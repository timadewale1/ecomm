import React, { createContext, useState, useContext, useEffect } from "react";
import {
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  setDoc,
} from "firebase/firestore";
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
    await new Promise((res) => setTimeout(res, delay));
  }
  return null;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accountDeactivated, setAccountDeactivated] = useState(false);
  const navigate = useNavigate(); // ✅ Added

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
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

          // Fetch user data
          const userRef = doc(db, "users", user.uid);
          const userDoc = await retryGetDoc(userRef);

          if (userDoc && userDoc.exists()) {
            if (userDoc.data().isDeactivated) {
              await signOut(auth);
              setAccountDeactivated(true);
            } else {
              setCurrentUser(user);
              setCurrentUserData({ ...userDoc.data(), role: "user" });

              // ✅ Redirect After Login
              navigate("/newhome", { replace: true });
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

                // ✅ Redirect After Vendor Login
                navigate("/vendor-dashboard", { replace: true });
              }
            } else {
              toast.error("Unauthorized access. Please contact support.");
              await signOut(auth);
            }
          }

          setLoading(false);
        } catch (error) {
          console.error("Error fetching user data:", error);
          setLoading(false);
        }
      } else {
        setCurrentUser(null);
        setCurrentUserData(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // ✅ Google Sign-In Function
  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if email is used by a vendor
      const vendorsRef = collection(db, "vendors");
      const vendorQuery = query(vendorsRef, where("email", "==", user.email));
      const vendorSnapshot = await getDocs(vendorQuery);
      if (!vendorSnapshot.empty) {
        await auth.signOut();
        toast.error("This email is already used for a Vendor account!");
        return;
      }

      // Check if user exists and their role
      const usersRef = collection(db, "users");
      const userQuery = query(usersRef, where("email", "==", user.email));
      const userSnapshot = await getDocs(userQuery);
      if (!userSnapshot.empty) {
        const userData = userSnapshot.docs[0].data();
        if (userData.role === "vendor") {
          await auth.signOut();
          toast.error("This email is already used for a Vendor account!");
          return;
        }
      }

      // Create user doc if doesn't exist
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          username: user.displayName,
          email: user.email,
          profileComplete: false,
          role: "user",
          createdAt: new Date(),
        });
      }

  
      toast.success(`Welcome back ${user.displayName}!`);
      navigate("/newhome", { replace: true });
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      let errorMessage = "Google Sign-In failed. Please try again.";
      if (error.code === "auth/account-exists-with-different-credential") {
        errorMessage = "An account with the same email already exists.";
      } else if (error.code === "auth/popup-closed-by-user") {
        errorMessage = "Popup closed before completing sign-in.";
      }
      toast.error(errorMessage);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentUserData,
        loading,
        accountDeactivated,
        handleGoogleSignIn, 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
