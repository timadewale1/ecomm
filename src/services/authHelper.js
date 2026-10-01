import { auth } from "../firebase.config";
import { isCurrentAccountBuyer } from "./accountLookups";

// Legacy helper: never reveal another account’s role for a supplied email.
export const emailBelongsToVendor = async (emailLower) => {
  const user = auth.currentUser;
  if (!user || user.isAnonymous ||
      String(user.email || "").trim().toLowerCase() !== String(emailLower || "").trim().toLowerCase()) {
    throw new Error("Sign in to check your account.");
  }
  return !(await isCurrentAccountBuyer());
};
