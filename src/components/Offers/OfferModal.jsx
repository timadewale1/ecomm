/* eslint-disable react/prop-types */
import React, { useMemo, useState, useEffect } from "react";
import Modal from "react-modal";
import { MdOutlineClose, MdInfoOutline } from "react-icons/md";
import { CiCircleInfo } from "react-icons/ci";
import toast from "react-hot-toast";
import {
  motion,
  useMotionValue,
  useDragControls,
  animate,
} from "framer-motion";
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
          where("createdAt", ">=", Timestamp.fromDate(start)),
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
        typeof prev === "number" ? Math.max(0, prev - 1) : prev,
      );

      onOfferSubmitted?.(); // ← inform parent to show the one-time modal
      onClose?.();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to send offer");
    } finally {
      setSubmitting(false);
    }
  };

  // ---- drag-to-close sheet (pill handle) ----
  const y = useMotionValue(0);
  const dragControls = useDragControls();

  useEffect(() => {
    if (!isOpen) return;
    y.set(420);
    requestAnimationFrame(() => {
      animate(y, 0, { type: "spring", stiffness: 260, damping: 28 });
    });
  }, [isOpen, y]);

  const onDragEnd = (_, info) => {
    const shouldClose = info.offset.y > 140 || info.velocity.y > 900;
    if (shouldClose) {
      onClose?.();
      return;
    }
    animate(y, 0, { type: "spring", stiffness: 260, damping: 28 });
  };
  // ---- /drag-to-close sheet ----

  const save10 = Math.max(0, price - p10Price);
  const save25 = Math.max(0, price - p25Price);

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      ariaHideApp={false}
      overlayClassName="fixed inset-0 bg-black/40 z-[9999] flex items-end justify-center"
      className="w-full max-w-md mx-auto outline-none bg-transparent p-0"
    >
      <motion.div
        style={{ y }}
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 520 }}
        dragElastic={0.15}
        onDragEnd={onDragEnd}
        className="w-full h-[50vh] bg-white rounded-t-[28px] px-4 pt-3 pb-5 shadow-2xl"
      >
        {/* Drag pill */}
        <div
          className="w-full flex justify-center pb-2"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="relative flex items-center justify-center py-2">
          <h2 className="text-base font-opensans font-semibold">
            Make an Offer
          </h2>
          <button
            type="button"
            className="absolute right-0 top-1/2 -translate-y-1/2 p-1"
            onClick={onClose}
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
            <span className="text-gray-500">Checking daily limit…</span>
          ) : offersLeft > 0 ? (
            <span>
              You have <b className="text-gray-800">{offersLeft}</b> offers left
            </span>
          ) : (
            <span className="text-red-600">
              You’ve reached your daily limit (10). Try again tomorrow.
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
            {submitting ? "Sending…" : "Send Offer"}
          </button>
        </div>
      </motion.div>
    </Modal>
  );
}
