import {
  collection,
  doc,
  getDocsFromServer,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "../../firebase.config";
import store from "../../redux/store";
import {
  buyerDraftChangesReceived,
  buyerOrderChangesReceived,
  buyerOrdersCleared,
  buyerOrdersSyncFailed,
  buyerOrdersSyncStarted,
  buyerServerDraftsReplaced,
  buyerServerOrdersReplaced,
  expiredDraftsPruned,
} from "../../redux/reducers/buyerOrdersSlice";
import {
  buyerOfferChangesReceived,
  buyerOffersCleared,
  buyerOffersServerSnapshotReplaced,
  buyerOffersSyncFailed,
  buyerOffersSyncStarted,
} from "../../redux/reducers/buyerOffersSlice";
import {
  notificationChangesReceived,
  notificationServerSnapshotReplaced,
  notificationsCleared,
  notificationsSyncFailed,
  notificationsSyncStarted,
} from "../../redux/reducers/notificationsRealtimeSlice";
import {
  userWalletCleared,
  userWalletLiveSyncStarted,
  userWalletSnapshotFailed,
  userWalletSnapshotReceived,
} from "../../redux/reducers/userWalletSlice";
import { snapshotChanges, snapshotDocument } from "./serializeFirestore";

let activeUid = null;
let generation = 0;
let unsubscribers = [];
let draftPruneTimer = null;

const ordersQuery = (uid) =>
  query(collection(db, "orders"), where("userId", "==", uid));

const draftsQuery = (uid) =>
  query(
    collection(db, "draftOrders"),
    where("ownerId", "==", uid),
    where("status", "==", "PAY_IN_PROGRESS"),
    where("expiresAt", ">", Timestamp.fromMillis(Date.now())),
  );

const offersQuery = (uid) =>
  query(
    collection(db, "offers"),
    where("buyerId", "==", uid),
    orderBy("createdAt", "desc"),
  );

const notificationsQuery = (uid) =>
  query(collection(db, "notifications"), where("userId", "==", uid));

const isMainNotification = (notification) =>
  notification?.type !== "offer-message";

const visibleNotificationChanges = (changes) =>
  changes.flatMap((change) => {
    if (change.type === "removed" || isMainNotification(change.data)) {
      return [change];
    }

    // Treat legacy chat-message documents as removed locally. They remain in
    // Firestore for audit/history purposes, but no longer pollute the main
    // notification list or its unread badge.
    return [{ id: change.id, type: "removed" }];
  });

const clearTimersAndListeners = () => {
  unsubscribers.forEach((unsubscribe) => unsubscribe());
  unsubscribers = [];
  if (draftPruneTimer) window.clearInterval(draftPruneTimer);
  draftPruneTimer = null;
};

export const stopUserRealtimeSync = ({ clear = true } = {}) => {
  generation += 1;
  clearTimersAndListeners();
  activeUid = null;
  if (clear) {
    store.dispatch(buyerOrdersCleared());
    store.dispatch(buyerOffersCleared());
    store.dispatch(notificationsCleared());
    store.dispatch(userWalletCleared());
  }
};

export const startUserRealtimeSync = (uid) => {
  if (!uid) {
    stopUserRealtimeSync();
    return () => {};
  }

  if (activeUid === uid && unsubscribers.length) {
    return () => {};
  }

  stopUserRealtimeSync({ clear: activeUid !== uid });
  activeUid = uid;
  const listenerGeneration = generation;

  store.dispatch(buyerOrdersSyncStarted(uid));
  store.dispatch(buyerOffersSyncStarted(uid));
  store.dispatch(notificationsSyncStarted(uid));
  store.dispatch(userWalletLiveSyncStarted(uid));

  const isCurrent = () =>
    activeUid === uid && listenerGeneration === generation;

  unsubscribers = [
    onSnapshot(
      ordersQuery(uid),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!isCurrent()) return;
        const changes = snapshotChanges(snapshot);
        if (changes.length || !store.getState().buyerOrders.initialOrdersSnapshotReceived) {
          store.dispatch(
            buyerOrderChangesReceived({
              uid,
              changes,
              fromCache: snapshot.metadata.fromCache,
            }),
          );
        }
      },
      (error) => {
        if (!isCurrent()) return;
        console.error("[realtime] buyer orders listener failed:", error);
        store.dispatch(
          buyerOrdersSyncFailed({ uid, message: error.message || "Orders could not sync." }),
        );
      },
    ),
    onSnapshot(
      draftsQuery(uid),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!isCurrent()) return;
        const changes = snapshotChanges(snapshot);
        if (changes.length || !store.getState().buyerOrders.initialDraftsSnapshotReceived) {
          store.dispatch(
            buyerDraftChangesReceived({
              uid,
              changes,
              fromCache: snapshot.metadata.fromCache,
            }),
          );
        }
      },
      (error) => {
        if (!isCurrent()) return;
        console.error("[realtime] buyer draft listener failed:", error);
        store.dispatch(
          buyerOrdersSyncFailed({ uid, message: error.message || "Draft orders could not sync." }),
        );
      },
    ),
    onSnapshot(
      offersQuery(uid),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!isCurrent()) return;
        const changes = snapshotChanges(snapshot);
        if (changes.length || !store.getState().buyerOffers.initialSnapshotReceived) {
          store.dispatch(
            buyerOfferChangesReceived({
              uid,
              changes,
              fromCache: snapshot.metadata.fromCache,
            }),
          );
        }
      },
      (error) => {
        if (!isCurrent()) return;
        console.error("[realtime] buyer offers listener failed:", error);
        store.dispatch(
          buyerOffersSyncFailed({ uid, message: error.message || "Offers could not sync." }),
        );
      },
    ),
    onSnapshot(
      notificationsQuery(uid),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!isCurrent()) return;
        const changes = visibleNotificationChanges(snapshotChanges(snapshot));
        if (changes.length || !store.getState().notificationsRealtime.initialSnapshotReceived) {
          store.dispatch(
            notificationChangesReceived({
              uid,
              changes,
              fromCache: snapshot.metadata.fromCache,
            }),
          );
        }
      },
      (error) => {
        if (!isCurrent()) return;
        console.error("[realtime] notifications listener failed:", error);
        store.dispatch(
          notificationsSyncFailed({
            uid,
            message: error.message || "Notifications could not sync.",
          }),
        );
      },
    ),
    onSnapshot(
      doc(db, "users", uid),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!isCurrent()) return;
        if (!snapshot.exists()) {
          store.dispatch(
            userWalletSnapshotFailed({
              uid,
              message: "User document not found",
            }),
          );
          return;
        }

        const data = snapshot.data();
        store.dispatch(
          userWalletSnapshotReceived({
            uid,
            balance: data.balance,
            accountNumber: data.accountNumber,
            bankName: data.preferredBank,
            walletSetup: data.walletSetup,
          }),
        );
      },
      (error) => {
        if (!isCurrent()) return;
        console.error("[realtime] user wallet listener failed:", error);
        store.dispatch(
          userWalletSnapshotFailed({
            uid,
            message: error.message || "Failed to fetch wallet data",
          }),
        );
      },
    ),
  ];

  draftPruneTimer = window.setInterval(() => {
    if (isCurrent()) store.dispatch(expiredDraftsPruned(Date.now()));
  }, 60_000);
  store.dispatch(expiredDraftsPruned(Date.now()));

  return () => {
    if (isCurrent()) stopUserRealtimeSync({ clear: false });
  };
};

const documentsFromSnapshot = (snapshot) => snapshot.docs.map(snapshotDocument);

export const refreshBuyerOrdersFromServer = async (uid) => {
  const [ordersSnapshot, draftsSnapshot] = await Promise.all([
    getDocsFromServer(ordersQuery(uid)),
    getDocsFromServer(draftsQuery(uid)),
  ]);
  if (activeUid !== uid) return;
  store.dispatch(
    buyerServerOrdersReplaced({ uid, documents: documentsFromSnapshot(ordersSnapshot) }),
  );
  store.dispatch(
    buyerServerDraftsReplaced({ uid, documents: documentsFromSnapshot(draftsSnapshot) }),
  );
  store.dispatch(expiredDraftsPruned(Date.now()));
};

export const refreshBuyerOffersFromServer = async (uid) => {
  const snapshot = await getDocsFromServer(offersQuery(uid));
  if (activeUid !== uid) return;
  store.dispatch(
    buyerOffersServerSnapshotReplaced({ uid, documents: documentsFromSnapshot(snapshot) }),
  );
};

export const refreshNotificationsFromServer = async (uid) => {
  const snapshot = await getDocsFromServer(notificationsQuery(uid));
  if (activeUid !== uid) return;
  store.dispatch(
    notificationServerSnapshotReplaced({
      uid,
      documents: documentsFromSnapshot(snapshot).filter(isMainNotification),
    }),
  );
};
