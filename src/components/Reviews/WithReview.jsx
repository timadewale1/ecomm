// WithReviewModal.jsx
import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../../firebase.config";
import ReviewModal from "./ReviewModal";
import { useAuth } from "../../custom-hooks/useAuth";

const WithReviewModal = ({ children }) => {
  const { currentUser } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [modalOrderId, setModalOrderId] = useState(null);
  const [orderData, setOrderData] = useState(null);

  useEffect(() => {
    if (!currentUser) return; // Only check if user is logged in

    const fetchDeliveredOrders = async () => {
      try {
        const ordersRef = collection(db, "orders");
        const q = query(
          ordersRef,
          where("userId", "==", currentUser.uid),
          where("progressStatus", "==", "Delivered"),
          where("isReviewed", "==", false)
        );
        const querySnapshot = await getDocs(q);

        const dismissed = new Set(
          JSON.parse(sessionStorage.getItem("dismissedReviewOrders") || "[]")
        );
        const deliveredOrders = [];
        querySnapshot.forEach((orderDoc) => {
          if (!dismissed.has(orderDoc.id)) {
            deliveredOrders.push({ id: orderDoc.id, ...orderDoc.data() });
          }
        });

        // If we found at least one unreviewed delivered order, show the modal for the first
        if (deliveredOrders.length > 0) {
          const firstOrder = deliveredOrders[0];
          setModalOrderId(firstOrder.id);
          setOrderData(firstOrder); // Store full order data for the modal
          setShowModal(true);
        }
      } catch (error) {
        console.error("Error fetching delivered orders:", error);
      }
    };

    fetchDeliveredOrders();
  }, [currentUser]);

  const handleModalClose = () => {
    if (modalOrderId) {
      const dismissed = new Set(
        JSON.parse(sessionStorage.getItem("dismissedReviewOrders") || "[]")
      );
      dismissed.add(modalOrderId);
      sessionStorage.setItem(
        "dismissedReviewOrders",
        JSON.stringify(Array.from(dismissed))
      );
    }
    // Close modal & clear states
    setShowModal(false);
    setModalOrderId(null);
    setOrderData(null);
  };

  return (
    <>
      {/* Render the children page component normally */}
      {children}

      {/* Conditionally render the ReviewModal with the order data */}
      <ReviewModal
        isOpen={showModal}
        onClose={handleModalClose}
        orderId={modalOrderId}
        orderData={orderData}
      />
    </>
  );
};

export default WithReviewModal;
