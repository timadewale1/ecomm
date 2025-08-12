import React from "react";
import { motion } from "framer-motion";
import { FaWhatsapp, FaXTwitter, FaX } from "react-icons/fa6";
import { RiGroupFill } from "react-icons/ri";

const containerVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 260, damping: 24 },
  },
  exit: { opacity: 0, y: 16, scale: 0.98, transition: { duration: 0.18 } },
};

const btnMotion = { whileHover: { y: -2 }, whileTap: { scale: 0.98 } };

const CommunityInviteModal = ({ onDone }) => {
  const openLink = (url) => {
    try {
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {}
    onDone && onDone();
  };

  return (
    // Backdrop (click outside to finish)
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 bg-white/10 backdrop-blur-sm z-[8999] flex items-center justify-center px-4"
      onClick={() => onDone && onDone()}
    >
      {/* Modal */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="w-full max-w-md rounded-2xl bg-white p-4 shadow-2xl text-left"
        onClick={(e) => e.stopPropagation()} // prevent backdrop close when clicking inside
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 bg-rose-100 flex justify-center items-center rounded-full">
              <RiGroupFill className="text-customRichBrown" />
            </div>
            <h2 className="font-opensans text-base font-semibold">
              Join Our Vendor Community
            </h2>
          </div>

          <motion.button
            {...btnMotion}
            aria-label="Close"
            onClick={() => onDone && onDone()}
            className="p-1 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-customOrange"
          >
            <FaX className="text-md text-black" />
          </motion.button>
        </div>

        {/* Copy */}
        <p className="m-1 text-xs mb-5 font-opensans text-gray-700 leading-relaxed">
          Join our vendor community to connect with other vendors and thrifters,
          get first-hand access to our team, learn sales tips, receive product
          updates, and stay connected.
        </p>

        {/* CTAs (brand-styled) */}
        <div className="w-full space-y-2">
          {/* WhatsApp */}
          <motion.button
            {...btnMotion}
            className="w-full rounded-full py-2.5 px-4 text-sm font-medium font-opensans flex items-center justify-center gap-2
                       text-white bg-[#25D366] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#25D366]"
            onClick={() => openLink("https://chat.whatsapp.com/BDJ8fGARojFJRwxXrjasSy ")}
          >
            Join us on WhatsApp
            <FaWhatsapp className="w-5 h-5" />
          </motion.button>

          {/* Twitter / X */}
          <motion.button
            {...btnMotion}
            className="w-full rounded-full py-2.5 px-4 text-sm font-medium font-opensans flex items-center justify-center gap-2
                       text-white bg-black hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
            onClick={() => openLink("https://x.com/i/communities/1927724485446144183")}
          >
            Join us on X (Twitter)
            <FaXTwitter className="w-5 h-5" />
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CommunityInviteModal;
