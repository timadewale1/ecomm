import { RecaptchaVerifier } from "firebase/auth";
import toast from "react-hot-toast";
import { getAuth } from "firebase/auth";

/**
 * Initializes the Firebase reCAPTCHA verifier.
 * @param {Object} auth - The Firebase Auth instance.
 * @returns {Promise} Resolves when the reCAPTCHA is rendered.
 */
export const initializeRecaptchaVerifier = (auth) => {
  // Clear existing reCAPTCHA verifier if it exists
  if (window.recaptchaVerifier) {
    window.recaptchaVerifier.clear();
  }

  // Create a new RecaptchaVerifier instance
  window.recaptchaVerifier = new RecaptchaVerifier(
    auth,
    "recaptcha-container",
    {
      size: "invisible",
      "expired-callback": () => {
        toast.error("reCAPTCHA expired. Please try again.");
      },
    }
  );

  // Render the reCAPTCHA
  return window.recaptchaVerifier.render().catch((error) => {
    console.error("reCAPTCHA render error:", error);
    toast.error("Failed to load reCAPTCHA. Please refresh the page.");
  });
};
