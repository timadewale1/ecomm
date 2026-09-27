import React from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAppExperience } from "../Context/AppExperienceContext";
import { APP_EXPERIENCE } from "../../services/appExperience";
import { appHaptics } from "../../services/haptics";

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const sheetVariants = {
  hidden: { y: "100%" },
  visible: { y: 0 },
  exit: { y: "100%" },
};

const VendorRedirectModal = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { selectExperience } = useAppExperience();

  const continueToVendorLogin = async () => {
    void appHaptics.medium();
    await selectExperience(APP_EXPERIENCE.VENDOR);
    onClose();
    navigate("/vendorlogin", { replace: true });
  };

  return (
    <AnimatePresence>
      {open && (
        // backdrop
        <motion.div
          className="fixed inset-0 z-[9999] flex items-end"
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={backdropVariants}
          transition={{ duration: 0.2 }}
          aria-modal="true"
          role="dialog"
          onClick={onClose} // clicking backdrop closes
        >
          {/* semi-transparent overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-50" />

          {/* sliding sheet from bottom covering ~50% of viewport, full width, rounded top */}
          <motion.div
            className="relative w-full min-h-[280px] rounded-t-[28px] bg-white shadow-xl px-6 pb-[calc(24px+env(safe-area-inset-bottom,0px))] pt-3 font-satoshi"
            style={{ zIndex: 10000 }}
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
          >
            <div className="mx-auto max-w-3xl">
              <div className="w-10 h-1.5 bg-gray-300 rounded-full mx-auto mb-4" />

              <h2 className="text-xl font-semibold text-black mb-2">
                This is a vendor account
              </h2>
              <p className="text-gray-600 mt-3 mb-6 leading-6">
                Continue to vendor login to manage your store with the correct
                My Thrift experience.
              </p>

              <div className="flex justify-center gap-3">
           
                <button
                  onClick={continueToVendorLogin}
                  className="min-h-12 px-4 py-2 w-full bg-customOrange rounded-md text-white font-semibold hover:bg-orange-600"
                >
                   Vendor Login
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VendorRedirectModal;
