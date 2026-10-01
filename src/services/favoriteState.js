import { httpsCallable } from "firebase/functions";
import { doc, getDocFromServer } from "firebase/firestore";
import { auth, db, functions } from "../firebase.config";

const transientCodes = new Set([
  "functions/aborted",
  "functions/cancelled",
  "functions/deadline-exceeded",
  "functions/internal",
  "functions/unavailable",
  "aborted",
  "cancelled",
  "deadline-exceeded",
  "internal",
  "unavailable",
]);

const pause = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const retryable = (error) => transientCodes.has(String(error?.code || "")) ||
  (error?.code === "functions/resource-exhausted" && !error?.details?.retryAfterMs);

const checkOwner = (uid) => {
  if (!uid || auth.currentUser?.uid !== uid || auth.currentUser?.isAnonymous) {
    const error = new Error("Please sign in again to update saved items.");
    error.code = "functions/unauthenticated";
    throw error;
  }
};

const callIdempotently = async (callable, payload, uid) => {
  await auth.authStateReady();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    checkOwner(uid);
    try {
      const response = await callable(payload);
      checkOwner(uid);
      if (response?.data?.ok !== true) {
        const error = new Error("Saved items could not be updated.");
        error.code = "functions/internal";
        throw error;
      }
      return response;
    } catch (error) {
      checkOwner(uid);
      if (attempt >= 2) throw error;
      if (error?.code === "functions/unauthenticated" && attempt === 0) await auth.currentUser.getIdToken(true);
      else if (retryable(error)) await pause(500 * (3 ** attempt) + Math.random() * 250);
      else throw error;
    }
  }
};

const setFavoriteStateCallable = httpsCallable(
  functions,
  "setFavoriteStateV1",
  { timeout: 20000 },
);
const mergeGuestFavoritesCallable = httpsCallable(
  functions,
  "mergeGuestFavoritesV1",
);

export const setFavoriteState = async ({ productId, liked, uid, clientSessionId, sequence }) => {
  try {
    const response = await callIdempotently(setFavoriteStateCallable, {
      productId, liked: Boolean(liked), clientSessionId, sequence,
    }, uid);
    return response.data;
  } catch (error) {
    // A lost HTTP response does not prove a failed write. Read the canonical
    // membership/count on an uncertain outcome before reverting the UI.
    if (retryable(error) && auth.currentUser?.uid === uid) {
      try {
        const [favorite, product] = await Promise.all([
          getDocFromServer(doc(db, "users", uid, "favorites", productId)),
          getDocFromServer(doc(db, "publicProducts", productId)),
        ]);
        checkOwner(uid);
        error.favoriteState = {
          liked: favorite.exists(), wishCount: product.data()?.wishCount ?? null,
          favoriteCountUpdatedAtMs: product.data()?.favoriteCountUpdatedAt?.toMillis?.() || 0,
        };
        if (favorite.exists() === Boolean(liked)) return { ok: true, ...error.favoriteState };
      } catch {
        // Keep the original request error; never report an unverified save.
      }
    }
    throw error;
  }
};

export const mergeGuestFavorites = async (products, uid) => {
  const items = (Array.isArray(products) ? products : []).map((product) => ({
    productId: product?.id || product?.productId || "",
    name: product?.name || "",
    price: Number(product?.price || 0),
  }));
  const response = await callIdempotently(mergeGuestFavoritesCallable, { items }, uid);
  return response?.data || {};
};

export const favoriteStateErrorMessage = (
  error,
  fallback = "Your saved items could not be updated. Please try again.",
) => {
  if (error?.code === "functions/unauthenticated") {
    return "Please sign in again to update saved items.";
  }
  if (error?.code === "functions/not-found") {
    return "This item is no longer available.";
  }
  if (error?.code === "functions/resource-exhausted") {
    return "Saved items are busy right now. Please wait a little and try again.";
  }
  if (error?.code === "functions/permission-denied") return "Your saved items could not be updated. Please sign in again.";
  if (transientCodes.has(String(error?.code || ""))) return "Couldn't save that change right now. Please check your connection and try again.";
  return fallback;
};
