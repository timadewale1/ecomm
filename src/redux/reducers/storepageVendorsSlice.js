// src/redux/reducers/storepageVendorsSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { db } from "../../firebase.config";
import {
  collection,
  getDocs,
  where,
  limit, // ✅  new
  orderBy, // ✅  new
  startAfter,
  query,
} from "firebase/firestore";
import { fetchVendorStoreProducts } from "../../services/vendorStoreSearch";
import { getPublicVendor, publicVendorsQuery } from "../../services/publicVendors";

const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.toDate === "function") return value.toDate().getTime();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const PAGE_SIZE = 51; // ⬅ how many products per “page”

export const DEFAULT_VENDOR_CATALOG_FILTERS = {
  sort: "relevance",
  subTypes: [],
  sizeType: null,
  sizes: [],
  category: null,
  colors: [],
  conditions: [],
  priceMin: "",
  priceMax: "",
};

const cloneCatalogFilters = (filters = DEFAULT_VENDOR_CATALOG_FILTERS) => {
  const { brand: _discardedBrand, ...supportedFilters } = filters || {};
  return {
    ...DEFAULT_VENDOR_CATALOG_FILTERS,
    ...supportedFilters,
    subTypes: [...(supportedFilters.subTypes || [])],
    sizes: [...(supportedFilters.sizes || [])],
    colors: [...(supportedFilters.colors || [])],
    conditions: [...(supportedFilters.conditions || [])],
  };
};

const createVendorCatalog = () => ({
  items: [],
  total: 0,
  availableTotal: null,
  facets: null,
  query: "",
  filters: cloneCatalogFilters(),
  nextCursor: null,
  hasMore: true,
  initialized: false,
  loadedRequestKey: null,
  activeRequestId: null,
  loadingInitial: false,
  loadingMore: false,
  error: null,
});

export function vendorCatalogRequestKey(query = "", filters = {}) {
  const normalized = cloneCatalogFilters(filters);
  return JSON.stringify({
    query: String(query || "").trim(),
    filters: {
      sort: normalized.sort || "relevance",
      subTypes: [...normalized.subTypes].sort(),
      sizeType: normalized.sizeType || null,
      sizes: [...normalized.sizes].sort(),
      category: normalized.category || null,
      colors: [...normalized.colors].sort(),
      conditions: [...normalized.conditions].sort(),
      priceMin: String(normalized.priceMin || ""),
      priceMax: String(normalized.priceMax || ""),
    },
  });
}

export const fetchVendorCatalogPage = createAsyncThunk(
  "storepageVendors/fetchVendorCatalogPage",
  async (
    { vendorId, loadMore = false, query: requestedQuery, filters: requestedFilters },
    { getState, rejectWithValue, signal },
  ) => {
    try {
      const entry = getState().storepageVendors.entities[vendorId] || {};
      const catalog = entry.catalog || createVendorCatalog();
      const queryValue =
        requestedQuery === undefined ? catalog.query : requestedQuery;
      const filterValue = cloneCatalogFilters(requestedFilters || catalog.filters);
      const requestKey = vendorCatalogRequestKey(queryValue, filterValue);
      const response = await fetchVendorStoreProducts({
        vendorId,
        query: queryValue,
        filters: filterValue,
        cursor: loadMore ? catalog.nextCursor : null,
        signal,
      });

      return {
        vendorId,
        loadMore,
        query: String(queryValue || ""),
        filters: filterValue,
        requestKey,
        ...response,
      };
    } catch (error) {
      if (error?.name === "AbortError") throw error;
      return rejectWithValue({
        message: error?.message || "Vendor products could not be loaded.",
        requestId: error?.requestId || null,
      });
    }
  },
);
export const fetchVendorCategories = createAsyncThunk(
  "storepageVendors/fetchVendorCategories",
  async (vendorId, { rejectWithValue }) => {
    try {
      const data = await getPublicVendor(vendorId);
      if (!data) throw new Error("Vendor not found");

      // Firestore field is now `productCategories` (instead of `categories`)
      const cats = Array.isArray(data.productCategories)
        ? data.productCategories
        : [];

      return { vendorId, categories: cats };
    } catch (err) {
      console.error("[cats] failed fetching vendor.productCategories:", err);
      return rejectWithValue(err.message);
    }
  }
);

/* ──────────────────────────────────────────────────────────────
   1)  Fetch only the vendor document (no products here)
   ────────────────────────────────────────────────────────────── */
export const fetchStoreVendor = createAsyncThunk(
  "storepageVendors/fetchStoreVendor",
  async (vendorId, { rejectWithValue }) => {
    try {
      const vendor = await getPublicVendor(vendorId);
      if (!vendor) throw new Error("Vendor not found");
      if (vendor.isApproved !== true || vendor.isDeactivated === true) {
        throw new Error("Vendor is not available");
      }
      return vendor;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

/* ──────────────────────────────────────────────────────────────
   2)  Batch‑fetch products (initial + “load more” use same thunk)
   ────────────────────────────────────────────────────────────── */
export const fetchVendorProductsBatch = createAsyncThunk(
  "storepageVendors/fetchVendorProductsBatch",
  async ({ vendorId, loadMore }, { getState, rejectWithValue }) => {
    try {
      const { entities } = getState().storepageVendors;
      const entry = entities[vendorId] || {};
      const vendor = entry.vendor;

      if (!vendor) throw new Error("Vendor must be loaded first");

      const startIdx = loadMore ? entry.nextIdx || 0 : 0;
      const endIdx = startIdx + PAGE_SIZE;

      const orderedIds = [...(vendor.productIds ?? [])].reverse();
      const ids = orderedIds.slice(startIdx, endIdx);
      if (ids.length === 0)
        return { vendorId, products: [], nextIdx: startIdx, noMore: true };

      // Firestore max 10 ids per 'in' query
      const products = [];
      for (let i = 0; i < ids.length; i += 10) {
        const chunk = ids.slice(i, i + 10);
        const snap = await getDocs(
          query(
            collection(db, "publicProducts"),
            where("__name__", "in", chunk),
            where("published", "==", true)
          )
        );
        snap.forEach((d) => products.push({ id: d.id, ...d.data() }));
      }

      return {
        vendorId,
        products,
        nextIdx: endIdx,
        noMore: endIdx >= orderedIds.length,
      };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);
export const fetchStoreVendorBySlug = createAsyncThunk(
  "storepageVendors/fetchBySlug",
  async (slug, { rejectWithValue }) => {
    try {
      const q = publicVendorsQuery(
        where("slug", "==", slug),
        limit(1)
      );
      const snap = await getDocs(q);
      if (snap.empty) throw new Error("Vendor not found");
      const docSnap = snap.docs[0];
      const vendor = { id: docSnap.id, ...docSnap.data() };
      if (vendor.isApproved !== true || vendor.isDeactivated === true) {
        throw new Error("Vendor is not available");
      }
      return vendor;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchVendorReviews = createAsyncThunk(
  "storepageVendors/fetchVendorReviews",
  async ({ vendorId }, { rejectWithValue }) => {
    try {
      const snapshot = await getDocs(collection(db, "vendors", vendorId, "reviews"));
      const reviews = snapshot.docs
        .map((reviewDoc) => {
          const data = reviewDoc.data();
          return {
            id: reviewDoc.id,
            ...data,
            createdAtMs: toMillis(data.createdAt),
          };
        })
        .sort((left, right) => right.createdAtMs - left.createdAtMs);

      return { vendorId, reviews };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);
/* ──────────────────────────────────────────────────────────────
   Slice
   ────────────────────────────────────────────────────────────── */
const storepageVendorsSlice = createSlice({
  name: "storepageVendors",
  initialState: {
    entities: {
      /*
        [vendorId]: {
          vendor:   {…},
          products: [],
          nextIdx:  0,
          noMore:   false,
          loadingMore: false
        }
      */
    },
    loading: false, // for vendor fetch
    error: null,
  },
  reducers: {
    resetVendorPage: (state, { payload: vendorId }) => {
      delete state.entities[vendorId];
    },
    saveStoreScroll: (state, { payload }) => {
      if (!state.entities[payload.vendorId]) {
        console.warn("saveStoreScroll: vendor entry missing");
        return;
      }
      state.entities[payload.vendorId].scrollY = payload.scrollY;
    },
    setStoreTab: (state, { payload }) => {
      state.entities[payload.vendorId] ??= { products: [] };
      state.entities[payload.vendorId].activeTab = payload.tab;
    },
    setVendorCatalogQuery: (state, { payload }) => {
      state.entities[payload.vendorId] ??= { products: [] };
      const entry = state.entities[payload.vendorId];
      entry.catalog ??= createVendorCatalog();
      entry.catalog.query = String(payload.query || "");
      entry.catalog.error = null;
    },
    setVendorCatalogFilters: (state, { payload }) => {
      state.entities[payload.vendorId] ??= { products: [] };
      const entry = state.entities[payload.vendorId];
      entry.catalog ??= createVendorCatalog();
      entry.catalog.filters = cloneCatalogFilters(payload.filters);
      entry.catalog.error = null;
    },
    adjustVendorFollowersCount: (state, { payload }) => {
      const vendor = state.entities[payload.vendorId]?.vendor;
      if (!vendor) return;
      vendor.followersCount = Math.max(
        0,
        Number(vendor.followersCount || 0) + Number(payload.delta || 0),
      );
    },
    setVendorFollowersCount: (state, { payload }) => {
      const vendor = state.entities[payload.vendorId]?.vendor;
      const count = Number(payload.count);
      if (!vendor || !Number.isFinite(count)) return;
      vendor.followersCount = Math.max(0, count);
    },
    removeVendorReview: (state, { payload }) => {
      const entry = state.entities[payload.vendorId];
      if (!entry) return;
      entry.reviews = (entry.reviews || []).filter(
        (review) => review.id !== payload.reviewId,
      );
      if (entry.vendor && payload.rating != null && payload.ratingCount != null) {
        entry.vendor.rating = payload.rating;
        entry.vendor.ratingCount = payload.ratingCount;
      }
    },
  },
  extraReducers: (builder) => {
    /* vendor document ---------------------------------------------------- */
    builder
      .addCase(fetchStoreVendor.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStoreVendor.fulfilled, (state, { payload: vendor }) => {
        state.loading = false;
        const existing = state.entities[vendor.id];
        state.entities[vendor.id] = {
          vendor,
          products: existing?.products ?? [],
          nextIdx: existing?.nextIdx ?? 0,
          categories: existing?.categories,
          noMore: existing?.noMore ?? false,
          loadingMore: existing?.loadingMore ?? false,
          scrollY: existing?.scrollY,
          activeTab: existing?.activeTab ?? "products",
          reviews: existing?.reviews ?? [],
          reviewsLoaded: existing?.reviewsLoaded ?? false,
          reviewsLoading: existing?.reviewsLoading ?? false,
          reviewsError: existing?.reviewsError ?? null,
          catalog: existing?.catalog ?? createVendorCatalog(),
        };
      })

      .addCase(fetchStoreVendor.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload || "Something went wrong.";
      });

    /* batched products --------------------------------------------------- */
    builder
      .addCase(fetchVendorProductsBatch.pending, (state, { meta }) => {
        const id = meta.arg.vendorId;
        state.entities[id] ??= { products: [] };
        state.entities[id].loadingMore = true;
      })
      .addCase(fetchVendorProductsBatch.fulfilled, (state, { payload }) => {
        const { vendorId, products, nextIdx, noMore } = payload;
        const entry = state.entities[vendorId];

        entry.products = [...entry.products, ...products];
        entry.nextIdx = nextIdx;
        entry.noMore = noMore;
        entry.loadingMore = false;
      })
      .addCase(
        fetchVendorProductsBatch.rejected,
        (state, { meta, payload }) => {
          const id = meta.arg.vendorId;
          if (state.entities[id]) state.entities[id].loadingMore = false;
          state.error = payload || "Something went wrong.";
        }
      )
      .addCase(fetchVendorCatalogPage.pending, (state, { meta }) => {
        const vendorId = meta.arg.vendorId;
        state.entities[vendorId] ??= { products: [] };
        const entry = state.entities[vendorId];
        entry.catalog ??= createVendorCatalog();
        entry.catalog.activeRequestId = meta.requestId;
        entry.catalog.error = null;
        if (meta.arg.loadMore) {
          entry.catalog.loadingMore = true;
        } else {
          entry.catalog.loadingInitial = true;
          entry.catalog.loadingMore = false;
        }
      })
      .addCase(fetchVendorCatalogPage.fulfilled, (state, { meta, payload }) => {
        const entry = state.entities[payload.vendorId];
        if (!entry?.catalog || entry.catalog.activeRequestId !== meta.requestId) {
          return;
        }

        const previous = payload.loadMore ? entry.catalog.items : [];
        const seen = new Set(previous.map((item) => item.id));
        const nextItems = [
          ...previous,
          ...payload.items.filter((item) => item?.id && !seen.has(item.id)),
        ];

        entry.catalog.items = nextItems;
        entry.catalog.total = payload.total;
        if (
          payload.availableTotal != null &&
          Number.isFinite(Number(payload.availableTotal))
        ) {
          entry.catalog.availableTotal = Math.max(
            0,
            Number(payload.availableTotal),
          );
        }
        entry.catalog.facets = payload.loadMore
          ? entry.catalog.facets || payload.facets
          : payload.facets;
        entry.catalog.query = payload.query;
        entry.catalog.filters = cloneCatalogFilters(payload.filters);
        entry.catalog.nextCursor = payload.nextCursor;
        entry.catalog.hasMore = Boolean(payload.nextCursor);
        entry.catalog.initialized = true;
        entry.catalog.loadedRequestKey = payload.requestKey;
        entry.catalog.activeRequestId = null;
        entry.catalog.loadingInitial = false;
        entry.catalog.loadingMore = false;
        entry.catalog.error = null;
        entry.catalog.lastRequestId = payload.requestId;
        entry.catalog.algorithmVersion = payload.algorithmVersion;
      })
      .addCase(fetchVendorCatalogPage.rejected, (state, action) => {
        const vendorId = action.meta.arg.vendorId;
        const catalog = state.entities[vendorId]?.catalog;
        if (!catalog || catalog.activeRequestId !== action.meta.requestId) return;

        catalog.activeRequestId = null;
        catalog.loadingInitial = false;
        catalog.loadingMore = false;
        if (action.meta.aborted || action.error?.name === "AbortError") return;
        catalog.error =
          action.payload?.message || "Vendor products could not be loaded.";
        catalog.lastRequestId = action.payload?.requestId || null;
      })
      .addCase(fetchVendorCategories.fulfilled, (state, { payload }) => {
        const { vendorId, categories } = payload;
        state.entities[vendorId] ??= { products: [] };
        state.entities[vendorId].categories = categories;
      })
      .addCase(fetchVendorReviews.pending, (state, { meta }) => {
        const vendorId = meta.arg.vendorId;
        state.entities[vendorId] ??= { products: [] };
        state.entities[vendorId].reviewsLoading = true;
        state.entities[vendorId].reviewsError = null;
      })
      .addCase(fetchVendorReviews.fulfilled, (state, { payload }) => {
        const { vendorId, reviews } = payload;
        state.entities[vendorId] ??= { products: [] };
        state.entities[vendorId].reviews = reviews;
        state.entities[vendorId].reviewsLoaded = true;
        state.entities[vendorId].reviewsLoading = false;
        state.entities[vendorId].reviewsError = null;
      })
      .addCase(fetchVendorReviews.rejected, (state, { meta, payload }) => {
        const vendorId = meta.arg.vendorId;
        state.entities[vendorId] ??= { products: [] };
        state.entities[vendorId].reviewsLoading = false;
        state.entities[vendorId].reviewsError =
          payload || "Reviews could not be loaded.";
      });
  },
});

export const {
  resetVendorPage,
  saveStoreScroll,
  setStoreTab,
  setVendorCatalogQuery,
  setVendorCatalogFilters,
  adjustVendorFollowersCount,
  setVendorFollowersCount,
  removeVendorReview,
} = storepageVendorsSlice.actions;
export default storepageVendorsSlice.reducer;
