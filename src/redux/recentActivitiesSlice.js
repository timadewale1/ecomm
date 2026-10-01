import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
} from "firebase/firestore";
import { db } from "../firebase.config";

export const RECENT_ACTIVITY_CACHE_TTL_MS = 60 * 1000;
const PAGE_SIZE = 10;

const makeInitialState = () => ({
  ownerVendorId: null,
  activities: [],
  lastDoc: null,
  status: "idle",
  error: null,
  hasMore: true,
  paginationReady: false,
  lastFetchedAt: null,
  activeRequestId: null,
});

const timestampToMillis = (value) => {
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (Number.isFinite(Number(value?.seconds))) {
    return (
      Number(value.seconds) * 1000 +
      Number(value.nanoseconds || 0) / 1e6
    );
  }
  const parsed = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeActivity = (snapshot) => {
  const data = snapshot.data();
  const { timestamp, ...serializableData } = data;
  return {
    id: snapshot.id,
    ...serializableData,
    timestampMs: timestampToMillis(timestamp),
  };
};

const mergeUniqueActivities = (current, incoming) => {
  const byId = new Map();
  [...current, ...incoming].forEach((activity) => {
    if (activity?.id) byId.set(activity.id, activity);
  });
  return [...byId.values()].sort(
    (first, second) =>
      Number(second.timestampMs || 0) - Number(first.timestampMs || 0),
  );
};

export const fetchRecentActivities = createAsyncThunk(
  "activities/fetchRecentActivities",
  async ({ vendorId, nextPage = false, lastDoc }, { rejectWithValue }) => {
    try {
      const activityRef = collection(db, "vendors", vendorId, "activityNotes");
      const constraints = [orderBy("timestamp", "desc")];
      if (nextPage && lastDoc) constraints.push(startAfter(lastDoc));
      constraints.push(limit(PAGE_SIZE));

      const querySnapshot = await getDocs(query(activityRef, ...constraints));
      return {
        activities: querySnapshot.docs.map(normalizeActivity),
        lastDoc:
          querySnapshot.docs.length > 0
            ? querySnapshot.docs[querySnapshot.docs.length - 1]
            : null,
        hasMore: querySnapshot.docs.length === PAGE_SIZE,
      };
    } catch (error) {
      return rejectWithValue(
        error?.message || "Recent activity could not be loaded.",
      );
    }
  },
  {
    condition: ({ vendorId }, { getState }) => {
      const state = getState().activities;
      return !(
        state.ownerVendorId === vendorId &&
        ["loading", "refreshing", "loadingMore"].includes(state.status)
      );
    },
  },
);

const recentActivitiesSlice = createSlice({
  name: "activities",
  initialState: makeInitialState(),
  reducers: {
    resetActivities(state) {
      Object.assign(state, makeInitialState());
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRecentActivities.pending, (state, action) => {
        const { vendorId, nextPage } = action.meta.arg;
        if (state.ownerVendorId !== vendorId) {
          Object.assign(state, makeInitialState(), { ownerVendorId: vendorId });
        }
        state.activeRequestId = action.meta.requestId;
        state.status = nextPage
          ? "loadingMore"
          : state.activities.length
            ? "refreshing"
            : "loading";
        state.error = null;
      })
      .addCase(fetchRecentActivities.fulfilled, (state, action) => {
        const { vendorId, nextPage } = action.meta.arg;
        if (
          state.ownerVendorId !== vendorId ||
          state.activeRequestId !== action.meta.requestId
        ) {
          return;
        }

        state.activities = nextPage
          ? mergeUniqueActivities(state.activities, action.payload.activities)
          : action.payload.activities;
        state.lastDoc = action.payload.lastDoc;
        state.hasMore = action.payload.hasMore;
        state.paginationReady = true;
        state.status = "ready";
        state.error = null;
        state.activeRequestId = null;
        if (!nextPage) state.lastFetchedAt = Date.now();
      })
      .addCase(fetchRecentActivities.rejected, (state, action) => {
        if (action.meta.condition) return;
        if (
          state.ownerVendorId !== action.meta.arg.vendorId ||
          state.activeRequestId !== action.meta.requestId
        ) {
          return;
        }
        state.status = state.activities.length ? "ready" : "error";
        state.error = action.payload || "Recent activity could not be loaded.";
        state.activeRequestId = null;
      });
  },
});

export const { resetActivities } = recentActivitiesSlice.actions;
export default recentActivitiesSlice.reducer;
