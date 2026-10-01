import { publicVendorsQuery } from "../../services/publicVendors";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getDocs } from "firebase/firestore";

/**
 * Preserves the server-projected discovery score and returns the top 10.
 * Customer clients never fetch raw orders or unpublished product IDs to rank.
 */
export const fetchTopVendors = createAsyncThunk(
  "topVendors/fetch",
  async (_, { rejectWithValue }) => {
    try {
      // Same discovery score, computed server-side; never fetch customer orders.
      const vendorSnap = await getDocs(publicVendorsQuery());
      const enriched = vendorSnap.docs.map((doc) => ({
        ...doc.data(), id: doc.id, score: Number(doc.data().discoveryScore) || 0,
      }));

      // 3) sort & take top 10
      enriched.sort((a, b) => b.score - a.score);
      return enriched.slice(0, 10);
    } catch (err) {
      console.error("fetchTopVendors:", err);
      return rejectWithValue(err.message);
    }
  }
);

const topVendorsSlice = createSlice({
  name: "topVendors",
  initialState: {
    list: [],
    status: "idle", // "idle" | "loading" | "succeeded" | "failed"
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTopVendors.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchTopVendors.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.list = action.payload;
      })
      .addCase(fetchTopVendors.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });
  },
});

export default topVendorsSlice.reducer;
