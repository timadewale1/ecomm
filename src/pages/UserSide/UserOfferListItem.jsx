import React from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { isOfferExpired } from "../../services/offerExpiry";

const NGN = (value) =>
  Number(value || 0).toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  });

const toDate = (value) => {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const activityDate = (offer) =>
  toDate(
    offer.status === "countered"
      ? offer.counteredAt || offer.updatedAt || offer.createdAt
      : offer.status === "accepted"
        ? offer.acceptedAt || offer.updatedAt || offer.createdAt
        : offer.status === "declined"
          ? offer.declinedAt || offer.updatedAt || offer.createdAt
          : offer.updatedAt || offer.createdAt
  );

const formatActivityTime = (date, now) => {
  if (!date) return "";
  const elapsed = Math.max(0, now - date.getTime());
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === new Date(now).getFullYear() ? undefined : "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function OfferListItem({
  offer,
  now,
  onClick,
  onBuyNow,
  onSendOffer,
  loading = false,
  disabled = false,
}) {
  const status = String(offer.status || "pending").toLowerCase();
  const expired = isOfferExpired(offer, now);
  const sold =
    status === "sold" ||
    ["PRODUCT_SOLD", "product_sold"].includes(
      String(offer.systemReasonCode || offer.expiredReason || ""),
    );
  const stopAndRun = (callback) => (event) => {
    event.stopPropagation();
    callback?.();
  };

  return (
    <article
      className="offer-list-item"
      onClick={() => !disabled && onClick?.()}
      onKeyDown={(event) => {
        if (event.currentTarget !== event.target) return;
        if (!disabled && (event.key === "Enter" || event.key === " ")) onClick?.();
      }}
      role="button"
      tabIndex="0"
      aria-disabled={disabled}
      aria-busy={loading}
    >
      <img
        className="offer-list-image"
        src={offer.productCover || "/placeholder.png"}
        alt={offer.productName || "Offered product"}
      />
      <div className="offer-list-content">
        {loading && (
          <span className="offer-list-opening" role="status">
            <Loader2 aria-hidden="true" /> Opening chat…
          </span>
        )}
        <div className="offer-list-copy">
          <h2>{offer.productName || "Item"}</h2>
          <div className="offer-list-prices">
            {status === "countered" ? (
              <>
                <strong>{NGN(offer.amount)}</strong>
                <ArrowRight aria-hidden="true" />
                <strong>{NGN(offer.counterAmount)}</strong>
              </>
            ) : (
              <>
                <s>{NGN(offer.listPrice)}</s>
                <strong>{NGN(offer.amount)}</strong>
              </>
            )}
          </div>
          <div className="offer-list-meta">
            <span>{offer.vendorShopName || "Vendor"}</span>
            <i aria-hidden="true" />
            <time>{formatActivityTime(activityDate(offer), now)}</time>
          </div>
        </div>

        {!expired && status === "accepted" && (
          <button className="offer-action offer-action-primary offer-action-wide" onClick={stopAndRun(onBuyNow)}>
            Buy Now
          </button>
        )}
        {!expired && status === "countered" && (
          <div className="offer-actions-pair">
            <button className="offer-action offer-action-secondary" onClick={stopAndRun(onSendOffer)}>
              Send Offer
            </button>
            <button className="offer-action offer-action-primary" onClick={stopAndRun(onBuyNow)}>
              Buy Now
            </button>
          </div>
        )}
        {["declined", "superseded"].includes(status) && (
          <button className="offer-action offer-action-primary offer-action-wide" onClick={stopAndRun(onSendOffer)}>
            Increase or send another offer
          </button>
        )}
        {sold && <span className="offer-expired">Item Sold</span>}
        {expired && !sold && (
          <div className="offer-expired-actions">
            <span className="offer-expired">Offer Expired</span>
            <button className="offer-action offer-action-primary" onClick={stopAndRun(onSendOffer)}>
              Send a new offer
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
