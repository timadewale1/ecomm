// utils/authHelpers.js
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase.config";

/**
 * Returns true if this lower-cased email already exists
 * in the “vendors” collection.
 */
export const emailBelongsToVendor = async (emailLower) => {
  const vendorsRef = collection(db, "vendors");
  const q = query(vendorsRef, where("email", "==", emailLower));
  const snap = await getDocs(q);
  return !snap.empty;
};
