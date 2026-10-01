import React, { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { httpsCallable } from "firebase/functions";
import {uploadPrivateImage} from "../../services/privateMedia";
import Compressor from "compressorjs";
import toast from "react-hot-toast";
import {
  FiCheck,
  FiChevronRight,
  FiCalendar,
  FiClock,
  FiCopy,
  FiImage,
  FiInfo,
  FiMapPin,
  FiPackage,
  FiPhone,
  FiTrash2,
  FiTruck,
  FiX,
  FiXCircle,
} from "react-icons/fi";
import AppBottomSheet from "../../components/layout/AppBottomSheet";
import NativePickerField from "../../components/Form/NativePickerField";
import { functions } from "../../firebase.config";
import { appHaptics } from "../../services/haptics";
import {
  patchVendorOrder,
  patchVendorStockpile,
} from "../../redux/actions/orderaction";
import { refreshVendorOrders } from "../../custom-hooks/orderListener";
import { RotatingLines } from "react-loader-spinner";
import NativeImageInput from "../../components/Inputs/NativeImageInput";

const DECLINE_REASONS = [
  "Item unavailable or out of stock",
  "Item damaged or no longer fit to sell",
  "Unable to prepare the order in time",
  "Listing or pricing error",
  "Other",
];

const padTime = (value) => String(value).padStart(2, "0");
const timeOptions = Array.from({ length: 25 }, (_, index) => {
  const totalMinutes = 8 * 60 + index * 30;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const value = `${padTime(hours)}:${padTime(minutes)}`;
  const suffix = hours >= 12 ? "PM" : "AM";
  const label = `${hours % 12 || 12}:${padTime(minutes)} ${suffix}`;
  return { value, label };
});

const dateKey = (date) => {
  const year = date.getFullYear();
  const month = padTime(date.getMonth() + 1);
  const day = padTime(date.getDate());
  return `${year}-${month}-${day}`;
};

const CALENDAR_WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PICKUP_MAX_ADVANCE_DAYS = 21;

const pickupCalendarDates = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: PICKUP_MAX_ADVANCE_DAYS + 1 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      value: dateKey(date),
      day: date.getDate(),
      date,
      monthKey: `${date.getFullYear()}-${padTime(date.getMonth() + 1)}`,
      monthLabel: new Intl.DateTimeFormat("en-GB", {
        month: "long",
        year: "numeric",
      }).format(date),
      isToday: index === 0,
      weekday: new Intl.DateTimeFormat("en-GB", { weekday: "short" })
        .format(date),
      label: new Intl.DateTimeFormat("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(date),
    };
  });
};

const groupPickupCalendarMonths = (dates) => dates.reduce((months, date) => {
  let month = months[months.length - 1];
  if (!month || month.key !== date.monthKey) {
    const weekday = date.date.getDay();
    month = {
      key: date.monthKey,
      label: date.monthLabel,
      leadingDays: (weekday + 6) % 7,
      dates: [],
    };
    months.push(month);
  }
  month.dates.push(date);
  return months;
}, []);

const pickupDateSummary = (dates) => dates.map((value) =>
  new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T12:00:00`))).join(", ");

const selectedPickupAvailability = (order) => {
  const source = Array.isArray(order.pickupAvailability) &&
    order.pickupAvailability.length ?
    order.pickupAvailability : order.pickupWindow?.availability;
  return Array.isArray(source) ? source : [];
};

const toDate = (value) => {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value) => {
  const date = toDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const compactIdentifier = (value) => {
  const identifier = String(value || "Unavailable");
  if (identifier.length <= 14) return identifier;
  return `${identifier.slice(0, 7)}…${identifier.slice(-4)}`;
};

const MAX_PROOF_IMAGE_BYTES = 8 * 1024 * 1024;

const compressProofImage = (file) =>
  new Promise((resolve, reject) => {
    new Compressor(file, {
      quality: 0.82,
      maxWidth: 1600,
      maxHeight: 1600,
      convertSize: 700000,
      success: resolve,
      error: reject,
    });
  });

const formatRemaining = (value) => {
  const date = toDate(value);
  if (!date) return null;
  const remaining = Math.max(0, date.getTime() - Date.now());
  const totalHours = Math.ceil(remaining / (60 * 60 * 1000));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (!totalHours) return "Ending now";
  if (!days) return `${hours} hour${hours === 1 ? "" : "s"} left`;
  return `${days} day${days === 1 ? "" : "s"}${hours ? ` ${hours} hr` : ""} left`;
};

const formatCompletionDuration = (startedAt, completedAt) => {
  const started = toDate(startedAt);
  const completed = toDate(completedAt);
  if (!started || !completed || completed <= started) return null;
  const totalMinutes = Math.max(
    1,
    Math.round((completed.getTime() - started.getTime()) / 60000),
  );
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days) {
    return `${days} day${days === 1 ? "" : "s"}${
      hours ? ` ${hours} hr${hours === 1 ? "" : "s"}` : ""
    }`;
  }
  if (hours) {
    return `${hours} hr${hours === 1 ? "" : "s"}${
      minutes ? ` ${minutes} min` : ""
    }`;
  }
  return `${minutes} min`;
};

const money = (value) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const normalized = (value) => String(value || "").trim().toLowerCase();
const isDeclinedOrder = (order) =>
  normalized(order?.vendorStatus) === "declined" ||
  normalized(order?.progressStatus) === "declined";

const statusCopy = (order) => {
  if (isDeclinedOrder(order)) return "Declined";
  if (order.kind === "pickup") {
    if (order.pickupWindow?.days) return "Ready for pickup";
    if (normalized(order.vendorStatus) === "accepted") return "Set pickup window";
  }
  const delivery = normalized(order.deliveryStatus);
  if (delivery === "delivered" || normalized(order.progressStatus) === "delivered") {
    return order.kind === "pickup" ? "Collected" : "Delivered";
  }
  if (delivery === "in_transit") return "In transit";
  if (["booked", "courier_assigned"].includes(delivery)) return "Courier assigned";
  if (delivery.includes("booking")) return "Booking courier";
  if (order.kind === "stockpile" && order.stockpile?.deliveryActionRequired) {
    return "Waiting for buyer delivery request";
  }
  if (normalized(order.vendorStatus) === "accepted") return "Processing";
  return "Awaiting your decision";
};

const stockpileStatusCopy = (order) => {
  const stockpile = order?.stockpile || {};
  const lifecycleStatus = normalized(
    stockpile.deliveryStatus || stockpile.status || order?.stockpileStatus,
  );

  if (stockpile.isActive === true && (!lifecycleStatus || lifecycleStatus === "active")) {
    return "Active stockpile";
  }

  const labels = {
    active: "Active stockpile",
    awaiting_delivery_request: "Waiting for buyer",
    closing: "Preparing delivery",
    preparing_quote: "Preparing delivery",
    quote_retry: "Delivery quote needs attention",
    awaiting_delivery_payment: "Awaiting delivery payment",
    payment_processing: "Processing delivery payment",
    booking: "Booking courier",
    booking_retry: "Booking courier",
    booking_outcome_unknown: "Confirming courier booking",
    booked: "Courier assigned",
    courier_assigned: "Courier assigned",
    ready_for_collection: "Ready for courier collection",
    in_transit: "In transit",
    completed: "Delivered",
    delivered: "Delivered",
    cancelled: "Stockpile closed",
  };

  return labels[lifecycleStatus] ||
    (stockpile.deliveryActionRequired
      ? "Waiting for buyer"
      : stockpile.isActive === false
        ? "Preparing delivery"
        : "Active stockpile");
};

const stockpileStatusDescription = (order) => {
  const stockpile = order?.stockpile || {};
  const lifecycleStatus = normalized(
    stockpile.deliveryStatus || stockpile.status || order?.stockpileStatus,
  );

  if (stockpile.isActive === true && (!lifecycleStatus || lifecycleStatus === "active")) {
    return `${formatRemaining(stockpile.endDate) || "Active"} · Ends ${formatDate(stockpile.endDate)}. Keep accepted items safely packed.`;
  }
  if (stockpile.deliveryActionRequired || lifecycleStatus === "awaiting_delivery_request") {
    return "The buyer must confirm their address, choose a courier and pay for delivery.";
  }
  if (["closing", "preparing_quote", "quote_retry"].includes(lifecycleStatus)) {
    return "The buyer has started arranging delivery for this stockpile.";
  }
  if (["awaiting_delivery_payment", "payment_processing"].includes(lifecycleStatus)) {
    return "The buyer is completing the stockpile delivery payment.";
  }
  if (["booking", "booking_retry", "booking_outcome_unknown"].includes(lifecycleStatus)) {
    return "The delivery request is being matched with a courier.";
  }
  if (["booked", "courier_assigned", "ready_for_collection"].includes(lifecycleStatus)) {
    return "A courier has been assigned. Keep the complete pile ready for collection.";
  }
  if (lifecycleStatus === "in_transit") {
    return "The courier has the parcel and delivery is in progress.";
  }
  if (["completed", "delivered"].includes(lifecycleStatus)) {
    return "This stockpile has been delivered to the buyer.";
  }
  if (lifecycleStatus === "cancelled") {
    return "This stockpile is closed and is no longer accepting orders.";
  }
  return stockpile.isActive === false
    ? "This stockpile is preparing for delivery."
    : "Keep accepted items safely packed while this stockpile remains active.";
};

const vendorOrderErrorMessage = (error, action) => {
  const code = normalized(error?.code);
  const message = String(error?.message || "").replace(/^firebaseerror:\s*/i, "").trim();
  const lowerMessage = normalized(message);

  if (lowerMessage.includes("already been accepted")) {
    return "This order was already accepted, so it can no longer be declined. Contact support if it must be cancelled.";
  }
  if (lowerMessage.includes("already been declined")) {
    return "This order was already declined and cannot be accepted.";
  }
  if (lowerMessage.includes("already being processed") || lowerMessage.includes("in progress")) {
    return "Another decision is already being processed. Refresh shortly before trying again.";
  }
  if (lowerMessage.includes("confirming this decision") || lowerMessage.includes("outcome unknown")) {
    return "We are confirming whether the payment service received this decision. Refresh shortly before trying again.";
  }
  if (code.includes("unavailable") || lowerMessage.includes("could not complete this decision")) {
    return `The payment service did not confirm this ${action}. The order was not changed; please try again.`;
  }
  return message || "This action could not be completed.";
};

function SheetHeader({ title, onClose, disabled = false }) {
  return (
    <div className="flex shrink-0 items-center justify-between border-b border-[#efefef] px-4 pb-3 ">
      <div className="h-9 w-9" aria-hidden="true" />
      <h2 className="truncate px-2 text-[17px] font-bold text-[#111827]">{title}</h2>
      <button
        type="button"
        onClick={() => {
          if (disabled) return;
          void appHaptics.selection();
          onClose();
        }}
        disabled={disabled}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f4f4f5] text-[#111827] disabled:opacity-40"
        aria-label="Close"
      >
        <FiX size={21} />
      </button>
    </div>
  );
}

function Section({ title, children, className = "" }) {
  return (
    <section className={`border-b border-[#efefef] px-5 py-5 ${className}`}>
      <h3 className="mb-4 text-[17px] font-bold text-[#111827]">{title}</h3>
      {children}
    </section>
  );
}

function StockpileProgress({ order }) {
  const stockpileStatus = normalized(
    order.stockpile?.status || order.stockpileStatus,
  );
  const deliveryStatus = normalized(
    order.stockpile?.deliveryStatus || order.deliveryStatus,
  );
  let currentIndex = 0;
  if (
    order.stockpile?.deliveryActionRequired ||
    [
      "awaiting_delivery_request",
      "closing",
      "preparing_quote",
      "quote_retry",
      "awaiting_delivery_payment",
      "payment_processing",
      "booking",
      "booking_retry",
      "booking_outcome_unknown",
    ].includes(stockpileStatus)
  ) currentIndex = 1;
  if (
    ["booked", "courier_assigned", "ready_for_collection"].includes(deliveryStatus) ||
    stockpileStatus === "booked"
  ) currentIndex = 2;
  if (
    order.vendorHandover?.confirmedAt ||
    order.stockpile?.vendorHandover?.confirmedAt
  ) currentIndex = 3;
  if (deliveryStatus === "in_transit" || stockpileStatus === "in_transit") {
    currentIndex = 4;
  }
  if (
    deliveryStatus === "delivered" ||
    normalized(order.progressStatus) === "delivered" ||
    ["completed", "delivered"].includes(stockpileStatus)
  ) currentIndex = 5;

  const steps = [
    ["Piling", "Accepted additions are held safely"],
    ["Delivery request", "Waiting for or processing the buyer’s delivery choice"],
    ["Courier booked", "Courier details are confirmed"],
    ["Handed to courier", "The parcel has left the vendor"],
    ["In transit", "The courier is delivering the stockpile"],
    ["Delivered", "Stockpile delivery is complete"],
  ];

  return (
    <div className="mt-4 border-t border-[#e6e8ec] pt-4">
      {steps.map(([label, description], index) => {
        const complete = index < currentIndex;
        const current = index === currentIndex;
        return (
          <div key={label} className="relative flex gap-3 pb-4 last:pb-0">
            {index < steps.length - 1 && (
              <span className={`absolute left-[11px] top-6 h-[calc(100%-12px)] w-px ${index < currentIndex ? "bg-[#72c993]" : "bg-[#dfe2e7]"}`} />
            )}
            <span className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
              complete
                ? "border-[#16844a] bg-[#16844a] text-white"
                : current
                  ? "border-[#ff4d22] bg-[#fff1ed] text-[#ff4d22]"
                  : "border-[#dfe2e7] bg-white text-[#a9afba]"
            }`}>
              {complete ? <FiCheck size={13} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className={`text-[12px] font-bold ${current || complete ? "text-[#111827]" : "text-[#8b93a1]"}`}>{label}</p>
              <p className="mt-0.5 text-[11px] leading-4 text-[#7a8494]">{description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  tone = "primary",
  loading = false,
}) {
  const styles =
    tone === "primary"
      ? "bg-[#ff4d22] text-white"
      : tone === "danger"
        ? "bg-[#fff1ed] text-[#d92d20]"
        : "border border-[#d9dce2] bg-white text-[#111827]";

  const disabledStyles =
    disabled && !loading
      ? "cursor-not-allowed bg-[#f3f4f6] text-[#9ca3af] border-transparent"
      : "";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-busy={loading}
      className={`
        flex min-h-12 w-full flex-none items-center justify-center
        rounded-xl px-4 text-[15px] font-bold transition
        ${styles}
        ${disabledStyles}
      `}
    >
      {loading ? (
        <RotatingLines
          visible
          width="22"
          strokeWidth="5"
          animationDuration="0.75"
          strokeColor={tone === "danger" ? "#d92d20" : "white"}
          ariaLabel="Loading"
        />
      ) : (
        children
      )}
    </button>
  );
}

function DeclineReason({ order, className = "" }) {
  if (!isDeclinedOrder(order)) return null;
  const reason = typeof order.declineReason === "string" ? order.declineReason.trim() : "";
  return (
    <div className={`flex items-start gap-3 rounded-2xl border border-[#f4d8d4] bg-[#fff5f3] p-4 ${className}`}>
      <FiXCircle className="mt-0.5 shrink-0 text-[#c43228]" size={18} aria-hidden="true" />
      <div className="min-w-0">
        <h3 className="text-[13px] font-bold text-[#a82e24]">Decline reason</h3>
        <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-5 text-[#703d36] [overflow-wrap:anywhere]">
          {reason || "No decline reason was recorded for this order."}
        </p>
      </div>
    </div>
  );
}

function DecisionSheet({
  order,
  action,
  busy,
  onClose,
  onSubmit,
}) {
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");

  const accepting = action === "accept";

  useEffect(() => {
    if (!action) {
      setReason("");
      setDetail("");
    }
  }, [action]);

  const finalReason =
    reason === "Other"
      ? detail.trim()
      : [reason, detail.trim()].filter(Boolean).join(": ");

  const declineDisabled =
    !reason ||
    (reason === "Other" && detail.trim().length < 3);

  return (
    <AppBottomSheet
      open={Boolean(action)}
      onClose={busy ? undefined : onClose}
      dismissible={!busy}
      height={accepting ? "auto" : "72dvh"}
      compactTop
      ariaLabel={accepting ? "Accept order" : "Decline order"}
    >
      <SheetHeader
        title={accepting ? "Accept order" : "Decline order"}
        onClose={onClose}
        disabled={busy}
      />

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {accepting ? (
          <div className="rounded-2xl bg-[#fff5f1] p-4 text-[12px] leading-5 text-[#5c2b1c]">
            {order.kind === "delivery"
              ? "Accept only when you can prepare this parcel. Courier collection will be initiated and can happen within 1–5 days. You will confirm when the complete parcel has been handed to the assigned courier."
              : order.kind === "pickup"
                ? "Accept this order, then set a clear pickup window and note for the customer."
                : "Accepting secures these items in the customer’s stockpile. Keep every accepted item safely packed until the pile closes and delivery is arranged."}
          </div>
        ) : (
          <div>
            <p className="text-[13px] font-bold text-[#111827]">
              Reason for declining
            </p>

            {/* Native iOS picker */}
            <div className="mt-3">
              <select
                value={reason}
                disabled={busy}
                onChange={(event) => {
                  void appHaptics.selection();

                  const nextReason = event.target.value;

                  setReason(nextReason);

                  // Clear "Other" explanation if switching away from Other
                  if (
                    reason === "Other" &&
                    nextReason !== "Other"
                  ) {
                    setDetail("");
                  }
                }}
                className="
                  h-[58px] min-h-[58px] w-full
                  appearance-auto
                  rounded-xl
                  border border-[#d9dce2]
                  bg-white
                  px-4
                  text-[14px]
                  font-medium
                  text-[#111827]
                  outline-none
                  focus:border-[#ff4d22]
                  disabled:cursor-not-allowed
                  disabled:bg-[#f3f4f6]
                  disabled:text-[#9ca3af]
                "
              >
                <option value="" disabled>
                  Select a reason
                </option>

                {DECLINE_REASONS.map((option) => (
                  <option
                    key={option}
                    value={option}
                  >
                    {option}
                  </option>
                ))}
              </select>
            </div>

            {/* Show note only once a reason has been selected */}
            {reason && (
              <label className="mt-4 block text-[12px] font-bold text-[#111827]">
                {reason === "Other"
                  ? "Tell the customer why"
                  : "Additional note (optional)"}

                <textarea
                  value={detail}
                  disabled={busy}
                  onChange={(event) =>
                    setDetail(event.target.value)
                  }
                  maxLength={500}
                  rows={3}
                  className="
                    mt-2 w-full resize-none
                    rounded-xl
                    border border-[#d9dce2]
                    p-3
                    text-[13px]
                    font-medium
                    text-[#111827]
                    outline-none
                    focus:border-[#ff4d22]
                    disabled:cursor-not-allowed
                    disabled:bg-[#f3f4f6]
                    disabled:text-[#9ca3af]
                  "
                  placeholder={
                    reason === "Other"
                      ? "Why are you declining this order?"
                      : "Add a brief note for the customer"
                  }
                />
              </label>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-[#efefef] px-5 py-4">
        <ActionButton
          disabled={
            busy ||
            (!accepting && declineDisabled)
          }
          tone={accepting ? "primary" : "danger"}
          loading={busy}
          onClick={() => onSubmit(finalReason)}
        >
          {accepting
            ? "Accept order"
            : "Decline order"}
        </ActionButton>
      </div>
    </AppBottomSheet>
  );
}

function PickupWindowSheet({ order, busy, onClose, onSave }) {
  const existingAvailability = selectedPickupAvailability(order);
  const [selectedDates, setSelectedDates] = useState(
    existingAvailability.map((entry) => entry.date).filter(Boolean),
  );
  const [startTime, setStartTime] = useState(
    existingAvailability[0]?.startTime || "10:00",
  );
  const [endTime, setEndTime] = useState(
    existingAvailability[0]?.endTime || "14:00",
  );
  const [note, setNote] = useState(order.pickupWindow?.note || "");
  const [shareContact, setShareContact] = useState(
    Boolean(order.pickupWindow?.shareContact),
  );
  const [contactNumber, setContactNumber] = useState(
    order.pickupWindow?.contactNumber || order.vendorPickup?.phoneNumber || "",
  );
  const dates = useMemo(() => pickupCalendarDates(), []);
  const calendarMonths = useMemo(
    () => groupPickupCalendarMonths(dates),
    [dates],
  );
  const startMinutes = Number(startTime.slice(0, 2)) * 60 +
    Number(startTime.slice(3, 5));
  const endOptions = useMemo(() => timeOptions.filter((option) => {
    const minutes = Number(option.value.slice(0, 2)) * 60 +
      Number(option.value.slice(3, 5));
    const duration = minutes - startMinutes;
    return duration >= 120 && duration <= 420;
  }), [startMinutes]);
  useEffect(() => {
    if (!endOptions.some((option) => option.value === endTime)) {
      setEndTime(endOptions[0]?.value || "");
    }
  }, [endOptions, endTime]);

  const toggleDate = (value) => {
    void appHaptics.selection();
    setSelectedDates((current) => {
      if (current.includes(value)) {
        return current.filter((date) => date !== value);
      }
      if (current.length >= 7) {
        toast.error("Choose no more than 7 pickup dates.");
        return current;
      }
      return [...current, value].sort();
    });
  };
  const canReschedule = Number(
    order.pickupWindow?.revision || order.pickupWindowRevision || 0,
  ) < 2;
  return (
    <AppBottomSheet
      open
      onClose={busy ? undefined : onClose}
      dismissible={!busy}
      height="90dvh"
      compactTop
      ariaLabel="Pickup window"
    >
      <SheetHeader
        title={order.pickupWindow?.days ? "Reschedule pickup" : "Set pickup window"}
        onClose={onClose}
        disabled={busy}
      />
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <div className="rounded-2xl bg-[#f6f7f9] p-3 text-[12px] leading-5 text-[#5f6878]">
          Choose 2–7 reachable dates within the next 21 days. Each pickup window must be 2–7 hours between 8:00 AM and 8:00 PM. You can reschedule once.
        </div>
        <div>
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-[13px] font-bold text-[#111827]"><FiCalendar className="text-[#ff4d22]" /> Pickup dates</p>
            <span className="text-[11px] font-medium text-[#697386]">{selectedDates.length}/7 selected</span>
          </div>
          <div className="mt-3 space-y-3">
            {calendarMonths.map((month) => (
              <section
                key={month.key}
                className="overflow-hidden rounded-2xl border border-[#e6e8ec] bg-white"
                aria-label={month.label}
              >
                <div className="border-b border-[#f0f1f3] px-4 py-3">
                  <p className="text-[15px] font-bold tracking-[-0.01em] text-[#111827]">
                    {month.label}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#7a8494]">
                    Select the dates when the customer can collect their order.
                  </p>
                </div>
                <div className="p-3">
                  <div className="grid grid-cols-7 gap-1">
                    {CALENDAR_WEEKDAYS.map((weekday) => (
                      <span
                        key={weekday}
                        className="pb-1 text-center text-[10px] font-bold uppercase tracking-[0.04em] text-[#9299a5]"
                      >
                        {weekday}
                      </span>
                    ))}
                    {Array.from({length: month.leadingDays}, (_, index) => (
                      <span key={`blank-${month.key}-${index}`} aria-hidden="true" />
                    ))}
                    {month.dates.map((date) => {
                      const selected = selectedDates.includes(date.value);
                      return (
                        <button
                          key={date.value}
                          type="button"
                          onClick={() => toggleDate(date.value)}
                          aria-label={`${date.label}${date.isToday ? ", today" : ""}`}
                          aria-pressed={selected}
                          className={`relative flex aspect-square min-h-10 items-center justify-center rounded-xl text-[13px] font-bold transition active:scale-95 ${selected ? "bg-[#ff4d22] text-white shadow-[0_4px_10px_rgba(255,77,34,0.2)]" : "bg-[#f7f7f8] text-[#111827]"}`}
                        >
                          {date.day}
                          {date.isToday && !selected && (
                            <span className="absolute bottom-1 h-1 w-1 rounded-full bg-[#ff4d22]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>
            ))}
          </div>
          {selectedDates.length > 0 && (
            <p className="mt-2 text-[11px] leading-4 text-[#697386]">{pickupDateSummary(selectedDates)}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="mb-2 text-[13px] font-bold text-[#111827]">From</p>
            <NativePickerField
              title="Pickup starts"
              value={startTime}
              options={timeOptions.slice(0, -4)}
              onChange={setStartTime}
              className="h-12 rounded-xl border border-[#d9dce2] px-3 text-[13px] font-medium"
            />
          </div>
          <div>
            <p className="mb-2 text-[13px] font-bold text-[#111827]">Until</p>
            <NativePickerField
              title="Pickup ends"
              value={endTime}
              options={endOptions}
              onChange={setEndTime}
              className="h-12 rounded-xl border border-[#d9dce2] px-3 text-[13px] font-medium"
            />
          </div>
        </div>
        <div className="rounded-2xl border border-[#eceef1] bg-[#fafafa] p-3">
          <div className="flex items-start gap-3">
            <FiMapPin className="mt-0.5 shrink-0 text-[#ff4d22]" size={18} />
            <div>
              <p className="text-[12px] font-bold text-[#111827]">Your pickup address</p>
              <p className="mt-1 text-[12px] leading-5 text-[#697386]">{order.vendorPickup?.address || "No pickup address is currently saved. Update your store profile before scheduling."}</p>
            </div>
          </div>
        </div>
        <label className="block text-[13px] font-bold text-[#111827]">
          Pickup note
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={1000}
            rows={3}
            className="mt-2 w-full resize-none rounded-xl border border-[#d9dce2] p-3 text-[13px] font-medium outline-none focus:border-[#ff4d22]"
            placeholder="Landmark, gate instructions or anything that helps them find you"
          />
        </label>
        <label className="block text-[13px] font-bold text-[#111827]">
          Vendor contact number
          <input
            value={contactNumber}
            onChange={(event) => setContactNumber(event.target.value)}
            inputMode="tel"
            className="mt-2 h-12 w-full rounded-xl border border-[#d9dce2] px-3 text-[13px] font-medium outline-none focus:border-[#ff4d22]"
            placeholder="A reachable store contact number"
          />
          <span className="mt-1.5 block text-[11px] font-normal leading-4 text-[#697386]">Use a reachable number. It is only sent to this buyer when sharing is enabled.</span>
        </label>
        <button
          type="button"
          onClick={() => {
            void appHaptics.selection();
            setShareContact((value) => !value);
          }}
          className="flex w-full items-start gap-3 rounded-2xl border border-[#e5e7eb] p-4 text-left"
        >
          <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${shareContact ? "border-[#ff4d22] bg-[#ff4d22] text-white" : "border-[#a9afba]"}`}>
            {shareContact && <FiCheck size={14} />}
          </span>
          <span>
            <span className="block text-[14px] font-bold text-[#111827]">Share a pickup contact number</span>
            <span className="mt-1 block text-[12px] leading-5 text-[#697386]">Only visible to this customer while their pickup is active.</span>
          </span>
        </button>
      </div>
      <div className="border-t border-[#efefef] px-5 py-4">
        <ActionButton
          disabled={
            busy ||
            !canReschedule ||
            selectedDates.length < 2 ||
            !startTime ||
            !endTime ||
            !order.vendorPickup?.address ||
            (shareContact && !contactNumber.trim())
          }
          loading={busy}
          onClick={() => onSave({
            pickupDays: pickupDateSummary(selectedDates),
            pickupTime: `${startTime}–${endTime}`,
            pickupAvailability: selectedDates.map((date) => ({
              date,
              startTime,
              endTime,
            })),
            pickupNote: note.trim(),
            shareContact,
            contactNumber: contactNumber.trim(),
          })}
        >
          {order.pickupWindow?.days ? "Update pickup window" : "Set pickup window"}
        </ActionButton>
      </div>
    </AppBottomSheet>
  );
}

function ProofImageField({ value, onChange, disabled = false }) {
  const chooseProof = (event) => {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      void appHaptics.warning();
      toast.error("Choose an image for the delivery proof.");
      return;
    }
    if (file.size > MAX_PROOF_IMAGE_BYTES) {
      void appHaptics.warning();
      toast.error("The delivery proof image must be under 8 MB.");
      return;
    }
    void appHaptics.selection();
    onChange({file, previewUrl: URL.createObjectURL(file)});
  };

  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-[13px] font-bold text-[#111827]">Delivery proof</p>
          <p className="mt-0.5 text-[11px] text-[#7a8494]">Optional image</p>
        </div>
        {value && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              void appHaptics.selection();
              onChange(null);
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#fff0ef] px-3 text-[11px] font-bold text-[#c43228] disabled:opacity-50"
          >
            <FiTrash2 aria-hidden="true" /> Remove
          </button>
        )}
      </div>

      <div className="mb-3 flex items-start gap-2 rounded-xl bg-[#fff7ed] p-3 text-[#8a4b12]">
        <FiInfo className="mt-0.5 shrink-0" aria-hidden="true" />
        <p className="text-[11px] leading-[17px]">
          Add a clear photo of the packed parcel at handover. It can support
          your case if the courier or customer later reports a problem.
        </p>
      </div>

      {value ? (
        <div className="overflow-hidden rounded-2xl border border-[#e6e8ec] bg-[#f7f7f8]">
          <img
            src={value.previewUrl}
            alt="Selected delivery proof"
            className="h-44 w-full object-cover"
          />
        </div>
      ) : (
        <label className={`flex min-h-28 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#cfd3da] bg-[#fafafa] px-4 text-center ${disabled ? "pointer-events-none opacity-50" : ""}`}>
          <FiImage className="mb-2 text-2xl text-[#ff4d22]" aria-hidden="true" />
          <span className="text-[12px] font-bold text-[#111827]">Add proof image</span>
          <span className="mt-1 text-[10px] text-[#7a8494]">Camera or photo library · maximum 8 MB</span>
          <NativeImageInput
            accept="image/*"
            disabled={disabled}
            onChange={chooseProof}
            className="sr-only"
          />
        </label>
      )}
    </div>
  );
}

function ConfirmSheet({
  title,
  message,
  items = [],
  busy,
  confirmLabel,
  onClose,
  onConfirm,
  proof = null,
  onProofChange = null,
}) {
  return (
    <AppBottomSheet open onClose={busy ? undefined : onClose} dismissible={!busy} height={onProofChange ? "86dvh" : "66dvh"} compactTop ariaLabel={title}>
      <SheetHeader title={title} onClose={onClose} disabled={busy} />
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <p className="text-[12px] leading-5 text-[#5f6878]">{message}</p>
        {items.length > 0 && (
          <div className="mt-5 space-y-3">
            {items.map((item, index) => (
              <div key={`${item.productId}-${index}`} className="flex items-center gap-3 rounded-xl bg-[#f7f7f8] p-3">
                <img src={item.image || "/logo192.png"} alt="" className="h-14 w-14 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold text-[#111827]">{item.name || "Item"}</p>
                  <p className="mt-1 text-[12px] text-[#697386]">
                    {[item.variant?.color, item.variant?.size].filter(Boolean).join(" · ") || "Standard option"} · Qty {item.quantity || 1}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        {onProofChange && (
          <ProofImageField
            value={proof}
            onChange={onProofChange}
            disabled={busy}
          />
        )}
      </div>
      <div className="border-t border-[#efefef] px-5 py-4">
        <ActionButton disabled={busy} loading={busy} onClick={onConfirm}>
          {confirmLabel}
        </ActionButton>
      </div>
    </AppBottomSheet>
  );
}

export default function VendorOrderDetailsSheet({
  open,
  order,
  orders = [],
  sourceBucket = null,
  onClose,
}) {
  const dispatch = useDispatch();
  const [busy, setBusy] = useState(false);
  const [decisionAction, setDecisionAction] = useState(null);
  const [pickupOpen, setPickupOpen] = useState(false);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [collectOpen, setCollectOpen] = useState(false);
  const [legacyAction, setLegacyAction] = useState(null);
  const [pickupPin, setPickupPin] = useState("");
  const [handoverProof, setHandoverProof] = useState(null);
  const [pickupProof, setPickupProof] = useState(null);
  const [stockpileDetailTab, setStockpileDetailTab] = useState("pile");
  const [, setClock] = useState(Date.now());

  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setInterval(() => setClock(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setStockpileDetailTab(sourceBucket === "new" ? "incoming" : "pile");
  }, [open, order?.id, order?.orderId, sourceBucket]);

  useEffect(() => {
    if (!open) {
      setDecisionAction(null);
      setPickupOpen(false);
      setHandoverOpen(false);
      setCollectOpen(false);
      setLegacyAction(null);
      setPickupPin("");
      setHandoverProof((current) => {
        if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl);
        return null;
      });
      setPickupProof((current) => {
        if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl);
        return null;
      });
    }
  }, [open]);

  const replaceProof = (setter) => (nextProof) => {
    setter((current) => {
      if (current?.previewUrl && current.previewUrl !== nextProof?.previewUrl) {
        URL.revokeObjectURL(current.previewUrl);
      }
      return nextProof;
    });
  };

  const pileOrders = useMemo(
    () => (orders.length ? orders : order ? [order] : []),
    [order, orders],
  );
  const acceptedPileOrders = useMemo(
    () => pileOrders.filter((entry) =>
      normalized(entry.vendorStatus) === "accepted" &&
      normalized(entry.progressStatus) !== "declined"),
    [pileOrders],
  );
  const incomingPileOrders = useMemo(
    () => pileOrders.filter((entry) =>
      normalized(entry.vendorStatus) !== "accepted" &&
      normalized(entry.vendorStatus) !== "declined" &&
      normalized(entry.progressStatus) !== "declined"),
    [pileOrders],
  );
  const previousPileOrders = useMemo(
    () => pileOrders.filter((entry) => !incomingPileOrders.includes(entry)),
    [incomingPileOrders, pileOrders],
  );
  const handoverItems = useMemo(
    () => pileOrders
      .filter((entry) =>
        order?.kind !== "stockpile" ||
        (
          normalized(entry.vendorStatus) === "accepted" &&
          normalized(entry.progressStatus) !== "declined"
        ))
      .flatMap((entry) => entry.items || []),
    [order?.kind, pileOrders],
  );
  if (!order) return null;

  const declined = isDeclinedOrder(order);
  const pending = normalized(order.vendorStatus) !== "accepted" && !declined;
  const accepted = normalized(order.vendorStatus) === "accepted" && !declined;
  const delivery = normalized(order.deliveryStatus);
  const completed = delivery === "delivered" ||
    normalized(order.progressStatus) === "delivered" ||
    normalized(order.pickupStatus) === "collected";
  const courierReady = ["booked", "courier_assigned", "ready_for_collection"].includes(delivery);
  const legacyDelivery = order.kind === "delivery" &&
    Number(order.deliveryArchitectureVersion || 0) !== 1;
  const isStockpileOrder = order.kind === "stockpile" || order.isStockpile;
  const hasEarlierPileOrders = isStockpileOrder && pileOrders.some(
    (entry) => (entry.orderId || entry.id) !== (order.orderId || order.id),
  );
  const showStockpileTabs = isStockpileOrder &&
    incomingPileOrders.length > 0 && previousPileOrders.length > 0;
  const visiblePileOrders = showStockpileTabs
    ? stockpileDetailTab === "incoming"
      ? incomingPileOrders
      : previousPileOrders
    : pileOrders;
  const projectedStockpileStateOrder = [...pileOrders]
    .filter((entry) => entry.stockpile)
    .sort((left, right) => {
      const leftDate = toDate(left.updatedAt || left.createdAt)?.getTime() || 0;
      const rightDate = toDate(right.updatedAt || right.createdAt)?.getTime() || 0;
      return rightDate - leftDate;
    })[0] || order;
  const canonicalPileHandover =
    projectedStockpileStateOrder.stockpile?.vendorHandover ||
    pileOrders.find((entry) => entry.vendorHandover?.confirmedAt)
      ?.vendorHandover ||
    order.vendorHandover ||
    null;
  const stockpileStateOrder = canonicalPileHandover
    ? {
        ...projectedStockpileStateOrder,
        vendorHandover: canonicalPileHandover,
        stockpile: {
          ...(projectedStockpileStateOrder.stockpile || {}),
          vendorHandover: canonicalPileHandover,
        },
      }
    : projectedStockpileStateOrder;

  const countOrderItems = (entry) => {
    const items = entry.items || [];
    if (items.length) {
      return items.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
    }
    return Number(entry.itemCount || 0);
  };
  const sumOrders = (entries, field, fallback) => entries.reduce(
    (sum, entry) => sum + Number(entry[field] ?? entry[fallback] ?? 0),
    0,
  );
  const nonDeclinedPileOrders = pileOrders.filter((entry) =>
    normalized(entry.vendorStatus) !== "declined" &&
    normalized(entry.progressStatus) !== "declined");
  const acceptedItemCount = acceptedPileOrders.reduce(
    (sum, entry) => sum + countOrderItems(entry),
    0,
  );
  const incomingItemCount = incomingPileOrders.reduce(
    (sum, entry) => sum + countOrderItems(entry),
    0,
  );
  const incomingSubtotal = sumOrders(incomingPileOrders, "subtotal", "vendorPayout");
  const stockpilePayout = sumOrders(nonDeclinedPileOrders, "vendorPayout", "subtotal");
  const canDecideOrder = pending &&
    (!isStockpileOrder || sourceBucket === "new");
  const canSchedulePickup = accepted && order.kind === "pickup" &&
    Boolean(order.pickupWindow?.days);
  const canConfirmHandover = accepted && order.kind !== "pickup" &&
    courierReady && !(isStockpileOrder
      ? canonicalPileHandover?.confirmedAt
      : order.vendorHandover?.confirmedAt);
  const canUpdateLegacyDelivery = accepted && legacyDelivery;
  const showFooterActions = !completed && !declined &&
    (canDecideOrder || canSchedulePickup || canConfirmHandover || canUpdateLegacyDelivery);

  const run = async (
    operation,
    successMessage,
    action = "action",
    verifyAfterClientError = null,
  ) => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await operation();
      void appHaptics.success();
      if (successMessage) toast.success(successMessage);
      return result;
    } catch (error) {
      let verifiedResult = null;
      let verificationError = null;
      if (typeof verifyAfterClientError === "function") {
        try {
          verifiedResult = await verifyAfterClientError();
        } catch (nextError) {
          verificationError = nextError;
        }
      }

      if (verifiedResult) {
        console.warn("Vendor order response was lost after a successful update", {
          action,
          orderId: order.orderId || order.id,
          originalCode: error?.code || null,
        });
        void appHaptics.success();
        if (successMessage) toast.success(successMessage);
        return verifiedResult;
      }

      console.error("Vendor order action failed", {
        action,
        orderId: order.orderId || order.id,
        code: error?.code || null,
        message: error?.message || null,
        details: error?.details || null,
        verificationError: verificationError?.message || null,
      });
      void appHaptics.error();
      toast.error(vendorOrderErrorMessage(error, action));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const uploadDeliveryProof = async (proof, kind) => {
    if (!proof?.file) return null;
    const compressed = await compressProofImage(proof.file);
    const entityId =
      order.stockpileDocId || order.stockpile?.id || order.orderId || order.id;
    return uploadPrivateImage(compressed, {kind: "delivery-proof", proofKind: kind,
      entityId, entityType: order.stockpileDocId || order.stockpile?.id ? "stockpile" : "order",
      attemptId: crypto.randomUUID(),
    });
  };

  const submitDecision = async (reason) => {
    const accepting = decisionAction === "accept";
    const expectedDecision = accepting ? "accepted" : "declined";
    const resolvedOrderId = order.orderId || order.id;
    const callable = httpsCallable(
      functions,
      accepting ? "acceptVendorOrder" : "declineVendorOrder",
    );
    const result = await run(
      () => callable({orderId: order.orderId || order.id, declineReason: reason}),
      accepting ? "Order accepted" : "Order declined",
      accepting ? "acceptance" : "decline",
      async () => {
        if (!order.vendorId) return null;
        let lastRefreshError = null;
        for (const delay of [400, 1000, 1800]) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          try {
            const refreshed = await refreshVendorOrders(order.vendorId);
            const updated = refreshed.find(
              (entry) => (entry.orderId || entry.id) === resolvedOrderId,
            );
            if (normalized(updated?.vendorStatus) === expectedDecision) {
              return {data: {verifiedAfterClientError: true}};
            }
          } catch (refreshError) {
            lastRefreshError = refreshError;
          }
        }
        if (lastRefreshError) throw lastRefreshError;
        return null;
      },
    );
    if (result) {
      dispatch(patchVendorOrder(resolvedOrderId, accepting
        ? {
            vendorStatus: "accepted",
            progressStatus: "In Progress",
            acceptedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        : {
            vendorStatus: "declined",
            progressStatus: "Declined",
            declineReason: reason,
            declinedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }));
      setDecisionAction(null);
      onClose();
    }
  };

  const savePickup = async (values) => {
    const result = await run(
      () => httpsCallable(functions, "scheduleOrderPickup")({
        orderId: order.orderId || order.id,
        ...values,
      }),
      order.pickupWindow?.days ? "Pickup window updated" : "Pickup window set",
    );
    if (result) {
      const now = new Date().toISOString();
      dispatch(patchVendorOrder(order.orderId || order.id, {
        pickupWindow: {
          days: values.pickupDays,
          time: values.pickupTime,
          note: values.pickupNote,
          shareContact: values.shareContact,
          contactNumber: values.contactNumber,
          revision: result?.data?.revision || Number(order.pickupWindow?.revision || 0) + 1,
          availability: values.pickupAvailability,
          scheduledAt: now,
        },
        pickupAvailability: values.pickupAvailability,
        pickupStatus: "ready_for_pickup",
        progressStatus: "Shipped",
        shippedAt: order.shippedAt || now,
        updatedAt: now,
      }));
      setPickupOpen(false);
      onClose();
    }
  };

  const confirmHandover = async () => {
    const result = await run(
      async () => {
        const deliveryProof = await uploadDeliveryProof(
          handoverProof,
          "courier_handover",
        );
        return httpsCallable(functions, "confirmVendorCourierHandoverV1")({
          orderId: order.orderId || order.id,
          confirmed: true,
          deliveryProof,
        });
      },
      "Courier handover confirmed",
      "courier handover",
    );
    if (result) {
      const now = new Date().toISOString();
      const vendorHandover = {
        ...(result?.data?.handover || {}),
        confirmedAt: now,
      };
      const stockpileDocId = order.stockpileDocId || order.stockpile?.id;
      if (stockpileDocId) {
        dispatch(patchVendorStockpile(stockpileDocId, {
          vendorHandover,
          stockpile: {vendorHandover},
          updatedAt: now,
        }));
      } else {
        dispatch(patchVendorOrder(order.orderId || order.id, {
          vendorHandover,
          updatedAt: now,
        }));
      }
      setHandoverOpen(false);
      onClose();
    }
  };

  const confirmCollection = async () => {
    const result = await run(
      async () => {
        const deliveryProof = await uploadDeliveryProof(
          pickupProof,
          "pickup_collection",
        );
        return httpsCallable(functions, "confirmPickupCollectionV1")({
          orderId: order.orderId || order.id,
          pin: pickupPin,
          deliveryProof,
        });
      },
      null,
      "pickup collection",
    );
    if (result?.data?.invalidPin) {
      void appHaptics.warning();
      toast.error("That collection code is not correct.");
      return;
    }
    if (result) {
      const now = new Date().toISOString();
      dispatch(patchVendorOrder(order.orderId || order.id, {
        pickupStatus: "collected",
        progressStatus: "Delivered",
        deliveryStatus: "delivered",
        collectedAt: now,
        deliveredAt: now,
        deliveryProof: result?.data?.deliveryProof || null,
        updatedAt: now,
      }));
      toast.success("Pickup confirmed");
      setCollectOpen(false);
      onClose();
    }
  };

  const updateLegacy = async () => {
    const result = await run(
      () => httpsCallable(functions, "updateLegacyVendorOrderStatusV1")({
        orderId: order.orderId || order.id,
        action: legacyAction,
      }),
      legacyAction === "shipped" ? "Order marked as shipped" : "Delivery confirmed",
    );
    if (result) {
      const now = new Date().toISOString();
      dispatch(patchVendorOrder(order.orderId || order.id, legacyAction === "shipped"
        ? {
            progressStatus: "Shipped",
            shippedAt: order.shippedAt || now,
            updatedAt: now,
          }
        : {
            progressStatus: "Delivered",
            deliveryStatus: "delivered",
            deliveredAt: now,
            updatedAt: now,
          }));
      setLegacyAction(null);
      onClose();
    }
  };

  const dueDate = toDate(order.vendorDecisionDueAt);
  const remainingMs = dueDate ? Math.max(0, dueDate.getTime() - Date.now()) : 0;
  const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
  const detailIdentifier = String(
    isStockpileOrder
      ? order.stockpileDocId || order.stockpile?.id || order.orderId || order.id
      : order.orderId || order.id || "Unavailable",
  );
  const detailIdentifierLabel = isStockpileOrder ? "Stockpile ID" : "Order ID";
  const visibleDetailIdentifier = compactIdentifier(detailIdentifier);
  const completionDuration = completed
    ? formatCompletionDuration(
        order.kind === "stockpile"
          ? order.stockpile?.createdAt || order.createdAt
          : order.createdAt,
        order.deliveredAt || order.collectedAt || order.updatedAt,
      )
    : null;
  const detailStatus = isStockpileOrder &&
      (sourceBucket == null || !["new", "declined"].includes(sourceBucket))
    ? stockpileStatusCopy(stockpileStateOrder)
    : statusCopy(order);

  return (
    <>
      <AppBottomSheet open={open} onClose={onClose} height="92dvh" compactTop ariaLabel="Order details">
        <SheetHeader title="Order details" onClose={onClose} />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-8">
          <div className="px-5 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#7a8494]">{detailIdentifierLabel}</p>
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(detailIdentifier);
                    void appHaptics.selection();
                    toast.success(`${detailIdentifierLabel} copied`);
                  }}
                  className="mt-1 flex min-w-0 max-w-full items-center gap-2 text-left text-[18px] font-bold text-[#111827]"
                >
                  <span className="truncate" title={detailIdentifier}>
                    {visibleDetailIdentifier}
                  </span>
                  <FiCopy className="shrink-0" size={15} />
                </button>
                <p className="mt-1 text-[13px] text-[#697386]">{formatDate(order.createdAt)}</p>
                <p className="mt-2 inline-flex rounded-full bg-[#fff1ed] px-2.5 py-1 text-[11px] font-bold text-[#e8461b]">
                  {order.kind === "pickup"
                    ? "Pickup order"
                    : order.kind === "stockpile"
                      ? "Stockpile order"
                      : "Delivery order"}
                </p>
              </div>
              <span className="max-w-[48%] rounded-full bg-[#fff1ed] px-3 py-1.5 text-right text-[12px] font-bold text-[#e8461b]">
                {detailStatus}
              </span>
            </div>
            {pending && (
              <div className="mt-4 flex items-start gap-3 rounded-2xl bg-[#fff8ed] p-4 text-[#7a4a0a]">
                <FiClock className="mt-0.5 shrink-0" size={18} />
                <p className="text-[13px] leading-5">
                  {dueDate
                    ? `${remainingHours || "Less than one"} hour${remainingHours === 1 ? "" : "s"} left to accept or decline. The order is automatically declined after 48 hours.`
                    : "This order needs your decision. New paid orders are automatically declined after 48 hours if unanswered."}
                </p>
              </div>
            )}
            {/* A declined stockpile addition keeps its own decision/reason. */}
            {pileOrders.length === 1 && <DeclineReason order={order} className="mt-4" />}
          </div>

          <Section
            title={isStockpileOrder
              ? sourceBucket === "new" && hasEarlierPileOrders
                ? "Orders in this repile"
                : "Orders in this stockpile"
              : "Item(s)"}
          >
            {showStockpileTabs && (
              <div className="mb-4 grid grid-cols-2 rounded-full bg-[#f1f2f4] p-1">
                {[
                  {id: "pile", label: `Current pile (${previousPileOrders.length})`},
                  {id: "incoming", label: `Incoming (${incomingPileOrders.length})`},
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      if (stockpileDetailTab === tab.id) return;
                      void appHaptics.selection();
                      setStockpileDetailTab(tab.id);
                    }}
                    className={`rounded-full px-3 py-2.5 text-[12px] font-bold transition ${
                      stockpileDetailTab === tab.id
                        ? "bg-white text-[#111827] shadow-sm"
                        : "text-[#697386]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
            <div className="space-y-3">
              {visiblePileOrders.map((entry) => (
                <div key={entry.orderId || entry.id} className={visiblePileOrders.length > 1 ? "border-b border-[#eceef1] pb-4 last:border-0 last:pb-0" : ""}>
                  {(pileOrders.length > 1 || isStockpileOrder) && (
                    <div className="mb-3 flex items-center justify-between text-[12px]">
                      <span
                        className="min-w-0 flex-1 truncate font-bold text-[#111827]"
                        title={entry.orderId || entry.id}
                      >
                        {compactIdentifier(entry.orderId || entry.id)}
                      </span>
                      <span className={isDeclinedOrder(entry) ? "text-[#d92d20]" : normalized(entry.vendorStatus) === "accepted" ? "text-[#16844a]" : "text-[#c27803]"}>
                        {isDeclinedOrder(entry) ? "Declined" : normalized(entry.vendorStatus) === "accepted" ? "Accepted" : "Awaiting decision"}
                      </span>
                    </div>
                  )}
                  <div className="space-y-3">
                    {(entry.items || []).map((item, index) => (
                      <div key={`${entry.orderId}-${item.productId}-${index}`} className="flex gap-3">
                        <img src={item.image || "/logo192.png"} alt="" className="h-20 w-20 rounded-xl bg-[#f2f3f5] object-cover" />
                        <div className="min-w-0 flex-1 py-1">
                          <p className="truncate text-[15px] font-bold text-[#111827]">{item.name || "Item"}</p>
                          <p className="mt-1 text-[13px] text-[#697386]">{[item.variant?.color, item.variant?.size].filter(Boolean).join(" · ") || "Standard option"}</p>
                          <div className="mt-2 flex items-center justify-between text-[13px]">
                            <span className="text-[#697386]">Qty {item.quantity || 1}</span>
                            <span className="font-bold text-[#111827]">{money((item.unitPrice || 0) * (item.quantity || 1))}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {pileOrders.length > 1 && <DeclineReason order={entry} className="mt-3" />}
                </div>
              ))}
            </div>
          </Section>

          <Section title="Customer">
            <div className="flex items-center gap-3">
              {order.buyer?.avatar ? (
                <img src={order.buyer.avatar} alt="" className="h-11 w-11 rounded-full object-cover" />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fff1ed] font-bold text-[#ff4d22]">
                  {(order.buyer?.displayName || "C").slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-[15px] font-bold text-[#111827]">{order.buyer?.displayName || "Customer"}</p>
                <p className="mt-0.5 text-[12px] text-[#697386]">Contact details are protected by My Thrift</p>
              </div>
            </div>
          </Section>

          {isStockpileOrder && (
            <Section title="Stockpile status">
              <div className="rounded-2xl bg-[#f7f7f8] p-4">
                <div className="flex items-center gap-3">
                  <FiPackage size={20} className="text-[#ff4d22]" />
                  <div>
                    <p className="text-[14px] font-bold text-[#111827]">
                      {stockpileStatusCopy(stockpileStateOrder)}
                    </p>
                    <p className="mt-1 text-[12px] leading-5 text-[#697386]">
                      {stockpileStatusDescription(stockpileStateOrder)}
                    </p>
                  </div>
                </div>
                <StockpileProgress order={stockpileStateOrder} />
              </div>
            </Section>
          )}

          {order.kind === "pickup" && accepted && (
            <Section title="Pickup window">
              {order.pickupWindow?.days ? (
                <div className="rounded-2xl bg-[#f7f7f8] p-4">
                  <div className="flex gap-3"><FiMapPin className="mt-0.5 text-[#ff4d22]" /><div><p className="text-[14px] font-bold">{order.pickupWindow.days}</p><p className="mt-1 text-[13px] text-[#697386]">{order.pickupWindow.time}</p></div></div>
                  {order.vendorPickup?.address && <p className="mt-3 border-t border-[#e5e7eb] pt-3 text-[12px] leading-5 text-[#5f6878]">{order.vendorPickup.address}</p>}
                  {order.pickupWindow.note && <p className="mt-3 border-t border-[#e5e7eb] pt-3 text-[13px] leading-5 text-[#5f6878]">{order.pickupWindow.note}</p>}
                  {order.pickupWindow.shareContact && <p className="mt-3 flex items-center gap-2 text-[12px] text-[#697386]"><FiPhone /> Shared number: {order.pickupWindow.contactNumber || order.vendorPickup?.phoneNumber || "—"}</p>}
                  {!completed && Number(order.pickupWindow?.revision || 1) < 2 && <button type="button" onClick={() => { void appHaptics.selection(); setPickupOpen(true); }} className="mt-4 text-[13px] font-bold text-[#ff4d22]">Reschedule pickup</button>}
                  {!completed && Number(order.pickupWindow?.revision || 1) >= 2 && <p className="mt-4 text-[11px] leading-4 text-[#8a5b29]">This pickup has already been rescheduled once. Contact support if another change is essential.</p>}
                </div>
              ) : (
                <button type="button" onClick={() => { void appHaptics.selection(); setPickupOpen(true); }} className="flex w-full items-center justify-between rounded-2xl bg-[#fff5f1] p-4 text-left"><span><span className="block text-[14px] font-bold text-[#111827]">Set pickup window</span><span className="mt-1 block text-[12px] text-[#697386]">Tell the customer when their order is ready.</span></span><FiChevronRight /></button>
              )}
            </Section>
          )}

          {accepted && order.kind !== "pickup" && order.deliveryFulfillmentId && (
            <Section title="Courier delivery">
              <div className="rounded-2xl bg-[#f7f7f8] p-4">
                <div className="flex items-start gap-3"><FiTruck className="mt-0.5 text-[#ff4d22]" size={19} /><div className="min-w-0"><p className="text-[14px] font-bold text-[#111827]">{order.deliveryProvider || "Courier is being assigned"}</p><p className="mt-1 text-[12px] text-[#697386]">{order.deliveryEta || statusCopy(order)}</p></div></div>
                {(isStockpileOrder
                  ? canonicalPileHandover?.confirmedAt
                  : order.vendorHandover?.confirmedAt) && <div className="mt-4 rounded-xl bg-[#eaf8ef] p-3 text-[12px] leading-5 text-[#176b3a]">Parcel handed to {order.deliveryProvider || "the courier"} {formatDate((isStockpileOrder ? canonicalPileHandover : order.vendorHandover).confirmedAt)}. Tracking updates automatically.</div>}
                {(order.trackingUrl || order.trackingCode) && <div className="mt-3 text-[12px] text-[#697386]">Tracking: {order.trackingCode || "Open courier tracking"}</div>}
              </div>
            </Section>
          )}

          <Section title="Order summary" className="border-b-0">
            <div className="space-y-3 text-[14px]">
              {isStockpileOrder ? (
                <>
                  <div className="flex justify-between text-[#697386]"><span>Accepted items</span><span>{acceptedItemCount}</span></div>
                  {incomingPileOrders.length > 0 && (
                    <>
                      <div className="flex justify-between text-[#a46200]"><span>Incoming items</span><span>{incomingItemCount}</span></div>
                      <div className="flex justify-between text-[#a46200]"><span>Incoming total</span><span>{money(incomingSubtotal)}</span></div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <div className="flex justify-between text-[#697386]"><span>Items</span><span>{countOrderItems(order)}</span></div>
                  <div className="flex justify-between text-[#697386]"><span>Item(s) total</span><span>{money(order.subtotal)}</span></div>
                </>
              )}
              {completionDuration && (
                <div className="flex justify-between text-[#697386]">
                  <span>Completed in</span>
                  <span className="font-bold text-[#111827]">{completionDuration}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-[#eceef1] pt-3 text-[16px] font-bold text-[#111827]"><span>Your item total</span><span>{money(isStockpileOrder ? stockpilePayout : order.vendorPayout ?? order.subtotal)}</span></div>
            </div>
          </Section>
        </div>

        {showFooterActions && (
          <div className="shrink-0 border-t border-[#eceef1] bg-white px-5 py-4">
            {canDecideOrder ? (
              <div className="grid grid-cols-2 gap-3">
                <ActionButton tone="danger" onClick={() => { void appHaptics.warning(); setDecisionAction("decline"); }}>Decline</ActionButton>
                <ActionButton onClick={() => { void appHaptics.medium(); setDecisionAction("accept"); }}>Accept order</ActionButton>
              </div>
            ) : order.kind === "pickup" && order.pickupWindow?.days ? (
              <ActionButton onClick={() => { void appHaptics.medium(); setCollectOpen(true); }}>Confirm collection</ActionButton>
            ) : courierReady && !(isStockpileOrder
              ? canonicalPileHandover?.confirmedAt
              : order.vendorHandover?.confirmedAt) ? (
              <ActionButton onClick={() => { void appHaptics.medium(); setHandoverOpen(true); }}>Confirm courier handover</ActionButton>
            ) : legacyDelivery ? (
              <div className="grid grid-cols-2 gap-3">
                {normalized(order.progressStatus) !== "shipped" && <ActionButton tone="secondary" onClick={() => setLegacyAction("shipped")}>Mark shipped</ActionButton>}
                <ActionButton onClick={() => setLegacyAction("delivered")}>Mark delivered</ActionButton>
              </div>
            ) : null}
          </div>
        )}
      </AppBottomSheet>

      <DecisionSheet order={order} action={decisionAction} busy={busy} onClose={() => setDecisionAction(null)} onSubmit={submitDecision} />
      {pickupOpen && <PickupWindowSheet order={order} busy={busy} onClose={() => setPickupOpen(false)} onSave={savePickup} />}
      {handoverOpen && <ConfirmSheet title="Confirm courier handover" message="Confirm only after every accepted item below is packed and physically handed to the assigned courier. Declined or unanswered additions are excluded. This records the handover; the courier remains responsible for confirming transit and delivery." items={handoverItems} busy={busy} confirmLabel="Everything is packed and handed over" onClose={() => setHandoverOpen(false)} onConfirm={confirmHandover} proof={handoverProof} onProofChange={replaceProof(setHandoverProof)} />}
      {collectOpen && (
        <AppBottomSheet open onClose={busy ? undefined : () => setCollectOpen(false)} dismissible={!busy} height="82dvh" compactTop ariaLabel="Confirm pickup">
          <SheetHeader title="Confirm pickup" onClose={() => setCollectOpen(false)} disabled={busy} />
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5"><p className="text-[13px] leading-5 text-[#697386]">Ask the customer for the four-digit collection code shown in their order.</p><input value={pickupPin} onChange={(event) => setPickupPin(event.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" autoComplete="one-time-code" className="mt-5 h-14 w-full rounded-xl border border-[#d9dce2] text-center text-2xl font-bold tracking-[0.5em] outline-none focus:border-[#ff4d22]" /><ProofImageField value={pickupProof} onChange={replaceProof(setPickupProof)} disabled={busy} /></div>
          <div className="border-t border-[#efefef] px-5 py-4"><ActionButton disabled={busy || pickupPin.length !== 4} loading={busy} onClick={confirmCollection}>Confirm collection</ActionButton></div>
        </AppBottomSheet>
      )}
      {legacyAction && <ConfirmSheet title={legacyAction === "shipped" ? "Mark order as shipped" : "Confirm delivery"} message={legacyAction === "shipped" ? "This legacy order predates in-app courier tracking. Confirm only after the parcel has left your possession." : "This legacy control completes the order and its existing payment settlement flow. Confirm only when delivery is complete."} busy={busy} confirmLabel={legacyAction === "shipped" ? "Mark shipped" : "Confirm delivered"} onClose={() => setLegacyAction(null)} onConfirm={updateLegacy} />}
    </>
  );
}
