import { createSlice } from "@reduxjs/toolkit";

const vendorProfileSlice = createSlice({
  name: "vendorProfile",
  initialState: {
    data: null,
    loading: false,
  },
  reducers: {
    setVendorProfile: (state, action) => {
      const data = action.payload;

      // Convert Firestore Timestamp to a serializable format
      if (data.createdSince && data.createdSince.toDate) {
        data.createdSince = data.createdSince.toDate().toISOString();
      }

      state.data = data;
    },
    clearVendorProfile: (state) => {
      state.data = null; // Clear the vendor profile data
    },
    setLoading: (state, action) => {
      state.loading = action.payload; // Set loading state
    },
  },
});

export const { setVendorProfile, clearVendorProfile, setLoading } =
  vendorProfileSlice.actions;

export default vendorProfileSlice.reducer;
