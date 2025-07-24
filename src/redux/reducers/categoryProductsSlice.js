import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { db } from "../../firebase.config";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";

const BATCH_SIZE_INCREMENT = 50;

/**
 * Helper to chunk an array into smaller arrays of `size` length.
 */
function chunkArray(array, size) {
  const results = [];
  for (let i = 0; i < array.length; i += size) {
    results.push(array.slice(i, i + size));
  }
  return results;
}

/**
 * Deduplicate an array by the `id` field.
 */
function deduplicateById(arr) {
  const map = new Map();
  arr.forEach((item) => map.set(item.id, item));
  return Array.from(map.values());
}

/**
 * Thunk to fetch products for a given category.
 * If loadMore is false and data is already cached, it returns the cached data.
 * Note: Category metadata (e.g., header images, subtitles) is handled by categoryMetadataSlice.
 */
export const fetchCategoryProducts = createAsyncThunk(
  "categoryProducts/fetchCategoryProducts",
  async ({ category, loadMore = false }, { getState, rejectWithValue }) => {
    try {
      console.log(
        "[Thunk] Starting fetchCategoryProducts for category:",
        category,
        "loadMore:",
        loadMore
      );

      const state = getState().categoryProducts;
      // Get cached data for this category, if available
      const cached = state.data[category] || {
        products: [],
        lastVisible: null,
        noMoreProducts: false,
      };

      // If not loading more and we already have cached products, use them
      if (!loadMore && cached.products.length > 0) {
        console.log("[Thunk] Using cached data for category:", category);
        return { ...cached, category };
      }

      const existingProducts = cached.products;

      // If cached indicates we've reached the end, skip further fetching
      if (cached.noMoreProducts && loadMore) {
        console.log(
          "[Thunk] No more products for category",
          category,
          "cached already."
        );
        return {
          products: [],
          lastVisible: cached.lastVisible,
          noMoreProducts: true,
          category,
        };
      }

      // 1) Fetch all approved & active vendors
      const vendorsSnap = await getDocs(
        query(
          collection(db, "vendors"),
          where("isApproved", "==", true),
          where("isDeactivated", "==", false)
        )
      );
      const approvedVendorIDs = vendorsSnap.docs.map((doc) => doc.id);
      console.log("[Thunk] Approved Vendor IDs:", approvedVendorIDs);

      if (approvedVendorIDs.length === 0) {
        console.log("[Thunk] No approved vendors found.");
        return {
          products: [],
          lastVisible: null,
          noMoreProducts: true,
          category,
        };
      }

      // 2) Chunk vendor IDs (Firestore 'in' supports up to 10 values)
      const vendorIDChunks = chunkArray(approvedVendorIDs, 10);
      // Use a Map to merge product docs (avoid duplicates)
      const docMap = new Map();

      for (const chunk of vendorIDChunks) {
        console.log("[Thunk] Querying chunk:", chunk);
        // Omit 'startAfter' for simplicity when merging multiple queries
        const q = query(
          collection(db, "products"),
          where("productType", "==", category),
          where("isDeleted", "==", false),
          where("published", "==", true),
          // Use the correct field name for vendor ID:
          where("vendorId", "in", chunk),
          orderBy("createdAt", "desc")
        );

        const snap = await getDocs(q);
        console.log("[Thunk] Chunk snapshot docs:", snap.docs);
        if (!snap.empty) {
          snap.docs.forEach((doc) => {
            docMap.set(doc.id, { id: doc.id, ...doc.data() });
          });
        }
      }

      if (docMap.size === 0) {
        console.log("[Thunk] No products found across all chunks.");
        return {
          products: [],
          lastVisible: null,
          noMoreProducts: true,
          category,
        };
      }

      // Convert the Map into an array and sort by createdAt descending
      let allDocs = Array.from(docMap.values());
      allDocs.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());

      // 3) Manual limit for "batch size"
      // For loadMore, new batch = existing products + BATCH_SIZE_INCREMENT; otherwise, initial batch = BATCH_SIZE_INCREMENT.
      const maxToShow = loadMore
        ? existingProducts.length + BATCH_SIZE_INCREMENT
        : BATCH_SIZE_INCREMENT;
      const finalDocs = allDocs.slice(0, maxToShow);

      // Determine if we've reached the end (allDocs are returned fully)
      const noMore = finalDocs.length === allDocs.length;
      const simulatedLastVisible = null; // Not used with this approach

      console.log("[Thunk] Final merged docs after chunking:", finalDocs);
      console.log("[Thunk] Reached end?", noMore);

      return {
        products: finalDocs,
        lastVisible: simulatedLastVisible,
        noMoreProducts: noMore,
        category,
      };
    } catch (error) {
      console.error("[Thunk] Error in fetchCategoryProducts:", error);
      return rejectWithValue(error.message);
    }
  }
);

const categoryProductsSlice = createSlice({
  name: "categoryProducts",
  initialState: {
    data: {}, // Stores data per category: { [category]: { products, lastVisible, noMoreProducts } }
    loading: false,
    error: null,
  },
  reducers: {
    resetCategoryProducts(state, action) {
      const category = action.payload;
      console.log(
        "[Slice] Resetting categoryProducts state for category:",
        category
      );
      state.data[category] = {
        products: [],
        lastVisible: null,
        noMoreProducts: false,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategoryProducts.pending, (state) => {
        console.log("[Slice] fetchCategoryProducts pending...");
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategoryProducts.fulfilled, (state, action) => {
        console.log("[Slice] fetchCategoryProducts fulfilled:", action.payload);
        const { products, lastVisible, noMoreProducts, category } =
          action.payload;
        const existing = state.data[category]?.products || [];
        const combined = [...existing, ...products];
        state.data[category] = {
          products: deduplicateById(combined),
          lastVisible,
          noMoreProducts,
        };
        state.loading = false;
      })
      .addCase(fetchCategoryProducts.rejected, (state, action) => {
        console.error(
          "[Slice] fetchCategoryProducts rejected:",
          action.payload || action.error.message
        );
        state.loading = false;
        state.error = action.payload || action.error.message;
      });
  },
});

export const { resetCategoryProducts } = categoryProductsSlice.actions;
export default categoryProductsSlice.reducer;
