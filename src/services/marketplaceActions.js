import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase.config";

const call = async (name, payload) => {
  const response = await httpsCallable(functions, name)(payload);
  return response?.data || {};
};

export const createMarketplaceOffer = (payload) =>
  call("createOfferV2", payload);

export const createProductInquiry = (payload) =>
  call("createProductInquiryV1", payload);

export const marketplaceActionErrorMessage = (
  error,
  fallback = "This item is not currently available.",
) => {
  const reason = error?.details?.reason || error?.customData?.details?.reason;
  if (
    reason === "vendor_missing" ||
    reason === "vendor_deactivated" ||
    reason === "vendor_pending_approval" ||
    reason === "product_unpublished" ||
    reason === "product_deleted" ||
    reason === "product_deactivated" ||
    reason === "product_sold" ||
    reason === "vendor_mismatch"
  ) {
    return reason === "product_sold"
      ? "This item has sold. You can still view its details."
      : "This item is not currently available.";
  }

  const message = String(error?.message || "")
    .replace(/^Firebase:\s*/i, "")
    .replace(/^functions\/[\w-]+:\s*/i, "")
    .trim();
  return message || fallback;
};
