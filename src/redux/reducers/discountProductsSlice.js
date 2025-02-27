import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { db } from "../../firebase.config";
import { collection, query, where, getDocs } from "firebase/firestore";

export const fetchDiscountProducts = createAsyncThunk(
  "discountProducts/fetchDiscountProducts",
  async (_, { rejectWithValue }) => {
    try {
      // Query all products that are not deleted and are published.
      const q = query(
        collection(db, "products"),
        where("isDeleted", "==", false),
        where("published", "==", true)
      );
      const snapshot = await getDocs(q);
      const allProducts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      // Filter for in‑app discount products (discount.discountType starts with "inApp")
      const inAppProducts = allProducts.filter(
        (product) =>
          product.discount &&
          product.discount.discountType &&
          product.discount.discountType.startsWith("inApp")
      );
      // Limit to 20 products
      const limitedProducts = inAppProducts.slice(0, 20);
      return limitedProducts;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const discountProductsSlice = createSlice({
  name: "discountProducts",
  initialState: {
    products: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDiscountProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDiscountProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload;
      })
      .addCase(fetchDiscountProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      });
  },
});

export default discountProductsSlice.reducer;
