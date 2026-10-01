import { createEntityAdapter, createSelector, createSlice } from "@reduxjs/toolkit";

const activityTime = (offer) =>
  Number(
    offer?.updatedAt ||
      offer?.counteredAt ||
      offer?.acceptedAt ||
      offer?.declinedAt ||
      offer?.createdAt ||
      0,
  );

const adapter = createEntityAdapter({
  sortComparer: (first, second) => activityTime(second) - activityTime(first),
});

const initialState = adapter.getInitialState({
  ownerUid: null,
  status: "idle",
  error: null,
  initialSnapshotReceived: false,
  serverConfirmed: false,
  lastSyncedAt: null,
  revision: 0,
});

const slice = createSlice({
  name: "buyerOffers",
  initialState,
  reducers: {
    syncStarted(state, { payload: uid }) {
      if (state.ownerUid !== uid) {
        adapter.removeAll(state);
        state.ownerUid = uid;
        state.initialSnapshotReceived = false;
        state.serverConfirmed = false;
        state.revision = 0;
      }
      state.status = state.ids.length ? "refreshing" : "connecting";
      state.error = null;
    },
    changesReceived(state, { payload }) {
      if (state.ownerUid !== payload.uid) return;
      payload.changes.forEach((change) => {
        if (change.type === "removed") adapter.removeOne(state, change.id);
        else adapter.upsertOne(state, change.data);
      });
      state.status = "ready";
      state.error = null;
      state.initialSnapshotReceived = true;
      state.serverConfirmed = !payload.fromCache;
      state.lastSyncedAt = Date.now();
      state.revision += 1;
    },
    serverSnapshotReplaced(state, { payload }) {
      if (state.ownerUid !== payload.uid) return;
      adapter.setAll(state, payload.documents);
      state.status = "ready";
      state.error = null;
      state.initialSnapshotReceived = true;
      state.serverConfirmed = true;
      state.lastSyncedAt = Date.now();
      state.revision += 1;
    },
    offerPatched(state, { payload }) {
      adapter.updateOne(state, { id: payload.id, changes: payload.changes });
    },
    syncFailed(state, { payload }) {
      if (state.ownerUid !== payload.uid) return;
      state.status = state.ids.length ? "ready" : "error";
      state.error = payload.message;
    },
    cleared(state) {
      adapter.removeAll(state);
      Object.assign(state, {
        ownerUid: null,
        status: "idle",
        error: null,
        initialSnapshotReceived: false,
        serverConfirmed: false,
        lastSyncedAt: null,
        revision: 0,
      });
    },
  },
});

export const {
  syncStarted: buyerOffersSyncStarted,
  changesReceived: buyerOfferChangesReceived,
  serverSnapshotReplaced: buyerOffersServerSnapshotReplaced,
  offerPatched: buyerOfferPatched,
  syncFailed: buyerOffersSyncFailed,
  cleared: buyerOffersCleared,
} = slice.actions;

const selectors = adapter.getSelectors((state) => state.buyerOffers);
export const selectBuyerOffers = selectors.selectAll;
export const selectBuyerOfferById = selectors.selectById;
export const selectBuyerOffersStatus = (state) => state.buyerOffers.status;
export const selectBuyerOffersError = (state) => state.buyerOffers.error;
export const selectUnreadBuyerOfferCount = createSelector(
  selectBuyerOffers,
  (offers) => {
    const unreadThreads = new Set();
    offers.forEach((offer) => {
      if (offer.buyerRead === false) {
        unreadThreads.add(`${offer.vendorId || "vendor"}__${offer.productId || "product"}`);
      }
    });
    return unreadThreads.size;
  },
);

export default slice.reducer;

