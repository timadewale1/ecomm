// components/layout/WithDeliveryPreferenceModal.jsx
import React, { useContext, useEffect, useRef, useState } from "react";
import { VendorContext } from "../Context/Vendorcontext";
import DeliveryPreferenceModal from "./DeliveryChoice";
import { db } from "../../firebase.config";
import { getAuth } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";

const WithDeliveryPreferenceModal = ({ children }) => {
  const { vendorData: vendor } = useContext(VendorContext);
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const openedRef = useRef(false);

  useEffect(() => {
    if (!vendor) return;
    const shouldShow =
      vendor.needsDeliveryPreference === true && vendor.isApproved === true;

    if (shouldShow && !openedRef.current) {
      setShow(true);
      openedRef.current = true;
    }
  }, [vendor]);

  const handleSelect = async (pref) => {
    try {
      setSaving(true);
      const uid = vendor?.vendorId || vendor?.uid || getAuth().currentUser?.uid;
      if (uid) {
        await updateDoc(doc(db, "vendors", uid), {
          deliveryPreference: pref, // "self" or "platform"
          needsDeliveryPreference: false, // don't show again
          updatedAt: new Date(),
        });
      }
    } catch (e) {
      console.error("Failed to set delivery preference:", e);
    } finally {
      setSaving(false);
      setShow(false);
    }
  };

  return (
    <>
      {children}
      {show && (
        <DeliveryPreferenceModal onSelect={handleSelect} saving={saving} />
      )}
    </>
  );
};

export default WithDeliveryPreferenceModal;
