import React, { useContext, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import StorePagePreview from "./StorePreview";
import { VendorContext } from "../Context/Vendorcontext";

const StoreCelebration = ({ onClose }) => {
  const [showCelebration, setShowCelebration] = useState(false);
  sessionStorage.setItem("walletSetUp", "true");
  
    const { vendorData } = useContext(VendorContext);

  const completed = localStorage.getItem("walletSetUp");
  useEffect(() => {
    if (completed === "true" && vendorData.isApproved) {
      setShowCelebration(true);
      sessionStorage.removeItem("walletSetUp");
    }
  }, [completed]);

  return (
    <AnimatePresence>
      {showCelebration && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-[8999]"
        >
          <motion.div
            key="modal"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "tween", duration: 0.8 }}
            className={`fixed inset-0 flex justify-center items-center z-[9999] font-opensans transition-opacity duration-300 ${
              showCelebration ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <div className="bg-white rounded-2xl p-3 w-[90%] max-w-md mx-auto shadow-2xl text-center">
              <h2 className="text-xl text-customOrange decoration-clone">🎉Congratulations!</h2>
              <p className="text-sm mb-1">
                Your store is live! Here's how it looks to customers:
              </p>
              <div className="border-2 border-customOrange border-dashed rounded-md">

              <StorePagePreview />
              </div>
              <button
                onClick={() => {
                  setShowCelebration(false);
                  localStorage.setItem('celebrated', 'true');
                  onClose && onClose();
                }}
                className="mt-2 px-4 py-2 rounded-full border border-customOrange text-white bg-customOrange"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StoreCelebration;
