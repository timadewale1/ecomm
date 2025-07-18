// src/components/modals/VendorPolicyModal.jsx
import React from "react";
import Modal from "react-modal";
import { motion, AnimatePresence } from "framer-motion";
import { MdClose } from "react-icons/md";

Modal.setAppElement("#root");

/* ----------- animation ----------- */
const variants = {
  hidden: { y: "100%" },
  visible: {
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 35 },
  },
  exit: { y: "100%", transition: { duration: 0.25 } },
};

/* ----------- wording templates ----------- */
const copy = {
  /* ✨ 1. platform fallback */
  NONE: {
    heading: "Return / Refund Policy",
    body: "This vendor hasn’t published a return‑policy yet. Please contact them directly before ordering if you need clarification.",
  },

  /* ✨ 2 – 8. vendor‑selectable policies */
  NO_RETURNS: {
    heading: "All Sales Final – No Returns",
    body: "Once the item leaves the vendor, no returns or refunds are accepted.",
  },
  NO_RETURNS_AFTER_24HRS: {
    heading: "No Returns After 24 Hours",
    body: "You must inspect your item immediately on delivery / pick‑up. After 24 hrs, all sales are final.",
  },
  NO_RETURNS_IF_CORRECT_ITEM: {
    heading: "No Returns if Item Matches Order",
    body: "If the correct item (size, colour, condition) was supplied, returns and refunds are not accepted.",
  },
  NO_RETURNS_SIZE_COLOR: {
    heading: "No Returns for Buyer Size / Colour Errors",
    body: "Please double‑check measurements and colour before buying. The vendor will not accept returns caused by customer selection mistakes.",
  },
  RETURNS_EXCHANGE_ONLY: {
    heading: "Returns – Exchange Only",
    body: "Items can be sent back within 3 days for an exchange or store credit. Cash refunds are not issued.",
  },
  RETURNS_REFUND_IF_DEFECT: {
    heading: "Returns & Full Refund if Defective",
    body: "If the item is damaged, faulty, or not as described, return it within 3 days for inspection and a full refund.",
  },
  RETURNS_REFUND_FLEX: {
    heading: "Flexible Returns & Refunds",
    body: "Contact the vendor within 3 days of receipt and they’ll work with you to arrange a return or refund.",
  },
};

const VendorPolicyModal = ({
  show,
  onClose,
  policy = { type: "NONE", notes: "" },
}) => {
  /* Pick template safely */
  const tpl = copy[policy.type] ?? copy.NONE;

  return (
    <Modal
      isOpen={show}
      onRequestClose={onClose}
      overlayClassName="fixed inset-0 bg-black/50 backdrop-blur-sm z-[3000]"
      style={{
        content: {
          inset: 0,
          background: "transparent",
          padding: 0,
          border: "none",
        },
      }}
      closeTimeoutMS={250}
    >
      <AnimatePresence>
        {show && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={variants}
            className="fixed inset-x-0 bottom-0 bg-white rounded-t-2xl p-6 shadow-xl max-h-[80vh] overflow-y-auto"
          >
            {/* close pill */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 bg-gray-200 p-1 rounded-full text-xl text-gray-600"
            >
              <MdClose />
            </button>

            {/* main copy */}
            <h2 className="text-lg font-opensans font-semibold mb-2">{tpl.heading}</h2>
            <p className="text-sm font-opensans mb-4 leading-relaxed">{tpl.body}</p>

            {/* vendor extra notes */}
            {policy.notes && (
              <>
                <hr className="border-gray-200 mb-3" />
                <p className="text-xs font-opensans text-gray-600 whitespace-pre-line">
                  {policy.notes}
                </p>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
};

export default VendorPolicyModal;
