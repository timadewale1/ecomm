// recentActivitiesSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase.config';


const PAGE_SIZE = 10;

export const fetchRecentActivities = createAsyncThunk(
  'activities/fetchRecentActivities',
  async ({ vendorId, nextPage, lastDoc }, { rejectWithValue }) => {
    try {
      const activityRef = collection(db, 'vendors', vendorId, 'activityNotes');
      let activitiesQuery;
      if (!nextPage || !lastDoc) {
        // initial fetch
        activitiesQuery = query(
          activityRef,
          orderBy('timestamp', 'desc'),
          limit(PAGE_SIZE)
        );
      } else {
        // paginated fetch using lastDoc
        activitiesQuery = query(
          activityRef,
          orderBy('timestamp', 'desc'),
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        );
      }
      const querySnapshot = await getDocs(activitiesQuery);
      const activities = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      const newLastDoc =
        querySnapshot.docs.length > 0
          ? querySnapshot.docs[querySnapshot.docs.length - 1]
          : null;
      const hasMore = querySnapshot.docs.length === PAGE_SIZE;
      return { activities, lastDoc: newLastDoc, hasMore };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const recentActivitiesSlice = createSlice({
  name: 'activities',
  initialState: {
    activities: [],
    lastDoc: null,
    loading: false,
    error: null,
    hasMore: true,
  },
  reducers: {
    resetActivities: state => {
      state.activities = [];
      state.lastDoc = null;
      state.hasMore = true;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchRecentActivities.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRecentActivities.fulfilled, (state, action) => {
        state.loading = false;
        // If we're paginating, append new activities; otherwise, replace the list
        state.activities = action.meta.arg.nextPage
          ? [...state.activities, ...action.payload.activities]
          : action.payload.activities;
        state.lastDoc = action.payload.lastDoc;
        state.hasMore = action.payload.hasMore;
      })
      .addCase(fetchRecentActivities.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { resetActivities } = recentActivitiesSlice.actions;
export default recentActivitiesSlice.reducer;
