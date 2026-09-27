import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase.config";

export const submitDeliveryCourierReview = async ({
  deliveryFulfillmentId,
  rating,
  tags,
  comment,
}) => {
  const response = await httpsCallable(
    functions,
    "submitDeliveryCourierReviewV1"
  )({ deliveryFulfillmentId, rating, tags, comment });
  return response.data;
};
