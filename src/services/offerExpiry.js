import { timestampToMillis } from "./priceLocks";

export const OFFER_PRICE_LOCK_DURATION_MS = 24 * 60 * 60 * 1000;

export const getOfferExpiryMs = (offer) => {
  if (!offer) return null;

  const explicitExpiry = timestampToMillis(
    offer.validUntil ?? offer.expiresAt ?? offer.offerExpiresAt,
  );
  if (explicitExpiry) return explicitExpiry;

  const status = String(offer.status || "").toLowerCase();
  if (status === "pending") {
    const placedAt = timestampToMillis(offer.createdAt ?? offer.updatedAt);
    return placedAt ? placedAt + OFFER_PRICE_LOCK_DURATION_MS : null;
  }
  if (status !== "accepted" && status !== "countered") return null;

  const responseTime = timestampToMillis(
    status === "countered"
      ? offer.counteredAt ?? offer.updatedAt
      : offer.acceptedAt ?? offer.updatedAt,
  );

  return responseTime ? responseTime + OFFER_PRICE_LOCK_DURATION_MS : null;
};

export const isOfferExpired = (offer, now = Date.now()) => {
  if (String(offer?.status || "").toLowerCase() === "expired") return true;
  const expiry = getOfferExpiryMs(offer);
  return Boolean(expiry && expiry <= now);
};
