import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase.config";

const friendlyMessages = {
  "functions/unauthenticated": "Sign in as a vendor to continue.",
  "functions/permission-denied": "This change is only available to the store owner.",
  "functions/not-found": "Your store profile could not be found.",
  "functions/unavailable": "This change is temporarily unavailable. Please try again.",
};

export const vendorProfileErrorMessage = (error) =>
  error?.details?.message ||
  error?.message ||
  friendlyMessages[error?.code] ||
  "Your profile could not be updated. Please try again.";

export async function updateVendorProfileField(field, value) {
  const callable = httpsCallable(functions, "updateVendorProfileV1");
  const result = await callable({field, value});
  return result.data;
}
