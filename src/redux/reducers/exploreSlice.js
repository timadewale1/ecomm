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

// helper to split an array into chunks of given size
function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// Fetch one page of products (batchSize) for productType, after lastVisible
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

      // 2) chunk vendor IDs into ≤30 groups
      const vendorChunks = chunkArray(approved, 30);

      // 3) fire one query per chunk in parallel
      const snaps = await Promise.all(
        vendorChunks.map((chunkIds) => {
          let q = query(
            collection(db, "products"),
            where("published", "==", true),
            where("isDeleted", "==", false),
            where("productType", "==", productType),
            where("vendorId", "in", chunkIds),
            orderBy("createdAt", "desc"),
            limit(batchSize)
          );
          if (lastVisible) {
            q = query(q, startAfter(lastVisible));
          }
          return getDocs(q);
        })
      );

      // 4) merge, dedupe, sort, and slice
      const allDocs = snaps.flatMap((snap) => snap.docs);
      const uniqueMap = new Map();
      allDocs.forEach((docSnap) => {
        if (!uniqueMap.has(docSnap.id)) {
          uniqueMap.set(docSnap.id, docSnap);
        }
      });
      const uniqueSnaps = Array.from(uniqueMap.values());
      uniqueSnaps.sort(
        (a, b) => b.data().createdAt.seconds - a.data().createdAt.seconds
      );

      const pageDocs = uniqueSnaps.slice(0, batchSize);
      const products = pageDocs.map((d) => ({ id: d.id, ...d.data() }));
      const newLastVisible = pageDocs.length
        ? pageDocs[pageDocs.length - 1]
        : null;

      return { productType, products, lastVisible: newLastVisible };
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
          state.byType[productType].error = null;
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
