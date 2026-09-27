import React from "react";
import { LuCopy, LuExternalLink, LuTruck } from "react-icons/lu";
import toast from "react-hot-toast";
import { appHaptics } from "../../services/haptics";
import { openExternalUrl } from "../../services/nativeLinks";
import "./delivery-tracking-card.css";

const clean = (value) => String(value || "").trim();

const humanStatus = (value) => {
  const status = clean(value).toLowerCase();
  if (status === "in_transit") return "In transit";
  if (status === "delivered") return "Delivered";
  if (status === "booked") return "Courier booked";
  if (status === "booking") return "Booking courier";
  return status
    ? status.replace(/_/g, " ").replace(/^./, (letter) => letter.toUpperCase())
    : "Delivery arranged";
};

export default function DeliveryTrackingCard({
  provider,
  providerLogo,
  status,
  eta,
  trackingUrl,
  trackingCode,
}) {
  const courier = clean(provider) || "Delivery partner";
  const url = clean(trackingUrl);
  const code = clean(trackingCode);

  if (!courier && !url && !code && !status) return null;

  const copyTrackingCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      void appHaptics.success();
      toast.success("Tracking ID copied");
    } catch (_) {
      void appHaptics.error();
      toast.error("Could not copy the tracking ID.");
    }
  };

  return (
    <div className="delivery-tracking-card">
      <div className="delivery-tracking-provider">
        <span className="delivery-tracking-logo" aria-hidden="true">
          {providerLogo ? <img src={providerLogo} alt="" /> : <LuTruck />}
        </span>
        <div>
          <small>Delivery partner</small>
          <strong>{courier}</strong>
          <p>{humanStatus(status)}</p>
        </div>
      </div>

      {eta && (
        <div className="delivery-tracking-eta">
          <span>Estimated delivery</span>
          <strong>{eta}</strong>
        </div>
      )}

      {url ? (
        <button
          type="button"
          className="delivery-tracking-primary"
          onClick={() => {
            void appHaptics.selection();
            void openExternalUrl(url);
          }}
        >
          Track delivery <LuExternalLink aria-hidden="true" />
        </button>
      ) : code ? (
        <>
          <button
            type="button"
            className="delivery-tracking-code"
            onClick={copyTrackingCode}
          >
            <span>
              <small>Tracking ID</small>
              <strong>{code}</strong>
            </span>
            <LuCopy aria-hidden="true" />
          </button>
          <p className="delivery-tracking-help">
            Use this ID when tracking directly with the courier or when
            speaking to their support team.
          </p>
        </>
      ) : (
        <p className="delivery-tracking-help">
          Tracking details will appear here when the courier provides them.
        </p>
      )}
    </div>
  );
}

