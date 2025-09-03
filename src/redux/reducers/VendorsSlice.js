import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase.config";

/** Helper that returns vendor docs for a given place type */
const getVendorsByType = async (type) => {
  const snap = await getDocs(
    query(
      collection(db, "vendors"),
      where("marketPlaceType", "==", type),
      where("isApproved", "==", true),
      where("isDeactivated", "==", false)
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/** Counts how many orders a vendor has fulfilled */
const getOrderCount = async (vendorId) => {
  const snap = await getDocs(
    query(collection(db, "orders"), where("vendorId", "==", vendorId))
  );
  return snap.size;
};

/** Fetches local + online vendors, assigns product & order counts, then ranks. */
export const fetchVendorsRanked = createAsyncThunk(
  "vendors/fetchRanked",
  async (_, { rejectWithValue }) => {
    try {
      // 1 ─ grab vendors by type
      const [marketVendors, onlineVendors] = await Promise.all([
        getVendorsByType("marketplace"),
        getVendorsByType("virtual"),
      ]);

      // 2 ─ enrich with counts + score
      const enrich = async (vList) =>
        Promise.all(
          vList.map(async (v) => {
            const productCount = Array.isArray(v.productIds)
              ? v.productIds.length
              : 0;
            const orderCount = await getOrderCount(v.id);
            return {
              ...v,
              productCount,
              orderCount,
              score: productCount + orderCount,
            };
          })
        );

      const [localEnriched, onlineEnriched] = await Promise.all([
        enrich(marketVendors),
        enrich(onlineVendors),
      ]);

      // 3 ─ rank each list:
      //    - vendors with flashSale first
      //    - then by score (desc)
      const bySaleThenScore = (a, b) =>
        Boolean(b.flashSale) - Boolean(a.flashSale) || b.score - a.score;

      localEnriched.sort(bySaleThenScore);
      onlineEnriched.sort(bySaleThenScore);

      return { local: localEnriched, online: onlineEnriched };
    } catch (err) {
      console.error("fetchVendorsRanked:", err);
      return rejectWithValue(err.message);
    }
  }
);

const initialState = {
  local: [],
  online: [],
  isFetched: false,
  status: "idle", // idle | loading | succeeded | failed
  error: null,
};

const vendorsSlice = createSlice({
  name: "vendors",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchVendorsRanked.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchVendorsRanked.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.local = action.payload.local; // already sorted (sales first)
        state.online = action.payload.online; // already sorted (sales first)
        state.isFetched = true;
      })
      .addCase(fetchVendorsRanked.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });
  },
});

export default vendorsSlice.reducer;
