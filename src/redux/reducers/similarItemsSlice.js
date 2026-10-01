import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  requestSimilarProducts,
  SIMILAR_PRODUCTS_BATCH_SIZE,
} from "../../services/similarProducts";

export const SIMILAR_ITEMS_FRESH_MS = 2 * 60 * 1000;
const MAX_CACHED_PRODUCTS = 20;

export const similarItemsCacheKey = (viewerKey, productId) =>
  `${viewerKey || "guest:unknown"}:${productId || "unknown"}`;

const emptyEntry = () => ({
  items: [],
  status: "idle",
  error: null,
  activeRequestId: null,
  responseRequestId: null,
  algorithmVersion: null,
  fetchedAt: null,
  lastAccessedAt: Date.now(),
});

export const fetchSimilarItems = createAsyncThunk(
  "similarItems/fetch",
  async ({ productId, viewerKey }, { signal, rejectWithValue }) => {
    const cacheKey = similarItemsCacheKey(viewerKey, productId);
    try {
      const response = await requestSimilarProducts({
        productId,
        limit: SIMILAR_PRODUCTS_BATCH_SIZE,
        signal,
      });
      return { productId, viewerKey, cacheKey, ...response };
    } catch (error) {
      if (error?.name === "AbortError") throw error;
      return rejectWithValue({
        productId,
        viewerKey,
        cacheKey,
        message: error?.message || "Similar items could not be loaded.",
        responseRequestId: error?.requestId || null,
      });
    }
  },
  {
    condition: ({ productId, viewerKey, force = false }, { getState }) => {
      if (!productId) return false;
      const cacheKey = similarItemsCacheKey(viewerKey, productId);
      const entry = getState().similarItems?.byProductId?.[cacheKey];
      if (entry?.status === "loading" || entry?.status === "refreshing") {
        return false;
      }
      if (force !== true && entry?.fetchedAt) {
        return Date.now() - entry.fetchedAt >= SIMILAR_ITEMS_FRESH_MS;
      }
      return true;
    },
  },
);

const pruneLeastRecentlyUsed = (state) => {
  const keys = Object.keys(state.byProductId);
  if (keys.length <= MAX_CACHED_PRODUCTS) return;

  keys
    .sort(
      (left, right) =>
        Number(state.byProductId[right]?.lastAccessedAt || 0) -
        Number(state.byProductId[left]?.lastAccessedAt || 0),
    )
    .slice(MAX_CACHED_PRODUCTS)
    .forEach((productId) => {
      delete state.byProductId[productId];
    });
};

const slice = createSlice({
  name: "similarItems",
  initialState: { byProductId: {} },
  reducers: {
    cacheCleared(state) {
      state.byProductId = {};
    },
    entryAccessed(state, { payload }) {
      const productId = payload?.productId;
      if (!productId) return;
      const cacheKey = similarItemsCacheKey(payload?.viewerKey, productId);
      const entry = state.byProductId[cacheKey];
      if (entry) entry.lastAccessedAt = Date.now();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSimilarItems.pending, (state, action) => {
        const { productId, viewerKey } = action.meta.arg;
        const cacheKey = similarItemsCacheKey(viewerKey, productId);
        const entry = state.byProductId[cacheKey] || emptyEntry();
        entry.status = entry.items.length ? "refreshing" : "loading";
        entry.error = null;
        entry.activeRequestId = action.meta.requestId;
        entry.lastAccessedAt = Date.now();
        state.byProductId[cacheKey] = entry;
      })
      .addCase(fetchSimilarItems.fulfilled, (state, action) => {
        const { cacheKey, items, requestId, algorithmVersion } = action.payload;
        const entry = state.byProductId[cacheKey] || emptyEntry();
        if (entry.activeRequestId !== action.meta.requestId) return;

        entry.items = items.slice(0, SIMILAR_PRODUCTS_BATCH_SIZE);
        entry.status = "ready";
        entry.error = null;
        entry.activeRequestId = null;
        entry.responseRequestId = requestId;
        entry.algorithmVersion = algorithmVersion;
        entry.fetchedAt = Date.now();
        entry.lastAccessedAt = Date.now();
        state.byProductId[cacheKey] = entry;
        pruneLeastRecentlyUsed(state);
      })
      .addCase(fetchSimilarItems.rejected, (state, action) => {
        if (action.meta.condition) return;
        const productId = action.meta.arg?.productId;
        const viewerKey = action.meta.arg?.viewerKey;
        const cacheKey = similarItemsCacheKey(viewerKey, productId);
        const entry = state.byProductId[cacheKey];
        if (!entry || entry.activeRequestId !== action.meta.requestId) return;

        entry.status = entry.items.length ? "ready" : "error";
        entry.error = action.payload?.message || action.error?.message;
        entry.activeRequestId = null;
        entry.lastAccessedAt = Date.now();
      });
  },
});

export const {
  cacheCleared: similarItemsCacheCleared,
  entryAccessed: similarItemsEntryAccessed,
} = slice.actions;

const EMPTY_ENTRY = Object.freeze({
  items: [],
  status: "idle",
  error: null,
  responseRequestId: null,
  algorithmVersion: null,
  fetchedAt: null,
});

export const selectSimilarItemsEntry = (state, productId, viewerKey) =>
  state.similarItems?.byProductId?.[
    similarItemsCacheKey(viewerKey, productId)
  ] || EMPTY_ENTRY;

export default slice.reducer;
