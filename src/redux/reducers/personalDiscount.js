// personalDiscount.js (updated personalDiscountsSlice file)
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { db } from "../../firebase.config";
import { collection, query, where, getDocs } from "firebase/firestore";

// This version queries the "products" collection for products with discount.discountType in ["personal-monetary", "personal-freebies"].
export const fetchPersonalDiscounts = createAsyncThunk(
  "personalDiscounts/fetchPersonalDiscounts",
  async (_, { rejectWithValue }) => {
    try {
      console.log("[fetchPersonalDiscounts] Starting fetch...");

      // If your "discount" field is an object with a key "discountType",
      // you can query like this:
      const q = query(
        collection(db, "products"),               // 1. Use "products" collection
        where("isDeleted", "==", false),          // 2. Match your existing conditions if needed
        where("published", "==", true),
        where("discount.discountType", "in", [
          "personal-monetary",
          "personal-freebies",
        ])
      );
      console.log("[fetchPersonalDiscounts] Firestore query created:", q);

      const snapshot = await getDocs(q);
      console.log(`[fetchPersonalDiscounts] Snapshot size: ${snapshot.size}`);

      const personalDiscountProducts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      console.log(
        "[fetchPersonalDiscounts] Fetched personal discount products:",
        personalDiscountProducts
      );

      // Limit to 20 if needed
      const limited = personalDiscountProducts.slice(0, 20);
      console.log("[fetchPersonalDiscounts] Returning limited array:", limited);

      return limited;
    } catch (error) {
      console.error("[fetchPersonalDiscounts] Error:", error);
      return rejectWithValue(error.message);
    }
  }
);

const personalDiscountsSlice = createSlice({
  name: "personalDiscounts",
  initialState: {
    discounts: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPersonalDiscounts.pending, (state) => {
        console.log("[fetchPersonalDiscounts.pending]");
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPersonalDiscounts.fulfilled, (state, action) => {
        console.log("[fetchPersonalDiscounts.fulfilled] Payload:", action.payload);
        state.loading = false;
        state.discounts = action.payload;
      })
      .addCase(fetchPersonalDiscounts.rejected, (state, action) => {
        console.error(
          "[fetchPersonalDiscounts.rejected] Error:",
          action.payload || action.error.message
        );
        state.loading = false;
        state.error = action.payload || action.error.message;
      });
  },
});

export default personalDiscountsSlice.reducer;
