import React, { useEffect, useState } from "react";
import Modal from "react-modal";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase.config";
import { motion } from "framer-motion";
import { BsStack } from "react-icons/bs";
import { IoIosClock } from "react-icons/io";
Modal.setAppElement("#root");

const StockpileSetupModal = ({ vendorId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [duration, setDuration] = useState(null);

  useEffect(() => {
    const checkVendorStockpile = async () => {
      const vendorRef = doc(db, "vendors", vendorId);
      const vendorSnap = await getDoc(vendorRef);
      const vendorData = vendorSnap.data();

      if (vendorData && !vendorData.stockpile) {
        setIsOpen(true);
      }
    };

    if (vendorId) {
      checkVendorStockpile();
    }
  }, [vendorId]);

  const handleStockpileChoice = async (enabled) => {
    const vendorRef = doc(db, "vendors", vendorId);

    if (!enabled) {
      await updateDoc(vendorRef, {
        stockpile: { enabled: false },
      });
      setIsOpen(false);
    } else {
      setStep(2);
    }
  };

  const handleDurationSubmit = async () => {
    if (!duration) return;
    const vendorRef = doc(db, "vendors", vendorId);

    await updateDoc(vendorRef, {
      stockpile: {
        enabled: true,
        durationInWeeks: duration,
      },
    });

    setIsOpen(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      className="fixed inset-0 bg-white  flex flex-col justify-center items-center  px-6"
      overlayClassName="fixed modal-stockpile inset-0 bg-black bg-opacity-60 z-40"
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full  text-center"
      >
        {/* ✨ Image placeholder section */}

        {step === 1 ? (
          <>
            <div className="mb-6 w-full flex justify-center object-cover ">
              <BsStack className="text-9xl text-customRichBrown" />
            </div>
            <h2 className="text-3xl font-bold font-ubuntu text-gray-800 mb-3">
              Do you currently offer stockpiling?
            </h2>
            <p className="text-sm mt-10 font-ubuntu text-gray-600 mb-6">
              Stockpiling allows customers to reserve items and keep adding more
              to their order over a set period before it's shipped. Let us know
              if you offer this option!
            </p>
            <div className="border-t border-gray-100"></div>
            <p className="text-xs mt-16 ital  font-ubuntu text-customOrange mb-6 italic">
              For stockpiled orders, you are paid 100% of the order value
              upfront, and the order is ready to be shipped once the stockpile
              duration expires.
            </p>
            <div className="relative -bottom-8 flex flex-col  gap-4 justify-center">
              <button
                onClick={() => handleStockpileChoice(true)}
                className="px-6 py-3 bg-customOrange text-white rounded-full font-semibold  font-opensans shadow-lg"
              >
                Yes, I do
              </button>
              <button
                onClick={() => handleStockpileChoice(false)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-full font-opensans font-semibold"
              >
                No, not currently
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-6 w-full flex justify-center object-cover ">
              <IoIosClock className="text-9xl text-customRichBrown" />
            </div>
            <h2 className="text-3xl font-ubuntu  font-bold text-gray-800 mb-4">
              How long can customers stockpile?
            </h2>
            <div className="grid grid-cols-2 gap-4 mt-10 mb-6">
              {[2, 4, 6, 8].map((week) => (
                <label
                  key={week}
                  className={`cursor-pointer px-4 py-3  font-opensans rounded-xl border text-sm font-medium ${
                    duration === week
                      ? "bg-customOrange text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}
                  onClick={() => setDuration(week)}
                >
                  {week} weeks
                </label>
              ))}
            </div>
            <button
              onClick={handleDurationSubmit}
              disabled={!duration}
              className={`w-full py-3 relative text-sm font-opensans -bottom-28 rounded-full font-medium ${
                duration
                  ? "bg-customOrange text-white"
                  : "bg-gray-300 text-gray-200 cursor-not-allowed"
              }`}
            >
              Save and continue
            </button>
          </>
        )}
      </motion.div>
    </Modal>
  );
};

export default StockpileSetupModal;
