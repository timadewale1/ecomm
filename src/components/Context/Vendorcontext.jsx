import React, { createContext, useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const vendorDoc = await getDoc(doc(db, "vendors", user.uid));
        if (vendorDoc.exists()) {
          setVendorData({ vendorId: user.uid, ...vendorDoc.data() }); // Set vendor-specific data
        } else {
          console.error("Vendor data not found");
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <VendorContext.Provider
      value={{
        vendors,
        setVendors,
        vendorData,   // Add vendorData to context
        loading,      // Loading state for vendor data
      }}
    >
      {children}
    </VendorContext.Provider>
  );
};
