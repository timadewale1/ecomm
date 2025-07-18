// src/redux/reducers/storepageVendorsSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { db } from "../../firebase.config";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  where,
  limit, // ✅  new
  orderBy, // ✅  new
  startAfter,
  query,
} from "firebase/firestore";

const PAGE_SIZE = 51; // ⬅ how many products per “page”
export const fetchVendorCategories = createAsyncThunk(
  "storepageVendors/fetchVendorCategories",
  async (vendorId, { rejectWithValue }) => {
    try {
      const snap = await getDoc(doc(db, "vendors", vendorId));
      if (!snap.exists()) throw new Error("Vendor not found");
      const data = snap.data();

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
      const snap = await getDoc(doc(db, "vendors", vendorId));
      if (!snap.exists()) throw new Error("Vendor not found");
      const vendor = { id: snap.id, ...snap.data() };
      if (!vendor.isApproved) throw new Error("Vendor is not available");
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
            collection(db, "products"),
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
      const q = query(
        collection(db, "vendors"),
        where("slug", "==", slug),
        limit(1)
      );
      const snap = await getDocs(q);
      if (snap.empty) throw new Error("Vendor not found");
      const docSnap = snap.docs[0];
      return { id: docSnap.id, ...docSnap.data() };
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
      .addCase(fetchVendorCategories.fulfilled, (state, { payload }) => {
        const { vendorId, categories } = payload;
        state.entities[vendorId] ??= { products: [] };
        state.entities[vendorId].categories = categories;
      });
  },
});

export const { resetVendorPage, saveStoreScroll } =
  storepageVendorsSlice.actions;
export default storepageVendorsSlice.reducer;
