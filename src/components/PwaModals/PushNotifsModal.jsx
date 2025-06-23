// src/components/IframeModal.jsx
import React, { useEffect, useState } from "react";
import Modal from "react-modal";
import { motion, AnimatePresence } from "framer-motion";
import { RotatingLines } from "react-loader-spinner"; // 👈 spinner

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
  const [iframeLoading, setIframeLoading] = useState(true); // 👈 track load state

  // lock body scroll
  useEffect(() => {
    document.body.style.overflow = show ? "hidden" : "auto";
  }, [show]);

  return (
    <Modal
      isOpen={show}
      onRequestClose={onClose}
      overlayClassName="fixed inset-0 z-[3000] bg-black/50 backdrop-blur-sm"
      closeTimeoutMS={300}
      style={{
        overlay: {
          backgroundColor: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)",
        },
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
            {/* Bottom-sheet container */}
            <div className="bg-white rounded-t-2xl shadow-xl w-full max-w-3xl h-[85vh] relative overflow-hidden">
              {/* 🔄 Loader overlay */}
              {iframeLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-20">
                  <RotatingLines
                    strokeColor="#f9531e"
                    strokeWidth="4"
                    animationDuration="0.75"
                    width="48"
                    visible={true}
                  />
                </div>
              )}

              {/* Iframe */}
              <iframe
                src={url}
                title="Blog Post"
                className="w-full h-full border-0"
                onLoad={() => setIframeLoading(false)} // 👈 hide loader when ready
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Glassy close pill */}
      {show && (
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute font-opensans bottom-4 left-1/2 -translate-x-1/2
                     px-6 py-1.5 text-sm font-medium
                     bg-white/20 backdrop-blur-md border border-white/30
                     rounded-full shadow hover:bg-white/30
                     transition-colors duration-200"
        >
          Close
        </button>
      )}
    </Modal>
  );
};

export default IframeModal;
