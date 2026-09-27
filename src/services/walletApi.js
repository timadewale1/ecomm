import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase.config";

const callWalletFunction = async (name, payload) => {
  const callable = httpsCallable(functions, name);
  const response = await callable(payload);
  return response?.data || {};
};

const retryableWalletReadCodes = new Set([
  "functions/aborted",
  "functions/deadline-exceeded",
  "functions/internal",
  "functions/unavailable",
  "auth/network-request-failed",
]);

const wait = (milliseconds) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

const callWalletRead = async (name, payload) => {
  try {
    return await callWalletFunction(name, payload);
  } catch (error) {
    if (!retryableWalletReadCodes.has(String(error?.code || ""))) throw error;
    // History is a read-only operation, so one short retry is safe and masks
    // a transient native WebView/callable transport interruption without ever
    // duplicating wallet mutations.
    await wait(250);
    return callWalletFunction(name, payload);
  }
};

export const getWalletTransactions = ({ accountId, accountType }) =>
  callWalletRead("getWalletTransactionsV1", { accountId, accountType });

export const createWallet = (payload) =>
  callWalletFunction("createWalletV1", payload);

export const requestVendorPayout = (payload) =>
  callWalletFunction("requestVendorPayoutV1", payload);

export const getVendorOrderRevenue = (vendorId) =>
  callWalletFunction("getVendorOrderRevenueV1", { vendorId });

export const getVendorDashboardRevenue = (vendorId) =>
  callWalletFunction("getVendorDashboardRevenueV1", { vendorId });

export const getTransactionPercentages = (orderId) =>
  callWalletFunction("getTransactionPercentagesV1", { orderId });

export const getWalletApiErrorMessage = (error, fallback) => {
  const message = String(error?.message || "")
    .replace(/^Firebase:\s*/i, "")
    .replace(/^functions\/[\w-]+:\s*/i, "")
    .trim();
  return message && message !== "internal" ? message : fallback;
};
