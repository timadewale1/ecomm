// src/firebase.config.js

import { initializeApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  setPersistence,
  browserLocalPersistence,
  indexedDBLocalPersistence,
} from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
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
import { isNativeApp } from "./services/platform";
import { WEB_AUTH_HOSTS } from "./services/webAuthRedirectState.mjs";

/* 1) Firebase config */
const firebaseConfig = {
  apiKey: "AIzaSyC7pOCYSGpYMUDiRxRN4nV4UUfd2tdx1Jg",
  authDomain: !isNativeApp && window.location.pathname === "/auth/google" &&
    WEB_AUTH_HOSTS.has(window.location.hostname)
    ? window.location.hostname
    : "ecommerce-ba520.firebaseapp.com",
  projectId: "ecommerce-ba520",
  storageBucket: "ecommerce-ba520.appspot.com",
  messagingSenderId: "620187458799",
  appId: "1:620187458799:web:c4deef3184a5145256cf1a",
};

/* 2) Initialize Firebase */
const app = initializeApp(firebaseConfig);

/* 3) App Check — do not let failures crash the app */
try {
  // Firebase debug tokens bypass real attestation and must never be embedded
  // in a production web or Capacitor bundle.
  const appCheckDebugToken = import.meta.env.DEV
    ? import.meta.env.VITE_FIREBASE_DEBUG_TOKEN
    : "";
  if (appCheckDebugToken) {
    window.FIREBASE_APPCHECK_DEBUG_TOKEN = appCheckDebugToken;
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
export const auth = isNativeApp
  ? initializeAuth(app, {
      // Initialize durable WKWebView storage up front. Passing persistence to
      // initializeAuth avoids the async setPersistence race that blocked login.
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    })
  : getAuth(app);

if (!isNativeApp) {
  setPersistence(auth, browserLocalPersistence).catch((err) =>
    console.error("Auth persistence failed:", err),
  );
}
console.log(
  `Auth initialized with ${isNativeApp ? "native durable" : "browser-local"} persistence.`,
);

/* 5) Firestore + Persistent local cache (multi-tab) */
let dbInstance;
try {
  dbInstance = initializeFirestore(
    app,
    isNativeApp
      ? {
          // WKWebView does not need browser multi-tab persistence. Force
          // long-polling so Firestore does not stall on streaming transports.
          localCache: memoryLocalCache(),
          experimentalForceLongPolling: true,
          useFetchStreams: false,
        }
      : {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
            cacheSizeBytes: CACHE_SIZE_UNLIMITED,
          }),
          experimentalAutoDetectLongPolling: true,
          useFetchStreams: false,
        },
  );
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
