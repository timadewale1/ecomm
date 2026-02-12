// hooks/useAuth.js
import React, { createContext, useState, useContext, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, getDocFromCache } from "firebase/firestore";
import { auth, db } from "../firebase.config";
import toast from "react-hot-toast";

const AuthContext = createContext();

const retryGetDoc = async (ref, retries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const docSnap = await getDoc(ref);
    if (docSnap.exists()) {
      return docSnap;
    }
    await new Promise((res) => setTimeout(res, delay));
  }
  return null;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => auth.currentUser);
  const [currentUserData, setCurrentUserData] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("mythrift:userData"));
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [accountDeactivated, setAccountDeactivated] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setAccountDeactivated(false);

      if (user) {
        // 1️⃣  Try cache first
        const userRef = doc(db, "users", user.uid);
        try {
          const cacheSnap = await getDocFromCache(userRef);
          if (cacheSnap.exists()) {
            const data = { ...cacheSnap.data(), role: "user" };
            setCurrentUserData(data);
            localStorage.setItem("mythrift:userData", JSON.stringify(data));
          }
        } catch {
          // no cache yet
        }

        // 2️⃣  Then network (with retry)
        try {
          const userDoc = await retryGetDoc(userRef);
          if (userDoc && userDoc.exists()) {
            if (userDoc.data().isDeactivated) {
              await signOut(auth);
              setAccountDeactivated(true);
            } else {
              const data = { ...userDoc.data(), role: "user" };
              setCurrentUser(user);
              setCurrentUserData(data);
              localStorage.setItem("mythrift:userData", JSON.stringify(data));
            }
            setLoading(false);
            return;
          }
        } catch {}

        // 3️⃣  Not a normal user → check vendor
        const vendorRef = doc(db, "vendors", user.uid);
        try {
          const cacheSnap = await getDocFromCache(vendorRef);
          if (cacheSnap.exists()) {
            const data = { ...cacheSnap.data(), role: "vendor" };
            setCurrentUserData(data);
            localStorage.setItem("mythrift:userData", JSON.stringify(data));
          }
        } catch {}

        try {
          const vendorDoc = await retryGetDoc(vendorRef);
          if (vendorDoc && vendorDoc.exists()) {
            if (vendorDoc.data().isDeactivated) {
              await signOut(auth);
              setAccountDeactivated(true);
            } else {
              const data = { ...vendorDoc.data(), role: "vendor" };
              setCurrentUser(user);
              setCurrentUserData(data);
              localStorage.setItem("mythrift:userData", JSON.stringify(data));
            }
          } else {
            toast.error("Unauthorized access. Please contact support.");
            await signOut(auth);
          }
        } catch (err) {
          console.error("Error fetching vendor data:", err);
        }

        setLoading(false);
      } else {
        // signed out
        setCurrentUser(null);
        setCurrentUserData(null);
        localStorage.removeItem("mythrift:userData");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const startOTPVerification = () => {};
  const endOTPVerification = () => {};

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentUserData,
        loading,
        accountDeactivated,
        startOTPVerification,
        endOTPVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
