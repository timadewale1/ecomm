// src/redux/slices/vendorChatSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase.config";

const PROFILE_CACHE_MS = 5 * 60 * 1000;
const PROFILE_RETRY_MS = 60 * 1000;

// Shared by historical questions and the ongoing inbox's legacy-avatar fallback.
export const fetchCustomerProfile = createAsyncThunk(
  "vendorChats/fetchCustomerProfile",
  async (customerId, { rejectWithValue }) => {
    try {
      const userRef = doc(db, "users", customerId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        // If the user doc does not exist, return a minimal placeholder:
        return { uid: customerId, displayName: "Unknown User", photoURL: null };
      }
      const data = userSnap.data();
      return {
        uid: customerId,
        displayName: data.username || "No Name",
        photoURL: data.photoURL || null,
      };
    } catch (err) {
      console.error("Error fetching customer profile:", err);
      return rejectWithValue(err.message);
    }
  },
  {
    condition: (customerId, { getState }) => {
      if (typeof customerId !== "string" || !customerId.trim() || customerId.includes("/")) return false;
      const request = getState().vendorChats.profileRequests?.[customerId];
      if (request?.status === "loading") return false;
      const age = Date.now() - (request?.updatedAt || 0);
      if (request?.status === "ready" && age < PROFILE_CACHE_MS) return false;
      if (request?.status === "error" && age < PROFILE_RETRY_MS) return false;
      return true;
    },
  },
);

const vendorChatSlice = createSlice({
  name: "vendorChats",
  initialState: {
    profiles: {
      // [uid]: { uid, displayName, photoURL, … }
    },
    profileRequests: {},
    status: "idle", // optional: track overall loading status if desired
    error: null,
  },
  reducers: {
    // We don’t need any “plain” reducers here right now,
    // because the thunk will populate `profiles` via extraReducers.
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomerProfile.pending, (state, action) => {
        state.profileRequests[action.meta.arg] = {
          status: "loading",
          requestId: action.meta.requestId,
          updatedAt: Date.now(),
        };
      })
      .addCase(fetchCustomerProfile.fulfilled, (state, action) => {
        const request = state.profileRequests[action.meta.arg];
        if (request?.requestId !== action.meta.requestId) return;
        const profile = action.payload;
        state.profiles[profile.uid] = profile;
        request.status = "ready";
        request.updatedAt = Date.now();
        state.error = null;
      })
      .addCase(fetchCustomerProfile.rejected, (state, action) => {
        const request = state.profileRequests[action.meta.arg];
        if (request?.requestId !== action.meta.requestId) return;
        request.status = "error";
        request.updatedAt = Date.now();
        state.error = action.payload || "Failed to load customer";
      });
  },
});

export default vendorChatSlice.reducer;
