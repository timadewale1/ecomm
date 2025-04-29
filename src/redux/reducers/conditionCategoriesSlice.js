import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
} from "firebase/firestore";
import { db } from "../../firebase.config";

/**
 * Returns ALL distinct productType strings that exist for a condition
 * across approved & active vendors.
 */
export const fetchConditionCategories = createAsyncThunk(
  "conditionCategories/fetch",
  async (condition) => {
    // 1️⃣ Get approved + active vendors
    const vendorSnap = await getDocs(
      query(
        collection(db, "vendors"),
        where("isApproved", "==", true),
        where("isDeactivated", "==", false)
      )
    );
    const vendorIds = vendorSnap.docs.map((d) => d.id);
    const allTypes = new Set();

    // 🔥 Normalize exactly like fetchConditionProducts
    const conditionToQuery =
      condition.toLowerCase() === "defect" ? "Defect:" : condition;

    // 2️⃣ Pull productType only, in 10-vendor batches to dodge the “in ≤10” rule
    for (let i = 0; i < vendorIds.length; i += 10) {
      let cursor = null;
      const batch = vendorIds.slice(i, i + 10);

      do {
        const constraints = [
          where("vendorId", "in", batch),
          where("condition", "==", conditionToQuery),
          where("isDeleted", "==", false),
          where("published", "==", true),
          orderBy("createdAt", "desc"),
          limit(500),
        ];
        if (cursor) constraints.push(startAfter(cursor));

        const q = query(collection(db, "products"), ...constraints);
        const snap = await getDocs(q);

        snap.docs.forEach((d) => {
          allTypes.add(d.data().productType || "Other");
        });
        cursor = snap.docs[snap.docs.length - 1];
      } while (cursor);
    }

    return [...allTypes];
  }
);

const conditionCategoriesSlice = createSlice({
  name: "conditionCategories",
  initialState: { byCondition: {} },
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchConditionCategories.fulfilled, (state, action) => {
      state.byCondition[action.meta.arg] = action.payload;
    });
  },
});

export default conditionCategoriesSlice.reducer;
