import { createEntityAdapter, createSlice } from "@reduxjs/toolkit";

const createdTime = (order) => Number(order?.createdAt || order?.updatedAt || 0);
const ordersAdapter = createEntityAdapter({
  sortComparer: (first, second) => createdTime(second) - createdTime(first),
});
const draftsAdapter = createEntityAdapter({
  sortComparer: (first, second) => createdTime(second) - createdTime(first),
});

const makeInitialState = () => ({
  ownerUid: null,
  orders: ordersAdapter.getInitialState(),
  drafts: draftsAdapter.getInitialState(),
  status: "idle",
  draftsStatus: "idle",
  error: null,
  initialOrdersSnapshotReceived: false,
  initialDraftsSnapshotReceived: false,
  serverConfirmed: false,
  lastSyncedAt: null,
  sourceRevision: 0,
  ordersRevision: 0,
  draftsRevision: 0,
  displayOrders: [],
  displayDrafts: [],
  projectionStatus: "idle",
  projectionError: null,
  projectedOrdersRevision: -1,
  projectedDraftsRevision: -1,
});

const initialState = makeInitialState();

const slice = createSlice({
  name: "buyerOrders",
  initialState,
  reducers: {
    syncStarted(state, { payload: uid }) {
      if (state.ownerUid !== uid) {
        ordersAdapter.removeAll(state.orders);
        draftsAdapter.removeAll(state.drafts);
        Object.assign(state, makeInitialState(), { ownerUid: uid });
      }
      state.status = state.orders.ids.length ? "refreshing" : "connecting";
      state.draftsStatus = state.drafts.ids.length ? "refreshing" : "connecting";
      state.error = null;
    },
    orderChangesReceived(state, { payload }) {
      if (state.ownerUid !== payload.uid) return;
      payload.changes.forEach((change) => {
        if (change.type === "removed") ordersAdapter.removeOne(state.orders, change.id);
        else ordersAdapter.upsertOne(state.orders, change.data);
      });
      state.status = "ready";
      state.error = null;
      state.initialOrdersSnapshotReceived = true;
      state.serverConfirmed = !payload.fromCache;
      state.lastSyncedAt = Date.now();
      state.sourceRevision += 1;
      state.ordersRevision += 1;
    },
    draftChangesReceived(state, { payload }) {
      if (state.ownerUid !== payload.uid) return;
      payload.changes.forEach((change) => {
        if (change.type === "removed") draftsAdapter.removeOne(state.drafts, change.id);
        else draftsAdapter.upsertOne(state.drafts, change.data);
      });
      state.draftsStatus = "ready";
      state.error = null;
      state.initialDraftsSnapshotReceived = true;
      state.lastSyncedAt = Date.now();
      state.sourceRevision += 1;
      state.draftsRevision += 1;
    },
    serverOrdersReplaced(state, { payload }) {
      if (state.ownerUid !== payload.uid) return;
      ordersAdapter.setAll(state.orders, payload.documents);
      state.status = "ready";
      state.initialOrdersSnapshotReceived = true;
      state.serverConfirmed = true;
      state.sourceRevision += 1;
      state.ordersRevision += 1;
      state.lastSyncedAt = Date.now();
    },
    serverDraftsReplaced(state, { payload }) {
      if (state.ownerUid !== payload.uid) return;
      draftsAdapter.setAll(state.drafts, payload.documents);
      state.draftsStatus = "ready";
      state.initialDraftsSnapshotReceived = true;
      state.sourceRevision += 1;
      state.draftsRevision += 1;
      state.lastSyncedAt = Date.now();
    },
    expiredDraftsPruned(state, { payload: now }) {
      const expiredIds = state.drafts.ids.filter((id) => {
        const expiresAt = Number(state.drafts.entities[id]?.expiresAt || 0);
        return expiresAt > 0 && expiresAt <= now;
      });
      if (expiredIds.length) {
        draftsAdapter.removeMany(state.drafts, expiredIds);
        state.sourceRevision += 1;
        state.draftsRevision += 1;
      }
    },
    projectionStarted(state) {
      state.projectionStatus = state.displayOrders.length || state.displayDrafts.length
        ? "refreshing"
        : "loading";
      state.projectionError = null;
    },
    ordersProjectionReceived(state, { payload }) {
      if (payload.revision < state.projectedOrdersRevision) return;
      state.displayOrders = payload.orders;
      state.projectedOrdersRevision = payload.revision;
      state.projectionStatus = "ready";
      state.projectionError = null;
    },
    draftsProjectionReceived(state, { payload }) {
      if (payload.revision < state.projectedDraftsRevision) return;
      state.displayDrafts = payload.drafts;
      state.projectedDraftsRevision = payload.revision;
      state.projectionStatus = "ready";
      state.projectionError = null;
    },
    projectionFailed(state, { payload }) {
      state.projectionStatus = state.displayOrders.length || state.displayDrafts.length
        ? "ready"
        : "error";
      state.projectionError = payload;
    },
    displayOrderPatched(state, { payload }) {
      state.displayOrders = state.displayOrders.map((order) => {
        const matches = payload.stockpileDocId
          ? order.stockpileDocId === payload.stockpileDocId
          : order.id === payload.id;
        return matches ? { ...order, ...payload.changes } : order;
      });
    },
    displayOrderReplaced(state, { payload }) {
      state.displayOrders = state.displayOrders.map((order) => {
        const matches = payload.order.stockpileDocId
          ? order.stockpileDocId === payload.order.stockpileDocId
          : order.id === payload.order.id;
        return matches ? payload.order : order;
      });
    },
    syncFailed(state, { payload }) {
      if (state.ownerUid !== payload.uid) return;
      state.status = state.orders.ids.length ? "ready" : "error";
      state.error = payload.message;
    },
    cleared(state) {
      Object.assign(state, makeInitialState());
    },
  },
});

export const {
  syncStarted: buyerOrdersSyncStarted,
  orderChangesReceived: buyerOrderChangesReceived,
  draftChangesReceived: buyerDraftChangesReceived,
  serverOrdersReplaced: buyerServerOrdersReplaced,
  serverDraftsReplaced: buyerServerDraftsReplaced,
  expiredDraftsPruned,
  projectionStarted: buyerOrdersProjectionStarted,
  ordersProjectionReceived,
  draftsProjectionReceived,
  projectionFailed: buyerOrdersProjectionFailed,
  displayOrderPatched,
  displayOrderReplaced,
  syncFailed: buyerOrdersSyncFailed,
  cleared: buyerOrdersCleared,
} = slice.actions;

const rawOrderSelectors = ordersAdapter.getSelectors((state) => state.buyerOrders.orders);
const rawDraftSelectors = draftsAdapter.getSelectors((state) => state.buyerOrders.drafts);
export const selectRawBuyerOrders = rawOrderSelectors.selectAll;
export const selectRawBuyerDrafts = rawDraftSelectors.selectAll;
export const selectBuyerOrdersStatus = (state) => state.buyerOrders.status;
export const selectBuyerDraftsStatus = (state) => state.buyerOrders.draftsStatus;
export const selectBuyerOrdersSourceRevision = (state) => state.buyerOrders.sourceRevision;
export const selectBuyerOrdersRevision = (state) => state.buyerOrders.ordersRevision;
export const selectBuyerDraftsRevision = (state) => state.buyerOrders.draftsRevision;
export const selectBuyerProjectedOrdersRevision = (state) =>
  state.buyerOrders.projectedOrdersRevision;
export const selectBuyerProjectedDraftsRevision = (state) =>
  state.buyerOrders.projectedDraftsRevision;
export const selectBuyerDisplayOrders = (state) => state.buyerOrders.displayOrders;
export const selectBuyerDisplayDrafts = (state) => state.buyerOrders.displayDrafts;
export const selectBuyerOrdersProjectionStatus = (state) => state.buyerOrders.projectionStatus;
export const selectBuyerOrdersProjectionError = (state) => state.buyerOrders.projectionError;

export default slice.reducer;
