// redux/slices/categoriesSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase.config";

export const fetchCategories = createAsyncThunk(
  "categories/fetchCategories",
  async () => {
    const vendorsQuery = query(
      collection(db, "vendors"),
      where("isApproved", "==", true),
      where("isDeactivated", "==", false)
    );

    const vendorSnapshot = await getDocs(vendorsQuery);
    const approvedVendors = vendorSnapshot.docs.map((doc) => doc.id);

    const productsQuery = query(
      collection(db, "products"),
      where("vendorId", "in", approvedVendors),
      where("isDeleted", "==", false),
      where("published", "==", true)
    );

    const productsSnapshot = await getDocs(productsQuery);
    const products = productsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const categoryCounts = {};
    products.forEach((product) => {
      const type = product.productType || "Other";
      if (!categoryCounts[type]) {
        categoryCounts[type] = { count: 0, products: [] };
      }
      categoryCounts[type].count += 1;
      categoryCounts[type].products.push(product);
    });

    const sortedCategories = Object.entries(categoryCounts)
      .map(([type, data]) => ({
        type,
        count: data.count,
        products: data.products,
      }))
      .sort((a, b) => b.count - a.count);

    return sortedCategories;
  }
);

const categoriesSlice = createSlice({
  name: "categories",
  initialState: {
    categories: [],
    status: "idle", // idle, loading, succeeded, failed
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categories = action.payload;
        state.status = "succeeded";
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      });
  },
});

export default categoriesSlice.reducer;
