import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  LuCheck,
  LuAlertCircle,
  LuClock3,
  LuMapPin,
  LuRefreshCw,
  LuShieldCheck,
  LuTruck,
  LuX,
} from "react-icons/lu";
import AppBottomSheet from "../layout/AppBottomSheet";
import NativePickerField from "../Form/NativePickerField";
import LocationPicker from "../Location/LocationPicker";
import { appHaptics } from "../../services/haptics";
import { shareContent } from "../../services/nativeLinks";
import { resumePaystackTransaction } from "../../services/paystackCheckout";
import DeliveryTrackingCard from "./DeliveryTrackingCard";
import CourierReviewSheet from "./CourierReviewSheet";
import { refreshDeliveryTracking } from "../../services/deliveryTracking";
import {
  getStockpileDeliveryState,
  initializeStockpileDeliveryPayment,
  prepareStockpileDelivery,
  selectStockpileDeliveryOption,
} from "../../services/stockpileDelivery";
import "./stockpile-delivery-sheet.css";

const PAYMENT_METHODS = [
  {
    value: "paystack",
    label: "Paystack",
    description: "Pay securely with card or bank transfer",
    icon: "/figma-assets/checkout-paystack.svg",
  },
  {
    value: "wallet",
    label: "My Wallet",
    description: "Use your available My Thrift balance",
    icon: "/figma-assets/checkout-wallet.svg",
  },
  {
    value: "pay for me",
    label: "Pay for me",
    description: "Share a secure payment link",
    icon: "/figma-assets/checkout-pay-for-me.svg",
  },
];

const REFRESHABLE_STATUSES = new Set([
  "closing",
  "preparing_quote",
  "awaiting_delivery_payment",
  "payment_processing",
  "booking",
]);

const COMPLETED_STATUSES = new Set(["booked", "in_transit", "delivered"]);

const formatMoney = (value) =>
  `₦${Number(value || 0).toLocaleString("en-NG", {
    maximumFractionDigits: 2,
  })}`;

const friendlyError = (error) =>
  error?.message?.replace(/^Firebase:\s*/i, "") ||
  "We couldn’t complete that request. Please try again.";

const addressFromProfile = (profile = {}) => {
  const location = profile.location || {};
  const latitude =
    location.lat ?? location.latitude ?? profile.latitude ?? profile.lat;
  const longitude =
    location.lng ?? location.longitude ?? profile.longitude ?? profile.lng;
  return {
    address:
      profile.deliveryAddress ||
      profile.address ||
      profile.Address ||
      location.address ||
      "",
    ...(Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))
      ? { latitude: Number(latitude), longitude: Number(longitude) }
      : {}),
    instructions: "",
  };
};

function SheetHeader({ title, onClose }) {
  return (
    <header className="stockpile-delivery-header">
      <div>
        <p>Stockpile delivery</p>
        <h2>{title}</h2>
      </div>
      <button type="button" aria-label="Close" onClick={onClose}>
        <LuX aria-hidden="true" />
      </button>
    </header>
  );
}

function LoadingState() {
  return (
    <div className="stockpile-delivery-status" role="status">
      <span className="stockpile-delivery-spinner" aria-hidden="true" />
      <h3>Checking your stockpile</h3>
      <p>We’re loading its latest order and delivery status.</p>
    </div>
  );
}

export default function StockpileDeliverySheet({
  open,
  onClose,
  stockpileId,
  currentUserData,
  onStateChange,
  onEditDetails,
}) {
  const profileAddress = useMemo(
    () => addressFromProfile(currentUserData),
    [currentUserData],
  );
  const [deliveryState, setDeliveryState] = useState(null);
  const [deliveryAddress, setDeliveryAddress] = useState(profileAddress);
  const [paymentMethod, setPaymentMethod] = useState("paystack");
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState("");
  const [courierReviewOpen, setCourierReviewOpen] = useState(false);
  const refreshInFlightRef = useRef(false);
  const trackingOpenRefreshRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  useEffect(() => {
    if (!open) return;
    mountedRef.current = true;
    setDeliveryState(null);
    setDeliveryAddress(profileAddress);
    setPaymentMethod("paystack");
    setNotice("");
    setCourierReviewOpen(false);
    trackingOpenRefreshRef.current = null;
  }, [open, profileAddress, stockpileId]);

  const applyState = useCallback(
    (next) => {
      if (!mountedRef.current || !next) return;
      setDeliveryState(next);
      if (next.paymentMethod) setPaymentMethod(next.paymentMethod);
      if (next.address?.address) {
        setDeliveryAddress((current) => ({
          ...current,
          ...next.address,
          instructions:
            next.address.instructions ?? current.instructions ?? "",
        }));
      }
      onStateChange?.(next);
    },
    [onStateChange],
  );

  const refreshState = useCallback(
    async ({ quiet = false } = {}) => {
      if (!stockpileId || refreshInFlightRef.current) return null;
      refreshInFlightRef.current = true;
      if (!quiet) setLoading(true);
      try {
        const next = await getStockpileDeliveryState(stockpileId);
        applyState(next);
        return next;
      } catch (requestError) {
        if (!quiet && mountedRef.current) {
          toast.error(friendlyError(requestError));
        }
        return null;
      } finally {
        refreshInFlightRef.current = false;
        if (!quiet && mountedRef.current) setLoading(false);
      }
    },
    [applyState, stockpileId],
  );

  useEffect(() => {
    if (!open || !stockpileId) return undefined;
    void refreshState();
    return undefined;
  }, [open, refreshState, stockpileId]);

  useEffect(() => {
    if (!open || !REFRESHABLE_STATUSES.has(deliveryState?.status)) {
      return undefined;
    }
    const refresh = () => void refreshState({ quiet: true });
    const interval = window.setInterval(refresh, 5000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", refresh);
    };
  }, [deliveryState?.status, open, refreshState]);

  useEffect(() => {
    const deliveryFulfillmentId = deliveryState?.deliveryFulfillmentId;
    if (
      !open ||
      !deliveryFulfillmentId ||
      !["booked", "in_transit"].includes(deliveryState?.status) ||
      trackingOpenRefreshRef.current === deliveryFulfillmentId
    ) {
      return undefined;
    }
    trackingOpenRefreshRef.current = deliveryFulfillmentId;
    let cancelled = false;
    const refreshOnOpen = async () => {
      try {
        await refreshDeliveryTracking({
          deliveryFulfillmentId,
          mode: "modal",
        });
        if (!cancelled) await refreshState({ quiet: true });
      } catch (requestError) {
        // Keep showing the last saved tracking state. Scheduled tracking and
        // the manual action can safely retry without blocking the sheet.
        console.warn("[stockpile-delivery] tracking refresh skipped", {
          code: requestError?.code || "unknown",
        });
      }
    };
    void refreshOnOpen();
    return () => {
      cancelled = true;
    };
  }, [deliveryState?.deliveryFulfillmentId, deliveryState?.status, open, refreshState]);

  const status = deliveryState?.status || "active";
  const needsAddress = ["active", "quote_retry"].includes(status);
  const needsPayment = status === "awaiting_delivery_payment";
  const isComplete = COMPLETED_STATUSES.has(status);
  const isWaiting = ["closing", "preparing_quote"].includes(status);
  const isPaymentPending = ["payment_processing", "booking"].includes(status);
  const hasActiveCheckout = Boolean(
    needsPayment &&
      deliveryState?.paymentStatus === "awaiting_customer" &&
      deliveryState?.paymentMethod,
  );
  const needsSupport = ["booking_retry", "booking_outcome_unknown"].includes(
    status,
  );
  const courierOptions = useMemo(
    () =>
      (Array.isArray(deliveryState?.deliveryOptions)
        ? deliveryState.deliveryOptions
        : []
      ).map((option) => ({
        value: String(option?.id || ""),
        label: `${option?.provider || "Courier"} · ${formatMoney(option?.amount)}`,
        detail: option?.eta ? String(option.eta) : "",
      })).filter((option) => option.value),
    [deliveryState?.deliveryOptions],
  );
  const contactName = [currentUserData?.firstName, currentUserData?.lastName]
    .filter(Boolean)
    .join(" ") || currentUserData?.username || currentUserData?.displayName || "Not added";
  const contactEmail = currentUserData?.email || "Not added";
  const contactPhone =
    currentUserData?.phoneNumber ||
    currentUserData?.phone ||
    currentUserData?.number ||
    "Not added";

  const title = needsAddress
    ? status === "quote_retry"
      ? "Retry delivery quote"
      : "End and deliver your pile"
    : needsPayment
      ? "Pay for delivery"
      : isComplete
        ? "Delivery arranged"
        : "Delivery progress";

  const handlePrepare = async () => {
    if (!deliveryAddress.address?.trim()) {
      toast.error("Choose the address where you want this stockpile delivered.");
      void appHaptics.warning();
      return;
    }
    setWorking(true);
    setNotice("");
    void appHaptics.medium();
    try {
      const result = await prepareStockpileDelivery({
        stockpileId,
        deliveryAddress,
      });
      const next = await refreshState({ quiet: true });
      applyState(next || { ...deliveryState, ...result });
      setNotice(
        result.status === "closing"
          ? "Your pile is safely closed. We’ll prepare the delivery fee as soon as the remaining vendor decision arrives."
          : "Your delivery fee is ready.",
      );
      void appHaptics.success();
    } catch (requestError) {
      toast.error(friendlyError(requestError));
      void appHaptics.error();
      await refreshState({ quiet: true });
    } finally {
      if (mountedRef.current) setWorking(false);
    }
  };

  const handlePayment = async () => {
    if (!deliveryState?.deliveryFulfillmentId) {
      toast.error("The delivery quote is still being prepared. Please refresh.");
      return;
    }
    setWorking(true);
    setNotice("");
    void appHaptics.medium();
    try {
      const result = await initializeStockpileDeliveryPayment({
        deliveryFulfillmentId: deliveryState.deliveryFulfillmentId,
        paymentMethod,
      });
      if (paymentMethod === "paystack" && result.access_code) {
        const outcome = await resumePaystackTransaction({
          accessCode: result.access_code,
        });
        if (outcome.status === "cancelled") {
          setNotice("Payment was not completed. You can continue when ready.");
        } else {
          setNotice(
            "Payment received. We’re confirming it and arranging your courier.",
          );
          void appHaptics.success();
        }
      } else if (paymentMethod === "pay for me" && result.shareUrl) {
        const outcome = await shareContent({
          title: "Pay for my My Thrift delivery",
          text: `Please help me pay ${formatMoney(
            deliveryState.amount,
          )} for my stockpile delivery.`,
          url: result.shareUrl,
        });
        if (outcome === "cancelled") {
          setNotice("");
        } else {
          setNotice(
            outcome === "copied"
              ? "Payment link copied. We’ll update this delivery when it is paid."
              : "Payment link ready. We’ll update this delivery when it is paid.",
          );
        }
      } else if (result.paymentReceived) {
        setNotice(
          result.bookingPending
            ? "Payment received. Your courier booking is being confirmed."
            : "Payment received and your delivery is being arranged.",
        );
        void appHaptics.success();
      }
      await refreshState({ quiet: true });
    } catch (requestError) {
      toast.error(friendlyError(requestError));
      void appHaptics.error();
      await refreshState({ quiet: true });
    } finally {
      if (mountedRef.current) setWorking(false);
    }
  };

  const handleCourierChange = async (quoteOptionId) => {
    if (
      !quoteOptionId ||
      !deliveryState?.deliveryFulfillmentId ||
      quoteOptionId === deliveryState?.selectedOption?.id
    ) {
      return;
    }
    setWorking(true);
    setNotice("");
    void appHaptics.selection();
    try {
      const result = await selectStockpileDeliveryOption({
        deliveryFulfillmentId: deliveryState.deliveryFulfillmentId,
        quoteOptionId,
      });
      applyState({ ...deliveryState, ...result });
      void appHaptics.success();
    } catch (requestError) {
      toast.error(friendlyError(requestError));
      void appHaptics.error();
      await refreshState({ quiet: true });
    } finally {
      if (mountedRef.current) setWorking(false);
    }
  };

  const handleTrackingRefresh = async () => {
    const deliveryFulfillmentId = deliveryState?.deliveryFulfillmentId;
    if (!deliveryFulfillmentId || working) return;
    setWorking(true);
    void appHaptics.selection();
    try {
      const result = await refreshDeliveryTracking({
        deliveryFulfillmentId,
        mode: "manual",
      });
      await refreshState({ quiet: true });
      toast.success(
        result?.reason === "fresh"
          ? "Tracking is already up to date."
          : "Tracking status refreshed.",
      );
      void appHaptics.success();
    } catch (requestError) {
      toast.error(friendlyError(requestError));
      void appHaptics.error();
    } finally {
      if (mountedRef.current) setWorking(false);
    }
  };

  return (
    <AppBottomSheet
      open={open}
      onClose={onClose}
      height="88dvh"
      ariaLabel="Stockpile delivery"
      ariaBusy={loading || working}
      surfaceClassName="stockpile-delivery-sheet"
      compactTop
    >
      <SheetHeader title={title} onClose={onClose} />

      <div className="stockpile-delivery-scroll">
        {loading && !deliveryState ? (
          <LoadingState />
        ) : (
          <>
            {needsAddress && (
              <>
                <section className="stockpile-delivery-intro">
                  <span><LuTruck aria-hidden="true" /></span>
                  <div>
                    <h3>One delivery for this stockpile</h3>
                    <p>
                      We’ll combine the accepted items, estimate their package,
                      and find a delivery option for the address below.
                    </p>
                  </div>
                </section>

                <section className="stockpile-delivery-section">
                  <div className="stockpile-delivery-section-title">
                    <LuMapPin aria-hidden="true" />
                    <div>
                      <h3>Delivery address</h3>
                      <p>This is where the completed pile will be sent.</p>
                    </div>
                  </div>
                  <LocationPicker
                    key={`${stockpileId}-${deliveryAddress.address}`}
                    initialAddress={deliveryAddress.address}
                    initialCoords={{
                      lat: deliveryAddress.latitude,
                      lng: deliveryAddress.longitude,
                    }}
                    onLocationSelect={({ address, lat, lng }) => {
                      setDeliveryAddress((current) => ({
                        ...current,
                        address,
                        latitude: lat,
                        longitude: lng,
                      }));
                      void appHaptics.selection();
                    }}
                  />
                </section>

                <section className="stockpile-delivery-section stockpile-contact-section">
                  <div className="stockpile-delivery-section-title">
                    <LuShieldCheck aria-hidden="true" />
                    <div>
                      <h3>Courier contact details</h3>
                      <p>
                        We share these details and the selected delivery address
                        only with the courier arranging this delivery.
                      </p>
                    </div>
                  </div>
                  <div className="stockpile-contact-card">
                    <div><span>Name</span><strong>{contactName}</strong></div>
                    <div><span>Phone</span><strong>{contactPhone}</strong></div>
                    <div><span>Email</span><strong>{contactEmail}</strong></div>
                  </div>
                  {onEditDetails && (
                    <button
                      type="button"
                      className="stockpile-edit-details"
                      onClick={() => {
                        void appHaptics.selection();
                        onEditDetails();
                      }}
                    >
                      Edit account details
                    </button>
                  )}
                </section>

                <div className="stockpile-delivery-warning">
                  <LuAlertCircle aria-hidden="true" />
                  <p>
                    Ending this pile is permanent. New orders cannot join it.
                    Declined orders will be excluded; orders still awaiting the
                    vendor will finish their decision before we calculate your fee.
                  </p>
                </div>

                <section className="stockpile-delivery-section stockpile-delivery-note-section">
                  <label className="stockpile-delivery-note-field">
                    <span>Delivery note <small>Optional</small></span>
                    <p>
                      Add a gate, landmark, or other instruction for the
                      delivery service.
                    </p>
                    <textarea
                      value={deliveryAddress.instructions || ""}
                      maxLength={1000}
                      placeholder="Add delivery instructions"
                      onChange={(event) =>
                        setDeliveryAddress((current) => ({
                          ...current,
                          instructions: event.target.value,
                        }))
                      }
                    />
                  </label>
                </section>
              </>
            )}

            {needsPayment && (
              <>
                <section className="stockpile-delivery-quote">
                  <p>Delivery fee</p>
                  <strong>{formatMoney(deliveryState.amount)}</strong>
                  <span>
                    {deliveryState.selectedOption?.provider || "Recommended courier"}
                    {deliveryState.selectedOption?.eta
                      ? ` · ${deliveryState.selectedOption.eta}`
                      : ""}
                  </span>
                </section>
                {courierOptions.length > 0 && (
                  <section className="stockpile-delivery-section">
                    <h3>Courier option</h3>
                    <p className="stockpile-courier-help">
                      Choose your preferred courier before starting payment.
                    </p>
                    <NativePickerField
                      title="Choose a courier"
                      value={String(deliveryState.selectedOption?.id || "")}
                      options={courierOptions}
                      onChange={handleCourierChange}
                      placeholder="Select a courier"
                      disabled={working || hasActiveCheckout}
                      className="stockpile-courier-picker"
                    />
                  </section>
                )}
                <section className="stockpile-delivery-section">
                  <h3>Payment method</h3>
                  <div className="stockpile-payment-options">
                    {PAYMENT_METHODS.map((method) => (
                      <button
                        type="button"
                        key={method.value}
                        className={
                          paymentMethod === method.value ? "is-selected" : ""
                        }
                        disabled={
                          hasActiveCheckout &&
                          deliveryState.paymentMethod !== method.value
                        }
                        onClick={() => {
                          setPaymentMethod(method.value);
                          void appHaptics.selection();
                        }}
                      >
                        <img src={method.icon} alt="" aria-hidden="true" />
                        <span>
                          <strong>{method.label}</strong>
                          <small>{method.description}</small>
                        </span>
                        <i aria-hidden="true">
                          {paymentMethod === method.value && <LuCheck />}
                        </i>
                      </button>
                    ))}
                  </div>
                </section>
                <div className="stockpile-delivery-protection">
                  <LuShieldCheck aria-hidden="true" />
                  <p>
                    The amount comes from the live delivery quote. Your items
                    stay under My Thrift protection throughout the booking.
                  </p>
                </div>
                {hasActiveCheckout && (
                  <p className="stockpile-delivery-notice">
                    Your{" "}
                    {PAYMENT_METHODS.find(
                      (method) =>
                        method.value === deliveryState.paymentMethod,
                    )?.label || "selected"}{" "}
                    payment is already active. Reopen or share that same
                    request to avoid duplicate charges.
                  </p>
                )}
              </>
            )}

            {(isWaiting || isPaymentPending || needsSupport || isComplete) && (
              <div className={`stockpile-delivery-status${isComplete ? " is-success" : ""}`}>
                <span aria-hidden="true">
                  {isComplete ? (
                    <LuCheck />
                  ) : needsSupport ? (
                    <LuAlertCircle />
                  ) : isWaiting ? (
                    <LuClock3 />
                  ) : (
                    <LuTruck />
                  )}
                </span>
                <h3>
                  {status === "closing"
                    ? "Waiting for the vendor"
                    : status === "preparing_quote"
                      ? "Preparing your delivery fee"
                      : status === "payment_processing"
                        ? "Confirming your payment"
                        : status === "booking"
                          ? "Booking your courier"
                          : status === "booking_outcome_unknown"
                            ? "We’re checking the courier booking"
                            : status === "booking_retry"
                              ? "Booking needs attention"
                              : status === "in_transit"
                                ? "Your stockpile is on the way"
                                : status === "delivered"
                                  ? "Stockpile delivered"
                                  : "Courier booked"
                  }
                </h3>
                <p>
                  {status === "closing"
                    ? `${deliveryState.awaitingVendorOrderCount || 1} order decision${
                        deliveryState.awaitingVendorOrderCount === 1 ? " is" : "s are"
                      } still pending. No new order can join this pile.`
                    : status === "preparing_quote"
                      ? "This normally takes only a moment."
                      : status === "booking_outcome_unknown"
                        ? "Do not pay or book again. We’re verifying the existing request to prevent a duplicate charge."
                        : status === "booking_retry"
                          ? "Your payment is safe. Please contact support so we can finish the courier booking without charging you again."
                          : status === "payment_processing"
                            ? "Please do not start another payment while this one is being checked."
                            : status === "booking"
                              ? "Your payment is confirmed. We’re finalising the courier booking."
                              : status === "in_transit"
                                ? "Use the tracking details below to follow your delivery."
                                : status === "delivered"
                                  ? "Your combined stockpile delivery has arrived."
                                  : "Your courier has been arranged successfully."
                  }
                </p>
                {isComplete && (
                  <>
                    <DeliveryTrackingCard
                      provider={
                        deliveryState.booking?.provider ||
                        deliveryState.selectedOption?.provider
                      }
                      providerLogo={
                        deliveryState.booking?.providerLogo ||
                        deliveryState.selectedOption?.providerLogo
                      }
                      status={deliveryState.status}
                      eta={deliveryState.selectedOption?.eta}
                      trackingCode={deliveryState.booking?.trackingCode}
                      trackingUrl={deliveryState.booking?.trackingUrl}
                    />
                    {status === "delivered" &&
                      !deliveryState.courierReviewSubmitted && (
                        <button
                          type="button"
                          className="stockpile-rate-courier"
                          onClick={() => {
                            void appHaptics.selection();
                            setCourierReviewOpen(true);
                          }}
                        >
                          Rate delivery courier
                        </button>
                      )}
                  </>
                )}
              </div>
            )}

            {notice && <p className="stockpile-delivery-notice">{notice}</p>}
          </>
        )}
      </div>

      {!loading && deliveryState && (
        <footer className="stockpile-delivery-actions">
          {needsAddress && (
            <button type="button" onClick={handlePrepare} disabled={working}>
              {working ? <span className="stockpile-delivery-spinner" /> : null}
              {working
                ? status === "quote_retry"
                  ? "Retrying quote…"
                  : "Ending stockpile…"
                : status === "quote_retry"
                  ? "Retry delivery quote"
                  : "End stockpile & get delivery fee"}
            </button>
          )}
          {needsPayment && (
            <button type="button" onClick={handlePayment} disabled={working}>
              {working ? <span className="stockpile-delivery-spinner" /> : null}
              {working
                ? "Preparing payment…"
                : paymentMethod === "pay for me"
                  ? "Create payment link"
                  : `Pay ${formatMoney(deliveryState.amount)}`}
            </button>
          )}
          {!needsAddress && !needsPayment && !isComplete && (
            <button
              type="button"
              className="is-secondary"
              onClick={isComplete ? handleTrackingRefresh : () => {
                void appHaptics.selection();
                void refreshState();
              }}
              disabled={loading || working}
            >
              <LuRefreshCw aria-hidden="true" /> Refresh status
            </button>
          )}
          {isComplete && (
            <div className="stockpile-delivery-complete-actions">
              <button
                type="button"
                className="is-secondary"
                onClick={handleTrackingRefresh}
                disabled={working}
              >
                <LuRefreshCw aria-hidden="true" />
                {working ? "Refreshing…" : "Refresh status"}
              </button>
              <button type="button" onClick={onClose}>Done</button>
            </div>
          )}
        </footer>
      )}
      <CourierReviewSheet
        open={courierReviewOpen}
        onClose={() => setCourierReviewOpen(false)}
        deliveryFulfillmentId={deliveryState?.deliveryFulfillmentId}
        provider={
          deliveryState?.booking?.provider ||
          deliveryState?.selectedOption?.provider
        }
        onSubmitted={(result) =>
          applyState({
            ...deliveryState,
            courierReviewSubmitted: true,
            courierReviewRating: result?.rating || null,
          })
        }
      />
    </AppBottomSheet>
  );
}
