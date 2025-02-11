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
      className="modal-content-rider h-auto"
      overlayClassName="fixed inset-0 bg-black bg-opacity-50"
    >
      <div className="flex flex-col  items-center font-opensans">
        {/* Header */}
        <div className="flex items-center justify-between w-full">
          <h2 className="font-opensans text-sm font-semibold flex items-center">
            Join Our WhatsApp Channel!{" "}
            <span>
              {" "}
              <FaWhatsapp className="text-transparent text-[6px]" />
            </span>
            <span>
              {" "}
              <FaWhatsapp className="text-customOrange text-2xl" />
            </span>
          </h2>
          <MdOutlineClose
            className="text-black text-xl cursor-pointer"
            onClick={onClose}
          />
        </div>

        {/* Content */}
        <div className="mt-6">
          <p className="text-sm text-black font-medium">
            Stay connected with us for:
          </p>
          <p className="text-xs mt-2 text-black">
            •{" "}
            <span className="text-customOrange text-sm font-medium">
              Exclusive Updates:
            </span>{" "}
            Be the first to know about upcoming events, promotions, and
            features.
          </p>
          <p className="text-xs mt-2 text-black">
            •{" "}
            <span className="text-customOrange text-sm font-medium">
              Vendor Tips & Insights:
            </span>{" "}
            Get valuable advice to grow your business.
          </p>
          <p className="text-xs mt-2 text-black">
            •{" "}
            <span className="text-customOrange text-sm font-medium">
              Real-Time Announcements:
            </span>{" "}
            Stay informed about important updates, news, and opportunities
            tailored for you 🚀
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
            className="px-6 py-2 bg-customOrange text-white text-sm font-medium rounded-full"
          >
            Join  Channel
          </a>
        </div>
      </div>
    </Modal>
  );
};

export default WhatsAppModal;
