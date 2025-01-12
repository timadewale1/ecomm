import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";
import { getFunctions } from "firebase/functions";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// 1) Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC7pOCYSGpYMUDiRxRN4nV4UUfd2tdx1Jg",
  authDomain: "ecommerce-ba520.firebaseapp.com",
  projectId: "ecommerce-ba520",
  storageBucket: "ecommerce-ba520.appspot.com",
  messagingSenderId: "620187458799",
  appId: "1:620187458799:web:c4deef3184a5145256cf1a",
};

// 2) Initialize Firebase
const app = initializeApp(firebaseConfig);
console.log("Firebase app initialized.");

// 3) Enable App Check debug token in development/localhost
//    (Use `window`, not `self`, to avoid ESLint "no-restricted-globals" error.)
if (
  process.env.NODE_ENV === "development" ||
  window.location.hostname === "localhost"
) {
  window.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  console.log(
    "App Check debug mode is ON. Check your console for the generated token."
  );
}

// 4) Initialize App Check with reCAPTCHA provider
//    Always specify a real site key. The debug token mechanism will override it locally.
initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider("YOUR_RECAPTCHA_V3_SITE_KEY"),
  isTokenAutoRefreshEnabled: true,
});
console.log("App Check initialized with reCAPTCHA.");

// 5) Initialize other Firebase services
export const auth = getAuth(app);
console.log("Auth initialized.");

export const db = getFirestore(app);
console.log("Firestore initialized.");

export const storage = getStorage(app);
console.log("Storage initialized.");

export const messaging = getMessaging(app);
console.log("Messaging initialized.");

export const functions = getFunctions(app);
console.log("Functions initialized.");

export default app;
