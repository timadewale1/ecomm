import { useEffect, useState } from "react";
import { getNextPriceLockExpiryMs } from "../services/priceLocks";

const MAX_TIMEOUT_MS = 2_147_000_000;

/**
 * Firestore TTL deletion is intentionally eventual. This clock forces the UI
 * to stop using a lock at its actual expiry, even if the document remains in
 * an `active` query for hours after that point.
 */
export default function usePriceLockExpiryClock(locksByProduct) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const current = Date.now();
    const nextExpiry = getNextPriceLockExpiryMs(locksByProduct, current);
    if (!nextExpiry) return undefined;

    const delay = Math.min(
      MAX_TIMEOUT_MS,
      Math.max(25, nextExpiry - current + 25),
    );
    const timer = window.setTimeout(() => setNow(Date.now()), delay);
    return () => window.clearTimeout(timer);
  }, [locksByProduct, now]);

  return now;
}
