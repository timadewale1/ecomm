// storepageVendorsSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { db } from "../../firebase.config";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  where,
  query,
} from "firebase/firestore";

/**
 * Thunk to fetch vendor + products in a single call
 */
export const fetchStorePageData = createAsyncThunk(
  "storepageVendors/fetchStorePageData",
  async (vendorId, { rejectWithValue }) => {
    try {
      console.log("fetchStorePageData: Fetching vendor with id:", vendorId);
      // 1) Fetch the vendor doc
      const vendorRef = doc(db, "vendors", vendorId);
      const vendorDoc = await getDoc(vendorRef);
      console.log("fetchStorePageData: vendorDoc exists:", vendorDoc.exists());

      if (!vendorDoc.exists()) {
        throw new Error("Vendor not found!");
      }

      const vendorData = { id: vendorDoc.id, ...vendorDoc.data() };
      console.log("fetchStorePageData: vendorData:", vendorData);

      // Optional: if vendor is not approved
      if (!vendorData.isApproved) {
        throw new Error("Vendor is not available!");
      }

      // 2) If vendor has productIds, fetch those products
      let products = [];
      if (vendorData.productIds && vendorData.productIds.length > 0) {
        console.log(
          "fetchStorePageData: Fetching products for vendor:",
          vendorData.productIds
        );
        // Chunk productIds (Firestore 'in' query limit is 10)
        const productChunks = [];
        for (let i = 0; i < vendorData.productIds.length; i += 10) {
          productChunks.push(vendorData.productIds.slice(i, i + 10));
        }
        // For each chunk, fetch products where __name__ in chunk
        for (const chunk of productChunks) {
          console.log("fetchStorePageData: Processing chunk:", chunk);
          const productsRef = collection(db, "products");
          const productsQuery = query(
            productsRef,
            where("__name__", "in", chunk),
            where("published", "==", true)
          );
          const snapshot = await getDocs(productsQuery);
          snapshot.forEach((doc) => {
            products.push({ id: doc.id, ...doc.data() });
          });
          console.log(
            "fetchStorePageData: Products fetched in chunk:",
            products
          );
        }
      }

      console.log(
        "fetchStorePageData: Returning vendor and products",
        vendorData,
        products
      );
      return { vendor: vendorData, products };
    } catch (error) {
      console.error("fetchStorePageData: Error", error.message);
      return rejectWithValue(error.message);
    }
  }
);

const storepageVendorsSlice = createSlice({
  name: "storepageVendors",
  initialState: {
    entities: {}, // { [vendorId]: { vendor: {...}, products: [...] } }
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStorePageData.pending, (state) => {
        state.loading = true;
        state.error = null;
        console.log("storepageVendorsSlice: fetchStorePageData.pending");
      })
      .addCase(fetchStorePageData.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        const { vendor, products } = action.payload;
        state.entities[vendor.id] = { vendor, products };
        console.log(
          "storepageVendorsSlice: fetchStorePageData.fulfilled",
          vendor,
          products
        );
      })
      .addCase(fetchStorePageData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Something went wrong.";
        console.log(
          "storepageVendorsSlice: fetchStorePageData.rejected",
          state.error
        );
      });
  },
});

export default storepageVendorsSlice.reducer;
