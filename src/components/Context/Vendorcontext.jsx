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
      console.log("VendorProvider: onAuthStateChanged fired", { user });
      if (user) {
        const vendorDocRef = doc(db, "vendors", user.uid);
        unsubscribeVendorDoc = onSnapshot(vendorDocRef, (docSnap) => {
          console.log("VendorProvider: vendor doc snapshot", {
            docSnapData: docSnap.data(),
          });
          if (docSnap.exists()) {
            setVendorData({ vendorId: user.uid, ...docSnap.data() });
          } else {
            console.error("Vendor data not found");
            setVendorData(null);
          }
          setLoading(false);
          console.log("VendorProvider: after fetching vendorData", {
            vendorData,
            loading,
          });
        });
      } else {
        console.log("VendorProvider: no user logged in");
        setVendorData(null);
        setLoading(false);
      }
    });

    return () => {
      if (unsubscribeVendorDoc) unsubscribeVendorDoc();
      unsubscribeAuth();
    };
  }, []);

  // In the return:
  console.log("VendorProvider render:", { vendorData, loading });

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
