/* eslint-disable react/prop-types */
import React, { useMemo, useState, useEffect } from "react";
import Modal from "react-modal";
import { MdOutlineClose } from "react-icons/md";
import toast from "react-hot-toast";
import {
  addDoc,
  collection,
  serverTimestamp,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../firebase.config";

export default function OfferSheet({
  isOpen,
  onClose,
  product,
  onOfferSubmitted,
  hasVariants,
  selectedSize,
  selectedColor,
  currentUser,
  navigate,
  location,
}) {
  const [mode, setMode] = useState("custom"); // 'custom' | 'p10' | 'p25'
  const [submitting, setSubmitting] = useState(false);
  const [customPriceInput, setCustomPriceInput] = useState("");

  const DAILY_OFFER_LIMIT = 10;
  const [offersLeft, setOffersLeft] = useState(null); // null = loading

  const price = Number(product?.price || 0);
  const MIN_OFFER_NAIRA = 300; // global floor (still enforced on submit)
  const minCustomPrice = Math.ceil(price * 0.6); // 40% off cap (vendor rule)

  const fmt = (n) =>
    Number(n || 0).toLocaleString("en-NG", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  const discounted = (p, pct) => Math.max(0, Math.round(p * (1 - pct / 100)));
  const p10Price = useMemo(() => discounted(price, 10), [price]);
  const p25Price = useMemo(() => discounted(price, 25), [price]);

  // Free-typed custom value
  const customVal = Number(customPriceInput);
  const hasEnteredCustom = customPriceInput !== "" && !Number.isNaN(customVal);

  const customBelow40Cap = hasEnteredCustom && customVal < minCustomPrice;
  const customTooHighOrEqual = hasEnteredCustom && customVal >= price;

  // Only consider the ₦300 “idle” rule if ₦300 lies within 0–40% vendor window
  const within40CapHitsMinNaira =
    minCustomPrice <= MIN_OFFER_NAIRA && price > MIN_OFFER_NAIRA;

  // Debounced (3s idle) check
  const [idleMinCheck, setIdleMinCheck] = useState(false);
  useEffect(() => {
    setIdleMinCheck(false);
    if (mode !== "custom") return;
    const t = setTimeout(() => setIdleMinCheck(true), 3000);
    return () => clearTimeout(t);
  }, [customPriceInput, mode]);

  const customBelowMinNairaIdle =
    within40CapHitsMinNaira &&
    idleMinCheck &&
    hasEnteredCustom &&
    customVal < MIN_OFFER_NAIRA;

  // Selected amount from current mode
  const selectedOfferAmount =
    mode === "p10"
      ? p10Price
      : mode === "p25"
      ? p25Price
      : hasEnteredCustom
      ? customVal
      : 0;

  // Enable/disable “Send offer”
  const customOk =
    hasEnteredCustom && !customTooHighOrEqual && !customBelow40Cap;
  const finalDisabled =
    submitting ||
    (mode === "custom" ? !customOk || customBelowMinNairaIdle : false) ||
    selectedOfferAmount <= 0 ||
    (offersLeft !== null && offersLeft <= 0);

  // 🔢 Load how many offers are left for today (client-side hint)
  useEffect(() => {
    if (!isOpen || !currentUser?.uid) {
      setOffersLeft(null);
      return;
    }
    (async () => {
      try {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const qRef = query(
          collection(db, "offers"),
          where("buyerId", "==", currentUser.uid),
          where("createdAt", ">=", Timestamp.fromDate(start))
        );
        const snap = await getDocs(qRef);
        const left = Math.max(0, DAILY_OFFER_LIMIT - snap.size);
        setOffersLeft(left);
      } catch (e) {
        console.error("Failed to compute daily offers:", e);
        setOffersLeft(null); // don't block if counting fails
      }
    })();
  }, [isOpen, currentUser?.uid]);

  const handleSubmit = async () => {
    if (!currentUser) {
      return navigate("/login", { state: { from: location?.pathname } });
    }

    // Guard on daily limit (client hint — final gate is in Cloud Functions)
    if (offersLeft !== null && offersLeft <= 0) {
      return toast.error("Daily offer limit reached (10). Try again tomorrow.");
    }

    // same validations you already have
    if (mode === "custom" && !hasEnteredCustom) {
      return toast.error("Enter your offer price.");
    }
    if (selectedOfferAmount < MIN_OFFER_NAIRA) {
      return toast.error(`Minimum offer is ₦${fmt(MIN_OFFER_NAIRA)}.`);
    }
    if (mode === "custom" && customBelow40Cap) {
      return toast.error(`Minimum is ₦${fmt(minCustomPrice)} (max 40% off).`);
    }
    if (selectedOfferAmount >= price) {
      return toast.error("Offer must be below list price.");
    }

    setSubmitting(true);
    try {
      const payload = {
        buyerId: currentUser.uid,
        vendorId: product.vendorId,
        productId: product.id,
        amount: selectedOfferAmount, // integer NGN
        note: "",
        variantAttributes: hasVariants
          ? { size: selectedSize || null, color: selectedColor || null }
          : null,
        status: "pending",
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "offers"), payload);

      // Optimistic update of the local counter (doesn't replace server enforcement)
      setOffersLeft((prev) =>
        typeof prev === "number" ? Math.max(0, prev - 1) : prev
      );

      toast.success("Offer sent. You’ll be notified when the vendor responds.");
      onOfferSubmitted?.(); // ← inform parent to show the one-time modal
      onClose?.();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to send offer");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="modal-content-offer animate-modal-slide-up"
      overlayClassName="offer-overlay"
      ariaHideApp={false}
    >
      <div className="p-3 relative h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-opensans font-semibold">
              Make an offer
            </h2>
            <span className="bg-customOrange -translate-y-2 text-white text-[10px] px-2 py-[2px]  font-satoshi rounded-md uppercase">
              Beta
            </span>
          </div>
          <MdOutlineClose
            className="text-2xl cursor-pointer"
            onClick={onClose}
          />
        </div>

        {/* Options */}
        <div className="flex gap-2">
          {/* 10% off */}
          <button
            type="button"
            onClick={() => setMode("p10")}
            className={`flex-1 border rounded-lg px-1.5 py-2 text-left font-opensans ${
              mode === "p10"
                ? "border-customOrange ring-2 ring-customOrange/20 bg-orange-50/40"
                : "border-gray-200"
            }`}
          >
            <div className="flex flex-col">
              <span className="text-base font-semibold">₦{fmt(p10Price)}</span>
              <span className="text-xs text-customOrange mt-0.5">10% off</span>
              <span className="text-[9px] text-gray-500 mt-0.5">
                You save ₦{fmt(price - p10Price)}
              </span>
            </div>
          </button>

          {/* 25% off */}
          <button
            type="button"
            onClick={() => setMode("p25")}
            className={`flex-1 border rounded-lg px-1.5 py-2 text-left font-opensans ${
              mode === "p25"
                ? "border-customOrange ring-2 ring-customOrange/20 bg-orange-50/40"
                : "border-gray-200"
            }`}
          >
            <div className="flex flex-col">
              <span className="text-base font-semibold">₦{fmt(p25Price)}</span>
              <span className="text-xs text-customOrange mt-0.5">25% off</span>
              <span className="text-[9px] text-gray-500 mt-0.5">
                You save ₦{fmt(price - p25Price)}
              </span>
            </div>
          </button>

          {/* Custom */}
          <button
            type="button"
            onClick={() => setMode("custom")}
            className={`flex-1 border rounded-lg px-1.5 py-2 text-left font-opensans ${
              mode === "custom"
                ? "border-customOrange ring-2 ring-customOrange/20 bg-orange-50/40"
                : "border-gray-200"
            }`}
          >
            <div className="flex flex-col">
              <span className="text-xs text-gray-700 font-semibold">
                Custom
              </span>
              <span className="text-base font-semibold mt-0.5">
                ₦{hasEnteredCustom ? fmt(customVal) : "—"}
              </span>
              <span className="text-[9px] text-gray-500 mt-0.5">
                {hasEnteredCustom
                  ? `You save ₦${fmt(Math.max(0, price - customVal))}`
                  : "Set a price"}
              </span>
            </div>
          </button>
        </div>

        {/* Gentle hint for ₦300 min (after 3s idle if relevant) */}
        {mode === "custom" && customBelowMinNairaIdle && (
          <p className="text-[11px] font-opensans text-red-500 mt-2">
            Minimum offer is ₦{fmt(MIN_OFFER_NAIRA)}.
          </p>
        )}

        {/* Price input for Custom */}
        {mode === "custom" && (
          <div className="mt-3">
            <input
              type="number"
              inputMode="numeric"
              placeholder={`₦${fmt(price)}`}
              value={customPriceInput}
              onChange={(e) => setCustomPriceInput(e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-sm font-opensans ${
                customBelow40Cap ||
                (within40CapHitsMinNaira &&
                  idleMinCheck &&
                  customVal < MIN_OFFER_NAIRA)
                  ? "bg-gray-100"
                  : ""
              }`}
            />
            {customBelow40Cap && (
              <p className="text-[11px] font-opensans text-red-500 mt-1">
                Minimum allowed for this item is ₦{fmt(minCustomPrice)}
              </p>
            )}
            {idleMinCheck && hasEnteredCustom && customVal >= price && (
              <p className="text-[11px] font-opensans text-red-500 mt-1">
                Offer must be below the list price ₦{fmt(price)}.
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 pt-4">
          <button
            disabled={finalDisabled}
            onClick={handleSubmit}
            className={`w-full rounded-full h-11 font-opensans font-semibold text-white ${
              finalDisabled
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-customOrange"
            }`}
          >
            {submitting
              ? "Sending…"
              : `Send offer ( ₦${fmt(selectedOfferAmount)} )`}
          </button>

          {/* Offers left today */}
          <div className="mt-2 text-center text-[11px] font-opensans">
            {offersLeft === null ? (
              <span className="text-gray-500">Checking daily limit…</span>
            ) : offersLeft > 0 ? (
              <span className="text-gray-900">
                Offers left today: <b>{offersLeft}</b>/
                <b>{DAILY_OFFER_LIMIT}</b>
              </span>
            ) : (
              <span className="text-red-600 font-opensans">
                You’ve reached your daily limit (10). Try again tomorrow.
              </span>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
