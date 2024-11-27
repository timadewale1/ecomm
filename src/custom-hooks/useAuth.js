import React, { createContext, useState, useContext, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase.config";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const AuthContext = createContext();

const retryGetDoc = async (ref, retries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const docSnap = await getDoc(ref);
    if (docSnap.exists()) {
      return docSnap;
    }
    await new Promise((res) => setTimeout(res, delay)); // Wait for delay
  }
  return null;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOTPVerifying, setIsOTPVerifying] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    console.log("AuthProvider useEffect triggered");
    console.log("isOTPVerifying:", isOTPVerifying);
  
    if (isOTPVerifying) {
      console.log("Skipping auth state check due to OTP verification in progress");
      return;
    }
  
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("onAuthStateChanged fired. User:", user);
  
      if (user) {
        try {
          const userRef = doc(db, "users", user.uid);
          console.log("Fetching user document:", userRef);
          const userDoc = await retryGetDoc(userRef);
  
          if (userDoc && userDoc.exists()) {
            console.log("User document found:", userDoc.data());
  
            if (userDoc.data().isDeactivated) {
              console.warn("User account is deactivated. Signing out...");
              await signOut(auth);
              navigate("/login");
            } else {
              console.log("Setting current user to:", user);
              setCurrentUser(user);
            }
          } else {
            console.warn("User document not found. Checking vendors...");
            const vendorRef = doc(db, "vendors", user.uid);
            const vendorDoc = await retryGetDoc(vendorRef);
  
            if (vendorDoc && vendorDoc.exists()) {
              console.log("Vendor document found:", vendorDoc.data());
  
              if (vendorDoc.data().isDeactivated) {
                console.warn("Vendor account is deactivated. Signing out...");
                await signOut(auth);
                navigate("/vendorlogin");
              } else {
                console.log("Setting current user to:", user);
                setCurrentUser(user);
              }
            } else {
              console.error(
                "No user or vendor document found. Unauthorized access."
              );
              toast.error("Unauthorized access. Please contact support.");
              await signOut(auth);
              navigate("/login");
            }
          }
        } catch (error) {
          console.error("Error during authentication check:", error);
          toast.error("Authentication error. Please try again.");
        }
      } else {
        console.log("No user is authenticated. Setting current user to null.");
        setCurrentUser(null);
      }
  
      setLoading(false);
    });
  
    return () => {
      console.log("Cleaning up AuthProvider subscription");
      unsubscribe();
    };
  }, [isOTPVerifying, navigate]);
  
  const startOTPVerification = () => setIsOTPVerifying(true);
  const endOTPVerification = () => setIsOTPVerifying(false);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        startOTPVerification,
        endOTPVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
