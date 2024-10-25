// import { useEffect } from "react";
// import { onAuthStateChanged } from "firebase/auth";
// import { auth, db } from "../firebase.config";
// import { addDoc, collection } from "firebase/firestore";

// const trackUserActivity = async (user, action) => {
//   if (user) {
//     const activityLogRef = collection(db, "userActivityLogs");
//     await addDoc(activityLogRef, {
//       userId: user.uid,
//       action: action,
//       timestamp: new Date(),
//     });
//   }
// };

// const useTrackUserActivity = () => {
//   useEffect(() => {
//     const unsubscribe = onAuthStateChanged(auth, async (user) => {
//       if (user) {
//         // Track login event
//         await trackUserActivity(user, "Login");
//       } else {
//         // Track logout event
//         await trackUserActivity(user, "Logout");
//       }
//     });

//     return () => unsubscribe();
//   }, []);
// };

// export default useTrackUserActivity;
