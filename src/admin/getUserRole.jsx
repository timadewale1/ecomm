import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase.config";

const getUserRole = async (uid) => {
  try {
    const userDocRef = doc(db, "users", uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
    
      return userData.role || "user"; 
    } else {
     
      return "user"; // Default to "user" role
    }
  } catch (error) {
    console.error("Error getting user role:", error);
    return "user"; // Default to "user" role in case of an error
  }
};

export { getUserRole };
