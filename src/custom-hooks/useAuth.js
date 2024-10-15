import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase.config"; 
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast"; 

const retryGetDoc = async (ref, retries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const docSnap = await getDoc(ref);
    if (docSnap.exists()) {
      return docSnap;
    }
    await new Promise(res => setTimeout(res, delay)); // Wait for delay
  }
  return null;
};

const useAuth = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userRef = doc(db, "users", user.uid);
          const userDoc = await retryGetDoc(userRef);

          if (userDoc && userDoc.exists()) {
            if (userDoc.data().isDeactivated) {
              await signOut(auth);
              navigate("/login");
            } else {
              setCurrentUser(user);
            }
          } else {
            const vendorRef = doc(db, "vendors", user.uid);
            const vendorDoc = await retryGetDoc(vendorRef);

            if (vendorDoc && vendorDoc.exists()) {
              if (vendorDoc.data().isDeactivated) {
                await signOut(auth);
                navigate("/vendorlogin");
              } else {
                setCurrentUser(user);
              }
            } else {
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
        setCurrentUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  return {
    currentUser,
    loading,
  };
};

export default useAuth;
