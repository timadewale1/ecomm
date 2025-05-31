// src/components/Chat/AnswerModal.jsx

import React, { useEffect, useState, useCallback } from "react";
import Modal from "react-modal";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { MdOutlineClose, MdFlag } from "react-icons/md";
import { Oval } from "react-loader-spinner";
import toast from "react-hot-toast";
import { db } from "../../firebase.config";

// IMPORTANT: tell React Modal where to mount
Modal.setAppElement("#root");

const AnswerModz = ({ isOpen, onClose, inquiryId, inquiryData }) => {
  const navigate = useNavigate();

  // Local state for reporting overlay
  const [isReporting, setIsReporting] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [otherReasonText, setOtherReasonText] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [ackOpen, setAckOpen] = useState(false);

  // Product info (fetched separately)
  const [productImage, setProductImage] = useState("");
  const [productPrice, setProductPrice] = useState(null);

  // Vendor name (fetched separately)
  const [vendorName, setVendorName] = useState("");

  // If inquiryData is missing, or not closed, or already read, do not render
  if (!inquiryData) return null;
  if (inquiryData.status !== "closed" || inquiryData.customerHasRead) {
    return null;
  }

  // Destructure needed fields from inquiryData
  const {
    vendorReply,
    productId,
    productName,
    vendorId,
    question: customerQuestion,
  } = inquiryData;

  // 1) Fetch product’s coverImageUrl & price when modal first opens
  useEffect(() => {
    if (!productId) return;
    const fetchProduct = async () => {
      try {
        const prodRef = doc(db, "products", productId);
        const prodSnap = await getDoc(prodRef);
        if (prodSnap.exists()) {
          const data = prodSnap.data();
          setProductImage(data.coverImageUrl || "");
          setProductPrice(data.price ?? null);
        }
      } catch (err) {
        console.error("Error fetching product details:", err);
      }
    };
    if (isOpen) {
      fetchProduct();
    }
  }, [isOpen, productId]);

  // 2) Fetch vendor’s shopName when modal first opens
  useEffect(() => {
    if (!vendorId) return;
    const fetchVendor = async () => {
      try {
        const vendorRef = doc(db, "vendors", vendorId);
        const vendorSnap = await getDoc(vendorRef);
        if (vendorSnap.exists()) {
          const data = vendorSnap.data();
          setVendorName(data.shopName || "The vendor");
        }
      } catch (err) {
        console.error("Error fetching vendor:", err);
      }
    };
    if (isOpen) {
      fetchVendor();
    }
  }, [isOpen, vendorId]);

  // Helper to mark `customerHasRead: true` in Firestore
  const markAsRead = useCallback(async () => {
    if (!inquiryId) return;
    try {
      const inqRef = doc(db, "inquiries", inquiryId);
      await updateDoc(inqRef, { customerHasRead: true });
    } catch (err) {
      console.error("Error marking inquiry as read:", err);
    }
  }, [inquiryId]);

  // When user clicks the “×” close button
  const handleCloseClick = async () => {
    await markAsRead();
    onClose();
  };

  // When user clicks “View Product”
  const handleViewProduct = async () => {
    await markAsRead();
    onClose();
    navigate(`/product/${productId}`);
  };

  // Reporting logic
  const openReportOverlay = () => {
    setIsReporting(true);
  };
  const closeReportOverlay = () => {
    setIsReporting(false);
    setSelectedReason("");
    setOtherReasonText("");
  };

  const handleSubmitReport = async () => {
    if (
      !selectedReason ||
      (selectedReason === "Other" && !otherReasonText.trim())
    ) {
      toast.error("Please select or enter a reason.");
      return;
    }
    setSubmittingReport(true);
    const finalReason =
      selectedReason === "Other" ? otherReasonText.trim() : selectedReason;

    try {
      const inqRef = doc(db, "inquiries", inquiryId);
      await updateDoc(inqRef, {
        customerReported: true,
        customerReportReason: finalReason,
        customerReportedAt: serverTimestamp(),
      });
      // ← don’t call markAsRead() here anymore

      setSubmittingReport(false);
      setIsReporting(false);
      setAckOpen(true); // show the “thank you” overlay
    } catch (err) {
      console.error("Error submitting report:", err);
      toast.error("Could not submit report. Please try again.");
      setSubmittingReport(false);
    }
  };

  // After user closes the “thank you” ack, fully close the modal
  const handleAckClose = async () => {
    // Only now do we mark the inquiry as read
    await markAsRead();
    setAckOpen(false);
    onClose();
  };

  return (
    <>
      {/* ─── MAIN “ANSWERED QUESTION” MODAL ─────────────────────────────────── */}
      <Modal
        isOpen={isOpen}
        onRequestClose={handleCloseClick}
        contentLabel="Your Question Has Been Answered"
        style={{
          content: {
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            top: "auto",
            borderRadius: "20px 20px 0 0",
            padding: "20px",
            backgroundColor: "#ffffff",
            border: "none",
            height: "79%",
            animation: "slide-up 0.3s ease-in-out",
            overflow: "hidden",
          },
          overlay: {
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            zIndex: 3000,
          },
        }}
      >
        <div className="flex flex-col h-full">
          {/* Header: Vendor name, “has replied to your question” */}
          <div className="mb-4 w-full flex items-center justify-between">
            <h2 className="font-opensans text-lg font-semibold text-gray-800">
              {vendorName} has replied to your question
            </h2>
            <MdOutlineClose
              className="text-black text-xl cursor-pointer"
              onClick={handleCloseClick}
            />
          </div>

          {/* Product image (large) */}
          {productImage ? (
            <img
              src={productImage}
              alt={productName}
              className="w-full h-40 object-cover rounded-md mb-2"
            />
          ) : (
            <div className="w-full h-40 bg-gray-200 rounded-md mb-2" />
          )}

          {/* Product name & price */}
          <div className="mb-4">
            <p className="font-opensans text-lg font-medium text-gray-800">
              {productName}
            </p>
            {productPrice != null && (
              <p className="text-base font-opensans text-gray-600">
                ₦{productPrice.toLocaleString()}
              </p>
            )}
          </div>

          {/* ─── CHAT BUBBLES SECTION ──────────────────────────────────────── */}
          <div className="flex-1 shadow-md  overflow-y-auto px-2 mb-4 hide-scrollbar">
            {/* Customer’s Question bubble (gray, left) */}
            <div className="flex mb-3">
              <div className="bg-gray-100 text-gray-800 rounded-lg px-4 py-3 max-w-[80%]">
                <p className="text-sm font-opensans">{customerQuestion}</p>
              </div>
            </div>

            {/* Vendor’s Reply bubble (orange, right) */}
            <div className="flex justify-end mb-3">
              <div className="bg-customOrange text-white rounded-lg px-4 py-3 max-w-[80%]">
                <p className="text-sm font-opensans">{vendorReply}</p>
              </div>
            </div>
          </div>

          {/* Actions: View Product / Report Chat */}
          <div className="flex flex-col gap-3 px-2 pb-4">
            <button
              onClick={handleViewProduct}
              className="px-6 h-12 w-full text-sm font-opensans bg-customOrange text-white font-medium rounded-full"
            >
              View Product
            </button>
            <button
              onClick={openReportOverlay}
              className="px-6 h-12 w-full text-sm font-opensans bg-transparent border border-gray-400 text-gray-700 font-medium rounded-full"
            >
              Report Chat
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── NESTED “REPORT REASON” OVERLAY ─────────────────────────────────── */}
      {isReporting && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-[3500] flex items-center justify-center"
          onClick={closeReportOverlay}
        >
          <div
            className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 bg-orange-100 flex justify-center items-center rounded-full">
                  <MdFlag className="text-customOrange" />
                </div>
                <h2 className="font-opensans text-base font-semibold">
                  Report Chat
                </h2>
              </div>
              <MdOutlineClose
                className="text-black text-xl cursor-pointer"
                onClick={closeReportOverlay}
              />
            </div>

            {/* Reasons List */}
            <div className="space-y-3 mb-4">
              {["Harassment", "Spam", "Inappropriate language", "Other"].map(
                (reason) => (
                  <div
                    key={reason}
                    className="flex items-center cursor-pointer"
                    onClick={() => {
                      setSelectedReason(reason);
                      if (reason !== "Other") {
                        setOtherReasonText("");
                      }
                    }}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex justify-center items-center mr-3 ${
                        selectedReason === reason
                          ? "border-customOrange"
                          : "border-gray-300"
                      }`}
                    >
                      {selectedReason === reason && (
                        <div className="w-3 h-3 rounded-full bg-customOrange" />
                      )}
                    </div>
                    <span className="font-opensans text-gray-800">
                      {reason}
                    </span>
                  </div>
                )
              )}

              {selectedReason === "Other" && (
                <textarea
                  rows={3}
                  className="border w-full rounded font-opensans p-2 text-sm mt-2 resize-none"
                  placeholder="Tell us what's wrong…"
                  value={otherReasonText}
                  onChange={(e) => setOtherReasonText(e.target.value)}
                />
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                disabled={
                  submittingReport ||
                  !selectedReason ||
                  (selectedReason === "Other" && !otherReasonText.trim())
                }
                className="bg-customOrange text-white px-10 py-2 rounded-full disabled:opacity-40 flex items-center"
                onClick={handleSubmitReport}
              >
                {submittingReport ? (
                  <Oval height={18} width={18} strokeWidth={4} color="#fff" />
                ) : (
                  "Send"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ACKNOWLEDGEMENT AFTER REPORT ─────────────────────────────────── */}
      {ackOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-[4000] flex items-center justify-center"
          onClick={handleAckClose}
        >
          <div
            className="bg-white rounded-lg shadow-lg w-full max-w-sm mx-4 p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <MdFlag className="mx-auto text-4xl text-customOrange mb-4" />
            <p className="font-opensans text-sm mb-6">
              Thanks for letting us know. We’re reviewing this chat and will
              keep you updated.
            </p>
            <button
              onClick={handleAckClose}
              className="mt-2 font-opensans bg-customOrange text-white px-6 py-2 rounded-full"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AnswerModz;
