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
import { auth, db } from "../../firebase.config";
import moment from "moment";
import toast from "react-hot-toast";
import { getStockpileOrderMembership } from "../../services/stockpileOrderStatus";
import {getOrderProductSnapshots} from "../../services/orderProductSnapshots";

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
    const session = auth.currentUser;
    const assertCurrent = () => {
      if (!session?.uid || session.uid !== userId || auth.currentUser !== session) {
        throw Object.assign(new Error("Your account changed. Please reopen your pile."), {code:"auth/session-changed"});
      }
    };
    console.log("[stockpileSlice] fetchStockpileData called with:", {
      userId,
      vendorId,
    });
    try {
      assertCurrent();
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
      assertCurrent();

      if (spSnap.empty) {
        console.log("[stockpileSlice] No active pile found for this vendor.");
        toast("No active pile found for this vendor.");
        return { pileItems: [], pileOrders: [], stockpileExpiry: null };
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
        return { pileItems: [], pileOrders: [], stockpileExpiry: null };
      }

      // If there's an endDate (Timestamp), parse it
      let expiry = null;
      if (spData.endDate) {
        expiry = spData.endDate.toDate(); // Convert from Timestamp
        console.log("[stockpileSlice] Stockpile endDate:", expiry);
      }

      const allItems = [];
      const pileOrders = [];


      const orderSnapshots = [];
      for (let start = 0; start < spData.orderIds.length; start += 20) {
        assertCurrent();
        orderSnapshots.push(...await Promise.all(spData.orderIds.slice(start, start + 20).map(oid=>getDoc(doc(db,"orders",oid)))));
      }
      assertCurrent();
      const orders = orderSnapshots.filter(snap=>snap.exists()).map(snap=>({...snap.data(),id:snap.id}));
      const productViews = await getOrderProductSnapshots(orders);
      assertCurrent();
      for (const orderData of orders) {
        const oid = orderData.id;
        const membershipStatus = getStockpileOrderMembership(orderData);
        const orderItems = [];
        if (!Array.isArray(orderData.cartItems)) {
          console.warn(
            "[stockpileSlice] orderData.cartItems is missing or not an array for order:",
            oid
          );
          pileOrders.push({
            id: oid,
            orderId: orderData.orderId || oid,
            progressStatus: orderData.progressStatus || "Pending",
            vendorStatus: orderData.vendorStatus || null,
            membershipStatus,
            declineReason: orderData.declineReason || null,
            createdAt: orderData.createdAt || null,
            items: [],
          });
          continue;
        }


        // Owned-order fallback is batched; missing listings cannot erase a pile.
        for (const [itemIndex,item] of orderData.cartItems.entries()) {
          const productData = productViews[oid]?.[itemIndex] || item.productSnapshot || {};

          // --------------------------
          // Decide which image to use:
          // --------------------------
          let itemImages = [];
          let variantImages = [];

          // Prefer the immutable order-time image. A live listing can change
          // after the item has already joined the customer's pile.
          if (item.selectedImageUrl) {
            itemImages.push(item.selectedImageUrl);
          } else if (item.productSnapshot?.imageUrl) {
            itemImages.push(item.productSnapshot.imageUrl);
          } else if (item.imageUrl || item.image || productData.imageUrl) {
            itemImages.push(item.imageUrl || item.image || productData.imageUrl);
          }

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
            orderId: oid,
            displayOrderId: orderData.orderId || oid,
            orderProgressStatus: orderData.progressStatus || "Pending",
            orderVendorStatus: orderData.vendorStatus || null,
            stockpileMembershipStatus: membershipStatus,
            declineReason: orderData.declineReason || null,
            name:
              item.name ||
              item.productSnapshot?.name ||
              productData.name ||
              "Item",
            imageUrl: finalImage,
            selectedImageUrl: finalImage,
            unitPrice:
              item.unitPrice ??
              item.productSnapshot?.price ??
              item.price ??
              productData.price ??
              null,
            selectedSize:
              item.selectedSize || item.size || item.variantAttributes?.size,
            selectedColor:
              item.selectedColor || item.color || item.variantAttributes?.color,
            condition:
              item.condition ||
              item.productSnapshot?.condition ||
              productData.condition ||
              null,
            isFashion:
              item.isFashion ??
              item.productSnapshot?.isFashion ??
              productData.isFashion ??
              false,
          };

          console.log(
            "[stockpileSlice] Final cart item with product data:",
            finalItem
          );
          orderItems.push(finalItem);
          allItems.push(finalItem);
        }

        pileOrders.push({
          id: oid,
          orderId: orderData.orderId || oid,
          progressStatus: orderData.progressStatus || "Pending",
          vendorStatus: orderData.vendorStatus || null,
          membershipStatus,
          declineReason: orderData.declineReason || null,
          createdAt: orderData.createdAt || null,
          items: orderItems,
        });
      }

      console.log(
        "[stockpileSlice] Final list of pile items length:",
        allItems.length
      );

      return {
        pileItems: allItems,
        pileOrders,
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
  pileOrders: [],
  stockpileExpiry: null,
  loading: false,
  error: null,
  requestId: null,
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
      state.pileOrders = [];
      state.stockpileExpiry = null;
      state.error = null;
      state.requestId = null;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStockpileData.pending, (state, action) => {
        state.requestId = action.meta.requestId;
        console.log("[stockpileSlice] fetchStockpileData.pending");
        state.loading = true;
        state.error = null;
        state.pileItems = [];
        state.pileOrders = [];
      })
      .addCase(fetchStockpileData.fulfilled, (state, action) => {
        if (state.requestId !== action.meta.requestId || auth.currentUser?.uid !== action.meta.arg.userId) return;
        console.log(
          "[stockpileSlice] fetchStockpileData.fulfilled:",
          action.payload
        );
        state.loading = false;
        if (action.payload) {
          state.pileItems = action.payload.pileItems;
          state.pileOrders = action.payload.pileOrders || [];
          state.stockpileExpiry = action.payload.stockpileExpiry;
        }
      })
      .addCase(fetchStockpileData.rejected, (state, action) => {
        if (state.requestId !== action.meta.requestId || auth.currentUser?.uid !== action.meta.arg.userId) return;
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
