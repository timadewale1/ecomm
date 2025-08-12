import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useState } from "react";
import { FaWhatsapp, FaX, FaXTwitter } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";

const CommunityInviteModal = ({ onClose }) => {
  const [isVisible, setIsVisible] = useState(false); // Modal initially hidden
  //   const navigate = useNavigate();

  const celebrationInProgress =
    sessionStorage.getItem("celebration") === "true";

  const isCelebrated = localStorage.getItem("celebrated");
  const isOnWhatsapp = localStorage.getItem("whatsappJoined");
  const isOnTwitter = localStorage.getItem("twitterJoined");

  if (!isCelebrated) {
    localStorage.setItem("celebrated", "true");
  }
  /* 
  Show modal if (
    wallet modal has been shown,
    modal hasn't been shown for up to 24 hours,
    either whatsapp or twitter join button hasn't been clicked
  )
  */
  useEffect(() => {
    const lastShowTime = localStorage.getItem("communityModalDissmisedAt");
    const oneDay = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const timeElapsed = now - Number(lastShowTime);
    const shouldShowModal =
      isCelebrated === "true" &&
      !celebrationInProgress &&
      (!lastShowTime || timeElapsed > oneDay) &&
      (!isOnWhatsapp || !isOnTwitter);

    if (shouldShowModal) {
      setTimeout(() => {
        setIsVisible(true);
        console.log("✅ Showing community invite modal");
      }, 1000);
    }
  }, [isCelebrated, isOnTwitter, isOnWhatsapp, celebrationInProgress]);

  const whatsappClicked = () => {
    // navigate()
    localStorage.setItem("whatsappJoined", true);
    handleClose();
  };

  const twitterClicked = () => {
    // navigate()
    localStorage.setItem("twitterJoined", true);
    handleClose();
  };

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem("communityModalDismissedAt", Date.now().toString());
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
            className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-[8999]"
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
              <div className="bg-white rounded-2xl p-3 w-[90%] max-w-md mx-auto shadow-2xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xl">Join Our Community!</div>
                  <FaX className="text-md text-black" onClick={handleClose} />
                </div>
                <div className="m-1 text-sm mb-6">
                  Our vendor community exists to bring you helpful tips and
                  updates on My Thrift for vendors. We also help you raise
                  engagement on your content to attract more customers. <br />{" "}
                  Join our communities today!
                </div>
                <div className="w-full">
                  <button
                    className="items-center w-full rounded-full border border-customOrange p-2 mb-2 text-sm"
                    onClick={whatsappClicked}
                  >
                    Join us on Whatsapp{" "}
                    <FaWhatsapp className="inline-flex w-5 h-5" />
                  </button>
                  <button
                    className="items-center w-full rounded-full border border-customOrange p-2 mb-2 text-sm"
                    onClick={twitterClicked}
                  >
                    Join us on Twitter{" "}
                    <FaXTwitter className="inline-flex w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CommunityInviteModal;
