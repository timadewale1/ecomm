import {getWalletTransactions} from "./walletApi";
import {
  extractWalletTransactions,
  normaliseWalletDate,
  walletDateMillis,
} from "./walletTransactionUtils";

const CACHE_PREFIX = "walletHistory:";

export const normalizeVendorWalletTransactions = (payload) =>
  extractWalletTransactions(payload)
    .map((transaction, index) => {
      const slug = String(transaction.amountSlug || "").trim();
      const isCredit = slug.startsWith("+");
      const createdAt = normaliseWalletDate(
        transaction.createdAt ||
        transaction.transactionDate ||
        transaction.date ||
        transaction.timestamp ||
        null,
      );
      const reference =
        transaction.transactionReference ||
        transaction.orderReference ||
        transaction.reference ||
        transaction.transactionRef ||
        "";
      const amount = Math.abs(
        Number(transaction.amount) ||
          Number(slug.replace(/[^0-9.-]/g, "")) ||
          0,
      );
      const status =
        transaction.status || transaction.transactionStatus || "completed";

      return {
        id:
          transaction.id ||
          reference ||
          `${createdAt || "transaction"}-${index}`,
        type: isCredit ? "credit" : "debit",
        title:
          transaction.title ||
          transaction.description ||
          (isCredit ? "Store payment" : "Withdrawal"),
        description:
          transaction.description ||
          (isCredit
            ? "Payment added to your store wallet"
            : "Withdrawal to your verified bank account"),
        amount,
        createdAt,
        reference,
        status,
      };
    })
    .sort(
      (left, right) =>
        walletDateMillis(right.createdAt) - walletDateMillis(left.createdAt),
    );

export const readCachedVendorWalletTransactions = (vendorId) => {
  if (!vendorId) return [];
  try {
    const value = JSON.parse(
      localStorage.getItem(`${CACHE_PREFIX}${vendorId}`) || "[]",
    );
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

export const loadVendorWalletTransactions = async (vendorId) => {
  if (!vendorId) return [];
  const payload = await getWalletTransactions({
    accountId: vendorId,
    accountType: "vendor",
  });
  if (payload.status === false) {
    throw new Error(payload.message || "Failed to load wallet history");
  }
  const transactions = normalizeVendorWalletTransactions(payload);
  try {
    localStorage.setItem(
      `${CACHE_PREFIX}${vendorId}`,
      JSON.stringify(transactions),
    );
  } catch {
    // The live provider response remains usable when local storage is full or
    // unavailable (for example, in an iOS private browsing context).
  }
  return transactions;
};
