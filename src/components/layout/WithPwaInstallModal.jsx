import React, { useState, useEffect } from "react";
import PWAInstallModal from "./PwaInstallModal";

const WithPwaInstallModal = ({ children }) => {
  const [showPwaModal, setShowPwaModal] = useState(true);
  console.log("WithPwaInstallModal rendered");

  return (
    <>
      {children}
      {showPwaModal && (<PWAInstallModal onClose={
        () => setShowPwaModal(false)} />)}
    </>
  );
};

export default WithPwaInstallModal;
