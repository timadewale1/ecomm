// hooks/usePriceLock.js
import React  from "react";
import { useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";

export function usePriceLock(db, buyerId, productId) {
  const [lock, setLock] = React.useState(null);

  React.useEffect(() => {
    if (!db || !buyerId || !productId) { setLock(null); return; }
    const lockRef = doc(db, "priceLocks", `${buyerId}_${productId}`);
    const unsub = onSnapshot(lockRef, (snap) => {
      if (!snap.exists()) return setLock(null);
      const data = snap.data();
      // Only honor ACTIVE & not expired
      const validUntilMs = data.validUntil?.toMillis?.() ?? 0;
      const isActive = data.state === "active" && validUntilMs > Date.now();
      setLock(isActive ? { ...data, validUntilMs } : null);
    }, () => setLock(null));
    return () => unsub();
  }, [db, buyerId, productId]);

  return lock; // null or { effectivePrice, reason, validUntilMs, ... }
}
