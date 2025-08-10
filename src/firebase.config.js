// src/firebase.config.js

import { initializeApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  CACHE_SIZE_UNLIMITED,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import {
  getMessaging,
  isSupported as messagingIsSupported,
} from "firebase/messaging";
import { getFunctions } from "firebase/functions";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "firebase/app-check";

/* 1) Firebase config */
const firebaseConfig = {
  apiKey: "AIzaSyC7pOCYSGpYMUDiRxRN4nV4UUfd2tdx1Jg",
  authDomain: "ecommerce-ba520.firebaseapp.com",
  projectId: "ecommerce-ba520",
  storageBucket: "ecommerce-ba520.appspot.com",
  messagingSenderId: "620187458799",
  appId: "1:620187458799:web:c4deef3184a5145256cf1a",
};

/* 2) Initialize Firebase */
const app = initializeApp(firebaseConfig);

/* 3) App Check — do not let failures crash the app */
try {
  if (import.meta.env.VITE_FIREBASE_DEBUG_TOKEN) {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN =
      import.meta.env.VITE_FIREBASE_DEBUG_TOKEN;
  }
  const recaptchaKey = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_KEY;
  if (recaptchaKey) {
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(recaptchaKey),
      isTokenAutoRefreshEnabled: true,
    });
    console.log("App Check initialized (reCAPTCHA Enterprise).");
  } else {
    console.warn("App Check not initialized: missing enterprise key env.");
  }
} catch (e) {
  console.warn("App Check init failed (continuing without it):", e);
}

/* 4) Auth + local persistence */
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch((err) =>
  console.error("Auth persistence failed:", err)
);
console.log("Auth initialized with local persistence.");

/* 5) Firestore + Persistent local cache (multi-tab) */
let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
      cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    }),
    // Helps in restrictive networks/VPNs
    experimentalAutoDetectLongPolling: true,
    useFetchStreams: false,
  });
  console.log(
    "✅ Firestore initialized with persistent local cache (multi-tab)."
  );
} catch (err) {
  console.warn("Persistent cache unavailable, falling back to memory:", err);
  dbInstance = getFirestore(app);
}
export const db = dbInstance;

/* 6) Storage */
export const storage = getStorage(app);
console.log("Storage initialized.");

/* 7) Messaging — guard for unsupported environments */
let messagingInstance = null;
export const messagingReady = (async () => {
  try {
    const supported = await messagingIsSupported().catch(() => false);
    const ok =
      supported &&
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window;

    if (ok) {
      messagingInstance = getMessaging(app);
      console.log("Firebase Messaging initialized.");
    } else {
      console.log("Firebase Messaging skipped – unsupported environment.");
    }
  } catch (e) {
    console.warn("Messaging initialization failed:", e);
  }
  return messagingInstance; // may be null
})();
export const messaging = () => messagingInstance;

/* 8) Cloud Functions — match your deployed region */
export const functions = getFunctions(app, );

export default app;
