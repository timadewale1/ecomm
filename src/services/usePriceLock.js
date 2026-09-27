// hooks/usePriceLock.js
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import {
  getPriceLockExpiryMs,
  isPriceLockUsable,
} from "./priceLocks";

export function usePriceLock(db, buyerId, productId) {
  const [lock, setLock] = useState(null);

  useEffect(() => {
    if (!db || !buyerId || !productId) { setLock(null); return; }
    const lockRef = doc(db, "priceLocks", `${buyerId}_${productId}`);
    const unsub = onSnapshot(lockRef, (snap) => {
      if (!snap.exists()) return setLock(null);
      const data = snap.data();
      // Only honor ACTIVE & not expired
      const validUntilMs = getPriceLockExpiryMs(data);
      const isActive = data.state === "active" && isPriceLockUsable(data);
      setLock(isActive ? { ...data, validUntilMs } : null);
    }, () => setLock(null));
    return () => unsub();
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
