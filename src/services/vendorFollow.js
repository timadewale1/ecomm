import { collection, getDocs, limit, onSnapshot, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions } from "../firebase.config";

const activeMutations = new Map();
const setFollow = httpsCallable(functions, "setVendorFollowStateV1");
const countFollowers = httpsCallable(functions, "getVendorFollowerCountV1");

function requireSession(userId, session = auth.currentUser) {
  if (!session || session.isAnonymous || session.uid !== userId || auth.currentUser !== session) {
    throw new Error("Your account changed. Please sign in and try again.");
  }
  return session;
}

// Owner-filtered queries also work before the relationship exists. A direct
// missing-document get cannot prove ownership to the security rules.
export const vendorFollowQuery = (userId, vendorId) => query(
  collection(db, "follows"), where("userId", "==", userId),
  where("vendorId", "==", vendorId), limit(1),
);

export async function getVendorFollowState(userId, vendorId) {
  const session = requireSession(userId);
  const snapshot = await getDocs(vendorFollowQuery(userId, vendorId));
  requireSession(userId, session);
  return !snapshot.empty;
}

export function subscribeVendorFollow(userId, vendorId, onValue, onError) {
  const session = auth.currentUser;
  if (!session || session.isAnonymous || session.uid !== userId) {
    onValue(false);
    return () => {};
  }
  return onSnapshot(vendorFollowQuery(userId, vendorId), snapshot => {
    if (auth.currentUser === session) onValue(!snapshot.empty);
  }, error => {
    if (auth.currentUser === session) onError?.(error);
  });
}

export async function getVendorFollowerCount(vendorId) {
  if (!vendorId) throw new Error("Vendor ID is missing.");
  return (await countFollowers({vendorId})).data.count;
}

/** Explicit intents are serialized per account/store; identical in-flight
 * requests share one result. The server transaction owns limits and writes. */
export async function setVendorFollowState({ userId, vendorId, shouldFollow }) {
  const session = requireSession(userId);
  if (!vendorId) throw new Error("Vendor ID is missing.");
  const key = `${userId}_${vendorId}`;
  const requestedState = Boolean(shouldFollow);
  const active = activeMutations.get(key);
  if (active?.session === session && active.shouldFollow === requestedState) return active.promise;
  const promise = (async () => {
    if (active) {
      try { await active.promise; } catch { /* A failed intent must not block the next one. */ }
    }
    requireSession(userId, session);
    const {data} = await setFollow({vendorId, shouldFollow:requestedState});
    requireSession(userId, session);
    return data;
  })();
  activeMutations.set(key, {shouldFollow:requestedState, session, promise});
  try { return await promise; }
  finally { if (activeMutations.get(key)?.promise === promise) activeMutations.delete(key); }
}
