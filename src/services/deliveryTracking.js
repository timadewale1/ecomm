import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase.config";

export const refreshDeliveryTracking = async ({
  deliveryFulfillmentId,
  mode = "modal",
}) => {
  const response = await httpsCallable(
    functions,
    "refreshDeliveryTrackingV1"
  )({
    deliveryFulfillmentId,
    mode: mode === "manual" ? "manual" : "modal",
  });
  return response.data;
};
