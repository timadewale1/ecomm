// src/store/slices/chatSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db, auth } from "../../firebase.config";
import {getChatParticipantProfile} from "../../services/chatParticipantProfiles";
import {prepareLegacyInquiryView} from "../../services/legacyInquiryAccess";
import {captureChatSession} from "../../services/chatRequestScope.mjs";

// Thunk to fetch inquiry, product, and customer once (for the initial load)
export const fetchInquiryDetails = createAsyncThunk(
  "chat/fetchInquiryDetails",
  async (inquiryId, { dispatch, rejectWithValue }) => {
    try {
      const scope = captureChatSession(() => auth.currentUser);
      await prepareLegacyInquiryView(inquiryId);
      scope.assertCurrent();
      // 1) Get the inquiry document
      const inquiryRef = doc(db, "inquiryViews", inquiryId);
      const inquirySnap = await getDoc(inquiryRef);
      if (!inquirySnap.exists()) {
        return rejectWithValue("Inquiry not found.");
      }
      const inquiryData = { id: inquirySnap.id, ...inquirySnap.data() };

      // 2) Fetch product
      let productData = null;
      const prodRef = doc(db, "publicProducts", inquiryData.productId);
      const prodSnap = await getDoc(prodRef);
      if (prodSnap.exists()) {
        productData = { id: prodSnap.id, ...prodSnap.data() };
      }

      // 3) Fetch customer
      const profile = await getChatParticipantProfile({inquiryId, customerId: inquiryData.customerId});
      scope.assertCurrent();
      const customerData = {...profile, id: profile.uid, username: profile.displayName};

      return { inquiry: inquiryData, product: productData, customer: customerData, ownerUid: scope.uid };
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
    const session = auth.currentUser;
    let active = true;
    const isCurrent = () => active && auth.currentUser === session && Boolean(session?.uid) &&
      getState().chat.ownerUid === session.uid && getState().chat.inquiry?.id === inquiryId;
    // We will set up an onSnapshot listener and dispatch updates
    const inquiryRef = doc(db, "inquiryViews", inquiryId);
    const unsubscribe = onSnapshot(
      inquiryRef,
      (snap) => {
        if (!isCurrent()) return;
        if (snap.exists()) {
          // Every time the inquiry document changes, update the store
          dispatch(chatSlice.actions.inquiryUpdated({ownerUid: session.uid, inquiry: { id: snap.id, ...snap.data() }}));
        } else {
          // Document deleted (or missing)
          dispatch(chatSlice.actions.clearChat());
        }
      },
      (error) => {
        if (!isCurrent()) return;
        console.error("subscribeToInquiry onSnapshot error:", error);
      }
    );

    // Return the unsubscribe function as the “payload” so we can call it later
    return {inquiryId, ownerUid: session?.uid, unsubscribe: () => {active = false; unsubscribe();}};
  }
);

const chatSlice = createSlice({
  name: "chat",
  initialState: {
    ownerUid: null,
    requestId: null,
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
      if (state.ownerUid === action.payload.ownerUid && state.inquiry?.id === action.payload.inquiry.id) state.inquiry = action.payload.inquiry;
    },
    clearChat(state) {
      state.ownerUid = null;
      state.requestId = null;
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
      .addCase(fetchInquiryDetails.pending, (state, action) => {
        state.inquiryUnsubscribe?.();
        state.inquiryUnsubscribe = null;
        state.ownerUid = auth.currentUser?.uid || null;
        state.requestId = action.meta.requestId;
        state.inquiry = null;
        state.product = null;
        state.customer = null;
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInquiryDetails.fulfilled, (state, action) => {
        if (state.requestId !== action.meta.requestId || state.ownerUid !== action.payload.ownerUid || auth.currentUser?.uid !== action.payload.ownerUid) return;
        state.loading = false;
        state.inquiry = action.payload.inquiry;
        state.product = action.payload.product;
        state.customer = action.payload.customer;
      })
      .addCase(fetchInquiryDetails.rejected, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        state.loading = false;
        state.error = action.payload || action.error.message;
      })
      .addCase(subscribeToInquiry.fulfilled, (state, action) => {
        const {ownerUid, inquiryId, unsubscribe} = action.payload;
        if (state.ownerUid !== ownerUid || state.inquiry?.id !== inquiryId || auth.currentUser?.uid !== ownerUid) {
          unsubscribe();
          return;
        }
        // Capture the unsubscribe function so we can clean up later
        state.inquiryUnsubscribe?.();
        state.inquiryUnsubscribe = unsubscribe;
      });
    // We could also handle subscribeToInquiry.pending/rejected if desired
  },
});

export const { inquiryUpdated, clearChat, setInquiryUnsubscribe } = chatSlice.actions;
export default chatSlice.reducer;
