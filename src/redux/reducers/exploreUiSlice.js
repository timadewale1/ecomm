// src/redux/reducers/exploreUiSlice.js
import { createSlice } from "@reduxjs/toolkit";

const exploreUiSlice = createSlice({
  name: "exploreUi",
  initialState: {
    selectedType: null,        // e.g. "Jeans"
    selectedSubType: null,     // e.g. "Slim"
    selectedPrice: null,       // the priceRange label, or null
    scrollY: 0,                // last scroll offset
  },
  reducers: {
    saveExploreUi(state, action) {
      return { ...state, ...action.payload };
    },
    clearExploreUi() {
      return {
        selectedType: null,
        selectedSubType: null,
        selectedPrice: null,
        scrollY: 0,
      };
    },
  },
});

export const { saveExploreUi, clearExploreUi } = exploreUiSlice.actions;
export default exploreUiSlice.reducer;
