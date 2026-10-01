import {
  createAsyncThunk,
  createSelector,
  createSlice,
} from "@reduxjs/toolkit";
import {
  collection,
  documentId,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebase.config";
import { isMarketplaceProductEligible } from "../../services/marketplaceVisibility";

const FAVORITES_CACHE_TTL_MS = 5 * 60 * 1000;
const FIRESTORE_IN_QUERY_LIMIT = 10;

const readLegacyFavorites = () => {
  try {
    const storedFavorites = JSON.parse(
      window.localStorage?.getItem("favorites") || "[]"
    );
    if (!Array.isArray(storedFavorites)) return { ids: [], entities: {} };

    const ids = [];
    const entities = {};

    storedFavorites.forEach((favorite) => {
      const id = favorite?.id || favorite?.productId;
      if (!id || ids.includes(id)) return;
      ids.push(id);
      entities[id] = { ...favorite, id };
    });

    return { ids, entities };
  } catch {
    return { ids: [], entities: {} };
  }
};

const legacyFavorites = readLegacyFavorites();

const initialState = {
  // null means the cached entries belong to the guest/legacy device scope.
  // A Firebase UID binds signed-in favourites to exactly one account so a
  // persisted cache can never leak across account switches.
  ownerUid: null,
  ids: legacyFavorites.ids,
  entities: legacyFavorites.entities,
  unavailableIds: [],
  status: "idle",
  error: null,
  lastFetchedAt: null,
  cloudStatus: "idle",
  cloudHydrated: false,
  cloudError: null,
  pendingGuestMergeIds: [],
  views: {},
  pendingIntents: {},
};

const splitIntoChunks = (values, size) => {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
};

export const refreshFavoriteProducts = createAsyncThunk(
  "favorites/refreshProducts",
  async ({ force = false } = {}, { getState, rejectWithValue }) => {
    const favorites = getState().favorites;
    const ids = Array.isArray(favorites?.ids) ? [...favorites.ids] : [];
    const fetchedAt = Date.now();

    if (ids.length === 0) {
      return { products: [], requestedIds: [], unavailableIds: [], fetchedAt };
    }

    const cacheIsStale =
      force ||
      !favorites.lastFetchedAt ||
      fetchedAt - favorites.lastFetchedAt >= FAVORITES_CACHE_TTL_MS;
    const knownUnavailable = new Set(favorites.unavailableIds || []);
    const requestedIds = cacheIsStale
      ? ids
      : ids.filter(
          (id) => !favorites.entities?.[id] && !knownUnavailable.has(id)
        );

    if (requestedIds.length === 0) {
      return { products: [], requestedIds: [], unavailableIds: [], fetchedAt };
    }

    try {
      const snapshots = await Promise.all(
        splitIntoChunks(requestedIds, FIRESTORE_IN_QUERY_LIMIT).map((chunk) =>
          getDocs(
            query(
              collection(db, "publicProducts"),
              where(documentId(), "in", chunk)
            )
          )
        )
      );
      const products = snapshots
        .flatMap((snapshot) =>
          snapshot.docs.map((productDoc) => ({
            id: productDoc.id,
            ...productDoc.data(),
          })),
        )
        .filter(isMarketplaceProductEligible);
      const returnedIds = new Set(products.map((product) => product.id));
      const unavailableIds = requestedIds.filter((id) => !returnedIds.has(id));

      return { products, requestedIds, unavailableIds, fetchedAt };
    } catch (error) {
      return rejectWithValue(
        error?.message || "Favourite products could not be refreshed."
      );
    }
  },
  {
    condition: ({ force = false } = {}, { getState }) => {
      const favorites = getState().favorites;
      if (!favorites || favorites.ids.length === 0) return false;
      if (
        favorites.status === "loading" ||
        favorites.status === "refreshing"
      ) {
        return false;
      }

      const unavailableIds = new Set(favorites.unavailableIds || []);
      const hasMissingProduct = favorites.ids.some(
        (id) => !favorites.entities[id] && !unavailableIds.has(id)
      );
      const cacheIsStale =
        !favorites.lastFetchedAt ||
        Date.now() - favorites.lastFetchedAt >= FAVORITES_CACHE_TTL_MS;

      return force || hasMissingProduct || cacheIsStale;
    },
  }
);

const favoritesSlice = createSlice({
  name: "favorites",
  initialState,
  reducers: {
    cloudSyncStarted: (state, { payload }) => {
      const uid = payload?.uid || null;
      if (!uid) return;

      if (state.ownerUid !== uid) {
        const preserveLocal = state.ownerUid === null && payload.preserveLocal;
        if (!preserveLocal) {
          state.ids = [];
          state.entities = {};
          state.unavailableIds = [];
          state.status = "idle";
          state.error = null;
          state.lastFetchedAt = null;
        }
        state.pendingGuestMergeIds = preserveLocal ? [...state.ids] : [];
        state.views = {};
        state.pendingIntents = {};
        state.ownerUid = uid;
      }

      state.cloudStatus = "connecting";
      state.cloudHydrated = false;
      state.cloudError = null;
    },
    cloudSnapshotReceived: (state, { payload }) => {
      if (!payload?.uid || state.ownerUid !== payload.uid) return;

      const cloudIds = Array.isArray(payload.ids) ? payload.ids : [];
      const pendingIds = Array.isArray(state.pendingGuestMergeIds)
        ? state.pendingGuestMergeIds
        : [];

      // Firestore can emit an empty cache snapshot before its first server
      // response on a fresh WebView. Do not let that transient snapshot erase
      // a valid UID-bound persisted cache.
      if (
        payload.fromCache === true &&
        cloudIds.length === 0 &&
        state.ids.length > 0 &&
        pendingIds.length === 0
      ) {
        state.cloudStatus = "connecting";
        return;
      }

      const nextIds = [...new Set([...cloudIds, ...pendingIds])];
      state.ids = nextIds;
      Object.keys(state.entities).forEach((id) => {
        if (!nextIds.includes(id)) delete state.entities[id];
      });
      state.unavailableIds = state.unavailableIds.filter((id) =>
        nextIds.includes(id)
      );
      const isAuthoritative = payload.fromCache !== true;
      state.cloudStatus = isAuthoritative || nextIds.length > 0
        ? "ready"
        : "connecting";
      state.cloudHydrated = isAuthoritative || nextIds.length > 0;
      state.cloudError = null;
    },
    guestMergeCompleted: (state, { payload }) => {
      if (!payload?.uid || state.ownerUid !== payload.uid) return;
      const mergedIds = new Set(payload.ids || []);
      state.pendingGuestMergeIds = state.pendingGuestMergeIds.filter(
        (id) => !mergedIds.has(id)
      );
    },
    guestMergeFailed: (state, { payload }) => {
      if (!payload?.uid || state.ownerUid !== payload.uid) return;
      // Keep pendingGuestMergeIds in the visible set. A retry can safely use
      // set(..., {merge:true}) because the document ID is the product ID.
      state.cloudError =
        payload.message || "Saved favourites could not be synced.";
    },
    cloudSyncFailed: (state, { payload }) => {
      if (!payload?.uid || state.ownerUid !== payload.uid) return;
      state.cloudStatus = "error";
      state.cloudError =
        payload.message || "Saved favourites could not be loaded.";
    },
    signedOut: (state) => {
      if (state.ownerUid === null) return;
      Object.assign(state, {
        ownerUid: null,
        ids: [],
        entities: {},
        unavailableIds: [],
        status: "idle",
        error: null,
        lastFetchedAt: null,
        cloudStatus: "idle",
        cloudHydrated: false,
        cloudError: null,
        pendingGuestMergeIds: [],
        views: {},
        pendingIntents: {},
      });
    },
    favoriteViewChanged: (state, { payload }) => {
      const { productId, product, liked, wishCount, pending, intent } = payload;
      if (!productId) return;
      state.views ||= {};
      state.pendingIntents ||= {};
      state.views[productId] = { liked, wishCount, pending };
      if (intent) state.pendingIntents[productId] = intent;
      else delete state.pendingIntents[productId];
      if (liked) {
        if (!state.ids.includes(productId)) state.ids.push(productId);
        // Keep raw product data separate from the optimistic display count.
        state.entities[productId] = { ...state.entities[productId], ...product, id: productId };
      } else {
        state.ids = state.ids.filter((id) => id !== productId);
        delete state.entities[productId];
        state.pendingGuestMergeIds = state.pendingGuestMergeIds.filter((id) => id !== productId);
      }
    },
    favoriteAdded: (state, { payload }) => {
      const id = payload?.id || payload?.productId;
      if (!id) return;

      if (!state.ids.includes(id)) state.ids.push(id);
      state.entities[id] = {
        ...(state.entities[id] || {}),
        ...payload,
        id,
      };
      state.unavailableIds = state.unavailableIds.filter(
        (productId) => productId !== id
      );
      state.error = null;
    },
    favoriteRemoved: (state, { payload: productId }) => {
      if (!productId) return;
      state.ids = state.ids.filter((id) => id !== productId);
      delete state.entities[productId];
      state.unavailableIds = state.unavailableIds.filter(
        (id) => id !== productId
      );
      state.pendingGuestMergeIds = state.pendingGuestMergeIds.filter(
        (id) => id !== productId
      );
      state.error = null;
      if (state.ids.length === 0) state.status = "idle";
    },
    legacyFavoritesMerged: (state, { payload }) => {
      if (!Array.isArray(payload)) return;
      payload.forEach((favorite) => {
        const id = favorite?.id || favorite?.productId;
        if (!id) return;
        if (!state.ids.includes(id)) state.ids.push(id);
        state.entities[id] = {
          ...(state.entities[id] || {}),
          ...favorite,
          id,
        };
      });
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(refreshFavoriteProducts.pending, (state) => {
        const hasCachedProducts = state.ids.some((id) => state.entities[id]);
        state.status = hasCachedProducts ? "refreshing" : "loading";
        state.error = null;
      })
      .addCase(refreshFavoriteProducts.fulfilled, (state, { payload }) => {
        payload.products.forEach((product) => {
          if (!state.ids.includes(product.id)) return;
          state.entities[product.id] = product;
        });
        const unavailableIds = new Set([
          ...state.unavailableIds,
          ...payload.unavailableIds,
        ]);
        payload.products.forEach((product) => unavailableIds.delete(product.id));
        payload.unavailableIds.forEach((id) => {
          // Keep the favourite ID so approval can restore it later, but never
          // render a stale cached copy while the vendor is unavailable.
          delete state.entities[id];
        });
        state.unavailableIds = [...unavailableIds].filter((id) =>
          state.ids.includes(id)
        );
        state.status = state.ids.length > 0 ? "ready" : "idle";
        state.error = null;
        state.lastFetchedAt = payload.fetchedAt;
      })
      .addCase(refreshFavoriteProducts.rejected, (state, { payload, meta }) => {
        if (meta.condition) return;
        state.status = "failed";
        state.error = payload || "Favourite products could not be refreshed.";
      });
  },
});

export const {
  cloudSyncStarted: favoritesCloudSyncStarted,
  cloudSnapshotReceived: favoritesCloudSnapshotReceived,
  cloudSyncFailed: favoritesCloudSyncFailed,
  guestMergeCompleted: favoritesGuestMergeCompleted,
  guestMergeFailed: favoritesGuestMergeFailed,
  signedOut: favoritesSignedOut,
  favoriteAdded,
  favoriteRemoved,
  favoriteViewChanged,
  legacyFavoritesMerged,
} = favoritesSlice.actions;

const selectFavoritesState = (state) => state.favorites;

export const selectFavoriteIds = (state) => selectFavoritesState(state).ids;
export const selectFavoritesStatus = (state) =>
  selectFavoritesState(state).status;
export const selectFavoritesError = (state) =>
  selectFavoritesState(state).error;
export const selectFavoritesLastFetchedAt = (state) =>
  selectFavoritesState(state).lastFetchedAt;
export const selectFavoritesOwnerUid = (state) =>
  selectFavoritesState(state).ownerUid;
export const selectFavoritesCloudStatus = (state) =>
  selectFavoritesState(state).cloudStatus;
export const selectFavoritesCloudHydrated = (state) =>
  selectFavoritesState(state).cloudHydrated;
export const selectFavoritesCloudError = (state) =>
  selectFavoritesState(state).cloudError;
export const selectFavoritesPendingGuestMergeIds = (state) =>
  selectFavoritesState(state).pendingGuestMergeIds || [];

export const selectFavoriteProducts = createSelector(
  [
    (state) => selectFavoritesState(state).ids,
    (state) => selectFavoritesState(state).entities,
  ],
  (ids, entities) => ids.map((id) => entities[id]).filter(Boolean)
);

export const selectIsFavorite = (state, productId) =>
  Boolean(productId && selectFavoritesState(state).ids.includes(productId));

export default favoritesSlice.reducer;
