// firebase.config.js
import { initializeApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import {
  initializeFirestore,
  enableIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";
import { getFunctions } from "firebase/functions";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "firebase/app-check";

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

// 3) App Check
if (import.meta.env.VITE_FIREBASE_DEBUG_TOKEN) {
  window.FIREBASE_APPCHECK_DEBUG_TOKEN =
    import.meta.env.VITE_FIREBASE_DEBUG_TOKEN;
}
initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider(
    import.meta.env.VITE_RECAPTCHA_ENTERPRISE_KEY
  ),
  isTokenAutoRefreshEnabled: true,
});
console.log("App Check initialized with production reCAPTCHA Enterprise.");

// 4) Auth + local persistence
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch((err) =>
  console.error("Auth persistence failed:", err)
);
console.log("Auth initialized with local persistence.");

// 5) Firestore + IndexedDB cache
export const db = initializeFirestore(app, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED,
});
enableIndexedDbPersistence(db).catch(() => {
  /* multi-tab or unsupported; ignore */
});
console.log("Firestore initialized with IndexedDB persistence.");

// 6) The rest
export const storage = getStorage(app);
console.log("Storage initialized.");
let messagingInstance = null; // will stay null in WKWebView
export const messagingReady = (async () => {
  try {
    const ok =
      (await messagingIsSupported()) && // Firebase helper
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window;
    if (ok) {
      messagingInstance = getMessaging(app);
      console.log("Firebase Messaging initialised");
    } else {
      console.log("Firebase Messaging skipped – unsupported environment");
    }
  } catch (e) {
    console.warn("Messaging initialisation failed:", e);
  }
  return messagingInstance; // may be null
})();
export const messaging = () => messagingInstance; // getter for components

export const functions = getFunctions(app);
console.log("Functions initialized.");

export default app;
