// src/store/slices/vendorTutorialsSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { db } from "../../firebase.config";

// Re-fetch only if cache is older than this
const TTL_MS = 1000 * 60 * 1000; // 10 minutes

export const fetchVendorTutorials = createAsyncThunk(
  "vendorTutorials/fetch",
  async () => {
    const q = query(
      collection(db, "vendorTutorials"),
      where("active", "==", true),
      orderBy("order", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },
  {
    // Skip network if we already have fresh data
    condition: (_, { getState }) => {
      const { status, lastFetched } = getState().vendorTutorials || {};
      if (status === "loading") return false;
      const fresh = lastFetched && Date.now() - lastFetched < TTL_MS;
      return !fresh;
    },
  }
);

const slice = createSlice({
  name: "vendorTutorials",
  initialState: {
    items: [],
    status: "idle", // idle | loading | succeeded | failed
    error: null,
    lastFetched: null,
    scrollX: 0, // remember horizontal scroll position
  },
  reducers: {
    setScrollX(state, action) {
      state.scrollX = action.payload || 0;
    },
    // Optional manual invalidation if you ever need a hard refresh
    invalidate(state) {
      state.lastFetched = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchVendorTutorials.pending, (s) => {
      s.status = "loading";
    });
    b.addCase(fetchVendorTutorials.fulfilled, (s, a) => {
      s.status = "succeeded";
      s.items = a.payload;
      s.lastFetched = Date.now();
      s.error = null;
    });
    b.addCase(fetchVendorTutorials.rejected, (s, a) => {
      s.status = "failed";
      s.error = a.error?.message || "Failed to load tutorials";
    });
  },
});

export const { setScrollX, invalidate } = slice.actions;
export default slice.reducer;
