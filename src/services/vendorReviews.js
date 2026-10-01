import { httpsCallable } from "firebase/functions";
import { auth, functions } from "../firebase.config";
import { createReviewClient, reviewVersion } from "./reviewClient.mjs";

const request = createReviewClient({
  currentUser: () => auth.currentUser,
  call: (name, data) => httpsCallable(functions, name, { timeout: 60000 })(data),
});
export const submitBuyerReview = (payload, userId) => request("submitBuyerReviewV1", payload, userId);
export const deleteOwnedVendorReview = ({vendorId, reviewId, userId, review}) =>
  request("deleteBuyerReviewV1", {vendorId, reviewId, version: reviewVersion(review)}, userId);
