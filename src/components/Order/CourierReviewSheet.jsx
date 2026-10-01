import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { LuStar, LuTruck, LuX } from "react-icons/lu";
import AppBottomSheet from "../layout/AppBottomSheet";
import { appHaptics } from "../../services/haptics";
import { submitDeliveryCourierReview } from "../../services/deliveryCourierReviews";
import "./courier-review-sheet.css";

const TAGS = [
  ["on_time", "On time"],
  ["careful_handling", "Careful handling"],
  ["professional", "Professional"],
  ["good_communication", "Good communication"],
  ["late_delivery", "Late delivery"],
  ["poor_handling", "Poor handling"],
  ["hard_to_reach", "Hard to reach"],
];

export default function CourierReviewSheet({
  open,
  onClose,
  deliveryFulfillmentId,
  provider,
  onSubmitted,
}) {
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState([]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRating(0);
    setTags([]);
    setComment("");
    setSubmitting(false);
  }, [open, deliveryFulfillmentId]);

  const toggleTag = (value) => {
    void appHaptics.selection();
    setTags((current) =>
      current.includes(value)
        ? current.filter((tag) => tag !== value)
        : current.length < 4
          ? [...current, value]
          : current
    );
  };

  const submit = async () => {
    if (!rating) {
      toast.error("Choose a star rating first.");
      void appHaptics.warning();
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitDeliveryCourierReview({
        deliveryFulfillmentId,
        rating,
        tags,
        comment,
      });
      toast.success("Thanks for rating your courier.");
      void appHaptics.success();
      onSubmitted?.(result);
      onClose();
    } catch (error) {
      toast.error(
        error?.message?.replace(/^Firebase:\s*/i, "") ||
          "We couldn’t save your courier review. Please try again."
      );
      void appHaptics.error();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppBottomSheet
      open={open}
      onClose={submitting ? undefined : onClose}
      height="68dvh"
      ariaLabel="Rate delivery courier"
      surfaceClassName="courier-review-sheet"
      compactTop
      zIndex={5600}
      dismissible={!submitting}
      closeOnBackdrop={!submitting}
    >
      <header className="courier-review-header">
        <span><LuTruck aria-hidden="true" /></span>
        <div>
          <p>Delivery feedback</p>
          <h2>Rate {provider || "your courier"}</h2>
        </div>
        <button type="button" onClick={onClose} disabled={submitting} aria-label="Close">
          <LuX aria-hidden="true" />
        </button>
      </header>
      <div className="courier-review-content">
        <p className="courier-review-intro">
          This private My Thrift review helps us monitor delivery quality and
          resolve courier issues. It is not sent to the courier automatically.
        </p>
        <div className="courier-review-stars" aria-label="Courier rating">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              aria-label={`${value} star${value === 1 ? "" : "s"}`}
              className={value <= rating ? "is-active" : ""}
              onClick={() => {
                setRating(value);
                void appHaptics.selection();
              }}
            >
              <LuStar aria-hidden="true" />
            </button>
          ))}
        </div>
        <div className="courier-review-tags">
          {TAGS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={tags.includes(value) ? "is-selected" : ""}
              onClick={() => toggleTag(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="courier-review-comment">
          <span>Tell us more <small>Optional</small></span>
          <textarea
            value={comment}
            maxLength={1000}
            placeholder="How did the delivery go?"
            onChange={(event) => setComment(event.target.value)}
          />
        </label>
      </div>
      <footer className="courier-review-actions">
        <button type="button" onClick={submit} disabled={submitting || !deliveryFulfillmentId}>
          {submitting ? "Saving review…" : "Submit review"}
        </button>
      </footer>
    </AppBottomSheet>
  );
}
