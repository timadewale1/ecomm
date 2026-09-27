/* eslint-disable react/prop-types */
import React, { useMemo, useState, useEffect, useRef } from "react";
import { MdOutlineClose } from "react-icons/md";
import { CiCircleInfo } from "react-icons/ci";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../firebase.config";
import AppBottomSheet from "../layout/AppBottomSheet";
import {
  createMarketplaceOffer,
  marketplaceActionErrorMessage,
} from "../../services/marketplaceActions";

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
  const submissionLockRef = useRef(false);
  const submissionAttemptRef = useRef(null);
  const [customPriceInput, setCustomPriceInput] = useState("");

  const ROLLING_OFFER_LIMIT = 24;
  const [offersLeft, setOffersLeft] = useState(null); // null = loading

  const [showHeadsUp, setShowHeadsUp] = useState(true);

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

  // Client-side hint only. The Cloud Function owns the atomic rolling limit.
  useEffect(() => {
    if (!isOpen || !currentUser?.uid) {
      setOffersLeft(null);
      return;
    }
    (async () => {
      try {
        const start = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const qRef = query(
          collection(db, "offers"),
          where("buyerId", "==", currentUser.uid),
          where("createdAt", ">=", Timestamp.fromDate(start)),
        );
        const snap = await getDocs(qRef);
        const left = Math.max(0, ROLLING_OFFER_LIMIT - snap.size);
        setOffersLeft(left);
      } catch (e) {
        console.error("Failed to compute daily offers:", e);
        setOffersLeft(null); // don't block if counting fails
      }
    })();
  }, [isOpen, currentUser?.uid]);

  useEffect(() => {
    if (!isOpen) {
      submissionLockRef.current = false;
      submissionAttemptRef.current = null;
      setSubmitting(false);
    }
  }, [isOpen]);

  const getSubmissionAttempt = (signature) => {
    if (submissionAttemptRef.current?.signature === signature) {
      return submissionAttemptRef.current.id;
    }
    const id =
      typeof window.crypto?.randomUUID === "function"
        ? window.crypto.randomUUID()
        : `offer_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
    submissionAttemptRef.current = { id, signature };
    return id;
  };

  const handleSubmit = async () => {
    if (submissionLockRef.current) return;
    if (!currentUser) {
      return navigate("/login", { state: { from: location?.pathname } });
    }

    // Guard on the rolling limit (client hint — final gate is server-side).
    if (offersLeft !== null && offersLeft <= 0) {
      return toast.error(
        "You’ve used your 24 offers for this rolling 24-hour period. Try again when an earlier offer leaves the window.",
      );
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

    const signature = JSON.stringify({
      buyerId: currentUser.uid,
      vendorId: product.vendorId,
      productId: product.id,
      amount: selectedOfferAmount,
      size: hasVariants ? selectedSize || null : null,
      color: hasVariants ? selectedColor || null : null,
    });
    const submissionId = getSubmissionAttempt(signature);

    submissionLockRef.current = true;
    setSubmitting(true);
    try {
      const payload = {
        vendorId: product.vendorId,
        productId: product.id,
        amount: selectedOfferAmount, // integer NGN
        variantAttributes: hasVariants
          ? { size: selectedSize || null, color: selectedColor || null }
          : null,
        submissionId,
      };

      const result = await createMarketplaceOffer(payload);

      // Optimistic update of the local counter (doesn't replace server enforcement)
      setOffersLeft((prev) =>
        Number.isFinite(result?.offersRemaining)
          ? Math.max(0, Number(result.offersRemaining))
          : typeof prev === "number"
            ? Math.max(0, prev - 1)
            : prev,
      );

      onOfferSubmitted?.(); // ← inform parent to show the one-time modal
      submissionAttemptRef.current = null;
      onClose?.();
    } catch (err) {
      console.error(err);
      toast.error(marketplaceActionErrorMessage(err, "Failed to send offer."));
    } finally {
      submissionLockRef.current = false;
      setSubmitting(false);
    }
  };

  const save10 = Math.max(0, price - p10Price);
  const save25 = Math.max(0, price - p25Price);

  return (
    <AppBottomSheet
      open={isOpen}
      onClose={() => {
        if (!submitting) onClose?.();
      }}
      height="60dvh"
      ariaLabel="Make an Offer"
      zIndex={9999}
      dismissible={!submitting}

    >
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5 pt-5">

        {/* Header */}
        <div className="relative flex items-center justify-center">
          <h2 className="text-base font-opensans font-semibold">
            Make an Offer
          </h2>
          <button
            type="button"
            className="absolute right-0 top-1/2 -translate-y-1/2 p-1"
            onClick={onClose}
            disabled={submitting}
          >
            <MdOutlineClose className="text-xl" />
          </button>
        </div>

        {/* Heads up banner */}
        {showHeadsUp && (
          <div className="mt-3 flex items-start gap-2 bg-customOrangeBg   rounded-xl px-3 py-3">
            <div className="mt-[2px] flex items-center justify-center w-5 h-5 rounded-full">
              <CiCircleInfo className="text-customOrange text-base" />
            </div>
            <p className="text-[12px] leading-[16px] font-opensans text-gray-700 flex-1">
              Note: This item remains available for others to purchase while
              your offer is pending.{" "}
            </p>
            <button
              type="button"
              className="p-1 -mr-1 -mt-1"
              onClick={() => setShowHeadsUp(false)}
            >
              <MdOutlineClose className="text-base text-gray-500" />
            </button>
          </div>
        )}

        {/* Options */}
        <div className="mt-4 flex gap-3">
          {/* 10% */}
          <button
            type="button"
            onClick={() => setMode("p10")}
            className={`flex-1 border rounded-xl px-3 py-3 text-left font-opensans ${
              mode === "p10" ? "border-customOrange" : "border-gray-200"
            }`}
          >
            <div className="flex flex-col">
              <span className="text-base font-semibold">
                ₦{fmt(p10Price)}
              </span>
              <span className="text-sm text-gray-500 mt-1">
                Save ₦{fmt(save10)}
              </span>
            </div>
          </button>

          {/* 25% */}
          <button
            type="button"
            onClick={() => setMode("p25")}
            className={`flex-1 border rounded-xl px-3 py-3 text-left font-opensans ${
              mode === "p25" ? "border-customOrange" : "border-gray-200"
            }`}
          >
            <div className="flex flex-col">
              <span className="text-base font-semibold">
                ₦{fmt(p25Price)}
              </span>
              <span className="text-sm text-gray-500  mt-1">
                Save ₦{fmt(save25)}
              </span>
            </div>
          </button>

          {/* Custom */}
          <button
            type="button"
            onClick={() => setMode("custom")}
            className={`flex-1 border rounded-xl px-3 py-3 text-left font-opensans ${
              mode === "custom" ? "border-customOrange" : "border-gray-200"
            }`}
          >
            <div className="flex flex-col">
              <span className="text-base font-semibold">Custom</span>
              <span className="text-sm text-gray-500 mt-1">
                {hasEnteredCustom ? `₦${fmt(customVal)}` : "Set Price"}
              </span>
            </div>
          </button>
        </div>

        {/* Price input for Custom */}
        {mode === "custom" && (
          <div className="mt-4">
            <input
              type="number"
              inputMode="numeric"
              placeholder="₦0"
              value={customPriceInput}
              onChange={(e) => setCustomPriceInput(e.target.value)}
              className={`w-full border rounded-xl px-4 py-4 text-base font-opensans focus:outline-none focus:ring-2 focus:ring-customOrange/20 ${
                customBelow40Cap ||
                (within40CapHitsMinNaira &&
                  idleMinCheck &&
                  customVal < MIN_OFFER_NAIRA)
                  ? "bg-gray-50"
                  : "bg-white"
              }`}
            />
            {customBelow40Cap && (
              <p className="text-[11px] font-opensans text-red-500 mt-2">
                Minimum allowed for this item is ₦{fmt(minCustomPrice)}
              </p>
            )}
            {idleMinCheck && hasEnteredCustom && customVal >= price && (
              <p className="text-[11px] font-opensans text-red-500 mt-2">
                Offer must be below the list price ₦{fmt(price)}.
              </p>
            )}
            {mode === "custom" && customBelowMinNairaIdle && (
              <p className="text-[11px] font-opensans text-red-500 mt-2">
                Minimum offer is ₦{fmt(MIN_OFFER_NAIRA)}.
              </p>
            )}
          </div>
        )}

        {/* Offers left */}
        <div className="mt-5 text-center text-base font-opensans text-gray-600">
          {offersLeft === null ? (
            <span className="text-gray-500">Checking your 24-hour offer limit…</span>
          ) : offersLeft > 0 ? (
            <span>
              You have <b className="text-gray-800">{offersLeft}</b> of your 24 offers left in the current rolling 24-hour window.
            </span>
          ) : (
            <span className="text-red-600">
              You’ve reached 24 offers in the current rolling 24-hour window. Try again when an earlier offer leaves the window.
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4">
          <button
            disabled={finalDisabled}
            onClick={handleSubmit}
            className={`w-full rounded-xl h-12 font-opensans font-medium text-white ${
              finalDisabled
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-customOrange"
            }`}
          >
            {submitting ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                Sending…
              </span>
            ) : (
              "Send Offer"
            )}
          </button>
        </div>
      </div>
    </AppBottomSheet>
  );
}
