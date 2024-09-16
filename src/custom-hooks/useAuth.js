import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore"; // Import Firestore functions
import { auth, db } from "../firebase.config"; // Ensure correct import of your Firebase configuration
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast"; // For showing notifications

const useAuth = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists() && userDoc.data().isDeactivated) {
          // User is deactivated, log them out
          await signOut(auth);
          // toast.error("Your account has been deactivated.");
          navigate("/login"); // Redirect to login page
        } else {
          // Set the current user if not deactivated
          setCurrentUser(user);
        }
      } else {
        setCurrentUser(null);
      }

      setLoading(false); // Finish loading after authentication check
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [navigate]);

  return {
    currentUser,
    loading,
  };
};

export default useAuth;
