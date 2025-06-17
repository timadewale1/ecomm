// src/components/Wallet/WithWalletSetupModal.jsx

import React, { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { useAuth } from "../../custom-hooks/useAuth";
import { db } from "../../firebase.config";
import WalletSetupModal from "./WalletSetupModal";

const WithWalletSetupModal = ({ children }) => {
  const { currentUser } = useAuth();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    const vendorRef = doc(db, "vendors", currentUser.uid);
    const unsubscribe = onSnapshot(vendorRef, (snap) => {
      const data = snap.data();
      // Show modal if walletSetup is explicitly false
      setShowModal(data?.walletSetup === false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleClose = () => {
    setShowModal(false);
  };

  return (
    <>
      {children}
      {currentUser && (
        <WalletSetupModal
          isOpen={showModal}
          onClose={handleClose}
          vendorId={currentUser.uid}
        />
      )}
    </>
  );
};

export default WithWalletSetupModal;
