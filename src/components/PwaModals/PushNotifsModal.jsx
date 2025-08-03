// src/components/IframeModal.jsx
import React, { useEffect, useState, useRef } from "react";
import Modal from "react-modal";
import { motion, AnimatePresence } from "framer-motion";
import { RotatingLines } from "react-loader-spinner"; // spinner

Modal.setAppElement("#root");

const sheetVariants = {
  hidden: { y: "100%" },
  visible: {
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 35 },
  },
  exit: { y: "100%", transition: { duration: 0.25 } },
};

const IframeModal = ({ show, onClose, url }) => {
  const [iframeLoading, setIframeLoading] = useState(true);
  const iframeRef = useRef(null);

  // Lock / unlock page scroll
  useEffect(() => {
    document.body.style.overflow = show ? "hidden" : "auto";
  }, [show]);

  /** Scrolls to the hash (if any) inside the loaded iframe */
  const handleIframeLoad = () => {
    setIframeLoading(false);

    // Only attempt if same origin (otherwise DOM access will fail)
    try {
      const hash = url.split("#")[1];
      if (!hash) return;

      const doc = iframeRef.current?.contentDocument;
      const target = doc?.getElementById(hash);
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
      }
    } catch (err) {
      /* Cross‑origin iframe—just ignore */
      console.warn("Iframe scroll failed:", err);
    }
  };

  return (
    <Modal
      isOpen={show}
      onRequestClose={onClose}
      overlayClassName="fixed inset-0 z-[9900] bg-black/50 backdrop-blur-sm"
      closeTimeoutMS={300}
      style={{
        content: {
          inset: 0,
          border: "none",
          background: "transparent",
          padding: 0,
        },
      }}
    >
      <AnimatePresence>
        {show && (
          <motion.div
            className="fixed inset-x-0 bottom-0 flex justify-center"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={sheetVariants}
          >
            {/* Bottom‑sheet container */}
            <div className="bg-white rounded-t-2xl shadow-xl w-full max-w-3xl h-[85vh] relative overflow-hidden">
              {iframeLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-20">
                  <RotatingLines
                    strokeColor="#f9531e"
                    strokeWidth="3"
                    animationDuration="0.75"
                    width="30"
                    visible
                  />
                </div>
              )}

              <iframe
                ref={iframeRef}
                src={url}
                title="Embedded page"
                className="w-full h-full border-0"
                onLoad={handleIframeLoad}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Glassy close pill */}
      {show && (
        <button
          onClick={onClose}
          className="absolute bottom-4 left-1/2 -translate-x-1/2
                     px-6 py-3 text-base font-opensans font-medium
                     bg-black/20 backdrop-blur-md border border-white/30
                     rounded-full shadow-md hover:bg-white/30
                     transition-colors duration-200"
        >
          Close
        </button>
      )}
    </Modal>
  );
};

export default IframeModal;
