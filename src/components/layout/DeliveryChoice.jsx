// components/layout/DeliveryPreferenceModal.jsx
import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  PackageCheck,
  Truck,
  ShieldAlert,
  Info,
  X,
} from "lucide-react";
import { MdDeliveryDining } from "react-icons/md";

const DeliveryPreferenceModal = ({ onSelect, saving = false, onClose }) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[8999] flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ y: 40, scale: 0.98, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: 16, scale: 0.98, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delivery-pref-title"
          className="w-full max-w-sm rounded-2xl bg-white shadow-xl overflow-hidden"
        >
          {/* header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-rose-100 flex justify-center items-center rounded-full">
                <MdDeliveryDining className="text-customRichBrown" />
              </div>
              <h2
                id="delivery-pref-title"
                className="text-lg font-semibold font-opensans"
              >
                Delivery Preference
              </h2>
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-customOrange"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* scrollable body */}
          <div className="max-h-[85vh] scrollbar-hide overflow-y-auto px-4 py-3">
            <p className="text-[13px] font-opensans text-gray-900 mb-3">
              How would you like deliveries to be handled for your orders?
            </p>

            {/* option cards */}
            <div className="space-y-3">
              {/* Self-managed */}
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3">
                <div className="flex mb-2 items-center gap-2 ">
                  <PackageCheck className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-[13px]  font-semibold font-opensans">
                    Handle deliveries yourself
                  </h3>
                </div>
                <hr />
                <ul className="text-[12px] mt-4 text-gray-700 space-y-1.5 font-opensans">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-[2px] text-emerald-600 shrink-0" />
                    <span>
                      No delivery fees are charged by My Thrift at checkout.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-[2px] text-emerald-600 shrink-0" />
                    <span>
                      You arrange riders and costs directly with the buyer.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-[2px] text-emerald-600 shrink-0" />
                    <span>
                      Before tapping{" "}
                      <span className="font-medium">Shipped</span>, share the
                      rider’s name/number or tracking info with the customer.
                    </span>
                  </li>

                  <li className="mt-1.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Info className="h-3.5 w-3.5 text-gray-500" />
                      <span className="text-[12px] font-semibold">
                        When can you mark an order “Delivered”?
                      </span>
                    </div>
                    <ul className="space-y-1.5 pl-5 list-disc">
                      <li>
                        After the customer confirms they received it,
                        <em> or</em>
                      </li>
                      <li>
                        If you and the customer clearly agreed{" "}
                        <em>in advance</em> that you may mark it delivered
                        before the package arrives (e.g., COD/pick-up). Make
                        sure you told them exactly when you’ll do this.
                      </li>
                    </ul>
                  </li>

                  <li className="flex items-start gap-2 mt-1.5">
                    <ShieldAlert className="h-4 w-4 mt-[2px] text-amber-600 shrink-0" />
                    <span>
                      If a customer reports you marked “Delivered” without
                      delivery or without a prior agreement, we may reverse the
                      status, pause payouts, or take account action.
                    </span>
                  </li>
                </ul>
              </div>

              {/* Platform-managed */}
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="h-4 w-4 text-customOrange" />
                  <h3 className="text-[13px] font-semibold font-opensans">
                    Let My Thrift handle deliveries
                  </h3>
                </div>
                <hr />
                <ul className="text-[12px] mt-4 text-gray-700 space-y-1.5 font-opensans">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-[2px] text-emerald-600 shrink-0" />
                    <span>
                      Delivery fees are calculated and charged at checkout.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-[2px] text-emerald-600 shrink-0" />
                    <span>
                      Once you hand the package to our logistics partner, you
                      can mark the order{" "}
                      <span className="font-medium">Delivered</span> and receive
                      your final balance.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-[2px] text-emerald-600 shrink-0" />
                    <span>
                      <span className="font-medium">Stockpile orders:</span>{" "}
                      these always use your own delivery setup (even if you pick
                      My Thrift) because the end time can vary and customer may request for shipping anytime.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-[2px] text-emerald-600 shrink-0" />
                    <span>Need logistics suggestions? Contact support.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* actions */}
            <div className="mt-8 space-y-2">
              <button
                disabled={saving}
                onClick={() => onSelect("self")}
                className="w-full rounded-full py-2.5 px-4 text-sm font-opensans font-medium border border-gray-300 hover:bg-gray-50 disabled:opacity-60"
                aria-label="I will handle deliveries myself"
              >
                I’ll handle deliveries myself
              </button>

              <button
                disabled={saving}
                onClick={() => onSelect("platform")}
                className="w-full rounded-full py-2.5 px-4 text-sm font-opensans font-medium text-white bg-customOrange hover:opacity-90 disabled:opacity-60"
                aria-label="Let My Thrift handle deliveries"
              >
                Let My Thrift handle deliveries
              </button>

              <p className="text-[11px] text-gray-500 font-opensans text-center">
               To change this later contact support.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DeliveryPreferenceModal;
