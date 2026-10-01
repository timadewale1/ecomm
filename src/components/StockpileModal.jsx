import React from "react";
import { FaCalendarAlt } from "react-icons/fa";
import StockpileAnim from "./Loading/StockpileAnim";
import { IoCheckmarkCircleSharp } from "react-icons/io5";
import AppBottomSheet from "./layout/AppBottomSheet";

/** simple confetti / loader animation (swap in whatever you use) */

const StockpileInfoModal = ({ vendor, isOpen, onClose }) => {
  if (!vendor?.stockpile?.enabled) return null; // guard

  const maxWeeks = vendor.stockpile.durationInWeeks || 2;

  return (
    <AppBottomSheet
      open={isOpen}
      onClose={onClose}
      height="70dvh"
      ariaLabel={`Stockpile with ${vendor.shopName || "this vendor"}`}
    >
          <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-6 font-satoshi">
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
          </div>
    </AppBottomSheet>
  );
};

export default StockpileInfoModal;
