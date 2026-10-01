import { httpsCallable } from "firebase/functions";
import { auth, functions } from "../firebase.config";
import { createAccountLookupClient } from "./accountLookupClient.mjs";

export const CONTACT_SIGN_IN_MESSAGE =
  "Please sign in to the account linked to this email, or use a different email address.";

export function assertCurrentAccount(user) {
  if (!user?.uid || auth.currentUser !== user) {
    throw Object.assign(new Error("Your account changed. Please sign in again."), { code: "app/session-changed" });
  }
}

const client = createAccountLookupClient({
  currentUser: () => auth.currentUser,
  call: (name, data) => httpsCallable(functions, name, { timeout: 20000 })(data),
});
export const { isCurrentAccountBuyer, canUseBuyerContactEmail, isBuyerUsernameAvailable } = client;
