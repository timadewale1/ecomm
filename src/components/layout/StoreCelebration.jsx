import React, { useContext, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import StorePagePreview from "./StorePreview";
import CommunityInviteModal from "./CommunityInviteModal";
import { VendorContext } from "../Context/Vendorcontext";
import { db } from "../../firebase.config";
import { doc, updateDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const StoreCelebration = ({ onClose }) => {
  const { vendorData: vendor } = useContext(VendorContext);
  const [phase, setPhase] = useState("preview"); 

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
          <div className="bg-white rounded-2xl p-3 w-[90%] max-w-md mx-auto shadow-2xl text-center">
            {phase === "preview" ? (
              <>
                <h2 className="text-xl font-bold uppercase font-opensans text-customOrange">
                  🎉 Congratulations!
                </h2>
                <p className="text-xs px-12 font-opensans mt-3 mb-1">
                  Your store setup is complete! Here&apos;s how it looks to
                  customers:
                </p>

                <div className="shadow mt-4 border-dashed rounded-md">
                  <StorePagePreview />
                </div>

                <button
                  onClick={() => setPhase("community")}
                  className="mt-4 px-4 py-2 rounded-full border border-customOrange font-opensans text-white bg-customOrange"
                >
                  Continue
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
