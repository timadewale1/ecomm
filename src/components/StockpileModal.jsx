import React, { useEffect, useState } from "react";
import Modal from "react-modal";
import { AnimatePresence, motion } from "framer-motion";
import { PiStackSimpleFill } from "react-icons/pi";
import { GoChevronRight } from "react-icons/go";
import { FaCalendarAlt } from "react-icons/fa";
import StockpileAnim from "./Loading/StockpileAnim";
import { IoCheckmarkCircleSharp } from "react-icons/io5";

/** simple confetti / loader animation (swap in whatever you use) */

const StockpileInfoModal = ({ vendor, isOpen, onClose }) => {
  const [autoClose, setAutoClose] = useState(false);

  /* optional: auto-dismiss after 12 s so it never blocks the UI */
  //   useEffect(() => {
  //     if (!isOpen) return;
  //     const id = setTimeout(() => {
  //       setAutoClose(true);
  //       onClose();
  //     }, 12000);
  //     return () => clearTimeout(id);
  //   }, [isOpen, onClose]);

  if (!vendor?.stockpile?.enabled) return null; // guard

  const maxWeeks = vendor.stockpile.durationInWeeks || 2;

  return (
    <AnimatePresence>
      {isOpen && !autoClose && (
        <Modal
          isOpen
          onRequestClose={onClose}
          ariaHideApp={false}
          overlayClassName="fixed inset-0 bg-black/50 flex items-end z-50"
          className="bg-white w-full max-w-md h-[70vh] rounded-t-3xl shadow-xl p-4 flex flex-col"
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="flex-1 flex flex-col"
          >
            <StockpileAnim />
            {/* header */}
            <div className="flex flex-col items-center mb-4">
              <h2 className="text-lg font-opensans font-semibold mt-2">
                Stockpile with&nbsp;{vendor.shopName}!
              </h2>
            </div>

            {/* body */}
            <div className="flex-1 overflow-y-auto pr-1.5">
              <p className="text-sm font-opensans text-gray-800 mb-3">
                This vendor lets you{" "}
                <span className="font-semibold">pile up</span> items up to{" "}
                <span className="font-semibold mr-1 text-customOrange">
                  {maxWeeks}&nbsp;weeks
                </span>
                before shipping
              </p>

              <div className="bg-orange-50 rounded-lg p-3 flex items-start space-x-2">
                <FaCalendarAlt className="text-orange-600 text-lg mt-0.5" />
                <p className="text-xs font-opensans text-orange-700">
                  Your pile stays open until you request for shipping or the{" "}
                  {maxWeeks}-week timer runs out whichever comes first.
                </p>
              </div>
              <hr className="my-4 border-gray-200" />

              <ul className="mt-4 text-xs font-opensans space-y-2">
                {[
                  "Add more products anytime before checkout.",
                  "One delivery fee when everything is ready.",
                  "No service fees when re-piling & all stockpile is protected with buyers protection.",
                ].map((text) => (
                  <li key={text} className="flex items-start">
                    <IoCheckmarkCircleSharp className="text-customOrange mt-0.5 mr-2 flex-shrink-0" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* footer */}
            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={onClose}
                className="w-full py-3 rounded-full bg-customOrange text-white font-opensans font-semibold shadow-sm"
              >
                Got&nbsp;it
              </button>
            </div>
          </motion.div>
        </Modal>
      )}
    </AnimatePresence>
  );
};

export default StockpileInfoModal;
