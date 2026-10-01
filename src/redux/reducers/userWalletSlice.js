import { createSlice } from "@reduxjs/toolkit";

const makeInitialState = () => ({
  ownerUid: null,
  balance: 0,
  accountNumber: "",
  bankName: "",
  walletSetup: false,
  snapshotStatus: "idle",
  snapshotError: null,
  initialSnapshotReceived: false,
  transactions: [],
  transactionsStatus: "idle",
  transactionsError: null,
  transactionsRequestId: null,
  transactionsLastCompletedRequestId: null,
  transactionsLastFetchedAt: null,
  entryAnimationPlayed: false,
});

const ensureOwner = (state, uid) => {
  if (state.ownerUid === uid) return;
  Object.assign(state, makeInitialState(), { ownerUid: uid });
};

const slice = createSlice({
  name: "userWallet",
  initialState: makeInitialState(),
  reducers: {
    liveSyncStarted(state, { payload: uid }) {
      ensureOwner(state, uid);
      state.snapshotStatus = state.initialSnapshotReceived ? "ready" : "connecting";
      state.snapshotError = null;
    },
    snapshotReceived(state, { payload }) {
      if (state.ownerUid !== payload.uid) return;
      state.balance = Number(payload.balance) || 0;
      state.accountNumber = payload.accountNumber || "";
      state.bankName = payload.bankName || "";
      state.walletSetup = payload.walletSetup === true;
      state.snapshotStatus = "ready";
      state.snapshotError = null;
      state.initialSnapshotReceived = true;
    },
    snapshotFailed(state, { payload }) {
      if (state.ownerUid !== payload.uid) return;
      state.snapshotStatus = state.initialSnapshotReceived ? "ready" : "error";
      state.snapshotError = payload.message;
    },
    transactionsFetchStarted(state, { payload }) {
      ensureOwner(state, payload.uid);
      state.transactionsRequestId = payload.requestId;
      state.transactionsStatus = state.transactions.length ? "refreshing" : "loading";
      state.transactionsError = null;
    },
    transactionsReceived(state, { payload }) {
      if (
        state.ownerUid !== payload.uid ||
        state.transactionsRequestId !== payload.requestId
      ) {
        return;
      }
      state.transactions = payload.transactions;
      state.transactionsStatus = "ready";
      state.transactionsError = null;
      state.transactionsRequestId = null;
      state.transactionsLastCompletedRequestId = payload.requestId;
      state.transactionsLastFetchedAt = Date.now();
    },
    transactionsEnriched(state, { payload }) {
      if (
        state.ownerUid !== payload.uid ||
        state.transactionsLastCompletedRequestId !== payload.requestId
      ) {
        return;
      }
      state.transactions = payload.transactions;
    },
    transactionsFetchFailed(state, { payload }) {
      if (
        state.ownerUid !== payload.uid ||
        state.transactionsRequestId !== payload.requestId
      ) {
        return;
      }
      state.transactionsStatus = state.transactions.length ? "ready" : "error";
      state.transactionsError = payload.message;
      state.transactionsRequestId = null;
    },
    entryAnimationCompleted(state, { payload: uid }) {
      if (state.ownerUid === uid) state.entryAnimationPlayed = true;
    },
    cleared(state) {
      Object.assign(state, makeInitialState());
    },
  },
});

export const {
  liveSyncStarted: userWalletLiveSyncStarted,
  snapshotReceived: userWalletSnapshotReceived,
  snapshotFailed: userWalletSnapshotFailed,
  transactionsFetchStarted: userWalletTransactionsFetchStarted,
  transactionsReceived: userWalletTransactionsReceived,
  transactionsEnriched: userWalletTransactionsEnriched,
  transactionsFetchFailed: userWalletTransactionsFetchFailed,
  entryAnimationCompleted: userWalletEntryAnimationCompleted,
  cleared: userWalletCleared,
} = slice.actions;

export const selectUserWallet = (state) => state.userWallet;
export const selectUserWalletTransactions = (state) =>
  state.userWallet.transactions;
export const selectUserWalletTransactionsStatus = (state) =>
  state.userWallet.transactionsStatus;

export default slice.reducer;
