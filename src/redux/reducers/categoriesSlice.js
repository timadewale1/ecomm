// redux/slices/categoriesSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase.config";

// helper to split an array into chunks of size `n`
function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export const fetchCategories = createAsyncThunk(
  "categories/fetchCategories",
  async () => {
    // 1) Fetch approved + active vendors
    const vendorsQuery = query(
      collection(db, "vendors"),
      where("isApproved", "==", true),
      where("isDeactivated", "==", false)
    );
    const vendorSnapshot = await getDocs(vendorsQuery);
    const approvedVendors = vendorSnapshot.docs.map((doc) => doc.id);

    if (approvedVendors.length === 0) {
      return [];
    }

    // 2) Chunk vendor IDs into ≤30 groups
    const vendorChunks = chunkArray(approvedVendors, 30);

    // 3) Fire one products query per chunk, in parallel
    const productSnapshots = await Promise.all(
      vendorChunks.map((chunkIds) => {
        return getDocs(
          query(
            collection(db, "products"),
            where("vendorId", "in", chunkIds),
            where("isDeleted", "==", false),
            where("published", "==", true)
          )
        );
      })
    );

    // 4) Merge all docs into one array
    const allProducts = productSnapshots
      .flatMap((snap) => snap.docs)
      .map((doc) => ({ id: doc.id, ...doc.data() }));

    // 5) Build category counts
    const categoryCounts = {};
    allProducts.forEach((product) => {
      const type = product.productType || "Other";
      if (!categoryCounts[type]) {
        categoryCounts[type] = { count: 0, products: [] };
      }
      categoryCounts[type].count += 1;
      categoryCounts[type].products.push(product);
    });

    // 6) Sort and return
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
    status: "idle",
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
