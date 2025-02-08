// components/Providers.js
"use client";

import { useEffect } from "react";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "firebase/app-check";
import app from "@/lib/firebase.config"; // Adjust the path if needed

export default function Providers({ children }) {
  useEffect(() => {
    console.log("Initializing Firebase App Check");

    // In development, set the debug token on window if available
    if (process.env.NODE_ENV !== "production") {
      const debugToken = process.env.NEXT_PUBLIC_APP_CHECK_DEBUG_TOKEN;
      if (debugToken) {
        window.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
        console.log(
          "App Check Debug Token Set:",
          window.FIREBASE_APPCHECK_DEBUG_TOKEN
        );
      } else {
        console.warn(
          "No NEXT_PUBLIC_APP_CHECK_DEBUG_TOKEN provided in development."
        );
      }
    }

    // Initialize Firebase App Check with the ReCaptcha Enterprise provider.
    // In development, if a debug token is set, Firebase will use that automatically.
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(
        process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_KEY // Ensure this env variable exists
      ),
      isTokenAutoRefreshEnabled: true, // Automatically refresh App Check tokens
    });

    console.log("Firebase App Check initialized");
  }, []);

  // Render children so that this provider wraps your entire app
  return children;
}
