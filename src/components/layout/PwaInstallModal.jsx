// import React, { useCallback, useEffect, useMemo, useState } from "react";

// const PWAInstallModal = ({ onClose }) => {
//   const [isVisible, setIsVisible] = useState(false);
//   const [step, setStep] = useState(1);
//   const [installEvent, setInstallEvent] = useState(null);

//   console.log("PWAInstallModal rendered");
//   const ios = useMemo(() => {
//     return /iPhone|iPad|iPod/i.test(navigator.userAgent);
//   }, []);

//   const pwa = useMemo(() => {
//     return window.matchMedia("(display-mode: standalone)").matches;
//   }, []);

//   // 🔥 Capture install event & show modal if needed
//   const handleBeforeInstallPrompt = useCallback((e) => {
//     e.preventDefault();
//     console.log("🔥 Captured beforeinstallprompt");
//     setInstallEvent(e);

//     const lastPrompt = localStorage.getItem("pwaPromptDismissedAt");
//     const now = Date.now();
//     const timeElapsed = now - Number(lastPrompt);
//     const shouldShowModal = !lastPrompt || timeElapsed > 24 * 60 * 60 * 1000;

//     if (shouldShowModal) {
//       setTimeout(() => {
//         setIsVisible(true);
//         console.log("✅ PWA modal is now visible");
//       }, 3000);
//     }
//   }, []);

//   useEffect(() => {
//     if (pwa) return;
//     window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
//     return () => {
//       window.removeEventListener(
//         "beforeinstallprompt",
//         handleBeforeInstallPrompt
//       );
//       document.body.classList.remove("noscroll");
//     };
//   }, [handleBeforeInstallPrompt, pwa]);

//   // 📱 Show modal manually for iOS users
//   useEffect(() => {
//     if (!ios || pwa) return;

//     const lastPrompt = localStorage.getItem("pwaPromptDismissedAt");
//     const now = Date.now();
//     const timeElapsed = now - Number(lastPrompt);
//     const shouldShowModal = !lastPrompt || timeElapsed > 24 * 60 * 60 * 1000;

//     if (shouldShowModal) {
//       setTimeout(() => {
//         setIsVisible(true);
//         console.log("✅ Showing iOS install modal");
//       }, 3000);
//     }
//   }, [ios, pwa]);

//   const handleInstallClick = async () => {
//     installEvent.prompt();
//     const { outcome } = await installEvent.userChoice;
//     if (outcome === "accepted") {
//       localStorage.setItem("pwaPromptDismissedAt", Date.now().toString());
//       handleClose();
//     }
//   };

//   const handleClose = () => {
//     setIsVisible(false);
//     document.body.classList.remove("noscroll");
//     localStorage.setItem("pwaPromptDismissedAt", Date.now().toString());
//     onClose && onClose();
//   };

//   return (
//     <div
//       className={`fixed inset-0 bg-black/70 flex justify-center items-center z-[9999] font-opensans transition-opacity duration-300 ${
//         isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
//       }`}
//     >
//       <div className="bg-white rounded-lg p-4 w-[90%] max-w-md mx-auto">

//           <h2 className={`text-xl font-bold text-black mb-4 ${ios?"":"text-center"}`}>
//             Add App to Home Screen
//           </h2>
//         {!ios && (
//           <div className="flex justify-center items-center my-4">
//             <img
//               src="/logo.png"
//               alt="App-Icon"
//               className="w-16 h-16 rounded-xl flex justify-center"
//             />
//           </div>
//         )}
//         <p className={`text-sm text-black text-left mb-4 ${ios?"":"text-center"}`}>
//           We recommend you Install our app so as to recieve push notifications
//           and a smoother experience!
//         </p>

//         {ios && (<div className="border-2 border-gray-200 rounded-lg p-2 space-y-3">
//           {step === 1 ? (
//             <div className="space-y-2">
//               <p className="flex items-center space-x-2 font-semibold text-lg">
//                 Step{" "}
//                 <span className="w-6 h-6 mx-1 text-white flex justify-center items-center rounded-full bg-customOrange">
//                   {step}
//                 </span>
//               </p>
//               <p className="text-sm">
//                 Open{" "}
//                 <a
//                   href="www.shopmythrift.store"
//                   className="text-orange-500 underline"
//                 >
//                   My Thrift
//                 </a>{" "}
//                 in Safari.
//               </p>
//               <div className="w-full h-52">
//                 <img
//                   src="./pwa-assets/step-1.jpg"
//                   alt=""
//                   className="w-full h-full object-cover rounded-lg bg-gray-100"
//                 />
//               </div>
//             </div>
//           ) : step === 2 ? (
//             <div className="space-y-2">
//               <p className="flex items-center space-x-2 font-semibold text-lg">
//                 Step{" "}
//                 <span className="w-6 h-6 mx-1 text-white flex justify-center items-center rounded-full bg-customOrange">
//                   {step}
//                 </span>
//               </p>
//               <p className="text-sm">
//                 Tap the{" "}
//                 <strong>
//                   Share (
//                   <svg
//                     className="inline-block w-5 h-5"
//                     xmlns="http://www.w3.org/2000/svg"
//                     viewBox="0 0 50 50"
//                   >
//                     <path
//                       fill="black"
//                       d="M30.3 13.7L25 8.4l-5.3 5.3-1.4-1.4L25 5.6l6.7 6.7z"
//                     />
//                     <path fill="black" d="M24 7h2v21h-2z" />
//                     <path
//                       fill="black"
//                       d="M35 40H15c-1.7 0-3-1.3-3-3V19c0-1.7 1.3-3 3-3h7v2h-7c-.6 0-1 .4-1 1v18c0 .6.4 1 1 1h20c.6 0 1-.4 1-1V19c0-.6-.4-1-1-1h-7v-2h7c1.7 0 3 1.3 3 3v18c0 1.7-1.3 3-3 3z"
//                     />
//                   </svg>
//                   )
//                 </strong>{" "}
//                 button.
//               </p>
//               <div className="w-full h-52">
//                 <img
//                   src="./pwa-assets/step-2.jpg"
//                   alt=""
//                   className="w-full h-full object-cover rounded-lg bg-gray-100"
//                 />
//               </div>
//             </div>
//           ) : step === 3 ? (
//             <div className="space-y-2">
//               <p className="flex items-center space-x-2 font-semibold text-lg">
//                 Step{" "}
//                 <span className="w-6 h-6 mx-1 text-white flex justify-center items-center rounded-full bg-customOrange">
//                   {step}
//                 </span>
//               </p>
//               <p className="text-sm">
//                 Tap <strong>Add to Home Screen</strong>.
//               </p>
//               <div className="w-full h-52">
//                 <img
//                   src="./pwa-assets/step-3.jpg"
//                   alt=""
//                   className="w-full h-full object-cover rounded-lg bg-gray-100"
//                 />
//               </div>
//             </div>
//           ) : step === 4 ? (
//             <div className="space-y-2">
//               <p className="flex items-center space-x-2 font-semibold text-lg">
//                 Step{" "}
//                 <span className="w-6 h-6 mx-1 text-white flex justify-center items-center rounded-full bg-customOrange">
//                   {step}
//                 </span>
//               </p>
//               <p className="text-sm">
//                 Tap <strong>Add</strong> at top-right.
//               </p>
//               <div className="w-full h-52">
//                 <img
//                   src="./pwa-assets/step-4.jpg"
//                   alt=""
//                   className="w-full h-full object-cover rounded-lg bg-gray-100"
//                 />
//               </div>
//             </div>
//           ) : (
//             <div className="space-y-2">
//               <p className="flex items-center space-x-2 font-semibold text-lg">
//                 Step{" "}
//                 <span className="w-6 h-6 mx-1 text-white flex justify-center items-center rounded-full bg-customOrange">
//                   {step}
//                 </span>
//               </p>
//               <p className="text-sm">App now on your home screen!</p>
//               <div className="w-full h-52">
//                 <img
//                   src="./pwa-assets/step-5.jpg"
//                   alt=""
//                   className="w-full h-full object-cover rounded-lg bg-gray-100"
//                 />
//               </div>
//             </div>
//           )}
//           <div className="flex justify-between mt-3">
//             <button
//               onClick={() =>
//                 step !== 1
//                   ? setStep((prev) => Math.max(1, prev - 1))
//                   : handleClose()
//               }
//               className="w-[45%] text-center rounded-full py-2 bg-transparent border border-customRichBrown text-brown-600 text-sm"
//             >
//               {step === 1 ? "Skip" : "Back"}
//             </button>
//             <button
//               onClick={() =>
//                 step !== 5
//                   ? setStep((prev) => Math.min(5, prev + 1))
//                   : handleClose()
//               }
//               className="w-[45%] text-center rounded-full py-2 bg-customOrange text-white text-sm"
//             >
//               {step === 5 ? "Done" : "Next"}
//             </button>
//           </div>
//         </div>)}
//         <div>

//         </div>
//         {!ios && (
//           <div className="flex flex-col space-y-3">
//           <button
//             className="w-full border-customOrange border-2 rounded-full p-3 bg-customOrange text-white text-base"
//             onClick={handleInstallClick}
//           >
//             Install
//           </button>
//           <button className="w-full border-customOrange border-2 rounded-full p-3 bg-white text-customOrange text-base" onClick={() => handleClose()}>
//             Close
//           </button>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default PWAInstallModal;

import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useMemo, useState } from "react";

const PWAInstallModal = ({ onClose }) => {
  const [isVisible, setIsVisible] = useState(false); // Modal initially hidden
  const [step, setStep] = useState(1);

  console.log("PWAInstallModal rendered");

  // Detect iOS devices
  const ios = useMemo(() => {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
  }, []);

  // Check if already running as PWA
  const pwa = useMemo(() => {
    return window.matchMedia("(display-mode: standalone)").matches;
  }, []);

  // Show modal for iOS users if not recently dismissed
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
    setIsVisible(false)
    localStorage.setItem("pwaPromptDismissedAt", Date.now().toString());
    setTimeout(() => {
      onClose && onClose();
    }, 1000);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-40"
          >
            <motion.div
              key="modal"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "tween", duration: 0.8 }}
              className={`fixed inset-0 flex justify-center items-center z-[9999] font-opensans transition-opacity duration-300 ${
                isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            >
              <div className="bg-white rounded-2xl p-4 w-[90%] max-w-md mx-auto shadow-2xl">
                <h2 className="text-xl font-bold text-black mb-4">
                  Add App to Home Screen
                </h2>
                <p className="text-sm text-black text-left mb-4">
                  We recommend you Install our app so as to recieve push
                  notifications and a smoother experience!
                </p>

                <div className="border-2 border-gray-200 rounded-lg p-2 space-y-3">
                  {step === 1 ? (
                    <div className="space-y-2">
                      <p className="flex items-center space-x-2 font-semibold text-lg">
                        Step{" "}
                        <span className="w-6 h-6 mx-1 text-white flex justify-center items-center rounded-full bg-customOrange">
                          {step}
                        </span>
                      </p>
                      <p className="text-sm">
                        Open{" "}
                        <a
                          href="www.shopmythrift.store"
                          className="text-orange-500 underline"
                        >
                          My Thrift
                        </a>{" "}
                        in Safari.
                      </p>
                      <div className="w-full h-52 flex items-center justify-center">
                        <img
                          src="./pwa-assets/step-1.jpg"
                          alt=""
                          className="w-full rounded-lg bg-gray-100"
                        />
                      </div>
                    </div>
                  ) : step === 2 ? (
                    <div className="space-y-2">
                      <p className="flex items-center space-x-2 font-semibold text-lg">
                        Step{" "}
                        <span className="w-6 h-6 mx-1 text-white flex justify-center items-center rounded-full bg-customOrange">
                          {step}
                        </span>
                      </p>
                      <p className="text-sm">
                        Tap the{" "}
                        <strong>
                          Share (
                          <svg
                            className="inline-block w-5 h-5"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 50 50"
                          >
                            <path
                              fill="black"
                              d="M30.3 13.7L25 8.4l-5.3 5.3-1.4-1.4L25 5.6l6.7 6.7z"
                            />
                            <path fill="black" d="M24 7h2v21h-2z" />
                            <path
                              fill="black"
                              d="M35 40H15c-1.7 0-3-1.3-3-3V19c0-1.7 1.3-3 3-3h7v2h-7c-.6 0-1 .4-1 1v18c0 .6.4 1 1 1h20c.6 0 1-.4 1-1V19c0-.6-.4-1-1-1h-7v-2h7c1.7 0 3 1.3 3 3v18c0 1.7-1.3 3-3 3z"
                            />
                          </svg>
                          )
                        </strong>{" "}
                        button.
                      </p>
                      <div className="w-full h-52 flex items-center justify-center">
                        <img
                          src="./pwa-assets/step-2.jpg"
                          alt=""
                          className="w-full rounded-lg bg-gray-100"
                        />
                      </div>
                    </div>
                  ) : step === 3 ? (
                    <div className="space-y-2">
                      <p className="flex items-center space-x-2 font-semibold text-lg">
                        Step{" "}
                        <span className="w-6 h-6 mx-1 text-white flex justify-center items-center rounded-full bg-customOrange">
                          {step}
                        </span>
                      </p>
                      <p className="text-sm">
                        Tap <strong>Add to Home Screen</strong>.
                      </p>
                      <div className="w-full h-52 flex items-center justify-center">
                        <img
                          src="./pwa-assets/step-3.jpg"
                          alt=""
                          className="w-full rounded-lg bg-gray-100"
                        />
                      </div>
                    </div>
                  ) : step === 4 ? (
                    <div className="space-y-2">
                      <p className="flex items-center space-x-2 font-semibold text-lg">
                        Step{" "}
                        <span className="w-6 h-6 mx-1 text-white flex justify-center items-center rounded-full bg-customOrange">
                          {step}
                        </span>
                      </p>
                      <p className="text-sm">
                        Tap <strong>Add</strong> at top-right.
                      </p>
                      <div className="w-full h-52 flex items-center justify-center">
                        <img
                          src="./pwa-assets/step-4.jpg"
                          alt=""
                          className="w-full rounded-lg bg-gray-100"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="flex items-center space-x-2 font-semibold text-lg">
                        Step{" "}
                        <span className="w-6 h-6 mx-1 text-white flex justify-center items-center rounded-full bg-customOrange">
                          {step}
                        </span>
                      </p>
                      <p className="text-sm">App now on your home screen!</p>
                      <div className="w-full h-52 flex items-center justify-center">
                        <img
                          src="./pwa-assets/step-5.jpg"
                          alt=""
                          className="w-full rounded-lg bg-gray-100"
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between mt-3">
                    <button
                      onClick={() =>
                        step !== 1
                          ? setStep((prev) => Math.max(1, prev - 1))
                          : handleClose()
                      }
                      className="w-[45%] text-center rounded-full py-2 bg-transparent border border-customRichBrown text-brown-600 text-sm"
                    >
                      {step === 1 ? "Skip" : "Back"}
                    </button>
                    <button
                      onClick={() =>
                        step !== 5
                          ? setStep((prev) => Math.min(5, prev + 1))
                          : handleClose()
                      }
                      className="w-[45%] text-center rounded-full py-2 bg-customOrange text-white text-sm"
                    >
                      {step === 5 ? "Done" : "Next"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PWAInstallModal;
