import React, { useState, useEffect } from "react";
import Modal from "react-modal";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { MdOutlineClose, MdOutlineReviews, MdCancel } from "react-icons/md";
import { db } from "../../firebase.config";

Modal.setAppElement("#root"); // Ensure accessibility compliance

const ReviewModal = ({ isOpen, onClose, orderId, orderData }) => {
  const navigate = useNavigate();
  const [vendorName, setVendorName] = useState("the vendor");
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [otherReasonText, setOtherReasonText] = useState("");

  useEffect(() => {
    const fetchVendorName = async () => {
      if (!orderData?.vendorId) return;

      try {
        const vendorRef = doc(db, "vendors", orderData.vendorId);
        const vendorDoc = await getDoc(vendorRef);

        if (vendorDoc.exists()) {
          const vendorData = vendorDoc.data();
          setVendorName(vendorData.shopName || "the vendor");
        }
      } catch (error) {
        console.error("Error fetching vendor name:", error);
      }
    };

    fetchVendorName();
  }, [orderData?.vendorId]);

  const handleDisputeSubmit = async () => {
    const finalReason =
      disputeReason === "Other" ? otherReasonText : disputeReason;

    if (!finalReason) {
      alert("Please select or enter a reason for the dispute.");
      return;
    }

    // Update order with `disputeOrder: true` and store the reason
    if (orderId) {
      try {
        const orderRef = doc(db, "orders", orderId);
        await updateDoc(orderRef, {
          disputeOrder: true,
          disputeReason: finalReason,
        });
      } catch (error) {
        console.error("Error updating order with dispute status:", error);
      }
    }

    // Redirect to email client
    const emailSubject = encodeURIComponent("Dispute Claim - Order Issue");
    const emailBody = encodeURIComponent(
      `Hello Support,\n\nI have a dispute regarding my order.\nReason: ${finalReason}\n\nPlease assist me further.\n\nThanks,`
    );
    window.location.href = `mailto:support@mythrift.store?subject=${emailSubject}&body=${emailBody}`;

    setIsDisputeModalOpen(false);
    onClose();
  };

  const handleReviewClick = async () => {
    if (orderId) {
      try {
        const orderRef = doc(db, "orders", orderId);
        await updateDoc(orderRef, { isReviewed: true });
      } catch (error) {
        console.error("Error updating order with review status:", error);
      }
      navigate(`/reviews/${orderData.vendorId}`);
    }
    onClose();
  };

  const handleCloseModal = async () => {
    if (orderId) {
      try {
        const orderRef = doc(db, "orders", orderId);
        await updateDoc(orderRef, { isReviewed: true });
      } catch (error) {
        console.error("Error marking order as reviewed:", error);
      }
    }
    onClose();
  };

  return (
    <>
      {/* Main Review Modal */}
      <Modal
        isOpen={isOpen}
        onRequestClose={onClose}
        contentLabel="Leave a Review"
        style={{
          content: {
            position: "absolute",
            bottom: "0",
            left: "0",
            right: "0",
            top: "auto",
            borderRadius: "20px 20px 0 0",
            padding: "20px",
            backgroundColor: "#ffffff",
            border: "none",
            height: "60%",
            animation: "slide-up 0.3s ease-in-out",
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
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-between mb-4 w-full">
            <div className="flex items-center space-x-2">
              <div className="w-9 h-9 bg-rose-100 flex justify-center items-center rounded-full">
                <MdOutlineReviews className="text-customRichBrown text-2xl" />
              </div>
              <h2 className="font-opensans text-lg ml-4 font-semibold">
                Leave a Review 🧡
              </h2>
            </div>
            <MdOutlineClose
              className="text-black text-xl cursor-pointer"
              onClick={handleCloseModal}
            />
          </div>
          <div className="px-4">
            <p className="text-sm font-opensans text-black font-normal">
              {vendorName} has delivered your order. We hope you love it! Please
              leave a review. Our vendors love hearing from you.
            </p>
            <div className="mt-20 flex flex-col justify-center">
              <button
                onClick={handleReviewClick}
                className="px-6 h-12 w-full text-sm font-opensans py-2 bg-customOrange text-white font-medium rounded-full"
              >
                Write a Review
              </button>
              <button
                onClick={() => setIsDisputeModalOpen(true)}
                className="px-6 h-12 w-full mt-4 text-sm font-opensans py-2 bg-transparent border-1 border-customRichBrown text-customRichBrown font-medium rounded-full"
              >
                Dispute
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Dispute Modal */}
      <Modal
        isOpen={isDisputeModalOpen}
        onRequestClose={() => setIsDisputeModalOpen(false)}
        className="modal-content-reason h-auto"
        overlayClassName="modal-overlay"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 bg-rose-100 flex justify-center items-center rounded-full">
              <MdCancel className="text-customRichBrown" />
            </div>
            <h2 className="font-opensans text-base font-semibold">
              Reason for Dispute
            </h2>
          </div>
          <MdOutlineClose
            className="text-black text-xl cursor-pointer"
            onClick={() => setIsDisputeModalOpen(false)}
          />
        </div>
        <div className="space-y-3 mb-4">
          {[
            "Order hasn't been delivered",
            "Order arrived horribly damaged",
            "Incorrect order",
            "Other",
          ].map((reason, index) => (
            <div
              key={index}
              className={`cursor-pointer flex items-center text-gray-800 mb-1 ${
                disputeReason === reason
                  ? "border-customOrange"
                  : "border-gray-200"
              }`}
              onClick={() => {
                setDisputeReason(reason);
                if (reason !== "Other") setOtherReasonText(""); // Clear otherReasonText if not "Other"
              }}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex justify-center items-center mr-3 ${
                  disputeReason === reason
                    ? "border-customOrange"
                    : "border-customOrange border-opacity-80"
                }`}
              >
                {disputeReason === reason && (
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                )}
              </div>
              <span className="font-opensans text-black">{reason}</span>
            </div>
          ))}

          {/* Show text input if "Other" is selected */}
          {disputeReason === "Other" && (
            <input
              type="text"
              placeholder="Please explain well oh..."
              className="border px-2 h-20 text-xs rounded w-full"
              value={otherReasonText}
              onChange={(e) => setOtherReasonText(e.target.value)}
            />
          )}
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={handleDisputeSubmit}
            className="bg-customOrange text-white font-opensans py-2 px-12 rounded-full"
          >
            Send
          </button>
        </div>
      </Modal>
    </>
  );
};

export default ReviewModal;
