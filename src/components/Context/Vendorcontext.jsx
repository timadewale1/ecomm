import React, {
  createContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDocFromServer, onSnapshot } from "firebase/firestore";
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
  const completedProfileUidRef = useRef(null);

  useEffect(() => {
    const auth = getAuth();
    let unsubscribeVendorDoc;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const vendorDocRef = doc(db, "vendors", user.uid);
        unsubscribeVendorDoc = onSnapshot(vendorDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const snapshotData = docSnap.data();
            const completionConfirmedLocally =
              completedProfileUidRef.current === user.uid;

            if (snapshotData.profileComplete === true) {
              completedProfileUidRef.current = null;
            }

            setVendorData({
              vendorId: user.uid,
              ...snapshotData,
              // A successful completion callable means its Firestore batch has
              // committed. Never let an older cached snapshot reverse that
              // confirmed state while the server listener catches up.
              ...(completionConfirmedLocally &&
              snapshotData.profileComplete !== true
                ? { profileComplete: true }
                : {}),
            });
          } else {
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

  const markVendorProfileComplete = useCallback((patch = {}) => {
    const uid = getAuth().currentUser?.uid;
    if (!uid) return;
    completedProfileUidRef.current = uid;
    setVendorData((current) => ({
      ...(current || {}),
      vendorId: uid,
      ...patch,
      profileComplete: true,
    }));
    setLoading(false);
  }, []);

  const refreshVendorData = useCallback(async () => {
    const uid = getAuth().currentUser?.uid;
    if (!uid) return null;
    const snapshot = await getDocFromServer(doc(db, "vendors", uid));
    if (!snapshot.exists()) return null;
    const next = { vendorId: uid, ...snapshot.data() };
    if (next.profileComplete === true) {
      completedProfileUidRef.current = null;
    } else if (completedProfileUidRef.current === uid) {
      next.profileComplete = true;
    }
    setVendorData(next);
    setLoading(false);
    return next;
  }, []);

  return (
    <VendorContext.Provider
      value={{
        vendors,
        setVendors,
        vendorData, // Add vendorData to context
        loading, // Loading state for vendor data
        markVendorProfileComplete,
        refreshVendorData,
      }}
    >
      {children}
    </VendorContext.Provider>
  );
};
