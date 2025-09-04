import { createSlice } from "@reduxjs/toolkit";

const slice = createSlice({
  name: "scroll",
  initialState: {
    positions: {}, // { [key]: number }
  },
  reducers: {
    saveScroll(state, action) {
      const { key, y = 0 } = action.payload;
      state.positions[key] = y;
    },
    clearScroll(state, action) {
      const { key } = action.payload;
      delete state.positions[key];
    },
  },
});

export const { saveScroll, clearScroll } = slice.actions;
export default slice.reducer;
