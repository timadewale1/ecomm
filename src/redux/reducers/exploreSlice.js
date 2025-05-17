// src/redux/reducers/exploreSlice.js
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

// Fetch one page of products (batchSize) for productType, after lastDoc
export const fetchExploreProducts = createAsyncThunk(
  "explore/fetchExploreProducts",
  async (
    { productType, lastVisible = null, batchSize = 20 },
    { rejectWithValue }
  ) => {
    try {
      // 1) approved vendors
      const vendorSnap = await getDocs(
        query(
          collection(db, "vendors"),
          where("isApproved", "==", true),
          where("isDeactivated", "==", false)
        )
      );
      const approved = vendorSnap.docs.map((d) => d.id);
      if (!approved.length) {
        return { productType, products: [], lastVisible: null };
      }

      // 2) build product query with pagination
      let constraints = [
        where("published", "==", true),
        where("isDeleted", "==", false),
        where("productType", "==", productType),
        where("vendorId", "in", approved),
        orderBy("createdAt", "desc"),
        limit(batchSize),
      ];
      if (lastVisible) constraints.push(startAfter(lastVisible));

      const prodSnap = await getDocs(
        query(collection(db, "products"), ...constraints)
      );
      const products = prodSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const newLast = prodSnap.docs.length
        ? prodSnap.docs[prodSnap.docs.length - 1]
        : null;

      return { productType, products, lastVisible: newLast };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const exploreSlice = createSlice({
  name: "explore",
  initialState: {
    byType: {
      // e.g. "Jeans": { products: [], lastVisible: null, status: "idle", error: null }
    },
  },
  reducers: {
    // only use if you explicitly want to clear the cache
    resetExploreType(state, action) {
      delete state.byType[action.payload.productType];
    },
  },
  extraReducers: (builder) =>
    builder
      .addCase(fetchExploreProducts.pending, (state, action) => {
        const { productType } = action.meta.arg;
        if (!state.byType[productType]) {
          state.byType[productType] = {
            products: [],
            lastVisible: null,
            status: "loading",
            error: null,
          };
        } else {
          state.byType[productType].status = "loading";
        }
      })
      .addCase(fetchExploreProducts.fulfilled, (state, action) => {
        const { productType, products, lastVisible } = action.payload;
        const entry = state.byType[productType] || {
          products: [],
          lastVisible: null,
          status: "idle",
          error: null,
        };
        // append on pagination, replace on first load
        if (action.meta.arg.lastVisible) {
          entry.products.push(...products);
        } else {
          entry.products = products;
        }
        entry.lastVisible = lastVisible;
        entry.status = "succeeded";
        entry.error = null;
        state.byType[productType] = entry;
      })
      .addCase(fetchExploreProducts.rejected, (state, action) => {
        const { productType } = action.meta.arg;
        state.byType[productType].status = "failed";
        state.byType[productType].error =
          action.payload || action.error.message;
      }),
});

export const { resetExploreType } = exploreSlice.actions;
export default exploreSlice.reducer;
