import { Capacitor, CapacitorHttp } from "@capacitor/core";

export class PaymentApiError extends Error {
  constructor(message, { status = null, code = "PAYMENT_API_ERROR", cause } = {}) {
    super(message);
    this.name = "PaymentApiError";
    this.status = status;
    this.code = code;
    this.cause = cause;
  }
}

const apiBaseUrl = () =>
  String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

const apiToken = () => String(import.meta.env.VITE_RESOLVE_TOKEN || "").trim();

const readJson = (value) => {
  if (value && typeof value === "object") return value;
  if (typeof value !== "string" || !value.trim()) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

const errorMessageFrom = (payload, fallback) =>
  payload?.message ||
  payload?.error?.message ||
  (typeof payload?.error === "string" ? payload.error : "") ||
  fallback;

const paymentRequest = async ({ path, method = "GET", params, data }) => {
  const baseUrl = apiBaseUrl();
  const token = apiToken();
  if (!baseUrl || !token) {
    throw new PaymentApiError("This service is temporarily unavailable.", {
      code: "PAYMENT_API_CONFIGURATION",
    });
  }

  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    ...(data ? { "Content-Type": "application/json" } : {}),
  };

  try {
    if (Capacitor.isNativePlatform()) {
      const response = await CapacitorHttp.request({
        url,
        method,
        headers,
        params,
        data,
        responseType: "json",
        connectTimeout: 15000,
        readTimeout: 20000,
      });
      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        data: readJson(response.data),
      };
    }

    const requestUrl = new URL(url);
    Object.entries(params || {}).forEach(([key, value]) => {
      requestUrl.searchParams.set(key, String(value));
    });
    const response = await fetch(requestUrl.toString(), {
      method,
      headers,
      ...(data ? { body: JSON.stringify(data) } : {}),
    });
    return {
      ok: response.ok,
      status: response.status,
      data: readJson(await response.text()),
    };
  } catch (error) {
    if (error instanceof PaymentApiError) throw error;
    throw new PaymentApiError(
      "We couldn’t reach the payment service. Check your connection and try again.",
      { code: "PAYMENT_API_NETWORK", cause: error }
    );
  }
};

export const getPaymentApiErrorMessage = (error, fallback) => {
  if (error instanceof PaymentApiError && error.message) return error.message;
  return fallback;
};

export const resolveBankAccount = async ({ accountNumber, bankCode }) => {
  const response = await paymentRequest({
    path: "/resolve-account",
    params: { accountNumber, bankCode },
  });
  const payload = response.data;
  const accountName =
    payload?.data?.data?.account_name ||
    payload?.data?.account_name ||
    payload?.account_name ||
    "";

  if (!response.ok || payload?.status === false || !accountName) {
    throw new PaymentApiError(
      errorMessageFrom(payload, "We couldn’t verify that account. Check the details and try again."),
      { status: response.status, code: "BANK_RESOLUTION_FAILED" }
    );
  }

  return { accountName };
};

export const createTransferRecipient = async (recipient) => {
  const response = await paymentRequest({
    path: "/transfer-recipient",
    method: "POST",
    data: recipient,
  });
  const payload = response.data;
  const recipientCode =
    payload?.data?.recipientCode ||
    payload?.data?.recipient_code ||
    payload?.recipientCode ||
    "";

  if (!response.ok || payload?.status === false || !recipientCode) {
    throw new PaymentApiError(
      errorMessageFrom(payload, "We couldn’t finish setting up your bank account."),
      { status: response.status, code: "TRANSFER_RECIPIENT_FAILED" }
    );
  }

  return { recipientCode };
};
