import React, { useEffect, useState } from "react";
import StoreCelebration from "./StoreCelebration";

const WithStoreCelebrationModal = ({ children }) => {
  const [showModal, setShowModal] = useState(true);
  sessionStorage.setItem("celebration", "true");

  useEffect(() => {
    const hasBeenShown = localStorage.getItem("celebrated");

    if (hasBeenShown === "true") {
      setShowModal(false);

      sessionStorage.removeItem("celebration");
    }
  }, []);

  console.log("Store Celebration rendered");

  return (
    <>
      {children}
      {showModal && (
        <StoreCelebration
          onClose={() => {
            setShowModal(false);
            sessionStorage.removeItem("celebration");
          }}
        />
      )}
    </>
  );
};

export default WithStoreCelebrationModal;
