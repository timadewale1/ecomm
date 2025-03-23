import React, { useEffect, useMemo, useState } from "react";
import "../../styles/PWAInstallModal.css"; // Import the CSS below

const PWAInstallModal = ({ onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  const ios = useMemo(() => {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
  }, []);

  const pwa = useMemo(() => {
    return window.matchMedia("(display-mode: standalone)").matches;
  }, []);

  useEffect(() => {
    const setInstallMessage = (message) => {
      const messageElement = document.getElementById("pwa-message");
      if (messageElement) {
        messageElement.innerHTML = message;
      }
    };
    if (!pwa) {
      if (!ios) {
        setInstallMessage(
          `Tap the <strong><svg class="inline-svg" width="30" height="30" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50"><path fill="white" d="M30.3 13.7L25 8.4l-5.3 5.3-1.4-1.4L25 5.6l6.7 6.7z"/><path fill="white" d="M24 7h2v21h-2z"/><path fill="white" d="M35 40H15c-1.7 0-3-1.3-3-3V19c0-1.7 1.3-3 3-3h7v2h-7c-.6 0-1 .4-1 1v18c0 .6.4 1 1 1h20c.6 0 1-.4 1-1V19c0-.6-.4-1-1-1h-7v-2h7c1.7 0 3 1.3 3 3v18c0 1.7-1.3 3-3 3z"/></svg></strong> button and select <strong>Add to Home Screen</strong> to install this app.`
        );
      } else {
        setInstallMessage("io");
      }
      // Show modal after 10 seconds
      const timer = setTimeout(() => {
        setIsVisible(true);
        document.body.classList.add("noscroll"); // disable scrolling
      }, 3000);
      return () => {
        clearTimeout(timer);
        document.body.classList.remove("noscroll");
      };
    }
  }, [ios, pwa]);

  const handleInstallClick = async () => {
    window.beforeInstallEvent.prompt();
    const { outcome } = await window.beforeInstallEvent.userChoice;
    if (outcome === "accepted") {
      handleClose();
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    document.body.classList.remove("noscroll");
    onClose && onClose();
  };

  if (!isVisible) return null;

  return (
    <div className={`pwa-modal ${isVisible ? "show" : ""}`}>
      <div className="pwa-modal-content">
        <h2 className="head">Add to Home Screen</h2>
        <img src="/logo192.png" alt="App-Icon" />
        <p className="mt-[10px] text-white">
          Install our lightweight browser application for quicker access and a
          better experience!
        </p>
        {ios && (
          <p id="pwa-message" className="mb-[15px] text-white">
            Tap the{" "}
            <strong>
              <svg
                class="inline-svg"
                width="30"
                height="30"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 50 50"
              >
                <path
                  fill="white"
                  d="M30.3 13.7L25 8.4l-5.3 5.3-1.4-1.4L25 5.6l6.7 6.7z"
                />
                <path fill="white" d="M24 7h2v21h-2z" />
                <path
                  fill="white"
                  d="M35 40H15c-1.7 0-3-1.3-3-3V19c0-1.7 1.3-3 3-3h7v2h-7c-.6 0-1 .4-1 1v18c0 .6.4 1 1 1h20c.6 0 1-.4 1-1V19c0-.6-.4-1-1-1h-7v-2h7c1.7 0 3 1.3 3 3v18c0 1.7-1.3 3-3 3z"
                />
              </svg>
            </strong>{" "}
            button and select <strong>Add to Home Screen</strong> to install
            this app.
          </p>
        )}
        {!ios && window.beforeInstallEvent && (
          <button
            id="install-btn"
            className="inst-btn"
            onClick={handleInstallClick}
          >
            Install
          </button>
        )}
        <button className="close-btn" onClick={handleClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default PWAInstallModal;
