import { getOwnedOrderVendorSummaries } from "./orderVendorSummaries";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase.config";
import {
  userWalletTransactionsFetchFailed,
  userWalletTransactionsFetchStarted,
  userWalletTransactionsEnriched,
  userWalletTransactionsReceived,
} from "../redux/reducers/userWalletSlice";
import {
  getWalletApiErrorMessage,
  getWalletTransactions,
} from "./walletApi";
import {
  extractWalletTransactions,
  normaliseWalletDate,
  walletDateMillis,
} from "./walletTransactionUtils";

let nextRequestId = 0;

const normaliseReference = (value) => String(value || "").trim();

const parseAmount = (transaction) => {
  const direct = Number(transaction.amount);
  if (Number.isFinite(direct)) return Math.abs(direct);
  const parsed = Number(
    String(transaction.amountSlug || "").replace(/[^0-9.-]/g, ""),
  );
  return Number.isFinite(parsed) ? Math.abs(parsed) : 0;
};

const loadTransactionEnrichment = async (uid) => {
  const orderByReference = new Map();
  const vendorNames = {};

  const ordersSnapshot = await getDocs(
    query(collection(db, "orders"), where("userId", "==", uid)),
  );
  const orders = ordersSnapshot.docs.map((orderDoc) => ({
    id: orderDoc.id,
    ...orderDoc.data(),
  }));
  const summaries = await getOwnedOrderVendorSummaries(orders, uid);
  Object.values(summaries).forEach((summary) => {
    vendorNames[summary.vendorId] = summary.shopName;
  });

  orders.forEach((order) => {
    const reference = normaliseReference(order.orderReference);
    if (reference) orderByReference.set(reference, order);
  });

  return { orderByReference, vendorNames };
};

const normaliseTransactions = (
  apiTransactions,
  { orderByReference = new Map(), vendorNames = {} } = {},
) =>
  apiTransactions
    .map((transaction, index) => {
      const isCredit = String(transaction.amountSlug || "")
        .trim()
        .startsWith("+");
      const reference = normaliseReference(
        transaction.transactionReference ||
          transaction.orderReference ||
          transaction.reference ||
          transaction.transactionRef,
      );
      const order = reference ? orderByReference.get(reference) : null;
      const vendorName = order ? vendorNames[order.vendorId] : "";
      const title = isCredit
        ? "Wallet top up"
        : vendorName
          ? `Payment to ${vendorName}`
          : "Wallet payment";
      const createdAt = normaliseWalletDate(
        transaction.createdAt ||
        transaction.transactionDate ||
        transaction.date ||
        transaction.timestamp ||
        null,
      );

      return {
        id:
          transaction.id ||
          reference ||
          `${createdAt || "wallet-transaction"}-${index}`,
        type: isCredit ? "credit" : "debit",
        amount: parseAmount(transaction),
        createdAt,
        reference,
        title,
        description: title,
        orderId: order?.orderId || order?.id || "",
        vendorId: order?.vendorId || "",
      };
    })
    .sort((left, right) => {
      const leftTime = walletDateMillis(left.createdAt);
      const rightTime = walletDateMillis(right.createdAt);
      return rightTime - leftTime;
    });

export const fetchUserWalletTransactions =
  (uid, { force = false } = {}) =>
  async (dispatch, getState) => {
    if (!uid) return [];

    const current = getState().userWallet;
    if (
      !force &&
      current.ownerUid === uid &&
      ["loading", "refreshing", "ready"].includes(
        current.transactionsStatus,
      )
    ) {
      return current.transactions;
    }

    const requestId = ++nextRequestId;
    dispatch(userWalletTransactionsFetchStarted({ uid, requestId }));

    try {
      const json = await getWalletTransactions({
        accountId: uid,
        accountType: "user",
      });
      if (json.status === false) {
        throw new Error(json.message || "Failed to load history");
      }

      const providerTransactions = extractWalletTransactions(json);
      // Render the provider history immediately. On iOS the optional Firestore
      // order/vendor lookup is a network operation because the WebView uses a
      // memory cache; it must never hold the wallet list hostage.
      const transactions = normaliseTransactions(providerTransactions);
      dispatch(userWalletTransactionsReceived({ uid, requestId, transactions }));

      void loadTransactionEnrichment(uid)
        .then((enrichment) => {
          dispatch(
            userWalletTransactionsEnriched({
              uid,
              requestId,
              transactions: normaliseTransactions(
                providerTransactions,
                enrichment,
              ),
            }),
          );
        })
        .catch((error) => {
          // Vendor/order labels are optional. The authoritative provider
          // transaction list remains visible when enrichment is unavailable.
          console.warn(
            "Unable to enrich wallet transactions with order data:",
            error,
          );
        });
      return transactions;
    } catch (error) {
      console.error("⚠️ fetchHistory error:", error);
      const message = getWalletApiErrorMessage(
        error,
        "Failed to load wallet history",
      );
      dispatch(
        userWalletTransactionsFetchFailed({
          uid,
          requestId,
          message,
        }),
      );
      throw new Error(message, { cause: error });
    }
  };
