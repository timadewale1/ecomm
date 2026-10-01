import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase.config";

export const markOrderPaymentClientCompleted = async (reference) => {
  const normalizedReference = String(reference || "").trim();
  if (!normalizedReference) return null;
  const result = await httpsCallable(
    functions,
    "markOrderPaymentClientCompletedV1",
  )({reference: normalizedReference});
  return result?.data || null;
};
