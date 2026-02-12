import React, { useMemo, useState, useEffect } from "react";
import Modal from "react-modal";
import toast from "react-hot-toast";
import { MdOutlineClose, MdOutlineReportProblem } from "react-icons/md";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase.config";
// OPTIONAL (only if you want rate limiting like disputes/favorites)
// import { handleUserActionLimit } from "../../services/userWriteHandler";

Modal.setAppElement("#root");

const REASONS = [
  "Misleading description or photos",
  "Counterfeit / fake item",
  "Prohibited or unsafe item",
  "Scam / suspicious listing",
  "Offensive / inappropriate content",
  "Other",
];

const ProductReportModal = ({
  isOpen,
  onClose,
  product,
  vendor,
  currentUser,
  context = {}, // { surface, isShared, url, selectedSize, selectedColor, subProductId, selectedImageUrl }
}) => {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setReason("");
      setDetails("");
      setSending(false);
    }
  }, [isOpen]);

  const finalReason = useMemo(() => {
    if (!reason) return "";
    return reason === "Other" ? "Other" : reason;
  }, [reason]);

  const canSend = useMemo(() => {
    if (!finalReason) return false;
    if (finalReason === "Other") return details.trim().length >= 10;
    return true;
  }, [finalReason, details]);

  const handleSubmit = async () => {
    const uid = currentUser?.uid;
    if (!uid) return toast.error("Please sign in to report this product.");

    if (!finalReason) return toast.error("Please select a reason.");
    if (finalReason === "Other" && details.trim().length < 10) {
      return toast.error("Please describe the issue (min 10 characters).");
    }

    if (!product?.id || !product?.vendorId) {
      return toast.error("Missing product info. Please refresh and try again.");
    }

    setSending(true);

    try {
      // OPTIONAL rate limiting (enable only if your rules allow the report_* keys)
      // await handleUserActionLimit(uid, "report", {}, { dayLimit: 20, hourLimit: 10, minuteLimit: 3 });

      const payload = {
        type: "product",
        status: "open",

        reason: finalReason,
        details: String(details || "").trim(),

        productId: product.id,
        vendorId: product.vendorId,

        productName: product?.name || "",
        productCover: product?.coverImageUrl || "",
        productPrice: Number(product?.price || 0),

        vendorShopName: vendor?.shopName || "",

        reporterId: uid,
        reporterEmail: currentUser?.email || "",

        // context (helps you debug where the report came from)
        surface: context?.surface || "product_detail",
        isShared: !!context?.isShared,
        url: context?.url || window.location.href,

        // selection context (very useful for fashion variants)
        selectedSize: context?.selectedSize || "",
        selectedColor: context?.selectedColor || "",
        subProductId: context?.subProductId || null,
        selectedImageUrl: context?.selectedImageUrl || "",

        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "productReports"), payload);

      toast.success("Report sent. Thanks for helping keep My Thrift safe.");
      onClose?.();
    } catch (err) {
      console.error("[product report] failed:", err);
      toast.error(err?.message || "Failed to send report. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="modal-content-stockpile h-auto"
      overlayClassName="modal-content-overloy "
      ariaHideApp={false}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 bg-rose-100 flex justify-center items-center rounded-full">
            <MdOutlineReportProblem className="text-customRichBrown" />
          </div>
          <h2 className="font-opensans text-base font-semibold">
            Report this product
          </h2>
        </div>

        <MdOutlineClose
          className="text-black text-xl cursor-pointer"
          onClick={onClose}
          aria-label="Close"
        />
      </div>

      <p className="text-xs font-opensans text-gray-600 mb-3">
        Pick a reason and add details if needed. Our team will review it.
      </p>

      {/* Reasons (same “radio” style as dispute) */}
      <div className="space-y-3 mb-4">
        {REASONS.map((r) => (
          <div
            key={r}
            className="cursor-pointer flex items-center text-gray-800 mb-1"
            onClick={() => {
              setReason(r);
              if (r !== "Other") setDetails("");
            }}
          >
            <div
              className={`w-5 h-5 rounded-full border-2 flex justify-center items-center mr-3 ${
                reason === r ? "border-customOrange" : "border-customOrange/80"
              }`}
            >
              {reason === r && (
                <div className="w-3 h-3 rounded-full bg-orange-500" />
              )}
            </div>

            <span className="font-opensans text-black text-sm">{r}</span>
          </div>
        ))}

        {reason === "Other" && (
          <textarea
            rows={3}
            placeholder="Tell us what’s wrong..."
            className="border px-3 py-2 text-sm rounded w-full font-opensans"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={700}
          />
        )}

        {reason !== "Other" && (
          <textarea
  rows={3}
  placeholder="Tell us what’s wrong..."
  className="border px-3 py-2 text-sm rounded w-full font-opensans resize-none"
  value={details}
  onChange={(e) => setDetails(e.target.value)}
  maxLength={700}
/>
        )}
      </div>

      <div className="flex justify-center mt-4">
        <button
          onClick={handleSubmit}
          disabled={!canSend || sending}
          className={`bg-customOrange text-white font-opensans py-2 w-full rounded-full ${
            !canSend || sending ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </div>
    </Modal>
  );
};

export default ProductReportModal;
