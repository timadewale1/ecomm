import React, { useEffect, useMemo, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { doc, getDoc } from "firebase/firestore";
import { AlertTriangle, Flag, Star, X } from "lucide-react";
import { RotatingLines } from "react-loader-spinner";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { db, functions } from "../../firebase.config";
import AppBottomSheet from "../layout/AppBottomSheet";
import NativePickerField from "../Form/NativePickerField";
import { appHaptics } from "../../services/haptics";
import "./review-completion-sheet.css";

const DISPUTE_REASONS = [
  { value: "not-delivered", label: "Order has not been delivered" },
  { value: "damaged", label: "Order arrived badly damaged" },
  { value: "incorrect-order", label: "Incorrect order received" },
  { value: "other", label: "Something else" },
];

const clampRating = (value) => Math.min(5, Math.max(1, Number(value) || 1));

const ReviewModal = ({ isOpen, onClose, orderId, orderData }) => {
  const navigate = useNavigate();
  const [vendorName, setVendorName] = useState("the vendor");
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeDetails, setDisputeDetails] = useState("");
  const [submittingDispute, setSubmittingDispute] = useState(false);

  const effectiveOrderId = String(orderId || orderData?.id || "").trim();
  const stockpileId = String(
    orderData?.stockpileDocId ||
      orderData?.stockpileId ||
      orderData?.stockpile?.id ||
      "",
  ).trim();
  const isStockpile = Boolean(stockpileId || orderData?.isStockpile);
  const displayedId = isStockpile ? stockpileId : effectiveOrderId;
  const selectedReason = useMemo(
    () => DISPUTE_REASONS.find((reason) => reason.value === disputeReason),
    [disputeReason],
  );

  useEffect(() => {
    if (!isOpen) {
      setIsDisputeModalOpen(false);
      setDisputeReason("");
      setDisputeDetails("");
      setSubmittingDispute(false);
      return;
    }
    setVendorName(
      orderData?.vendorName || orderData?.shopName || "the vendor",
    );
    if (!orderData?.vendorId) return;
    let cancelled = false;
    void getDoc(doc(db, "vendors", orderData.vendorId))
      .then((snapshot) => {
        if (!cancelled && snapshot.exists()) {
          setVendorName(snapshot.data()?.shopName || "the vendor");
        }
      })
      .catch((error) => {
        console.warn("[completed-order-review] vendor lookup failed", {
          code: error?.code || "unknown",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, orderData?.shopName, orderData?.vendorId, orderData?.vendorName]);

  const openReviewComposer = (rating) => {
    if (!orderData?.vendorId || !effectiveOrderId) {
      void appHaptics.error();
      toast.error("This order cannot be rated right now.");
      return;
    }
    const params = new URLSearchParams({
      tab: "reviews",
      rating: String(clampRating(rating)),
    });
    if (isStockpile && stockpileId) params.set("rateStockpile", stockpileId);
    else params.set("rateOrder", effectiveOrderId);
    void appHaptics.medium();
    onClose?.();
    navigate(`/store/${orderData.vendorId}?${params.toString()}`);
  };

  const openDispute = () => {
    setDisputeReason("");
    setDisputeDetails("");
    setIsDisputeModalOpen(true);
    void appHaptics.selection();
  };

  const closeDispute = () => {
    if (submittingDispute) return;
    setIsDisputeModalOpen(false);
  };

  const submitDispute = async () => {
    if (!effectiveOrderId || !disputeReason || submittingDispute) return;
    if (disputeReason === "other" && disputeDetails.trim().length < 10) {
      toast.error("Tell us briefly what happened with this order.");
      return;
    }
    setSubmittingDispute(true);
    try {
      const callable = httpsCallable(functions, "submitOrderDisputeV1");
      const response = await callable({
        orderId: effectiveOrderId,
        reason: disputeReason,
        details: disputeDetails.trim(),
      });
      void appHaptics.success();
      toast.success(
        response.data?.alreadySubmitted
          ? "This order issue is already under review."
          : "Order dispute submitted",
      );
      setIsDisputeModalOpen(false);
      onClose?.();
    } catch (error) {
      console.error("[completed-order-review] dispute failed", {
        orderId: effectiveOrderId,
        code: error?.code || "unknown",
      });
      void appHaptics.error();
      toast.error(error?.message || "Your dispute could not be submitted.");
    } finally {
      setSubmittingDispute(false);
    }
  };

  return (
    <>
      <AppBottomSheet
        open={isOpen}
        onClose={onClose}
        height="56dvh"
        compactTop
        ariaLabel="Rate completed order"
      >
        <div className="completed-order-review-head">
          <div>
            <h2>How was your order?</h2>
            <p>Rate your experience with {vendorName}.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <X />
          </button>
        </div>
        <div className="completed-order-review-body">
          <div className="completed-order-review-copy">
            <strong>{isStockpile ? "Stockpile" : "Order"} completed</strong>
            <span title={displayedId}>{displayedId || "Order details unavailable"}</span>
            <p>
              Your rating helps other buyers and gives the vendor useful
              feedback. Tap a star to continue to the verified review form.
            </p>
          </div>
          <div className="completed-order-review-stars" aria-label="Rate this order">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => openReviewComposer(rating)}
                aria-label={`${rating} star${rating === 1 ? "" : "s"}`}
              >
                <Star />
              </button>
            ))}
          </div>
          <small>Tap a star to write your review</small>
          <button
            type="button"
            className="completed-order-dispute-action"
            onClick={openDispute}
          >
            <Flag />
            Report an issue with this order
          </button>
        </div>
      </AppBottomSheet>

      <AppBottomSheet
        open={isDisputeModalOpen}
        onClose={closeDispute}
        height="68dvh"
        compactTop
        keyboardAware
        dismissible={!submittingDispute}
        closeOnBackdrop={!submittingDispute}
        zIndex={3100}
        ariaLabel="Dispute completed order"
        ariaBusy={submittingDispute}
      >
        <div className="completed-order-review-head">
          <div>
            <h2>Report an order issue</h2>
            <p>We’ll attach this report to the verified order.</p>
          </div>
          <button
            type="button"
            onClick={closeDispute}
            disabled={submittingDispute}
            aria-label="Close"
          >
            <X />
          </button>
        </div>
        <div className="completed-order-dispute-body">
          <label htmlFor="completed-order-dispute-reason">Reason</label>
          <NativePickerField
            id="completed-order-dispute-reason"
            title="Reason for dispute"
            value={disputeReason}
            options={DISPUTE_REASONS}
            onChange={(value) => {
              setDisputeReason(value);
              if (value !== "other") setDisputeDetails("");
            }}
            placeholder="Choose a reason"
            disabled={submittingDispute}
            className="completed-order-dispute-picker"
          />
          {selectedReason && (
            <p className="completed-order-selected-reason">
              <AlertTriangle />
              {selectedReason.label}
            </p>
          )}
          <label htmlFor="completed-order-dispute-details">
            Additional details {disputeReason === "other" ? "" : "(optional)"}
          </label>
          <textarea
            id="completed-order-dispute-details"
            rows={5}
            maxLength={1000}
            value={disputeDetails}
            onChange={(event) => setDisputeDetails(event.target.value)}
            placeholder="Tell our support team what happened"
            disabled={submittingDispute}
          />
          <p>
            Submitting creates a support record linked to this order. It does
            not automatically issue a refund; our team will review the order
            and contact you if more information is needed.
          </p>
        </div>
        <div className="completed-order-dispute-footer">
          <button
            type="button"
            onClick={submitDispute}
            disabled={
              !disputeReason ||
              submittingDispute ||
              (disputeReason === "other" && disputeDetails.trim().length < 10)
            }
          >
            {submittingDispute ? (
              <RotatingLines strokeColor="#fff" width="20" />
            ) : (
              "Submit dispute"
            )}
          </button>
        </div>
      </AppBottomSheet>
    </>
  );
};

export default ReviewModal;
