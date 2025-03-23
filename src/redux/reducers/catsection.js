// src/redux/slices/catsection.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { db } from "../../firebase.config";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
} from "firebase/firestore";

// Utility: remove duplicates by id
function deduplicateById(arr) {
  const map = new Map();
  arr.forEach((item) => map.set(item.id, item));
  return Array.from(map.values());
}

/**
 * Thunk to fetch category data (vendors and products) for a given category.
 * If loadMore is true, it fetches the next batch of products.
 * For the special category "all" (case-insensitive), the queries omit the category filter.
 * Otherwise, for specific categories (e.g., "Mens"), the products query returns products where
 * the "category" field is either the normalized category (e.g., "Mens") or "all".
 */
export const fetchCategorySection = createAsyncThunk(
  "catsection/fetchCategorySection",
  async ({ category, loadMore = false }, { getState, rejectWithValue }) => {
    try {
      // Check if the category is "all" (case-insensitive)
      const isAll = category.toLowerCase() === "all";
      // For non-"all" categories, normalize (e.g., "Mens", "Womens", "Kids")
      const normalizedCat = isAll
        ? "all"
        : category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();

      // Get current cached state for this category (if any)
      const state = getState().catsection.data[category] || {
        vendors: [],
        products: [],
        lastVisibleProduct: null,
        noMoreProducts: false,
      };

      // 1) Fetch vendors if not already cached.
      let vendors = state.vendors;
      if (vendors.length === 0) {
        let vendorsQuery;
        if (isAll) {
          // For "all", fetch all approved and active vendors
          vendorsQuery = query(
            collection(db, "vendors"),
            where("isApproved", "==", true),
            where("isDeactivated", "==", false)
          );
        } else {
          // For a specific category, filter by the categories array
          vendorsQuery = query(
            collection(db, "vendors"),
            where("categories", "array-contains", normalizedCat),
            where("isApproved", "==", true),
            where("isDeactivated", "==", false)
          );
        }
        const vendorSnapshot = await getDocs(vendorsQuery);
        vendors = vendorSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        vendors = deduplicateById(vendors);
      }

      // Extract approved vendor IDs
      const approvedVendorIDs = vendors.map((v) => v.id);
      if (approvedVendorIDs.length === 0) {
        console.log("No approved vendors found for category:", normalizedCat);
        return {
          category,
          vendors,
          products: [],
          lastVisibleProduct: null,
          noMoreProducts: true,
        };
      }

      // 2) Fetch products from these approved vendors.
      // For non-"all" categories, we add an extra filter so that products with 
      // category equal to the normalized category OR "all" are returned.
      let productDocs = [];
      const batchSize = loadMore ? 20 : 10;
      // Helper function to query a chunk:
      const queryChunk = async (chunk) => {
        let q;
        if (isAll) {
          q = query(
            collection(db, "products"),
            where("isDeleted", "==", false),
            where("published", "==", true),
            where("vendorId", "in", chunk),
            orderBy("createdAt", "desc"),
            limit(batchSize)
          );
        } else {
          // Use an 'in' filter to include products whose category is either the normalizedCat or "all"
          q = query(
            collection(db, "products"),
            where("category", "in", [normalizedCat, "all"]),
            where("isDeleted", "==", false),
            where("published", "==", true),
            where("vendorId", "in", chunk),
            orderBy("createdAt", "desc"),
            limit(batchSize)
          );
        }
        if (loadMore && state.lastVisibleProduct) {
          q = query(q, startAfter(state.lastVisibleProduct));
        }
        const snapshot = await getDocs(q);
        return snapshot.docs;
      };

      if (approvedVendorIDs.length <= 10) {
        productDocs = await queryChunk(approvedVendorIDs);
      } else {
        // If more than 10 vendor IDs, split them into chunks:
        const chunks = [];
        for (let i = 0; i < approvedVendorIDs.length; i += 10) {
          chunks.push(approvedVendorIDs.slice(i, i + 10));
        }
        // For each chunk, query products and merge results.
        for (const chunk of chunks) {
          const docs = await queryChunk(chunk);
          productDocs.push(...docs);
        }
        // Sort all documents by createdAt descending
        productDocs.sort(
          (a, b) =>
            (b.data().createdAt?.toMillis?.() || 0) -
            (a.data().createdAt?.toMillis?.() || 0)
        );
        // Limit to the batch size
        productDocs = productDocs.slice(0, batchSize);
      }

      const products = productDocs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const lastVisibleProduct =
        productDocs.length > 0
          ? productDocs[productDocs.length - 1]
          : state.lastVisibleProduct;
      const noMoreProducts = productDocs.length < batchSize;

      return {
        category,
        vendors,
        products,
        lastVisibleProduct,
        noMoreProducts,
      };
    } catch (error) {
      console.error("[Thunk] fetchCategorySection error:", error);
      return rejectWithValue(error.message);
    }
  }
);

const catsectionSlice = createSlice({
  name: "catsection",
  initialState: {
    data: {}, // keyed by category, e.g., data["Mens"] = { vendors, products, lastVisibleProduct, noMoreProducts, loading, error }
    loading: false,
    error: null,
  },
  reducers: {
    // Optionally, you can reset a category’s data
    resetCategorySection(state, action) {
      const category = action.payload;
      console.log("[Slice] Resetting data for category:", category);
      state.data[category] = {
        vendors: [],
        products: [],
        lastVisibleProduct: null,
        noMoreProducts: false,
        loading: false,
        error: null,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategorySection.pending, (state, action) => {
        const { category } = action.meta.arg;
        if (!state.data[category]) {
          state.data[category] = {
            vendors: [],
            products: [],
            lastVisibleProduct: null,
            noMoreProducts: false,
            loading: true,
            error: null,
          };
        } else {
          state.data[category].loading = true;
          state.data[category].error = null;
        }
      })
      .addCase(fetchCategorySection.fulfilled, (state, action) => {
        const {
          category,
          vendors,
          products,
          lastVisibleProduct,
          noMoreProducts,
        } = action.payload;
        if (!state.data[category]) {
          state.data[category] = {
            vendors,
            products,
            lastVisibleProduct,
            noMoreProducts,
            loading: false,
            error: null,
          };
        } else {
          // For loadMore, append new products; vendors remain unchanged
          state.data[category].vendors = vendors;
          state.data[category].products = deduplicateById([
            ...state.data[category].products,
            ...products,
          ]);
          state.data[category].lastVisibleProduct = lastVisibleProduct;
          state.data[category].noMoreProducts = noMoreProducts;
          state.data[category].loading = false;
          state.data[category].error = null;
        }
      })
      .addCase(fetchCategorySection.rejected, (state, action) => {
        const { category } = action.meta.arg;
        if (!state.data[category]) {
          state.data[category] = {
            vendors: [],
            products: [],
            lastVisibleProduct: null,
            noMoreProducts: false,
            loading: false,
            error: action.payload || action.error.message,
          };
        } else {
          state.data[category].loading = false;
          state.data[category].error = action.payload || action.error.message;
        }
      });
  },
});

export const { resetCategorySection } = catsectionSlice.actions;
export default catsectionSlice.reducer;
