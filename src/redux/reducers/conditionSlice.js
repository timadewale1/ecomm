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

      
      let productsQuery = query(
        collection(db, "products"),
        where("vendorId", "in", approvedVendors),
        where("isDeleted", "==", false),
        where("published", "==", true),
        where("condition", "==", conditionToQuery), // ← use the corrected value
        orderBy("createdAt", "desc"),
        limit(batchSize)
      );

      // If we have a "lastVisible" doc, add startAfter for pagination
      if (lastVisible) {
        productsQuery = query(productsQuery, startAfter(lastVisible));
      }

      // 3) Fetch products
      const productsSnapshot = await getDocs(productsQuery);
      const products = productsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // 4) Return data
      return {
        condition,
        products,
        lastVisible:
          productsSnapshot.docs.length > 0
            ? productsSnapshot.docs[productsSnapshot.docs.length - 1]
            : null,
      };
    } catch (error) {
      console.error("fetchConditionProducts error:", error);
      return rejectWithValue(error.message);
    }
  }
);

// Slice: conditionSlice
const conditionSlice = createSlice({
  name: "condition",
  initialState: {
    // Cache data per condition.
    // Each key will hold an object: { conditionProducts, conditionLastVisible, conditionStatus, conditionError }
    productsByCondition: {},
  },
  reducers: {
    // Reset products for a particular condition if needed
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
        console.log("🔥 fetchConditionProducts.fulfilled:", action.payload);

        const { condition, products, lastVisible } = action.payload;

        if (!state.productsByCondition[condition]) {
          state.productsByCondition[condition] = {
            conditionProducts: [],
            conditionLastVisible: null,
            conditionStatus: "idle",
            conditionError: null,
          };
        }
        // Deduplicate products by id
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
