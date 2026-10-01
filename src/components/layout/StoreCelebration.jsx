import React, { useContext, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import StorePagePreview from "./StorePreview";
import CommunityInviteModal from "./CommunityInviteModal";
import { VendorContext } from "../Context/Vendorcontext";
import { db } from "../../firebase.config";
import { doc, updateDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { acquireScrollLock } from "../../services/scrollLock";

const StoreCelebration = ({ onClose }) => {
  const { vendorData: vendor } = useContext(VendorContext);
  const [phase, setPhase] = useState("preview");

  useEffect(() => {
    return acquireScrollLock("StoreCelebration", { freezePosition: true });
  }, []);

  const handleCommunityDone = async () => {
    try {
      const uid = vendor?.vendorId || vendor?.uid || getAuth().currentUser?.uid;
      if (uid) {
        await updateDoc(doc(db, "vendors", uid), { introcelebration: true });
      }
    } catch (err) {
      console.error("Failed to set introcelebration=true:", err);
    } finally {
      onClose && onClose();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[8999]"
      >
        <motion.div
          key="modal"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "tween", duration: 0.8 }}
          className="fixed inset-0 flex justify-center items-center z-[9999]"
        >
          <div className="mx-auto max-h-[92dvh] w-[92%] max-w-md overflow-y-auto overscroll-contain rounded-[24px] bg-white p-4 text-center shadow-2xl font-satoshi">
            {phase === "preview" ? (
              <>
                <h2 className="text-[21px] font-medium leading-7 text-gray-900">
                  Congratulations! 🎉
                </h2>
                <p className="mx-auto mb-1 mt-2 max-w-xs px-2 text-sm leading-5 text-gray-600">
                  Your store setup is complete. Here&apos;s how it looks to
                  customers:
                </p>

                <div className="mt-4">
                  <StorePagePreview />
                </div>

                <button
                  type="button"
                  onClick={() => setPhase("community")}
                  className="mt-4 h-12 w-full rounded-xl border border-customOrange bg-customOrange px-4 text-base font-medium text-white active:opacity-90"
                >
                  Continue setup
                </button>
              </>
            ) : (
          
              <CommunityInviteModal onDone={handleCommunityDone} />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default StoreCelebration;
