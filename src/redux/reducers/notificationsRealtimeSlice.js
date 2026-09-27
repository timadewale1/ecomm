import { createEntityAdapter, createSelector, createSlice } from "@reduxjs/toolkit";

const activityTime = (item) => Number(item?.createdAt || item?.updatedAt || 0);

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
  name: "notificationsRealtime",
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

      const removedIds = [];
      const changedDocuments = [];
      payload.changes.forEach((change) => {
        if (change.type === "removed") removedIds.push(change.id);
        else changedDocuments.push(change.data);
      });

      // A first Firestore snapshot can contain the user's entire notification
      // history. Batch adapter work so its sort comparer runs once instead of
      // re-sorting the growing collection after every individual document.
      if (removedIds.length) adapter.removeMany(state, removedIds);
      if (changedDocuments.length) adapter.upsertMany(state, changedDocuments);

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
    notificationPatched(state, { payload }) {
      adapter.updateOne(state, { id: payload.id, changes: payload.changes });
    },
    notificationRestored(state, { payload }) {
      adapter.upsertOne(state, payload);
    },
    notificationRemoved(state, { payload: id }) {
      adapter.removeOne(state, id);
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
  syncStarted: notificationsSyncStarted,
  changesReceived: notificationChangesReceived,
  serverSnapshotReplaced: notificationServerSnapshotReplaced,
  notificationPatched,
  notificationRestored,
  notificationRemoved,
  syncFailed: notificationsSyncFailed,
  cleared: notificationsCleared,
} = slice.actions;

const selectors = adapter.getSelectors((state) => state.notificationsRealtime);
export const selectNotifications = selectors.selectAll;
export const selectNotificationById = selectors.selectById;
export const selectNotificationsStatus = (state) => state.notificationsRealtime.status;
export const selectNotificationsError = (state) => state.notificationsRealtime.error;
export const selectNotificationsRevision = (state) => state.notificationsRealtime.revision;
export const selectUnreadNotificationsCount = createSelector(
  selectNotifications,
  (notifications) => notifications.filter((item) => item.seen !== true).length,
);
export const selectHasUnreadNotifications = createSelector(
  selectUnreadNotificationsCount,
  (count) => count > 0,
);

export default slice.reducer;
