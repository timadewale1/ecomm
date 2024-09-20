import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase.config"; 
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast"; 

const useAuth = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Check the user document
          const userRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userRef);

          if (userDoc.exists()) {
            if (userDoc.data().isDeactivated) {
              // User is deactivated, log them out
              await signOut(auth);
              // toast.error("Your account has been deactivated.");
              navigate("/login"); // Redirect to login page
            } else {
              // User is active, set them as the current user
              setCurrentUser(user);
            }
          } else {
            // If no user doc is found, check the vendors collection
            const vendorRef = doc(db, "vendors", user.uid);
            const vendorDoc = await getDoc(vendorRef);

            if (vendorDoc.exists()) {
              if (vendorDoc.data().isDeactivated) {
                // Vendor is deactivated, log them out
                await signOut(auth);
                // toast.error("Your vendor account has been deactivated.");
                navigate("/vendorlogin"); // Redirect to vendor login page
              } else {
                // Vendor is active, set them as the current user
                setCurrentUser(user);
              }
            } else {
              // If no user or vendor doc is found, consider them an unauthorized user
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
        setCurrentUser(null); // Reset if no user is logged in
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
