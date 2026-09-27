import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebase.config";
import store from "../../redux/store";
import {
  offerConversationChangesReceived,
  offerConversationsCleared,
  offerConversationsSyncFailed,
  offerConversationsSyncStarted,
} from "../../redux/reducers/offerConversationsSlice";
import { snapshotChanges, snapshotDocument } from "./serializeFirestore";
import { repairOfferConversationAvatars, resetOfferConversationAvatarRepair } from "../offerConversations";

let activeIdentity = null;
let generation = 0;
let unsubscribe = null;
let notificationBaselineReady = false;
let latestEventIds = new Map();

export const stopOfferConversationSync = ({clear = true} = {}) => {
  resetOfferConversationAvatarRepair();
  generation += 1;
  unsubscribe?.();
  unsubscribe = null;
  activeIdentity = null;
  notificationBaselineReady = false;
  latestEventIds = new Map();
  if (clear) store.dispatch(offerConversationsCleared());
};

export const startOfferConversationSync = (uid, role) => {
  const normalizedRole = role === "vendor" ? "vendor" : role === "user" ? "buyer" : null;
  if (!uid || !normalizedRole) {
    stopOfferConversationSync();
    return () => {};
  }
  const identity = `${uid}:${normalizedRole}`;
  if (activeIdentity === identity && unsubscribe) return () => {};

  stopOfferConversationSync({clear: activeIdentity !== identity});
  activeIdentity = identity;
  const listenerGeneration = generation;
  const isCurrent = () =>
    activeIdentity === identity && listenerGeneration === generation;
  store.dispatch(
    offerConversationsSyncStarted({uid, role: normalizedRole}),
  );

  const field = normalizedRole === "vendor" ? "vendorId" : "buyerId";
  let avatarBaselineRefreshed = false;
  const conversationQuery = query(
    collection(db, "offerConversations"),
    where(field, "==", uid),
    orderBy("latestActivityAt", "desc"),
  );
  unsubscribe = onSnapshot(
    conversationQuery,
    {includeMetadataChanges: true},
    (snapshot) => {
      if (!isCurrent()) return;
      const incomingActivity = [];
      snapshot.docChanges().forEach((change) => {
        const conversationId = change.doc.id;
        if (change.type === "removed") {
          latestEventIds.delete(conversationId);
          return;
        }
        const conversation = snapshotDocument(change.doc);
        const event = conversation.latestEvent || {};
        const nextEventId = String(event.id || "");
        const previousEventId = latestEventIds.get(conversationId) || "";
        latestEventIds.set(conversationId, nextEventId);
        if (
          !notificationBaselineReady ||
          !nextEventId ||
          nextEventId === previousEventId ||
          change.doc.metadata.hasPendingWrites
        ) return;

        const actorRole = String(event.actorRole || "");
        const systemUpdateForBoth =
          actorRole === "system" && event.type === "offer_expired";
        if (actorRole === normalizedRole || (actorRole === "system" && !systemUpdateForBoth)) {
          return;
        }
        const counterpart =
          normalizedRole === "buyer" ? conversation.vendor || {} : conversation.buyer || {};
        incomingActivity.push({
          conversationId,
          eventId: nextEventId,
          eventType: event.type || "offer_update",
          preview: event.preview || "New offer activity",
          counterpartName:
            counterpart.displayName ||
            (normalizedRole === "buyer" ? "Vendor" : "Buyer"),
          counterpartAvatar: counterpart.avatarUrl || "",
          role: normalizedRole,
          activityAt: conversation.latestActivityAt || Date.now(),
        });
      });
      store.dispatch(
        offerConversationChangesReceived({
          uid,
          role: normalizedRole,
          changes: snapshotChanges(snapshot),
          fromCache: snapshot.metadata.fromCache,
        }),
      );
      if (!snapshot.metadata.fromCache) {
        const documents = avatarBaselineRefreshed
          ? snapshot.docChanges().filter((change) => change.type !== "removed").map((change) => change.doc)
          : snapshot.docs;
        repairOfferConversationAvatars(documents.map(snapshotDocument));
        avatarBaselineRefreshed = true;
      }
      if (!notificationBaselineReady) {
        notificationBaselineReady = true;
        return;
      }
      incomingActivity.forEach((detail) => {
        window.dispatchEvent(
          new CustomEvent("mythrift:offer-conversation-activity", {detail}),
        );
      });
    },
    (error) => {
      if (!isCurrent()) return;
      console.error("[offer-conversation] list sync failed:", error);
      store.dispatch(
        offerConversationsSyncFailed({
          uid,
          role: normalizedRole,
          message: error.message || "Offer conversations could not sync.",
        }),
      );
    },
  );

  return () => {
    if (isCurrent()) stopOfferConversationSync({clear: false});
  };
};
