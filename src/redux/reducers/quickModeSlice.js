import { createSlice } from "@reduxjs/toolkit";

const quickModeSlice = createSlice({
  name: "quickMode",
  initialState: {
    isActive: false,
    vendorId: null,
  },
  reducers: {
    activateQuickMode: (state, action) => {
      state.isActive = true;
      state.vendorId = action.payload;
    },
    deactivateQuickMode: (state) => {
      state.isActive = false;
      state.vendorId = null;
    },
  },
});

export const { activateQuickMode, deactivateQuickMode } =
  quickModeSlice.actions;

export const selectQuickMode = (state) => state.quickMode; 

export default quickModeSlice.reducer;
