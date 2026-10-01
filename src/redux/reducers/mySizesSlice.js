import { createSlice } from "@reduxjs/toolkit";
import { clearHomeFeedSnapshot } from "../actions/homeFeedSnapshot";
import {
  createEmptyMySizesProfiles,
  getMySizes,
  getMySizesErrorMessage,
  MY_SIZES_SCHEMA_VERSION,
  normalizeMySizesProfiles,
  saveMySizes,
} from "../../services/mySizes";
import { similarItemsCacheCleared } from "./similarItemsSlice";

const makeInitialState = () => ({
  ownerUid: null,
  schemaVersion: MY_SIZES_SCHEMA_VERSION,
  profiles: createEmptyMySizesProfiles(),
  status: "idle",
  error: null,
  requestId: null,
  lastFetchedAt: null,
  saveStatus: "idle",
  saveError: null,
  saveRequestId: null,
  rollbackProfiles: null,
});

let requestSequence = 0;
const createRequestId = (prefix) => {
  requestSequence += 1;
  return `${prefix}-${Date.now()}-${requestSequence}`;
};

const ensureOwner = (state, uid) => {
  if (state.ownerUid === uid) return;
  Object.assign(state, makeInitialState(), { ownerUid: uid });
};

const mySizesSlice = createSlice({
  name: "mySizes",
  initialState: makeInitialState(),
  reducers: {
    ownerChanged(state, { payload: uid }) {
      if (!uid) {
        Object.assign(state, makeInitialState());
        return;
      }
      ensureOwner(state, uid);
    },
    loadStarted(state, { payload }) {
      ensureOwner(state, payload.uid);
      state.requestId = payload.requestId;
      state.status = state.lastFetchedAt ? "refreshing" : "loading";
      state.error = null;
    },
    loadSucceeded(state, { payload }) {
      if (
        state.ownerUid !== payload.uid ||
        state.requestId !== payload.requestId
      ) {
        return;
      }
      state.schemaVersion = payload.sizing.schemaVersion;
      state.profiles = normalizeMySizesProfiles(payload.sizing.profiles);
      state.status = "ready";
      state.error = null;
      state.requestId = null;
      state.lastFetchedAt = Date.now();
    },
    loadFailed(state, { payload }) {
      if (
        state.ownerUid !== payload.uid ||
        state.requestId !== payload.requestId
      ) {
        return;
      }
      state.status = state.lastFetchedAt ? "ready" : "error";
      state.error = payload.message;
      state.requestId = null;
    },
    saveStarted(state, { payload }) {
      ensureOwner(state, payload.uid);
      // A refresh started before this write must never be allowed to replace
      // the successfully saved choices when its slower response arrives.
      state.requestId = null;
      if (state.status === "loading" || state.status === "refreshing") {
        state.status = state.lastFetchedAt ? "ready" : "idle";
      }
      state.rollbackProfiles = normalizeMySizesProfiles(state.profiles);
      state.profiles = normalizeMySizesProfiles(payload.profiles);
      state.saveStatus = "saving";
      state.saveError = null;
      state.saveRequestId = payload.requestId;
    },
    saveSucceeded(state, { payload }) {
      if (
        state.ownerUid !== payload.uid ||
        state.saveRequestId !== payload.requestId
      ) {
        return;
      }
      state.schemaVersion = payload.sizing.schemaVersion;
      state.profiles = normalizeMySizesProfiles(payload.sizing.profiles);
      state.saveStatus = "ready";
      state.saveError = null;
      state.saveRequestId = null;
      state.rollbackProfiles = null;
      state.lastFetchedAt = Date.now();
    },
    saveFailed(state, { payload }) {
      if (
        state.ownerUid !== payload.uid ||
        state.saveRequestId !== payload.requestId
      ) {
        return;
      }
      if (state.rollbackProfiles) {
        state.profiles = normalizeMySizesProfiles(state.rollbackProfiles);
      }
      state.saveStatus = "error";
      state.saveError = payload.message;
      state.saveRequestId = null;
      state.rollbackProfiles = null;
    },
    cleared(state) {
      Object.assign(state, makeInitialState());
    },
  },
});

export const {
  ownerChanged: mySizesOwnerChanged,
  loadStarted: mySizesLoadStarted,
  loadSucceeded: mySizesLoadSucceeded,
  loadFailed: mySizesLoadFailed,
  saveStarted: mySizesSaveStarted,
  saveSucceeded: mySizesSaveSucceeded,
  saveFailed: mySizesSaveFailed,
  cleared: mySizesCleared,
} = mySizesSlice.actions;

export const fetchMySizes =
  ({ uid, force = false } = {}) =>
  async (dispatch, getState) => {
    if (!uid) return null;

    const current = getState().mySizes;
    if (
      current?.ownerUid === uid &&
      (current.status === "loading" || current.status === "refreshing")
    ) {
      return null;
    }
    if (!force && current?.ownerUid === uid && current?.lastFetchedAt) {
      return current.profiles;
    }

    const requestId = createRequestId("load");
    dispatch(mySizesLoadStarted({ uid, requestId }));

    try {
      const sizing = await getMySizes();
      dispatch(mySizesLoadSucceeded({ uid, requestId, sizing }));
      return sizing;
    } catch (error) {
      const message = getMySizesErrorMessage(error, "load");
      dispatch(mySizesLoadFailed({ uid, requestId, message }));
      throw error;
    }
  };

export const persistMySizes =
  ({ uid, profiles } = {}) =>
  async (dispatch, getState) => {
    if (!uid) throw new Error("A signed-in account is required.");

    const current = getState().mySizes;
    if (current?.ownerUid === uid && current.saveStatus === "saving") {
      throw new Error("Your sizes are already being saved.");
    }

    const requestId = createRequestId("save");
    const normalizedProfiles = normalizeMySizesProfiles(profiles);
    dispatch(
      mySizesSaveStarted({ uid, requestId, profiles: normalizedProfiles }),
    );

    try {
      const sizing = await saveMySizes(normalizedProfiles);
      const activeSave = getState().mySizes;
      const stillOwnsRequest = Boolean(
        activeSave?.ownerUid === uid &&
          activeSave?.saveRequestId === requestId,
      );
      dispatch(mySizesSaveSucceeded({ uid, requestId, sizing }));
      // A response belonging to an account that has since signed out or been
      // replaced must not evict the newly active account's cached feeds.
      if (stillOwnsRequest) {
        dispatch(clearHomeFeedSnapshot());
        dispatch(similarItemsCacheCleared());
      }
      return sizing;
    } catch (error) {
      const message = getMySizesErrorMessage(error, "save");
      dispatch(mySizesSaveFailed({ uid, requestId, message }));
      throw error;
    }
  };

export const selectMySizesState = (state) => state.mySizes;

export default mySizesSlice.reducer;
