import React, { useEffect, useState } from "react";
import StoreCelebration from "./StoreCelebration";

const WithStoreCelebrationModal = ({ children }) => {
  const [showModal, setShowModal] = useState(true);

  useEffect(() => {
    const hasBeenShown = localStorage.getItem('celebrated')

    if (hasBeenShown === 'true') {
        setShowModal(false)
    }
  }, [])
  
  console.log("Store Celebration rendered");

  return (
    <>
      {children}
      {showModal && (<StoreCelebration onClose={
        () => setShowModal(false)} />)}
    </>
  );
};

export default WithStoreCelebrationModal;
