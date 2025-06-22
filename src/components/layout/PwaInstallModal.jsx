import React, { useCallback, useEffect, useMemo, useState } from "react";
import "../../styles/PWAInstallModal.css"; // Import the CSS below

const PWAInstallModal = ({ onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [step, setStep] = useState(1);
  const [installEvent, setInstallEvent] = useState(null);

  console.log("PWAInstallModal rendered");
  const ios = useMemo(() => {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
  }, []);

  const pwa = useMemo(() => {
    return window.matchMedia("(display-mode: standalone)").matches;
  }, []);

  // ✅ Use useCallback to prevent event handler recreation
  //   const handleBeforeInstallPrompt = useCallback((e) => {
  //     e.preventDefault();
  //     console.log("Captured beforeinstallprompt 🔥");
  //     setInstallEvent(e);
  //   }, []);

  //   useEffect(() => {

  //   window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

  //   return () => {
  //     window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  //   };
  // }, [handleBeforeInstallPrompt]);

  // 🔥 Capture install event & show modal if needed
  const handleBeforeInstallPrompt = useCallback((e) => {
    e.preventDefault();
    console.log("🔥 Captured beforeinstallprompt");
    setInstallEvent(e);

    const lastPrompt = localStorage.getItem("pwaPromptDismissedAt");
    const now = Date.now();
    const timeElapsed = now - Number(lastPrompt);
    const shouldShowModal = !lastPrompt || timeElapsed > 24 * 60 * 60 * 1000;

    if (shouldShowModal) {
      setTimeout(() => {
        setIsVisible(true);
        document.body.classList.add("noscroll");
        console.log("✅ PWA modal is now visible");
      }, 3000);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      document.body.classList.remove("noscroll");
    };
  }, [handleBeforeInstallPrompt, installEvent]);

  // useEffect(() => {
  //   if (pwa) return;

  //   const lastPrompt = localStorage.getItem("pwaPromptDismissedAt");
  //   const now = Date.now();
  //   const timeElapsed = now - Number(lastPrompt);

  //   const shouldShowModal = !lastPrompt || timeElapsed > 24 * 60 * 60 * 1000;

  //   if (!shouldShowModal) return;

  //   const checkAndShow = () => {
  //     if (installEvent || ios) {
  //       setTimeout(() => {
  //         setIsVisible(true);
  //         console.log("Is now visible")
  //         document.body.classList.add("noscroll");
  //       }, 3000);
  //     }
  //   };

  //   checkAndShow();
  //   const interval = setInterval(checkAndShow, 500);
  //   const cleanupTimeout = setTimeout(() => clearInterval(interval), 5000);

  //   return () => {
  //     clearInterval(interval);
  //     clearTimeout(cleanupTimeout);
  //     document.body.classList.remove("noscroll");
  //   };
  // }, [pwa, ios, installEvent]);

  // 📱 Show modal manually for iOS users
  useEffect(() => {
    if (!ios || pwa) return;

    const lastPrompt = localStorage.getItem("pwaPromptDismissedAt");
    const now = Date.now();
    const timeElapsed = now - Number(lastPrompt);
    const shouldShowModal = !lastPrompt || timeElapsed > 24 * 60 * 60 * 1000;

    if (shouldShowModal) {
      setTimeout(() => {
        setIsVisible(true);
        document.body.classList.add("noscroll");
        console.log("✅ Showing iOS install modal");
      }, 3000);
    }
  }, [ios, pwa]);

  const handleInstallClick = async () => {
    installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "accepted") {
      localStorage.setItem("pwaPromptDismissedAt", Date.now().toString());
      handleClose();
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    document.body.classList.remove("noscroll");
    localStorage.setItem("pwaPromptDismissedAt", Date.now().toString());
    onClose && onClose();
  };

  return (
    <div
      className={`pwa-modal noscroll font-opensans ${isVisible ? "show" : ""}`}
    >
      <div className="pwa-modal-content">
        {ios ? (
          <h2 className="head font-bold text-black">
            How to install the app to your Home Screen
          </h2>
        ) : (
          <h2 className="text-center text-2xl font-semibold my-2">
            Add to Home Screen
          </h2>
        )}
        {!ios && (
          <div className="flex justify-center items-center my-4">
            <img
              src="/logo.png"
              alt="App-Icon"
              className="w-16 h-16 rounded-xl flex justify-center"
            />
          </div>
        )}
        <p
          className={`mt-[10px] text-black ${
            !ios ? "text-center" : "text-left"
          } text-lg`}
        >
          Install our lightweight browser application for quicker access and a
          better experience!
        </p>

        {ios && (
          <div className="text-black border-2 my-4 p-2 rounded-lg space-y-3">
            {step === 1 ? (
              <div className="space-y-2">
                <p className="flex space-x-2 items-center justify-start font-semibold text-xl">
                  Step{" "}
                  <span className="w-7 text-center h-7 mx-1 text-white flex justify-center items-center rounded-full bg-customOrange">
                    {step}
                  </span>
                </p>
                <p>
                  Open{" "}
                  <a
                    href="www.shopmythrift.store"
                    className="text-customOrange underline"
                  >
                    My Thrift
                  </a>{" "}
                  in Chrome or Safari browser
                </p>
                <div className="w-full h-[200px]">
                  <img
                    src="./pwa-assets/step-1.jpg"
                    alt=""
                    className="w-full h-full object-cover rounded-xl bg-customSoftGray"
                  />
                </div>
              </div>
            ) : step === 2 ? (
              <div className="space-y-2">
                <p className="flex space-x-2 items-center justify-start font-semibold text-xl">
                  Step{" "}
                  <span className="w-7 text-center h-7 mx-1 text-white flex justify-center items-center rounded-full bg-customOrange">
                    {step}
                  </span>
                </p>
                <p>
                  Find the{" "}
                  <strong>
                    Share (
                    <svg
                      class="inline-svg"
                      width="30"
                      height="30"
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
                  button and click on it. Usually at the top or bottom-right
                  corner of your browser.
                </p>
                <div className="w-full h-[200px]">
                  <img
                    src="./pwa-assets/step-2.jpg"
                    alt=""
                    className="w-full h-full object-cover rounded-xl bg-customSoftGray"
                  />
                </div>
              </div>
            ) : step === 3 ? (
              <div className="space-y-2">
                <p className="flex space-x-2 items-center justify-start font-semibold text-xl">
                  Step{" "}
                  <span className="w-7 text-center h-7 mx-1 text-white flex justify-center items-center rounded-full bg-customOrange">
                    {step}
                  </span>
                </p>
                <p>
                  Scroll and tap <strong>'Add to Home Screen'</strong>
                </p>
                <div className="w-full h-[200px]">
                  <img
                    src="./pwa-assets/step-3.jpg"
                    alt=""
                    className="w-full rounded-xl bg-customSoftGray"
                  />
                </div>
              </div>
            ) : step === 4 ? (
              <div className="space-y-2">
                <p className="flex space-x-2 items-center justify-start font-semibold text-xl">
                  Step{" "}
                  <span className="w-7 text-center h-7 mx-1 text-white flex justify-center items-center rounded-full bg-customOrange">
                    {step}
                  </span>
                </p>
                <p>
                  Tap <strong>'Add'</strong> at the top-right corner
                </p>
                <div className="w-full h-[200px]">
                  <img
                    src="./pwa-assets/step-4.jpg"
                    alt=""
                    className="w-full h-full object-cover rounded-xl bg-customSoftGray"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="flex space-x-2 items-center justify-start font-semibold text-xl">
                  Step{" "}
                  <span className="w-7 text-center h-7 mx-1 text-white flex justify-center items-center rounded-full bg-customOrange">
                    {step}
                  </span>
                </p>
                <p>
                  The app will now appear on your home screen like a regular
                  app!
                </p>
                <div className="w-full h-[200px]">
                  <img
                    src="./pwa-assets/step-5.jpg"
                    alt=""
                    className="w-full h-full object-cover rounded-xl bg-customSoftGray"
                  />
                </div>
              </div>
            )}
            <div className="flex justify-between text-white">
              <div
                onClick={() => {
                  step !== 1
                    ? setStep((prev) => Math.max(1, prev - 1))
                    : handleClose();
                }}
                className={`cursor-pointer w-1/3 text-center rounded-full p-2 bg-customOrange`}
              >
                {step === 1 ? "Skip" : "Back"}
              </div>
              <div
                onClick={() => {
                  step !== 5
                    ? setStep((prev) => Math.min(5, prev + 1))
                    : handleClose();
                }}
                className={`cursor-pointer w-1/3 text-center rounded-full p-2 bg-customOrange`}
              >
                {step === 5 ? "Done" : "Next"}
              </div>
            </div>
          </div>
        )}
        {!ios && installEvent && (
          <button
            id="install-btn"
            className="inst-btn"
            onClick={handleInstallClick}
          >
            Install Now
          </button>
        )}
        {!ios && (
          <button className="close-btn" onClick={() => handleClose()}>
            Close
          </button>
        )}
      </div>
    </div>
  );
};

export default PWAInstallModal;
