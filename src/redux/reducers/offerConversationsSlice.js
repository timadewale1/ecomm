import { createEntityAdapter, createSelector, createSlice } from "@reduxjs/toolkit";

const activityTime = (conversation) =>
  Number(conversation?.latestActivityAt || conversation?.updatedAt || 0);

const adapter = createEntityAdapter({
  sortComparer: (first, second) => activityTime(second) - activityTime(first),
});

const initialState = adapter.getInitialState({
  ownerUid: null,
  ownerRole: null,
  status: "idle",
  error: null,
  initialSnapshotReceived: false,
  lastSyncedAt: null,
});

const slice = createSlice({
  name: "offerConversations",
  initialState,
  reducers: {
    syncStarted(state, {payload}) {
      if (state.ownerUid !== payload.uid || state.ownerRole !== payload.role) {
        adapter.removeAll(state);
        state.ownerUid = payload.uid;
        state.ownerRole = payload.role;
        state.initialSnapshotReceived = false;
      }
      state.status = state.ids.length ? "refreshing" : "connecting";
      state.error = null;
    },
    changesReceived(state, {payload}) {
      if (state.ownerUid !== payload.uid || state.ownerRole !== payload.role) return;
      payload.changes.forEach((change) => {
        if (change.type === "removed") adapter.removeOne(state, change.id);
        else adapter.upsertOne(state, change.data);
      });
      state.status = "ready";
      state.error = null;
      state.initialSnapshotReceived = true;
      state.lastSyncedAt = Date.now();
    },
    syncFailed(state, {payload}) {
      if (state.ownerUid !== payload.uid || state.ownerRole !== payload.role) return;
      state.status = state.ids.length ? "ready" : "error";
      state.error = payload.message;
    },
    cleared(state) {
      adapter.removeAll(state);
      Object.assign(state, {
        ownerUid: null,
        ownerRole: null,
        status: "idle",
        error: null,
        initialSnapshotReceived: false,
        lastSyncedAt: null,
      });
    },
  },
});

export const {
  syncStarted: offerConversationsSyncStarted,
  changesReceived: offerConversationChangesReceived,
  syncFailed: offerConversationsSyncFailed,
  cleared: offerConversationsCleared,
} = slice.actions;

const selectors = adapter.getSelectors((state) => state.offerConversations);
export const selectOfferConversations = selectors.selectAll;
export const selectOfferConversationById = selectors.selectById;
export const selectOfferConversationsStatus = (state) =>
  state.offerConversations.status;
export const selectOfferConversationsError = (state) =>
  state.offerConversations.error;
export const selectOfferConversationUnreadCount = createSelector(
  selectOfferConversations,
  (state) => state.offerConversations.ownerRole,
  (conversations, role) =>
    conversations.reduce(
      (total, conversation) =>
        total +
        Number(
          role === "vendor"
            ? conversation.vendorUnreadCount || 0
            : conversation.buyerUnreadCount || 0,
        ),
      0,
    ),
);

export default slice.reducer;
