import React from "react";
import Modal from "react-modal";
import { MdOutlineClose } from "react-icons/md";
import { FaWhatsapp } from "react-icons/fa6";

Modal.setAppElement("#root"); // Accessibility compliance

const WhatsAppModal = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="Join Our WhatsApp Channel"
      style={{
        content: {
          position: "absolute",
          bottom: "0",
          left: "0",
          right: "0",
          top: "auto",
          borderRadius: "20px 20px 0 0",
          padding: "20px",
          backgroundColor: "#ffffff",
          border: "none",
          height: "30%",
          animation: "slide-up 0.3s ease-in-out",
        },
        overlay: {
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          zIndex: 3000,
        },
      }}
    >
      <div className="flex flex-col items-center">
        {/* Header */}
        <div className="flex items-center justify-between w-full">
          <h2 className="font-opensans text-lg font-semibold flex items-center">
            Join Our WhatsApp Channel! <span> {" "}<FaWhatsapp className="text-transparent text-[6px]"/></span><span> {" "}<FaWhatsapp className="text-customOrange text-2xl"/></span>
          </h2>
          <MdOutlineClose
            className="text-black text-xl cursor-pointer"
            onClick={onClose}
          />
        </div>

        {/* Content */}
        <div className="mt-6">
          <p className="text-sm text-center text-gray-600">
            Stay updated with our latest vendor related news, and updates on WhatsApp.
          </p>
        </div>

        {/* Button */}
        <div className="mt-8 w-full flex justify-center">
          <a
            href="https://whatsapp.com/channel/0029VavGIkL0AgW26yJ5KV2B" // Replace with your WhatsApp link
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              localStorage.setItem("hasWhatsAppModalShown", true);
              onClose();
            }} // Mark as interacted
            className="px-6 py-3 bg-customOrange text-white text-sm font-medium rounded-full"
          >
            Join WhatsApp Channel
          </a>
        </div>
      </div>
    </Modal>
  );
};

export default WhatsAppModal;
