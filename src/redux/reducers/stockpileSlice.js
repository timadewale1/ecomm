// stockpileSlice.js

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
 * fetchStockpileData:
 * 1) Looks up 'stockpiles' doc for user+vendor+active
 * 2) For each orderId, fetch 'orders' doc
 * 3) For each cartItem, fetch product doc for name+image
 * 4) Merge into single array: pileItems
 */
export const fetchStockpileData = createAsyncThunk(
  "stockpile/fetchStockpileData",
  async ({ userId, vendorId }, thunkAPI) => {
    console.log("[stockpileSlice] fetchStockpileData called with:", {
      userId,
      vendorId,
    });
    try {
      const stockpilesRef = collection(db, "stockpiles");
      const q = query(
        stockpilesRef,
        where("userId", "==", userId),
        where("vendorId", "==", vendorId),
        where("isActive", "==", true)
      );
      console.log(
        "[stockpileSlice] Executing Firestore query for stockpiles..."
      );
      const spSnap = await getDocs(q);

      if (spSnap.empty) {
        console.log("[stockpileSlice] No active pile found for this vendor.");
        toast("No active pile found for this vendor.");
        return { pileItems: [], stockpileExpiry: null };
      }

      const spDoc = spSnap.docs[0];
      const spData = spDoc.data();
      console.log("[stockpileSlice] Fetched stockpile doc:", spDoc.id, spData);

      // If no orders yet
      if (!spData.orderIds || spData.orderIds.length === 0) {
        console.log(
          "[stockpileSlice] No orders array found in this stockpile."
        );
        toast("No orders in this stockpile yet.");
        return { pileItems: [], stockpileExpiry: null };
      }

      // If there's an endDate (Timestamp), parse it
      let expiry = null;
      if (spData.endDate) {
        expiry = spData.endDate.toDate(); // Convert from Timestamp
        console.log("[stockpileSlice] Stockpile endDate:", expiry);
      }

      let allItems = [];

      // For each order
      for (const oid of spData.orderIds) {
        console.log("[stockpileSlice] Fetching order doc:", oid);
        const orderSnap = await getDoc(doc(db, "orders", oid));
        if (!orderSnap.exists()) {
          console.warn("[stockpileSlice] Order doc does not exist:", oid);
          continue;
        }

        const orderData = orderSnap.data();
        if (orderData.progressStatus === "Declined") {
          console.log(`[stockpileSlice] Skipping declined order: ${oid}`);
          continue;
        }
        if (!Array.isArray(orderData.cartItems)) {
          console.warn(
            "[stockpileSlice] orderData.cartItems is missing or not an array for order:",
            oid
          );
          continue;
        }

        // For each cartItem, fetch product doc
        for (const item of orderData.cartItems) {
          if (!item.productId) {
            console.warn(
              "[stockpileSlice] cartItem is missing productId:",
              item
            );
            continue;
          }

          console.log(
            "[stockpileSlice] Fetching product doc for:",
            item.productId
          );
          const productSnap = await getDoc(doc(db, "products", item.productId));
          if (!productSnap.exists()) {
            console.warn(
              "[stockpileSlice] Product doc not found for ID:",
              item.productId
            );
            continue;
          }

          const productData = productSnap.data();
          console.log("[stockpileSlice] Product data fetched:", productData);

          // --------------------------
          // Decide which image to use:
          // --------------------------
          let itemImages = [];
          let variantImages = [];

          // 1) Check for subProductId
          let subProduct = null;
          if (item.subProductId && productData.subProducts) {
            subProduct = productData.subProducts.find(
              (sp) => sp.subProductId === item.subProductId
            );
            if (subProduct?.images?.length) {
              itemImages.push(...subProduct.images);
            }
          }

          // 2) Check for variantAttributes
          if (item.variantAttributes) {
            const variantAttrs = item.variantAttributes;
            // If subProduct has variants, use them; else fallback to productData.variants
            const variantsSource = subProduct?.variants
              ? subProduct.variants
              : productData.variants;

            if (variantsSource) {
              const matchedVariant = variantsSource.find((v) => {
                // e.g. v.attributes = { color: ..., size: ... }
                if (!v.attributes) return false;
                return Object.keys(variantAttrs).every(
                  (key) => variantAttrs[key] === v.attributes[key]
                );
              });
              if (matchedVariant?.images?.length) {
                variantImages.push(...matchedVariant.images);
              }
            }
          }

          // Remove duplicates by combining
          itemImages = itemImages.concat(
            variantImages.filter((img) => !itemImages.includes(img))
          );

          // 3) Fallback if no images from subProduct or variant
          if (itemImages.length === 0 && productData.imageUrls?.length) {
            itemImages.push(...productData.imageUrls);
          }

          // 4) If still empty, fallback to coverImageUrl or placeholder
          if (itemImages.length === 0) {
            itemImages.push(
              productData.coverImageUrl || "https://via.placeholder.com/80"
            );
          }

          // Finally pick the first image
          const finalImage = itemImages[0];

          // Build the final cart item
          const finalItem = {
            ...item,
            name: productData.name || "Unknown",
            imageUrl: finalImage,
          };

          console.log(
            "[stockpileSlice] Final cart item with product data:",
            finalItem
          );
          allItems.push(finalItem);
        }
      }

      console.log(
        "[stockpileSlice] Final list of pile items length:",
        allItems.length
      );

      return {
        pileItems: allItems,
        stockpileExpiry: expiry,
      };
    } catch (error) {
      console.error("[stockpileSlice] Error fetching stockpile data:", error);
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

/**
 * The slice:
 * - isActive / vendorId in case you want to track if user is in stockpile mode
 * - pileItems + stockpileExpiry to store modal data
 */
const initialState = {
  isActive: false,
  vendorId: null,
  pileItems: [],
  stockpileExpiry: null,
  loading: false,
  error: null,
};

const stockpileSlice = createSlice({
  name: "stockpile",
  initialState,
  reducers: {
    enterStockpileMode: (state, action) => {
      console.log(
        "[stockpileSlice] enterStockpileMode action:",
        action.payload
      );
      state.isActive = true;
      state.vendorId = action.payload.vendorId;
    },
    exitStockpileMode: (state) => {
      console.log(
        "[stockpileSlice] exitStockpileMode called. Resetting state."
      );
      state.isActive = false;
      state.vendorId = null;
      state.pileItems = [];
      state.stockpileExpiry = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStockpileData.pending, (state) => {
        console.log("[stockpileSlice] fetchStockpileData.pending");
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStockpileData.fulfilled, (state, action) => {
        console.log(
          "[stockpileSlice] fetchStockpileData.fulfilled:",
          action.payload
        );
        state.loading = false;
        if (action.payload) {
          state.pileItems = action.payload.pileItems;
          state.stockpileExpiry = action.payload.stockpileExpiry;
        }
      })
      .addCase(fetchStockpileData.rejected, (state, action) => {
        console.log(
          "[stockpileSlice] fetchStockpileData.rejected with error:",
          action.payload
        );
        state.loading = false;
        state.error = action.payload || "Failed to load stockpile data";
      });
  },
});

export const { enterStockpileMode, exitStockpileMode } = stockpileSlice.actions;
export default stockpileSlice.reducer;
