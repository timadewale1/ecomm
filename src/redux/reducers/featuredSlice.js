import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
} from "firebase/firestore";
import { db } from "../../firebase.config";

const PAGE_SIZE = 40;

export const fetchFeaturedProducts = createAsyncThunk(
  "featured/fetch",
  async ({ reset = false } = {}, { getState, rejectWithValue }) => {
    try {
      const { featured } = getState();
      const useCursor = reset ? null : featured.lastVisible;

      // Only published and not deleted + featured
      let qRef = query(
        collection(db, "products"),
        where("published", "==", true),
        where("isDeleted", "==", false),
        where("isFeatured", "==", true),
        orderBy("featuredAt", "desc"),
        limit(PAGE_SIZE)
      );

      if (useCursor) {
        qRef = query(
          collection(db, "products"),
          where("published", "==", true),
          where("isDeleted", "==", false),
          where("isFeatured", "==", true),
          orderBy("featuredAt", "desc"),
          startAfter(useCursor),
          limit(PAGE_SIZE)
        );
      }

      const snap = await getDocs(qRef);
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const last = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;

      return { docs, last, reset };
    } catch (e) {
      console.error("[fetchFeaturedProducts] failed:", e);
      return rejectWithValue(e.message || "Failed to load featured products");
    }
  }
);

const featuredSlice = createSlice({
  name: "featured",
  initialState: {
    items: [],
    lastVisible: null,
    status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
    hasMore: true,
    hydrated: false, // set true after first successful load
  },
  reducers: {
    resetFeatured(state) {
      state.items = [];
      state.lastVisible = null;
      state.status = "idle";
      state.error = null;
      state.hasMore = true;
      state.hydrated = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFeaturedProducts.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchFeaturedProducts.fulfilled, (state, action) => {
        const { docs, last, reset } = action.payload;

        // Merge unique (avoid duplicates when user bounces back)
        if (reset) {
          state.items = docs;
        } else {
          const existing = new Set(state.items.map((i) => i.id));
          state.items = [...state.items, ...docs.filter((d) => !existing.has(d.id))];
        }

        state.lastVisible = last;
        state.hasMore = docs.length === PAGE_SIZE;
        state.status = "succeeded";
        state.hydrated = true;
      })
      .addCase(fetchFeaturedProducts.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Failed to load featured products";
      });
  },
});

export const { resetFeatured } = featuredSlice.actions;
export default featuredSlice.reducer;
