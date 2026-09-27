import {
  collection,
  doc,
  getCountFromServer,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";

import { db } from "../firebase.config";
import { handleUserActionLimit } from "./userWriteHandler";

const activeMutations = new Map();

const followKey = (userId, vendorId) => `${userId}_${vendorId}`;

export const getVendorFollowerCount = async (vendorId) => {
  if (!vendorId) throw new Error("Vendor ID is missing.");
  const snapshot = await getCountFromServer(
    query(collection(db, "follows"), where("vendorId", "==", vendorId)),
  );
  return snapshot.data().count;
};

/**
 * Set one user's relationship with one vendor to an explicit state.
 *
 * The follows document is the source of truth. The transaction makes retries
 * idempotent: requesting "followed" for an existing document (or "unfollowed"
 * for a missing one) is a successful no-op rather than another counter change.
 * The vendor counter is reconciled by the onFollowChange Cloud Function.
 */
export const setVendorFollowState = async ({ userId, vendorId, shouldFollow }) => {
  if (!userId) throw new Error("You need to be signed in to follow a vendor.");
  if (!vendorId) throw new Error("Vendor ID is missing.");

  const key = followKey(userId, vendorId);
  const requestedState = Boolean(shouldFollow);
  const active = activeMutations.get(key);

  // Share an identical in-flight request across simultaneously mounted entry
  // points. Callers always reconcile their UI from the returned canonical state.
  if (active && active.shouldFollow === requestedState) return active.promise;

  const previousPromise = active?.promise;

  const promise = (async () => {
    // Opposite requests for the same relationship are serialized. This makes
    // the most recent explicit intent win without two transactions racing.
    if (previousPromise) {
      try {
        await previousPromise;
      } catch {
        // A failed earlier request must not permanently block the next intent.
      }
    }

    await handleUserActionLimit(
      userId,
      "follow",
      {},
      {
        collectionName: "usage_metadata",
        writeLimit: 50,
        minuteLimit: 8,
        hourLimit: 40,
      },
    );

    const followRef = doc(db, "follows", key);
    const result = await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(followRef);
      const currentState = snapshot.exists();

      if (currentState === requestedState) {
        return { followed: currentState, changed: false };
      }

      if (requestedState) {
        transaction.set(followRef, {
          userId,
          vendorId,
          createdAt: serverTimestamp(),
        });
      } else {
        transaction.delete(followRef);
      }

      return { followed: requestedState, changed: true };
    });

    console.info("[vendorFollow] mutation complete", {
      vendorId,
      requestedState,
      followed: result.followed,
      changed: result.changed,
    });
    return result;
  })();

  activeMutations.set(key, { shouldFollow: requestedState, promise });

  try {
    return await promise;
  } finally {
    if (activeMutations.get(key)?.promise === promise) activeMutations.delete(key);
  }
};
