// hooks/usePriceLock.js
import { useEffect, useState } from "react";
import { collection, query, where, limit, onSnapshot } from "firebase/firestore";
import {
  getPriceLockExpiryMs,
  isPriceLockUsable,
} from "./priceLocks";

export function usePriceLock(db, buyerId, productId) {
  const [lock, setLock] = useState(null);

  useEffect(() => {
    if (!db || !buyerId || !productId) { setLock(null); return; }
    // An owner-filtered query can subscribe before a lock exists, without
    // permitting reads of guessed documents belonging to another buyer.
    const lockQuery = query(collection(db, "priceLocks"), where("buyerId", "==", buyerId),
      where("productId", "==", productId), limit(1));
    let active = true;
    setLock(null);
    const unsub = onSnapshot(lockQuery, (snap) => {
      if (!active) return;
      if (snap.empty) return setLock(null);
      const data = snap.docs[0].data();
      // Only honor ACTIVE & not expired
      const validUntilMs = getPriceLockExpiryMs(data);
      const isActive = data.state === "active" && isPriceLockUsable(data);
      setLock(isActive ? { ...data, validUntilMs } : null);
    }, () => {if (active) setLock(null);});
    return () => {active = false; unsub();};
  }, [db, buyerId, productId]);

  useEffect(() => {
    const expiryMs = getPriceLockExpiryMs(lock);
    if (!expiryMs) return undefined;

    const remaining = expiryMs - Date.now();
    if (remaining <= 0) {
      setLock(null);
      return undefined;
    }

    const timer = window.setTimeout(
      () => setLock(null),
      Math.min(2_147_000_000, remaining + 25),
    );
    return () => window.clearTimeout(timer);
  }, [lock]);

  return lock; // null or { effectivePrice, reason, validUntilMs, ... }
}
