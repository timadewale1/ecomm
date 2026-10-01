// redux/reducers/categoryTypesSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  collection,
  getDocs,
  orderBy,
  limit,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebase.config";

function canonicalCategory(input) {
  const v = String(input || "")
    .trim()
    .toLowerCase();
  if (!v) return "Misc";
  if (["men", "mens", "man"].includes(v)) return "Mens";
  if (["women", "womens", "lady", "ladies"].includes(v)) return "Womens";
  if (["kid", "kids", "children"].includes(v)) return "Kids";
  if (["all"].includes(v)) return "All";
  return String(input).charAt(0).toUpperCase() + String(input).slice(1);
}

/**
 * Fetch distinct product types for a category using the index:
 * - Probe current public items (desc by createdAt), not stale raw samples.
 * - For "All", probe the eligible top-level catalogue, never private 'items'.
 */
export const fetchCategoryProductTypes = createAsyncThunk(
  "categoryTypes/fetch",
  async ({ category, probeLimit = 150 }, { rejectWithValue }) => {
    try {
      const cat = canonicalCategory(category);
      const types = new Set();

      if (cat === "All") {
        // Global: probe recent items from all categories
        const snap = await getDocs(
          query(
            collection(db, "publicProducts"),
            where("vendorEligible", "==", true),
            where("published", "==", true),
            orderBy("createdAt", "desc"),
            limit(probeLimit)
          )
        );
        snap.forEach((d) => {
          const item = d.data();
          if (item.isDeleted === true || item.isUnpublished === true || item.isDeactivated === true || item.deactivated === true) return;
          const t = d.data()?.productType;
          if (t) types.add(String(t));
        });
      } else {
        // Only current public listings may contribute category previews.
        const itemsSnap = await getDocs(
          query(
            collection(db, "publicProducts"),
            where("browseCategory", "==", cat),
            orderBy("createdAt", "desc"),
            limit(probeLimit)
          )
        );
        itemsSnap.forEach((d) => {
          const t = d.data()?.productType;
          if (t) types.add(String(t));
        });
      }

      // sort case-insensitively
      const list = Array.from(types).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" })
      );
      return { category: cat, types: list };
    } catch (err) {
      console.error("fetchCategoryProductTypes error:", err);
      return rejectWithValue(err.message);
    }
  }
);

const slice = createSlice({
  name: "categoryTypes",
  initialState: {
    byCategory: {}, // { [category]: string[] }
    status: "idle",
    error: null,
  },
  reducers: {
    clearCategoryTypes(state, action) {
      const cat = canonicalCategory(action.payload.category);
      delete state.byCategory[cat];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategoryProductTypes.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchCategoryProductTypes.fulfilled, (state, action) => {
        const { category, types } = action.payload;
        state.byCategory[category] = types;
        state.status = "succeeded";
      })
      .addCase(fetchCategoryProductTypes.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message;
      });
  },
});

export const { clearCategoryTypes } = slice.actions;
export default slice.reducer;
