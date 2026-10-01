import { publicVendorsQuery } from "../../services/publicVendors";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getDocs, where } from "firebase/firestore";

/** Helper that returns vendor docs for a given place type */
const getVendorsByType = async (type) => {
  const snap = await getDocs(
    publicVendorsQuery(
      where("marketPlaceType", "==", type),
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/** Fetches public local + online stores, preserving sale priority and ranking. */
export const fetchVendorsRanked = createAsyncThunk(
  "vendors/fetchRanked",
  async (_, { rejectWithValue }) => {
    try {
      // 1 ─ grab vendors by type
      const [marketVendors, onlineVendors] = await Promise.all([
        getVendorsByType("marketplace"),
        getVendorsByType("virtual"),
      ]);

      const enrich = (vendors) => vendors.map((vendor) => ({
        ...vendor, score: Number(vendor.discoveryScore) || 0,
      }));
      const localEnriched = enrich(marketVendors);
      const onlineEnriched = enrich(onlineVendors);

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
