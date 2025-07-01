// src/components/vendor/WithPickupPrompt.jsx
import React, { useState, useEffect } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { useAuth } from "../../custom-hooks/useAuth";
import { db } from "../../firebase.config";
import PickupPromptModal from "./PickupModal";

const WithPickupPrompt = ({ children }) => {
  const { currentUser } = useAuth();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    const vendorRef = doc(db, "vendors", currentUser.uid);
    const unsubscribe = onSnapshot(vendorRef, (snap) => {
      const data = snap.data() || {};

      const needsPrompt =
        data.isApproved === true &&
        data.deliveryMode === "Delivery" &&
        data.offerPickupPrompt !== true;

      setShowModal(needsPrompt);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleAnswer = async (offersPickup, location) => {
    if (!currentUser) return;

    const vendorRef = doc(db, "vendors", currentUser.uid);
    const updates = { offerPickupPrompt: true };

    if (offersPickup && location) {
      updates.deliveryMode = "Delivery & Pickup";
      updates.pickupAddress = location.address;
      updates.pickupLat = location.lat;
      updates.pickupLng = location.lng;
    }

    try {
      await updateDoc(vendorRef, updates);
    } catch (err) {
      console.error("Error updating pickup settings:", err);
    } finally {
      setShowModal(false);
    }
  };

  const handleClose = () => {
    // user closed without choosing → still mark as prompted
    handleAnswer(false);
  };

  return (
    <>
      {children}
      {currentUser && (
        <PickupPromptModal
          isOpen={showModal}
          onClose={handleClose}
          onAnswer={handleAnswer}
        />
      )}
    </>
  );
};

export default WithPickupPrompt;
