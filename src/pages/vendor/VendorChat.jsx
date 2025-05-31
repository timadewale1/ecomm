// src/pages/VendorChat.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  fetchInquiryDetails,
  subscribeToInquiry,
  clearChat,
} from "../../redux/reducers/chatSlice";
import { GoChevronLeft } from "react-icons/go";
import { FiMoreHorizontal } from "react-icons/fi";
import { MdOutlineClose, MdFlag } from "react-icons/md";
import { Oval } from "react-loader-spinner";
import { IoMdSend } from "react-icons/io";
import toast from "react-hot-toast";
import { doc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../../firebase.config";
import Loading from "../../components/Loading/Loading";

export default function VendorChat() {
  const { inquiryId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Pull everything from the Redux slice
  const { inquiry, product, customer, loading, error } = useSelector(
    (state) => state.chat
  );
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  // ── report‐chat UI state ─────────────────────────────────────────
  const [showActions, setShowActions] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [ackOpen, setAckOpen] = useState(false);
  const [showAlreadyReportedModal, setShowAlreadyReportedModal] =
    useState(false);
  // 1) On mount: fetch inquiry/product/customer once, then subscribe
  useEffect(() => {
    if (!inquiryId) return;

    dispatch(fetchInquiryDetails(inquiryId));
    dispatch(subscribeToInquiry(inquiryId));

    return () => {
      dispatch(clearChat());
    };
  }, [dispatch, inquiryId]);

  if (loading) {
    return <Loading />;
  }
  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500 font-opensans">
          Error: We’re looking into this
        </div>
      </div>
    );
  }

  // Helper to format Firestore Timestamp
  const formatTimestamp = (ts) =>
    ts instanceof Timestamp
      ? ts.toDate().toLocaleString([], {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

  // “Tap to View” click handler
  const handleTapToView = () => {
    navigate("/vendor-products", {
      state: { highlightId: inquiry?.productId || null },
    });
  };

  // Send the vendor’s reply
  const handleSendReply = async () => {
    if (!replyText.trim()) {
      toast.error("Please type a reply before sending.");
      return;
    }
    setSending(true);
    try {
      const inquiryRef = doc(db, "inquiries", inquiryId);
      await updateDoc(inquiryRef, {
        vendorReply: replyText.trim(),
        repliedAt: serverTimestamp(),
        status: "closed",
      });
      toast.success("Reply sent.");
      setTimeout(() => navigate("/vchats"), 500);
    } catch (err) {
      console.error("Failed to send reply:", err);
      toast.error("Could not send reply. Try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full mx-auto bg-white">
      {/* TOP BAR */}
      <div className="sticky top-0 bg-white z-20 border-b px-4 py-3 flex items-center">
        <GoChevronLeft
          className="cursor-pointer mr-4 text-2xl text-gray-700"
          onClick={() => navigate("/vchats")}
        />
        <div className="flex-1 flex items-center justify-between">
          <div>
            <div className="font-semibold text-lg text-gray-800 font-opensans">
              {product?.name || "Product"}
            </div>
            <div className="text-sm text-gray-500 font-opensans">
              Chat with {customer?.username || inquiry?.customerId}
            </div>
          </div>

          {/* “…” button */}
          <div className="relative">
            <FiMoreHorizontal
              className="text-2xl text-gray-700 cursor-pointer"
              onClick={() => setShowActions((prev) => !prev)}
            />
            {showActions && (
              <div
                className="absolute right-0 mt-2 w-44 bg-white rounded-lg shadow-lg border z-30"
                onMouseLeave={() => setShowActions(false)}
              >
                {inquiry?.reported ? (
                  // If already reported, show a "View report status" menu item
                  <button
                    className="flex items-center px-4 py-2 text-sm font-opensans w-full hover:bg-gray-100"
                    onClick={() => {
                      setShowActions(false);
                      setShowAlreadyReportedModal(true);
                    }}
                  >
                    <MdFlag className="mr-2 text-customOrange" />
                    View report status
                  </button>
                ) : (
                  // If not yet reported, show the normal "Report chat" item
                  <button
                    className="flex items-center px-4 py-2 text-sm font-opensans w-full hover:bg-gray-100"
                    onClick={() => {
                      setShowActions(false);
                      setIsReportModalOpen(true);
                    }}
                  >
                    <MdFlag className="mr-2 text-customOrange" />
                    Report chat
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PRODUCT INFO + “Tap to View” OVERLAY */}
      {product && (
        <div className="relative px-4 py-4 flex flex-col items-start">
          <div
            onClick={handleTapToView}
            className="relative w-64 h-64 rounded-lg overflow-hidden cursor-pointer"
          >
            <img
              src={product.coverImageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-3 right-3 bg-black bg-opacity-70 text-white text-[11px] px-3 py-1 rounded-full font-opensans shadow-lg">
              Tap to View Details
            </div>
          </div>

          <p className="text-xs font-opensans mt-2">
            One‐way chat — {customer?.username || inquiry?.customerId} asked
            about{" "}
            <span className="uppercase text-customOrange font-semibold">
              {product.name}
            </span>
            . You have one reply; please be clear. Thanks!
          </p>
        </div>
      )}

      {/* SCROLLABLE CHAT AREA */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        <div className="flex">
          <img
            src={customer?.photoURL || "/default-avatar.png"}
            alt="customer avatar"
            className="w-10 h-10 rounded-full object-cover mr-3"
          />
          <div>
            <div className="bg-gray-100 text-gray-800 rounded-lg px-4 py-2 font-opensans max-w-xs">
              {inquiry?.question}
            </div>
            <div className="mt-1 text-xs font-opensans text-gray-400">
              {formatTimestamp(inquiry?.createdAt)}
            </div>
          </div>
        </div>

        {inquiry?.status === "closed" && inquiry.vendorReply && (
          <div className="flex justify-end">
            <div>
              <div className="bg-customOrange text-white rounded-lg px-4 py-2 font-opensans max-w-xs">
                {inquiry.vendorReply}
              </div>
              <div className="mt-1 text-xs text-gray-400 text-right font-opensans">
                {formatTimestamp(inquiry.repliedAt)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* REPLY INPUT AREA */}
      {inquiry?.status === "open" && (
        <div className="border-t px-4 py-3">
          <div className="relative">
            <input
              type="text"
              className="w-full border border-gray-300 rounded-full px-4 py-2 pr-16 text-sm font-opensans focus:outline-none focus:ring-2 focus:ring-customOrange"
              placeholder="Type your reply…"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              disabled={sending}
            />
            <button
              onClick={handleSendReply}
              disabled={sending || !replyText.trim()}
              className={`absolute right-2 top-1/2 transform -translate-y-1/2 bg-customOrange text-white rounded-full p-1.5 text-xl ${
                sending || !replyText.trim()
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-orange-600"
              }`}
            >
              {sending ? (
                <Oval
                  height={20}
                  width={20}
                  strokeWidth={4}
                  color="#ffffff"
                  secondaryColor="transparent"
                  visible={true}
                />
              ) : (
                <IoMdSend />
              )}
            </button>
          </div>
        </div>
      )}

      {/* FOOTER DISCLAIMER */}
      {inquiry?.status === "open" ? (
        <div className="text-center text-xs text-gray-500 py-2 font-opensans">
          Chats are monitored in real‐time.
        </div>
      ) : (
        <div className="text-center text-xs text-gray-500 py-2 px-3 font-opensans">
          This chat is closed. You’ve answered their question—now focus on
          making that sale!
        </div>
      )}

      {/* ── REPORT CHAT “MODAL” REPLACEMENT ──────────────────────────── */}
      {showAlreadyReportedModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center"
          onClick={() => setShowAlreadyReportedModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-opensans text-lg font-semibold">
                Report Status
              </h2>
              <MdOutlineClose
                className="text-black text-xl cursor-pointer"
                onClick={() => setShowAlreadyReportedModal(false)}
              />
            </div>

            {/* Body */}
            <p className="font-opensans text-sm">
              You’ve already reported this chat. Our team is reviewing it and
              will keep you updated. Thanks for bringing this to our attention.
            </p>

            {/* Close Button */}
            <div className="mt-6 flex justify-end">
              <button
                className="bg-customOrange text-white px-4 py-2 rounded-full"
                onClick={() => setShowAlreadyReportedModal(false)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {isReportModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center"
          onClick={() => setIsReportModalOpen(false)}
        >
          {/* 
            Stop propagation if the user clicks inside the white box 
            so that clicking inside doesn’t close the overlay.
          */}
          <div
            className="bg-white rounded-lg shadow-lg w-full  mx-4 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 bg-rose-100 flex justify-center items-center rounded-full">
                  <MdFlag className="text-customRichBrown" />
                </div>
                <h2 className="font-opensans text-lg font-semibold">
                  Report Chat
                </h2>
              </div>
              <MdOutlineClose
                className="text-black text-xl cursor-pointer"
                onClick={() => setIsReportModalOpen(false)}
              />
            </div>

            {/* reasons list */}
            <div className="space-y-3  mb-4">
              {["Harassment", "Spam", "Inappropriate language", "Other"].map(
                (reason) => (
                  <div
                    key={reason}
                    className="flex items-center cursor-pointer"
                    onClick={() => {
                      setSelectedReason(reason);
                      if (reason !== "Other") {
                        setOtherReason("");
                      }
                    }}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex justify-center items-center mr-3 ${
                        selectedReason === reason
                          ? "border-customOrange"
                          : "border-customOrange/60"
                      }`}
                    >
                      {selectedReason === reason && (
                        <div className="w-3 h-3 rounded-full bg-customOrange" />
                      )}
                    </div>
                    <span className="font-opensans">{reason}</span>
                  </div>
                )
              )}

              {selectedReason === "Other" && (
                <textarea
                  rows={3}
                  className="border w-full rounded font-opensans p-2 text-base mt-2 resize-none overflow-hidden"
                  placeholder="Tell us what's wrong..."
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                />
              )}
            </div>

            {/* submit button */}
            <div className="flex justify-end">
              <button
                disabled={
                  submittingReport ||
                  !selectedReason ||
                  (selectedReason === "Other" && !otherReason.trim())
                }
                className="bg-customOrange text-white px-10 py-2 rounded-full disabled:opacity-40"
                onClick={async () => {
                  setSubmittingReport(true);
                  try {
                    const inquiryRef = doc(db, "inquiries", inquiryId);
                    await updateDoc(inquiryRef, {
                      reported: true,
                      reportReason:
                        selectedReason === "Other"
                          ? otherReason.trim()
                          : selectedReason,
                      status:
                        inquiry?.status === "open" ? "closed" : inquiry?.status,
                      reportedAt: serverTimestamp(),
                    });
                    setIsReportModalOpen(false);
                    setAckOpen(true);
                  } catch (err) {
                    toast.error("Could not submit report. Please retry.");
                    console.error(err);
                  } finally {
                    setSubmittingReport(false);
                  }
                }}
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

      {/* ── ACKNOWLEDGEMENT POPUP ───────────────────────────────────── */}
      {ackOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center"
          onClick={() => setAckOpen(false)}
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
          </div>
        </div>
      )}
    </div>
  );
}
