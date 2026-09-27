// src/components/Pickup/PickupInfo.jsx
import React from "react";
import { GoChevronRight } from "react-icons/go";
import Pickup from "../Loading/Pickup";
import AppBottomSheet from "../layout/AppBottomSheet";

/* ----------------------------------------------------------------
   The pickup‑intro modal used in StorePage
---------------------------------------------------------------- */
const PickupInfoModal = ({
  vendor, // full vendor doc (must include pickupAddress)

  isOpen,
  onClose,
}) => {

  return (
    <AppBottomSheet
      open={isOpen}
      onClose={onClose}
      height="60dvh"
      ariaLabel={`${vendor?.shopName || "This vendor"} pickup information`}
    >
          <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-6 font-satoshi">
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
          </div>
    </AppBottomSheet>
  );
};

export default PickupInfoModal;
