import React, { useState, useEffect } from "react";
import WhatsAppModal from "./WhatsAppModal";

const WithWhatsAppModal = ({ children }) => {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const lastShownTime = localStorage.getItem("lastWhatsAppModalShown");
    const currentTime = new Date().getTime();
    const hasBeenShown = localStorage.getItem("hasWhatsAppModalShown");

    // Show modal if more than 2 hours have passed or it's the first time or it hasn't been shown before
    if (!hasBeenShown && (!lastShownTime || currentTime - lastShownTime >   60 * 1000)) {
      setShowModal(true);
    }
  }, []);

  const handleModalClose = () => {
    // Update last shown time in localStorage
    localStorage.setItem("lastWhatsAppModalShown", new Date().getTime());
    setShowModal(false);
  };

  return (
    <>
      {children}
      <WhatsAppModal isOpen={showModal} onClose={handleModalClose} />
    </>
  );
};

export default WithWhatsAppModal;
