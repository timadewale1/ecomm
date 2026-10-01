import { httpsCallable } from "firebase/functions";
import { auth, functions } from "../firebase.config";
import { createOwnedVendorSummaryReader } from "./vendorReadAccess.mjs";

// One owned order per vendor, batches of 50, discard responses after account switch.
export const getOwnedOrderVendorSummaries = createOwnedVendorSummaryReader({
  currentUid: () => auth.currentUser?.uid,
  call: (data) => httpsCallable(functions, "getOrderVendorSummariesV1")(data),
});
