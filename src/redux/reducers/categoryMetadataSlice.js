import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { db } from "../../firebase.config";
import { collection, getDocs } from "firebase/firestore";

export const fetchCategoryMetadata = createAsyncThunk(
  "categoryMetadata/fetchCategoryMetadata",
  async (_, { rejectWithValue }) => {
    try {
      console.log("[Thunk] Starting fetchCategoryMetadata");
      const snap = await getDocs(collection(db, "categoryMetadata"));
      if (snap.empty) {
        console.log("[Thunk] No category metadata found.");
        return {};
      }

      const metadata = {};
      snap.forEach((doc) => {
        const data = doc.data();
        metadata[data.categoryName] = {
          id: doc.id,
          categoryName: data.categoryName,
          headerImageUrl: data.headerImageUrl,
          subtitle: data.subtitle,
        };
      });

      console.log("[Thunk] Fetched category metadata:", metadata);
      return metadata;
    } catch (error) {
      console.error("[Thunk] Error in fetchCategoryMetadata:", error);
      return rejectWithValue(error.message);
    }
  }
);

const categoryMetadataSlice = createSlice({
  name: "categoryMetadata",
  initialState: {
    data: {}, // Stores metadata per category: { [categoryName]: { id, categoryName, headerImageUrl, subtitle } }
    loading: false,
    error: null,
  },
  reducers: {
    resetCategoryMetadata(state) {
      console.log("[Slice] Resetting categoryMetadata state");
      state.data = {};
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategoryMetadata.pending, (state) => {
        console.log("[Slice] fetchCategoryMetadata pending...");
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategoryMetadata.fulfilled, (state, action) => {
        console.log("[Slice] fetchCategoryMetadata fulfilled:", action.payload);
        state.data = action.payload;
        state.loading = false;
      })
      .addCase(fetchCategoryMetadata.rejected, (state, action) => {
        console.error(
          "[Slice] fetchCategoryMetadata rejected:",
          action.payload || action.error.message
        );
        state.loading = false;
        state.error = action.payload || action.error.message;
      });
  },
});

export const { resetCategoryMetadata } = categoryMetadataSlice.actions;
export default categoryMetadataSlice.reducer;
