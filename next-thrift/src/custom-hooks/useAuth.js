"use client";

import React, { createContext, useState, useContext, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase.config";
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
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accountDeactivated, setAccountDeactivated] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("onAuthStateChanged fired. User:", user); // Debugging log
      setLoading(true);
      setAccountDeactivated(false);

      if (user) {
        try {
          if (!user.emailVerified) {
            toast.error("Please verify your email to access the application.");
            await signOut(auth);
            setCurrentUser(null);
            setCurrentUserData(null);
            setLoading(false);
            return;
          }

          const userRef = doc(db, "users", user.uid);
          const userDoc = await retryGetDoc(userRef);

          if (userDoc && userDoc.exists()) {
            if (userDoc.data().isDeactivated) {
              await signOut(auth);
              setAccountDeactivated(true);
            } else {
              setCurrentUser(user);
              setCurrentUserData({ ...userDoc.data(), role: "user" });
            }
          } else {
            const vendorRef = doc(db, "vendors", user.uid);
            const vendorDoc = await retryGetDoc(vendorRef);

            if (vendorDoc && vendorDoc.exists()) {
              if (vendorDoc.data().isDeactivated) {
                await signOut(auth);
                setAccountDeactivated(true);
              } else {
                setCurrentUser(user);
                setCurrentUserData({ ...vendorDoc.data(), role: "vendor" });
              }
            } else {
              toast.error("Unauthorized access. Please contact support.");
              await signOut(auth);
            }
          }

          console.log("User logged in:", user.uid); // Debugging log
          setLoading(false);
        } catch (error) {
          console.error("Error fetching user data:", error);
          setLoading(false);
        }
      } else {
        console.log("User is logged out"); // Debugging log
        setCurrentUser(null);
        setCurrentUserData(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentUserData,
        loading,
        accountDeactivated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
