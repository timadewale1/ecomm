// import { initializeApp } from "firebase/app";
// import { getAuth } from "firebase/auth";
// import { getFirestore } from "firebase/firestore";
// import { getStorage } from "firebase/storage";
// import { getMessaging } from "firebase/messaging";
// import { getFunctions } from "firebase/functions";
// import {
//   initializeAppCheck,
//   ReCaptchaEnterpriseProvider,
// } from "firebase/app-check";


// const firebaseConfig = {
//   apiKey: "AIzaSyC7pOCYSGpYMUDiRxRN4nV4UUfd2tdx1Jg",
//   authDomain: "ecommerce-ba520.firebaseapp.com",
//   projectId: "ecommerce-ba520",
//   storageBucket: "ecommerce-ba520.appspot.com",
//   messagingSenderId: "620187458799",
//   appId: "1:620187458799:web:c4deef3184a5145256cf1a",
// };


// const app = initializeApp(firebaseConfig);
// console.log("Firebase app initialized."); // Debugging

// initializeAppCheck(app, {
//   provider: new ReCaptchaEnterpriseProvider(
//     process.env.REACT_APP_RECAPTCHA_ENTERPRISE_KEY 
//   ),
//   isTokenAutoRefreshEnabled: true,
// });

// export const auth = getAuth(app);
// export const db = getFirestore(app);
// export const storage = getStorage(app);
// export const messaging = getMessaging(app);
// export const functions = getFunctions(app);

// export default app;

/*For localhost only*/
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";
import { getFunctions } from "firebase/functions";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "firebase/app-check";

const firebaseConfig = {
  apiKey: "AIzaSyC7pOCYSGpYMUDiRxRN4nV4UUfd2tdx1Jg",
  authDomain: "ecommerce-ba520.firebaseapp.com",
  projectId: "ecommerce-ba520",
  storageBucket: "ecommerce-ba520.appspot.com",
  messagingSenderId: "620187458799",
  appId: "1:620187458799:web:c4deef3184a5145256cf1a",
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);
if (process.env.REACT_APP_FIREBASE_DEBUG_TOKEN) {
  window.FIREBASE_APPCHECK_DEBUG_TOKEN = process.env.REACT_APP_FIREBASE_DEBUG_TOKEN;
}

// Initialize App Check
/* const appCheck = */ initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider(
    ""
  ),
  isTokenAutoRefreshEnabled: true, // Automatically refresh App Check tokens
});

// Add console logs to verify App Check
console.log("App initialized with Firebase App Check");
console.log("App Check initialized with ReCaptcha Enterprise Provider");

// Firebase services
export const auth = getAuth(app);
console.log("Auth initialized");

export const db = getFirestore(app);
console.log("Firestore initialized");

export const storage = getStorage(app);
console.log("Storage initialized");

export const messaging = getMessaging(app);
console.log("Messaging initialized");

export const functions = getFunctions(app);
console.log("Functions initialized");

export default app;