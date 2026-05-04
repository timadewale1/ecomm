import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useMemo, useState } from "react";

const PWAInstallModal = ({ onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [step, setStep] = useState(1);

  // Detect iOS devices
  const ios = useMemo(() => {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
  }, []);

  // Check if already running as PWA
  const pwa = useMemo(() => {
    return window.matchMedia("(display-mode: standalone)").matches;
  }, []);
useEffect(() => {
  if (!ios || pwa) return; // Skip if not iOS or already installed

  const lastPrompt = localStorage.getItem("pwaPromptDismissedAt");
  const now = Date.now();
  const timeElapsed = now - Number(lastPrompt);
  const shouldShowModal = !lastPrompt || timeElapsed > 24 * 60 * 60 * 1000;

  if (shouldShowModal) {
    setTimeout(() => {
      setIsVisible(true);
      console.log("✅ Showing iOS install modal");
    }, 3000);
  }
}, [ios, pwa]);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem("pwaPromptDismissedAt", Date.now().toString());
    setTimeout(() => {
      if (onClose) onClose();
    }, 600); // Matches the exit animation duration
  };

  // Extracting step data for cleaner rendering and animations
  const stepsData = [
    {
      id: 1,
      title: "Open in Safari",
      description: (
        <>
          Open{" "}
          <a
            href="https://www.shopmythrift.store"
            className="text-customOrange font-semibold underline hover:text-orange-600 transition-colors"
          >
            My Thrift
          </a>{" "}
          in your Safari browser.
        </>
      ),
      img: "./pwa-assets/step-1.jpg",
    },
    {
      id: 2,
      title: "Tap the Share Icon",
      description: (
        <>
          Tap the{" "}
          <strong>
            Share (
            <svg
              className="inline-block w-5 h-5 -mt-1 mx-1"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 50 50"
            >
              <path
                fill="currentColor"
                d="M30.3 13.7L25 8.4l-5.3 5.3-1.4-1.4L25 5.6l6.7 6.7z"
              />
              <path fill="currentColor" d="M24 7h2v21h-2z" />
              <path
                fill="currentColor"
                d="M35 40H15c-1.7 0-3-1.3-3-3V19c0-1.7 1.3-3 3-3h7v2h-7c-.6 0-1 .4-1 1v18c0 .6.4 1 1 1h20c.6 0 1-.4 1-1V19c0-.6-.4-1-1-1h-7v-2h7c1.7 0 3 1.3 3 3v18c0 1.7-1.3 3-3 3z"
              />
            </svg>
            )
          </strong>{" "}
          button at the bottom.
        </>
      ),
      img: "./pwa-assets/step-2.jpg",
    },
    {
      id: 3,
      title: "Add to Home Screen",
      description: (
        <>
          Scroll down and tap <strong>Add to Home Screen</strong>.
        </>
      ),
      img: "./pwa-assets/step-3.jpg",
    },
    {
      id: 4,
      title: "Confirm Addition",
      description: (
        <>
          Tap <strong>Add</strong> at the top-right corner.
        </>
      ),
      img: "./pwa-assets/step-4.jpg",
    },
    {
      id: 5,
      title: "You're All Set!",
      description: "The app is now installed on your home screen for a seamless experience.",
      img: "./pwa-assets/step-5.jpg",
    },
  ];

  const currentStepData = stepsData[step - 1];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 bg-black/30 backdrop-blur-xs z-[9999] flex justify-center items-center font-satoshi p-4"
        >
          <motion.div
            key="modal"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white rounded-3xl p-6 w-full max-w-sm mx-auto shadow-2xl relative flex flex-col"
          >
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header Content */}
            <div className="text-center mb-6 mt-2">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Install Our App
              </h2>
              <p className="text-xs text-gray-500 px-2">
                Get push notifications and a faster, smoother shopping experience.
              </p>
            </div>

            {/* Progress Indicator */}
            <div className="flex gap-1.5 justify-center mb-6">
              {stepsData.map((s) => (
                <div
                  key={s.id}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    step >= s.id ? "w-6 bg-customOrange" : "w-2 bg-gray-200"
                  }`}
                />
              ))}
            </div>

            {/* Step Content Wrapper (Animated) */}
            <div className="flex-1 relative overflow-hidden min-h-[320px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col h-full"
                >
                 

                  <div className="w-full flex-1 flex items-center justify-center bg-gray-50 rounded-2xl border border-gray-100 p-2 overflow-hidden shadow-inner">
                    <img
                      src={currentStepData.img}
                      alt={`Step ${step} illustration`}
                      className="w-full h-auto max-h-48 object-contain rounded-xl mix-blend-multiply"
                    />
                  </div>
                   <div className="text-center mb-4 space-y-1">
                    <h3 className="font-semibold text-lg text-gray-800">
                      {currentStepData.title}
                    </h3>
                    <p className="text-sm text-gray-600 min-h-[40px]">
                      {currentStepData.description}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Actions / Buttons */}
            <div className="flex justify-between gap-4 mt-8">
              <button
                onClick={() => (step !== 1 ? setStep((prev) => prev - 1) : handleClose())}
                className="w-1/2 text-center rounded-full py-3 font-medium bg-transparent border-2 border-customRichBrown text-customRichBrown hover:bg-orange-50 transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-customRichBrown/50"
              >
                {step === 1 ? "Not Now" : "Back"}
              </button>
              
              <button
                onClick={() => (step !== 5 ? setStep((prev) => prev + 1) : handleClose())}
                className="w-1/2 text-center rounded-full py-3 font-medium bg-customOrange text-white hover:bg-orange-600 transition-colors shadow-lg shadow-customOrange/30 text-sm focus:outline-none focus:ring-2 focus:ring-customOrange/50"
              >
                {step === 5 ? "Done" : "Next Step"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PWAInstallModal;