// src/components/Pickup/PickupInfo.jsx
import React, { useEffect, useState } from "react";
import Modal from "react-modal";
import { AnimatePresence, motion } from "framer-motion";
import { MdDeliveryDining } from "react-icons/md";
import { GoChevronRight } from "react-icons/go";
import Pickup from "../Loading/Pickup";

/* ----------------------------------------------------------------
   The pickup‑intro modal used in StorePage
---------------------------------------------------------------- */
const PickupInfoModal = ({
  vendor, // full vendor doc (must include pickupAddress)
  currentUserCoords, // { lat, lng } — may be null if user denied location
  isOpen,
  onClose,
}) => {
  // Detect whether location permissions are available (still used for copy)
  const [hasLocation, setHasLocation] = useState(Boolean(currentUserCoords));

  useEffect(() => {
    setHasLocation(Boolean(currentUserCoords));
  }, [currentUserCoords]);

  return (
    <AnimatePresence>
      {isOpen && (
        <Modal
          isOpen
          onRequestClose={onClose}
          ariaHideApp={false}
          overlayClassName="fixed inset-0 bg-black/50 flex items-end z-50"
          className="bg-white w-full  h-[60vh] rounded-t-3xl shadow-xl p-4 flex flex-col"
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="flex-1 flex flex-col"
          >
            {/* ─── header ─────────────────────────────────────────────── */}
            <div className="flex flex-col items-center mb-4">
              <Pickup />
              <h2 className="text-lg font-opensans font-semibold">
                {vendor?.shopName || "This vendor"} offers&nbsp;Pick‑up!
              </h2>
            </div>

            {/* ─── body ───────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto pr-0.5">
              {/* always show the pick‑up address */}
              <p className="text-sm font-opensans text-gray-800 mb-2">
                Pick‑up address:&nbsp;
                <span className="font-semibold text-customOrange">
                  {vendor?.pickupAddress || "—"}
                </span>
              </p>

              {/* optional note if user’s location is unavailable */}
              {!hasLocation && (
                <p className="text-xs font-opensans text-gray-500 mb-2">
                  Enable location on checkout to get accurate directions.
                </p>
              )}

              <ul className="mt-4 text-xs font-opensans space-y-1">
                <li className="flex items-start">
                  <GoChevronRight className="text-customOrange mt-0.5 mr-1" />
                  Exact pick‑up point and route shown on the map.
                </li>
                <li className="flex items-start">
                  <GoChevronRight className="text-customOrange mt-0.5 mr-1" />
                  Order is protected with Pick‑up codes!
                </li>
              </ul>
            </div>

            {/* ─── footer ─────────────────────────────────────────────── */}
            <div className="mt-6 flex mb-4 flex-col gap-3">
              <button
                onClick={onClose}
                className="w-full py-3 rounded-full border border-gray-300 text-gray-700 font-opensans font-medium"
              >
                Close
              </button>
            </div>
          </motion.div>
        </Modal>
      )}
    </AnimatePresence>
  );
};

export default PickupInfoModal;
