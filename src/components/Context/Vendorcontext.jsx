import React, { createContext, useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase.config";

export const VendorContext = createContext();

export const VendorProvider = ({ children }) => {
  const [vendors, setVendors] = useState({
    online: [],
    local: [],
    isFetched: false,
  });

  const [vendorData, setVendorData] = useState(null); // Store specific vendor data
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    let unsubscribeVendorDoc;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const vendorDocRef = doc(db, "vendors", user.uid);
        unsubscribeVendorDoc = onSnapshot(vendorDocRef, (doc) => {
          if (doc.exists()) {
            setVendorData({ vendorId: user.uid, ...doc.data() });
          } else {
            console.error("Vendor data not found");
            setVendorData(null);
          }
          setLoading(false);
        });
      } else {
        setVendorData(null);
        setLoading(false);
      }
    });

    return () => {
      if (unsubscribeVendorDoc) unsubscribeVendorDoc();
      unsubscribeAuth();
    };
  }, []);

  return (
    <VendorContext.Provider
      value={{
        vendors,
        setVendors,
        vendorData, // Add vendorData to context
        loading, // Loading state for vendor data
      }}
    >
      {children}
    </VendorContext.Provider>
  );
};
