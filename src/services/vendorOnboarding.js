import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase.config";

const callable = (name) => httpsCallable(functions, name);

const unwrap = async (name, payload = {}) => {
  const response = await callable(name)(payload);
  return response?.data || {};
};

export const checkVendorShopName = async (shopName) =>
  unwrap("checkVendorShopName", { shopName });

export const resolveVendorBankAccount = async ({
  accountNumber,
  bankCode,
}) => unwrap("resolveVendorBankAccount", { accountNumber, bankCode });

export const getVendorOnboardingDraft = async () =>
  unwrap("getVendorOnboardingDraft");

export const saveVendorOnboardingDraft = async (draft) =>
  unwrap("saveVendorOnboardingDraft", { draft });

export const completeVendorProfile = async (profile) =>
  unwrap("completeVendorProfile", { profile });

export const deleteVendorIdImage = async () =>
  unwrap("deleteVendorIdImage");

export const getVendorOnboardingErrorMessage = (error, fallback) => {
  const reason = error?.details?.reason || error?.customData?.details?.reason;
  if (reason === "shop-name-taken") {
    return "That shop name is already taken. Choose another name.";
  }
  if (reason === "bank-resolution-failed") {
    return "We couldn’t verify that account. Check the bank and account number, then try again.";
  }
  if (reason === "recipient-creation-failed") {
    return "We couldn’t finish setting up your payout account. Check your bank details and try again.";
  }
  if (reason === "payment-configuration") {
    return "Bank verification is temporarily unavailable. Please contact support.";
  }

  const message = String(error?.message || "")
    .replace(/^Firebase:\s*/i, "")
    .replace(/^\w+\/\w+:\s*/i, "")
    .trim();
  return message || fallback;
};
