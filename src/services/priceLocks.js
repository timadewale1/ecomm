const INVALID_LOCK_STATES = new Set([
  "cancelled",
  "consumed",
  "expired",
  "revoked",
  "superseded",
]);

const finitePrice = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

/**
 * Supports live Firestore Timestamps, cached timestamp objects, Date values,
 * millisecond/second numbers, and ISO date strings.
 */
export const timestampToMillis = (value) => {
  if (!value) return null;

  if (typeof value.toMillis === "function") {
    const millis = Number(value.toMillis());
    return Number.isFinite(millis) ? millis : null;
  }

  if (value instanceof Date) {
    const millis = value.getTime();
    return Number.isFinite(millis) ? millis : null;
  }

  if (typeof value === "object") {
    const seconds = Number(value.seconds ?? value._seconds);
    if (Number.isFinite(seconds)) {
      const nanoseconds = Number(value.nanoseconds ?? value._nanoseconds ?? 0);
      return (
        seconds * 1_000 +
        (Number.isFinite(nanoseconds) ? nanoseconds / 1e6 : 0)
      );
    }
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return value > 0 && value < 1e11 ? value * 1_000 : value;
  }

  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : null;
};

export const getPriceLockExpiryMs = (lock) => {
  if (!lock) return null;
  return timestampToMillis(
    lock.expiresAt ??
      lock.validUntil ??
      lock.validUntilMs ??
      lock.offerExpiresAt ??
      lock.endsAt,
  );
};

export const isPriceLockUsable = (lock, now = Date.now()) => {
  if (!lock) return false;

  const state = String(lock.state ?? lock.status ?? "").toLowerCase();
  if (INVALID_LOCK_STATES.has(state)) return false;

  const hasExpiry =
    lock.expiresAt != null ||
    lock.validUntil != null ||
    lock.validUntilMs != null ||
    lock.offerExpiresAt != null ||
    lock.endsAt != null;
  const expiryMs = getPriceLockExpiryMs(lock);

  // This mirrors processOrder: a lock without an expiry is accepted for
  // backwards compatibility, but a supplied/unreadable or elapsed expiry is
  // never allowed to alter the displayed price.
  if (hasExpiry && (!expiryMs || expiryMs <= now)) return false;
  return true;
};

/**
 * One canonical client-side price decision for Cart and Checkout. The server
 * remains authoritative when the order preview is created.
 */
export const resolveEffectiveUnitPrice = ({
  product,
  lock,
  basePrice,
  now = Date.now(),
}) => {
  const base = finitePrice(basePrice) ?? finitePrice(product?.price) ?? 0;
  const itemLockedPrice = finitePrice(product?.lockedPrice);
  const itemExpiry = timestampToMillis(product?.offerExpiresAt);

  if (
    itemLockedPrice != null &&
    (!product?.offerExpiresAt || (itemExpiry && itemExpiry > now))
  ) {
    return { unitPrice: itemLockedPrice, source: "item.lockedPrice", base };
  }

  if (!isPriceLockUsable(lock, now)) {
    return {
      unitPrice: base,
      source: lock ? "base.expired-or-invalid-lock" : "base",
      base,
    };
  }

  const effectivePrice = finitePrice(lock?.effectivePrice);
  if (effectivePrice != null) {
    return { unitPrice: effectivePrice, source: "lock.effectivePrice", base };
  }

  const subProductPrice = product?.subProductId
    ? finitePrice(lock?.subProducts?.[product.subProductId])
    : null;
  if (subProductPrice != null) {
    return {
      unitPrice: subProductPrice,
      source: `lock.subProducts[${product.subProductId}]`,
      base,
    };
  }

  if (product?.selectedColor && product?.selectedSize && lock?.variants) {
    const variantKey = `${product.selectedColor}|${product.selectedSize}`;
    const variantPrice = finitePrice(lock.variants[variantKey]);
    if (variantPrice != null) {
      return {
        unitPrice: variantPrice,
        source: `lock.variants[${variantKey}]`,
        base,
      };
    }
  }

  const fallbackLockPrice = finitePrice(lock?.price);
  if (fallbackLockPrice != null) {
    return { unitPrice: fallbackLockPrice, source: "lock.price", base };
  }

  return { unitPrice: base, source: "base", base };
};

export const getNextPriceLockExpiryMs = (locks, now = Date.now()) => {
  const expiries = Object.values(locks || {})
    .map(getPriceLockExpiryMs)
    .filter((expiry) => Number.isFinite(expiry) && expiry > now);

  return expiries.length ? Math.min(...expiries) : null;
};
