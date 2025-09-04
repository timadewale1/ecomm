// redux/reducers/categoryTypesSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  orderBy,
  limit,
  query,
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
 * - Try doc('categories', cat).sample[]
 * - Probe first N items (desc by createdAt) to broaden coverage
 * - For "All", read from collectionGroup('items')
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
            collectionGroup(db, "items"),
            orderBy("createdAt", "desc"),
            limit(probeLimit)
          )
        );
        snap.forEach((d) => {
          const t = d.data()?.productType;
          if (t) types.add(String(t));
        });
      } else {
        // 1) sample on the category doc
        const catSnap = await getDoc(doc(db, "categories", cat));
        if (catSnap.exists()) {
          const sample = Array.isArray(catSnap.data()?.sample)
            ? catSnap.data().sample
            : [];
          for (const s of sample) {
            if (s?.productType) types.add(String(s.productType));
          }
        }

        // 2) probe first N items to broaden
        const itemsSnap = await getDocs(
          query(
            collection(db, "categories", cat, "items"),
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
