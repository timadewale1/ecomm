import React, { useEffect, useState, useContext, useRef } from "react";
import StoreCelebration from "./StoreCelebration";
import { VendorContext } from "../Context/Vendorcontext";

const WithStoreCelebrationModal = ({ children }) => {
  const { vendorData: vendor } = useContext(VendorContext);
  const [showModal, setShowModal] = useState(false);
  const openedRef = useRef(false); // prevent instant close after Firestore updates

  useEffect(() => {
    if (!vendor) return;
    const ready = vendor.walletSetup === true && vendor.introcelebration === false;

    // Only open the first time we detect "ready"
    if (ready && !openedRef.current) {
      setShowModal(true);
      openedRef.current = true;
    }
  }, [vendor]);

  return (
    <>
      {children}
      {showModal && (
        <StoreCelebration
          onClose={() => {
            setShowModal(false);
          }}
        />
      )}
    </>
  );
};

export default WithStoreCelebrationModal;
