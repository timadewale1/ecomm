import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebase.config";

/**
 * Fetches all approved, active vendors, counts
 *  • number of products (vendor.productIds.length)
 *  • number of orders (docs in "orders" with vendorId)
 * Then ranks them by (products + orders) desc and returns top 10.
 */
export const fetchTopVendors = createAsyncThunk(
  "topVendors/fetch",
  async (_, { rejectWithValue }) => {
    try {
      // 1) grab approved + active vendors
      const vendorSnap = await getDocs(
        query(
          collection(db, "vendors"),
          where("isApproved", "==", true),
          where("isDeactivated", "==", false)
        )
      );
      const vendors = vendorSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // 2) for each vendor, count products & orders
      const enriched = await Promise.all(
        vendors.map(async (v) => {
          const productCount = Array.isArray(v.productIds)
            ? v.productIds.length
            : 0;

          const ordersSnap = await getDocs(
            query(
              collection(db, "orders"),
              where("vendorId", "==", v.id)
            )
          );
          const orderCount = ordersSnap.size;

          return {
            ...v,
            productCount,
            orderCount,
            score: productCount + orderCount,
          };
        })
      );

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
