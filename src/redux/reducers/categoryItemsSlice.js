// redux/reducers/categoryItemsSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  collection,
  collectionGroup,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
} from "firebase/firestore";
import { db } from "../../firebase.config";

function canonicalCategory(input) {
  const v = String(input || "").trim().toLowerCase();
  if (!v) return "Misc";
  if (["men", "mens", "man"].includes(v)) return "Mens";
  if (["women", "womens", "lady", "ladies"].includes(v)) return "Womens";
  if (["kid", "kids", "children"].includes(v)) return "Kids";
  if (["all"].includes(v)) return "All";
  return String(input).charAt(0).toUpperCase() + String(input).slice(1);
}

/**
 * Fetch items from the categories index.
 * If category === "All": use collectionGroup('items') for a global feed.
 * Otherwise: use /categories/{cat}/items.
 */
export const fetchCategoryItems = createAsyncThunk(
  "categoryItems/fetch",
  async (
    { category, productType = null, lastCursor = null, pageSize = 50 },
    { rejectWithValue }
  ) => {
    try {
      const cat = canonicalCategory(category);

      const filters = [orderBy("createdAt", "desc")];
      if (productType) {
        // equality filter is supported with orderBy on a different field
        filters.unshift(where("productType", "==", productType));
      }

      let qRef;
      if (cat === "All") {
        // global view across all categories
        qRef = query(collectionGroup(db, "items"), ...filters, limit(pageSize));
      } else {
        // specific category
        qRef = query(
          collection(db, "categories", cat, "items"),
          ...filters,
          limit(pageSize)
        );
      }

      if (lastCursor) {
        qRef = query(qRef, startAfter(lastCursor));
      }

      const snap = await getDocs(qRef);
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const newCursor = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;

      return { category: cat, items, lastCursor: newCursor };
    } catch (err) {
      console.error("fetchCategoryItems error:", err);
      return rejectWithValue(err.message);
    }
  }
);

const categoryItemsSlice = createSlice({
  name: "categoryItems",
  initialState: {
    byCategory: {}, // { [category]: { items, lastCursor, status, error } }
  },
  reducers: {
    resetCategoryItems(state, action) {
      const cat = canonicalCategory(action.payload.category);
      state.byCategory[cat] = {
        items: [],
        lastCursor: null,
        status: "idle",
        error: null,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategoryItems.pending, (state, action) => {
        const cat = canonicalCategory(action.meta.arg.category);
        if (!state.byCategory[cat]) {
          state.byCategory[cat] = {
            items: [],
            lastCursor: null,
            status: "loading",
            error: null,
          };
        } else {
          state.byCategory[cat].status = "loading";
          state.byCategory[cat].error = null;
        }
      })
      .addCase(fetchCategoryItems.fulfilled, (state, action) => {
        const { category, items, lastCursor } = action.payload;
        if (!state.byCategory[category]) {
          state.byCategory[category] = {
            items: [],
            lastCursor: null,
            status: "idle",
            error: null,
          };
        }
        const bucket = state.byCategory[category];
        const seen = new Set(bucket.items.map((i) => i.id));
        const unique = items.filter((i) => !seen.has(i.id));
        bucket.items = bucket.items.concat(unique);
        bucket.lastCursor = lastCursor;
        bucket.status = "succeeded";
      })
      .addCase(fetchCategoryItems.rejected, (state, action) => {
        const cat = canonicalCategory(action.meta.arg.category);
        if (!state.byCategory[cat]) {
          state.byCategory[cat] = {
            items: [],
            lastCursor: null,
            status: "failed",
            error: action.payload || action.error.message,
          };
        } else {
          state.byCategory[cat].status = "failed";
          state.byCategory[cat].error =
            action.payload || action.error.message;
        }
      });
  },
});

export const { resetCategoryItems } = categoryItemsSlice.actions;
export default categoryItemsSlice.reducer;
