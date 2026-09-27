import SHA256 from "crypto-js/sha256";
import { httpsCallable } from "firebase/functions";
import { doc, getDoc, getDocFromCache } from "firebase/firestore";
import { auth, db, functions } from "../firebase.config";
import { createChatAvatarRepair } from "./chatAvatarRepair.mjs";

const cleanId = (value) => String(value || "").trim();

export const offerConversationIdFor = (vendorId, buyerId) => {
  const vendor = cleanId(vendorId);
  const buyer = cleanId(buyerId);
  if (!vendor || !buyer) return null;
  return `oc_${SHA256(`${vendor}\u0000${buyer}`).toString().slice(0, 48)}`;
};

const callable = (name) => httpsCallable(functions, name);
const avatarRepair = createChatAvatarRepair({
  getUid: () => auth.currentUser?.uid || null,
  request: (conversationIds) => callable("refreshOfferConversationAvatarsV1")({conversationIds}),
  onError: (error) => console.warn("[offer-conversation] profile image refresh unavailable", {code: error?.code}),
});
export const repairOfferConversationAvatars = avatarRepair.enqueue;
export const resetOfferConversationAvatarRepair = avatarRepair.reset;

const RECOVERABLE_ENSURE_CODES = new Set([
  "internal",
  "deadline-exceeded",
  "network-request-failed",
  "unavailable",
  "unknown",
]);

const firebaseErrorCode = (error) =>
  String(error?.code || "").replace(/^functions\//, "");

const matchingConversation = (snapshot, {conversationId, vendorId, buyerId}) => {
  if (!snapshot?.exists()) return null;
  const conversation = snapshot.data() || {};
  if (
    cleanId(conversation.vendorId) !== cleanId(vendorId) ||
    cleanId(conversation.buyerId) !== cleanId(buyerId)
  ) {
    return null;
  }
  return conversationId;
};

const findExistingConversation = async ({conversationId, vendorId, buyerId}) => {
  if (!conversationId || !vendorId || !buyerId) return null;
  const reference = doc(db, "offerConversations", conversationId);
  const identity = {conversationId, vendorId, buyerId};

  // Conversation list listeners usually leave the document in Firestore's
  // cache. Prefer that zero-network path before asking the server to rebuild a
  // conversation that already exists.
  try {
    const cached = matchingConversation(
      await getDocFromCache(reference),
      identity,
    );
    if (cached) return cached;
  } catch {
    // A cache miss is expected on the first visit.
  }

  try {
    return matchingConversation(await getDoc(reference), identity);
  } catch {
    // The callable remains the compatibility path when the current rules or
    // network cannot serve the direct participant-owned read.
    return null;
  }
};

export const ensureOfferConversation = async (
  offerId,
  {vendorId = null, buyerId = auth.currentUser?.uid || null} = {},
) => {
  const conversationId = offerConversationIdFor(vendorId, buyerId);
  const identity = {conversationId, vendorId, buyerId};
  const existing = await findExistingConversation(identity);
  if (existing) return existing;

  try {
    const result = await callable("ensureOfferConversationV1")({offerId});
    return result.data?.conversationId || null;
  } catch (error) {
    // Callable responses can occasionally be reported as `internal` after the
    // idempotent server transaction committed. Verify the deterministic
    // participant-owned document before showing an error or making the buyer
    // tap the offer again.
    if (conversationId && RECOVERABLE_ENSURE_CODES.has(firebaseErrorCode(error))) {
      await new Promise((resolve) => window.setTimeout(resolve, 180));
      const recovered = await findExistingConversation(identity);
      if (recovered) return recovered;
    }
    throw error;
  }
};

export const hydrateMyOfferConversations = async () => {
  const result = await callable("hydrateMyOfferConversationsV1")({});
  return result.data;
};

export const sendOfferConversationMessage = async ({
  conversationId,
  text,
  clientMessageId,
  replyToMessageId = null,
  replyToQuestionId = null,
}) => {
  const result = await callable("sendOfferConversationMessageV1")({
    conversationId,
    text,
    clientMessageId,
    replyToMessageId,
    replyToQuestionId,
  });
  return result.data;
};

export const markOfferConversationRead = async (conversationId) => {
  const result = await callable("markOfferConversationReadV1")({conversationId});
  return result.data;
};

export const touchOfferConversationPresence = async (conversationId) => {
  const result = await callable("touchOfferConversationPresenceV1")({conversationId});
  return result.data;
};

export const acknowledgeOfferConversationSafety = async (conversationId) => {
  const result = await callable("acknowledgeOfferConversationSafetyV1")({
    conversationId,
  });
  return result.data;
};

export const actOnOfferConversation = async ({
  conversationId,
  offerId,
  action,
  counterAmount,
}) => {
  const result = await callable("actOnOfferConversationV1")({
    conversationId,
    offerId,
    action,
    counterAmount,
  });
  return result.data;
};

export const setOfferConversationBlocked = async (conversationId, blocked) => {
  const result = await callable("setOfferConversationBlockedV1")({
    conversationId,
    blocked,
  });
  return result.data;
};

export const reportOfferConversationMessage = async ({
  conversationId,
  eventId,
  reason,
}) => {
  const result = await callable("reportOfferConversationMessageV1")({
    conversationId,
    eventId,
    reason,
  });
  return result.data;
};

export const createClientMessageId = () => {
  if (typeof window.crypto?.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
};
