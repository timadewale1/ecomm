// src/redux/slices/vendorChatSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase.config";

// Thunk to load a single customer’s profile if we don’t already have it in state
export const fetchCustomerProfile = createAsyncThunk(
  "vendorChats/fetchCustomerProfile",
  async (customerId, { getState, rejectWithValue }) => {
    const state = getState();
    // If we already have this customer in the cache, bail out immediately:
    if (state.vendorChats.profiles[customerId]) {
      return state.vendorChats.profiles[customerId];
    }

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
        // Add any other fields you need here, e.g. username, etc.
      };
    } catch (err) {
      console.error("Error fetching customer profile:", err);
      return rejectWithValue(err.message);
    }
  }
);

const vendorChatSlice = createSlice({
  name: "vendorChats",
  initialState: {
    profiles: {
      // [uid]: { uid, displayName, photoURL, … }
    },
    status: "idle", // optional: track overall loading status if desired
    error: null,
  },
  reducers: {
    // We don’t need any “plain” reducers here right now,
    // because the thunk will populate `profiles` via extraReducers.
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomerProfile.fulfilled, (state, action) => {
        const profile = action.payload;
        state.profiles[profile.uid] = profile;
      })
      .addCase(fetchCustomerProfile.rejected, (state, action) => {
        state.error = action.payload || "Failed to load customer";
      });
    // If you want to track `fetchCustomerProfile.pending` to set state.status = 'loading', you can add that here.
  },
});

export default vendorChatSlice.reducer;
