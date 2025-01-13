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

// Firebase Configuration
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
console.log("Firebase app initialized successfully.");

// Enable Debug Mode for App Check
if (process.env.REACT_APP_FIREBASE_DEBUG_TOKEN) {
  // Inject debug token for App Check
  window.FIREBASE_APPCHECK_DEBUG_TOKEN = process.env.REACT_APP_FIREBASE_DEBUG_TOKEN;
  console.log(
    "Firebase App Check is running in DEBUG MODE. Debug Token:",
    process.env.REACT_APP_FIREBASE_DEBUG_TOKEN
  );
} else {
  console.error(
    "REACT_APP_FIREBASE_DEBUG_TOKEN environment variable is not set. App Check may not work properly in debug mode."
  );
}

// Initialize App Check
const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider(
    "6Lcau7IqAAAAAIhQjVGZBfkK17QSDLuk7oTiPl4g" // Replace with your actual key if needed
  ),
  isTokenAutoRefreshEnabled: true, // Automatically refresh App Check tokens
});

console.log("Firebase App Check initialized with ReCaptcha Enterprise Provider");

// Initialize Firebase services with console logs
export const auth = getAuth(app);
console.log("Firebase Auth service initialized.");

export const db = getFirestore(app);
console.log("Firestore database initialized.");

export const storage = getStorage(app);
console.log("Firebase Storage initialized.");

export const messaging = getMessaging(app);
console.log("Firebase Messaging initialized.");

export const functions = getFunctions(app);
console.log("Firebase Functions initialized.");

export default app;
