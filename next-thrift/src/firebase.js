/**
 * firebase.js
 *
 * Make sure to set the following environment variables:
 * - NEXT_PUBLIC_FIREBASE_API_KEY
 * - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
 * - NEXT_PUBLIC_FIREBASE_PROJECT_ID
 * - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
 * - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
 * - NEXT_PUBLIC_FIREBASE_APP_ID
 * - NEXT_PUBLIC_FIREBASE_DEBUG_TOKEN
 * - NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_KEY
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

// --------------
// Firebase config
// --------------
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// --------------------------------------------------------------------------
// Initialize Firebase app (or retrieve it if already initialized)
// --------------------------------------------------------------------------
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

console.log("[Firebase] Initialized app:", app.name);

// Keep a reference to our AppCheck instance so we don't initialize it again
let appCheckInstance = null;

/**
 * Only run App Check in the browser and only if we haven't set it up yet.
 * We do a dynamic import of `firebase/app-check` to ensure it only loads
 * client-side, preventing SSR/Next.js issues.
 */
if (typeof window !== "undefined") {
  console.log("[Firebase] Running in the browser context.");

  if (!appCheckInstance) {
    console.log(
      "[Firebase] appCheckInstance not found. Importing App Check..."
    );

    // If running on localhost, enable the debug token automatically
    if (window.location.hostname === "localhost") {
      const debugToken = process.env.NEXT_PUBLIC_FIREBASE_DEBUG_TOKEN || true;
      console.log(
        "[Firebase] Localhost detected. Setting debug token:",
        debugToken
      );
      window.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
    }

    import("firebase/app-check")
      .then(({ initializeAppCheck, ReCaptchaEnterpriseProvider }) => {
        console.log("[Firebase] app-check module successfully imported.");

        const recaptchaKey = process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_KEY;
        console.log(
          "[Firebase] Using ReCaptchaEnterpriseProvider key:",
          recaptchaKey
        );

        appCheckInstance = initializeAppCheck(app, {
          provider: new ReCaptchaEnterpriseProvider(recaptchaKey),
          isTokenAutoRefreshEnabled: true,
        });

        console.log(
          "[Firebase] AppCheck initialized with ReCaptcha Enterprise Provider."
        );
      })
      .catch((error) => {
        console.error(
          "[Firebase] Error importing or initializing AppCheck:",
          error
        );
      });
  } else {
    console.log(
      "[Firebase] appCheckInstance already exists. Skipping re-initialization."
    );
  }
} else {
  console.log(
    "[Firebase] Running in a non-browser context (likely SSR). App Check will not be initialized here."
  );
}

// --------------------------------------------------------------------------
// Export Firebase services
// --------------------------------------------------------------------------
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Default export for the initialized app
export default app;
