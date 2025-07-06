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

// helper to split into ≤30-sized chunks
function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export const fetchConditionProducts = createAsyncThunk(
  "condition/fetchConditionProducts",
  async (
    { condition, productType = null, lastVisible = null, batchSize = 5 },
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

      // If no approved vendors, return empty result immediately
      if (approvedVendors.length === 0) {
        console.log("No approved vendors found. Returning empty array.");
        return {
          condition,
          products: [],
          lastVisible: null,
        };
      }

      const conditionToQuery =
        condition.toLowerCase() === "defect" ? "Defect:" : condition;

      // 2) Build the shared filters
      const common = [
        where("isDeleted", "==", false),
        where("published", "==", true),
        where("condition", "==", conditionToQuery),
        orderBy("createdAt", "desc"),
      ];
      if (productType) {
        common.splice(2, 0, where("productType", "==", productType));
      }

      // 3) Chunk the vendor list into ≤30 and fire parallel queries
      const vendorChunks = chunkArray(approvedVendors, 30);
      const snaps = await Promise.all(
        vendorChunks.map((chunkIds) => {
          let q = query(
            collection(db, "products"),
            where("vendorId", "in", chunkIds),
            ...common,
            limit(batchSize)
          );
          if (lastVisible) {
            q = query(q, startAfter(lastVisible));
          }
          return getDocs(q);
        })
      );

      // 4) Merge all snapshots, dedupe, sort, and take the top batch
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

      // 5) Slice out exactly `batchSize` items
      const pageDocs = uniqueSnaps.slice(0, batchSize);
      const products = pageDocs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      const newLastVisible = pageDocs.length
        ? pageDocs[pageDocs.length - 1]
        : null;

      return {
        condition,
        products,
        lastVisible: newLastVisible,
      };
    } catch (error) {
      console.error("fetchConditionProducts error:", error);
      return rejectWithValue(error.message);
    }
  }
);

const conditionSlice = createSlice({
  name: "condition",
  initialState: {
    productsByCondition: {},
  },
  reducers: {
    resetConditionProducts(state, action) {
      const { condition } = action.payload;
      state.productsByCondition[condition] = {
        conditionProducts: [],
        conditionLastVisible: null,
        conditionStatus: "idle",
        conditionError: null,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConditionProducts.pending, (state, action) => {
        const { condition } = action.meta.arg;
        if (!state.productsByCondition[condition]) {
          state.productsByCondition[condition] = {
            conditionProducts: [],
            conditionLastVisible: null,
            conditionStatus: "loading",
            conditionError: null,
          };
        } else {
          state.productsByCondition[condition].conditionStatus = "loading";
          state.productsByCondition[condition].conditionError = null;
        }
      })
      .addCase(fetchConditionProducts.fulfilled, (state, action) => {
        const { condition, products, lastVisible } = action.payload;

        if (!state.productsByCondition[condition]) {
          state.productsByCondition[condition] = {
            conditionProducts: [],
            conditionLastVisible: null,
            conditionStatus: "idle",
            conditionError: null,
          };
        }

        const existingIds = new Set(
          state.productsByCondition[condition].conditionProducts.map(
            (p) => p.id
          )
        );
        const uniqueProducts = products.filter((p) => !existingIds.has(p.id));

        state.productsByCondition[condition].conditionProducts = [
          ...state.productsByCondition[condition].conditionProducts,
          ...uniqueProducts,
        ];
        state.productsByCondition[condition].conditionLastVisible = lastVisible;
        state.productsByCondition[condition].conditionStatus = "succeeded";
      })
      .addCase(fetchConditionProducts.rejected, (state, action) => {
        const { condition } = action.meta.arg;
        if (!state.productsByCondition[condition]) {
          state.productsByCondition[condition] = {
            conditionProducts: [],
            conditionLastVisible: null,
            conditionStatus: "failed",
            conditionError: action.payload || action.error.message,
          };
        } else {
          state.productsByCondition[condition].conditionStatus = "failed";
          state.productsByCondition[condition].conditionError =
            action.payload || action.error.message;
        }
      });
  },
});

export const { resetConditionProducts } = conditionSlice.actions;
export default conditionSlice.reducer;
