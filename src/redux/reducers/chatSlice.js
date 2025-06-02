// src/store/slices/chatSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db, auth } from "../../firebase.config";

// Thunk to fetch inquiry, product, and customer once (for the initial load)
export const fetchInquiryDetails = createAsyncThunk(
  "chat/fetchInquiryDetails",
  async (inquiryId, { dispatch, rejectWithValue }) => {
    try {
      // 1) Get the inquiry document
      const inquiryRef = doc(db, "inquiries", inquiryId);
      const inquirySnap = await getDoc(inquiryRef);
      if (!inquirySnap.exists()) {
        return rejectWithValue("Inquiry not found.");
      }
      const inquiryData = { id: inquirySnap.id, ...inquirySnap.data() };

      // 2) Fetch product
      let productData = null;
      const prodRef = doc(db, "products", inquiryData.productId);
      const prodSnap = await getDoc(prodRef);
      if (prodSnap.exists()) {
        productData = { id: prodSnap.id, ...prodSnap.data() };
      }

      // 3) Fetch customer
      let customerData = null;
      const custRef = doc(db, "users", inquiryData.customerId);
      const custSnap = await getDoc(custRef);
      if (custSnap.exists()) {
        customerData = { id: custSnap.id, ...custSnap.data() };
      }

      return { inquiry: inquiryData, product: productData, customer: customerData };
    } catch (err) {
      console.error("fetchInquiryDetails error:", err);
      return rejectWithValue(err.message);
    }
  }
);

// Thunk to subscribe to real‐time changes on the inquiry document
export const subscribeToInquiry = createAsyncThunk(
  "chat/subscribeToInquiry",
  (inquiryId, { dispatch, getState }) => {
    // We will set up an onSnapshot listener and dispatch updates
    const inquiryRef = doc(db, "inquiries", inquiryId);
    const unsubscribe = onSnapshot(
      inquiryRef,
      (snap) => {
        if (snap.exists()) {
          // Every time the inquiry document changes, update the store
          dispatch(chatSlice.actions.inquiryUpdated({ id: snap.id, ...snap.data() }));
        } else {
          // Document deleted (or missing)
          dispatch(chatSlice.actions.clearChat());
        }
      },
      (error) => {
        console.error("subscribeToInquiry onSnapshot error:", error);
      }
    );

    // Return the unsubscribe function as the “payload” so we can call it later
    return unsubscribe;
  }
);

const chatSlice = createSlice({
  name: "chat",
  initialState: {
    inquiry: null,
    product: null,
    customer: null,
    loading: false,
    error: null,
    // We will store the unsubscribe function here if we need to tear it down
    inquiryUnsubscribe: null,
  },
  reducers: {
    inquiryUpdated(state, action) {
      // Update the inquiry sub‐object in the store
      state.inquiry = action.payload;
    },
    clearChat(state) {
      state.inquiry = null;
      state.product = null;
      state.customer = null;
      state.error = null;
      state.loading = false;
      // If there is an open listener, call it
      if (typeof state.inquiryUnsubscribe === "function") {
        state.inquiryUnsubscribe();
      }
      state.inquiryUnsubscribe = null;
    },
    setInquiryUnsubscribe(state, action) {
      state.inquiryUnsubscribe = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInquiryDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInquiryDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.inquiry = action.payload.inquiry;
        state.product = action.payload.product;
        state.customer = action.payload.customer;
      })
      .addCase(fetchInquiryDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })
      .addCase(subscribeToInquiry.fulfilled, (state, action) => {
        // Capture the unsubscribe function so we can clean up later
        state.inquiryUnsubscribe = action.payload;
      });
    // We could also handle subscribeToInquiry.pending/rejected if desired
  },
});

export const { inquiryUpdated, clearChat, setInquiryUnsubscribe } = chatSlice.actions;
export default chatSlice.reducer;
