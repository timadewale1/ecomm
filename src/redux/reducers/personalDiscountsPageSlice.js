// src/redux/slices/personalDiscountsPageSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { db } from "../../firebase.config";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";

/** How many products to fetch per batch */
const BATCH_SIZE_INCREMENT = 20;

/** Utility: chunk an array into smaller arrays of a given size */
function chunkArray(array, size) {
  const results = [];
  for (let i = 0; i < array.length; i += size) {
    results.push(array.slice(i, i + size));
  }
  return results;
}

/** Utility: remove duplicates by `id` field */
function deduplicateById(arr) {
  const map = new Map();
  arr.forEach((item) => map.set(item.id, item));
  return Array.from(map.values());
}

/**
 * Thunk to fetch personal discount products in multiple batches of 20.
 * loadMore=false => initial batch, loadMore=true => next batch
 */
export const fetchPersonalDiscountsPage = createAsyncThunk(
  "personalDiscountsPage/fetchPersonalDiscountsPage",
  async ({ loadMore = false }, { getState, rejectWithValue }) => {
    try {
      console.log("[Thunk] fetchPersonalDiscountsPage start. loadMore:", loadMore);
      const state = getState().personalDiscountsPage;
      const { products: existingProducts, noMoreProducts } = state;

      // Already reached end? Return early
      if (noMoreProducts && loadMore) {
        console.log("[Thunk] No more personal discount products available.");
        return { products: [], noMoreProducts: true };
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
        console.log("[Thunk] No approved vendors => no personal discounts.");
        return { products: [], noMoreProducts: true };
      }

      // 2) Split vendor IDs into chunks of up to 10
      const vendorIDChunks = chunkArray(approvedVendorIDs, 10);
      const docMap = new Map(); // store unique docs

      // Query each vendor chunk
      for (const chunk of vendorIDChunks) {
        const qProd = query(
          collection(db, "products"),
          where("isDeleted", "==", false),
          where("published", "==", true),
          where("vendorId", "in", chunk),
          where("discount.discountType", "in", [
            "personal-monetary",
            "personal-freebies",
          ]),
          orderBy("createdAt", "desc")
        );

        const snap = await getDocs(qProd);
        snap.forEach((doc) => {
          docMap.set(doc.id, { id: doc.id, ...doc.data() });
        });
      }

      if (docMap.size === 0) {
        console.log("[Thunk] No personal discount products across all vendors.");
        return { products: [], noMoreProducts: true };
      }

      // 3) Combine & sort
      let allDocs = Array.from(docMap.values());
      allDocs.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));

      // 4) Decide how many to show
      const maxToShow = loadMore
        ? existingProducts.length + BATCH_SIZE_INCREMENT
        : BATCH_SIZE_INCREMENT;

      const finalDocs = allDocs.slice(0, maxToShow);
      const reachedEnd = finalDocs.length === allDocs.length;

      console.log(
        `[Thunk] finalDocs length=${finalDocs.length}, reachedEnd=${reachedEnd}`
      );

      return { products: finalDocs, noMoreProducts: reachedEnd };
    } catch (error) {
      console.error("[Thunk] fetchPersonalDiscountsPage error:", error);
      return rejectWithValue(error.message);
    }
  }
);

const personalDiscountsPageSlice = createSlice({
  name: "personalDiscountsPage",
  initialState: {
    products: [],
    noMoreProducts: false,
    loading: false,
    error: null,
  },
  reducers: {
    resetPersonalDiscountsPage(state) {
      console.log("[Slice] resetPersonalDiscountsPage");
      state.products = [];
      state.noMoreProducts = false;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPersonalDiscountsPage.pending, (state) => {
        console.log("[Slice] fetchPersonalDiscountsPage -> pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPersonalDiscountsPage.fulfilled, (state, action) => {
        console.log("[Slice] fetchPersonalDiscountsPage -> fulfilled:", action.payload);
        const { products, noMoreProducts } = action.payload;
        // Merge with existing
        const combined = [...state.products, ...products];
        state.products = deduplicateById(combined);
        state.noMoreProducts = noMoreProducts;
        state.loading = false;
      })
      .addCase(fetchPersonalDiscountsPage.rejected, (state, action) => {
        console.error("[Slice] fetchPersonalDiscountsPage -> rejected:", action.payload);
        state.loading = false;
        state.error = action.payload || action.error.message;
      });
  },
});

export const { resetPersonalDiscountsPage } = personalDiscountsPageSlice.actions;
export default personalDiscountsPageSlice.reducer;
