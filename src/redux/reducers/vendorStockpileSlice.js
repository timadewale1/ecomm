// src/redux/reducers/vendorStockpileSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebase.config";
import moment from "moment";
import toast from "react-hot-toast";

/**
 * fetchVendorStockpileData:
 * This async thunk fetches all stockpile documents for a given vendor.
 * For each stockpile, it fetches the associated orders (from the orderIds field)
 * and then for each order, loops through cart items and fetches the corresponding product
 * details to build a merged list of pileItems.
 *
 * Note: This is closely based on your customer-side stockpile logic but now uses only vendorId.
 */
export const fetchVendorStockpileData = createAsyncThunk(
  "vendorStockpiles/fetchVendorStockpileData",
  async (vendorId, thunkAPI) => {
    try {
      const stockpilesRef = collection(db, "stockpiles");
      // Query all stockpile docs for this vendor
      const q = query(stockpilesRef, where("vendorId", "==", vendorId));
      const spSnap = await getDocs(q);

      if (spSnap.empty) {
        toast("No stockpiles found for this vendor.");
        return { stockpiles: [] };
      }

      const stockpiles = [];
      // Loop through each stockpile document
      for (const docSnap of spSnap.docs) {
        const spData = docSnap.data();

        // Merge associated orders' cart items into one array.
        // This mimics your current merging logic.
        let allItems = [];
        if (spData.orderIds && Array.isArray(spData.orderIds)) {
          for (const oid of spData.orderIds) {
            const orderSnap = await getDoc(doc(db, "orders", oid));
            if (!orderSnap.exists()) {
              continue;
            }
            const orderData = orderSnap.data();
            // Skip declined orders
            if (orderData.progressStatus === "Declined") continue;
            if (!Array.isArray(orderData.cartItems)) continue;

            for (const item of orderData.cartItems) {
              if (!item.productId) continue;
              const productSnap = await getDoc(
                doc(db, "products", item.productId)
              );
              if (!productSnap.exists()) continue;
              const productData = productSnap.data();
              // Use coverImageUrl as a fallback (you could add additional logic for sub-products/variants if needed)
              const finalImage =
                productData.coverImageUrl || "https://via.placeholder.com/80";
              const finalItem = {
                ...item,
                name: productData.name || "Unknown",
                imageUrl: finalImage,
              };
              allItems.push(finalItem);
            }
          }
        }

        // If there is an endDate field (a Firestore Timestamp), convert it to a JavaScript Date
        let expiry = null;
        if (spData.endDate) {
          expiry = spData.endDate.toDate
            ? spData.endDate.toDate()
            : new Date(spData.endDate);
        }

        // Build the stockpile object
        stockpiles.push({
          id: docSnap.id,
          ...spData,
          pileItems: allItems,
          stockpileExpiry: expiry,
        });
      }

      return { stockpiles };
    } catch (error) {
      console.error(
        "[vendorStockpileSlice] Error fetching vendor stockpile data:",
        error
      );
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

const initialState = {
  stockpiles: [],
  loading: false,
  error: null,
};

const vendorStockpileSlice = createSlice({
  name: "vendorStockpiles",
  initialState,
  reducers: {
    // Optional: a reducer to clear the vendor stockpile state
    clearVendorStockpiles: (state) => {
      state.stockpiles = [];
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVendorStockpileData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchVendorStockpileData.fulfilled, (state, action) => {
        state.loading = false;
        state.stockpiles = action.payload.stockpiles;
      })
      .addCase(fetchVendorStockpileData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load vendor stockpiles";
      });
  },
});

export const { clearVendorStockpiles } = vendorStockpileSlice.actions;
export default vendorStockpileSlice.reducer;
