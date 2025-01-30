// redux/slices/conditionSlice.js
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

// ------------------------------------------
// AsyncThunk: fetchConditionProducts
// ------------------------------------------
export const fetchConditionProducts = createAsyncThunk(
  "condition/fetchConditionProducts",
  async (
    { condition, lastVisible = null, batchSize = 5 },
    { rejectWithValue }
  ) => {
    try {
      // 1) Get "approved" + "active" vendors
      const vendorsQuery = query(
        collection(db, "vendors"),
        where("isApproved", "==", true),
        where("isDeactivated", "==", false)
      );
      const vendorSnapshot = await getDocs(vendorsQuery);
      const approvedVendors = vendorSnapshot.docs.map((doc) => doc.id);

      // 2) Build base query for products
      //    - vendorId in approvedVendors
      //    - isDeleted == false
      //    - published == true
      //    - condition == condition
      //    - orderBy createdAt desc
      //    - limit = batchSize
      let productsQuery = query(
        collection(db, "products"),
        where("vendorId", "in", approvedVendors),
        where("isDeleted", "==", false),
        where("published", "==", true),
        where("condition", "==", condition),
        orderBy("createdAt", "desc"),
        limit(batchSize)
      );

      // If we have a "lastVisible" doc, add startAfter for pagination
      if (lastVisible) {
        productsQuery = query(
          collection(db, "products"),
          where("vendorId", "in", approvedVendors),
          where("isDeleted", "==", false),
          where("published", "==", true),
          where("condition", "==", condition),
          orderBy("createdAt", "desc"),
          startAfter(lastVisible),
          limit(batchSize)
        );
      }

      // 3) Fetch products
      const productsSnapshot = await getDocs(productsQuery);
      const products = productsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // 4) Return data + lastVisible for pagination
      return {
        products,
        lastVisible:
          productsSnapshot.docs.length > 0
            ? productsSnapshot.docs[productsSnapshot.docs.length - 1]
            : null,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// ------------------------------------------
// Slice: conditionSlice
const conditionSlice = createSlice({
  name: "condition",
  initialState: {
    conditionProducts: [],
    conditionLastVisible: null,
    conditionStatus: "idle", // or 'loading', 'succeeded', 'failed'
    conditionError: null,
  },
  reducers: {
    resetConditionProducts(state) {
      state.conditionProducts = [];
      state.conditionLastVisible = null;
      state.conditionStatus = "idle";
      state.conditionError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConditionProducts.pending, (state) => {
        state.conditionStatus = "loading";
      })
      .addCase(fetchConditionProducts.fulfilled, (state, action) => {
        const { products, lastVisible } = action.payload;

        // Deduplicate products based on their unique `id`
        const existingProductIds = new Set(
          state.conditionProducts.map((p) => p.id)
        );
        const uniqueProducts = products.filter(
          (product) => !existingProductIds.has(product.id)
        );

        // Append only unique products
        state.conditionProducts = [
          ...state.conditionProducts,
          ...uniqueProducts,
        ];
        state.conditionLastVisible = lastVisible;
        state.conditionStatus = "succeeded";
      })
      .addCase(fetchConditionProducts.rejected, (state, action) => {
        state.conditionStatus = "failed";
        state.conditionError = action.payload || action.error.message;
      });
  },
});

export const { resetConditionProducts } = conditionSlice.actions;

export default conditionSlice.reducer;
