const TRANSACTION_ARRAY_PATHS = [
  (payload) => payload,
  (payload) => payload?.data,
  (payload) => payload?.transactions,
  (payload) => payload?.data?.transactions,
  (payload) => payload?.data?.data,
  (payload) => payload?.data?.data?.transactions,
  (payload) => payload?.result,
  (payload) => payload?.result?.transactions,
];

export const extractWalletTransactions = (payload) => {
  for (const read of TRANSACTION_ARRAY_PATHS) {
    const candidate = read(payload);
    if (Array.isArray(candidate)) {
      return candidate.filter(
        (transaction) =>
          transaction && typeof transaction === "object" && !Array.isArray(transaction),
      );
    }
  }
  return [];
};

const dateFromNumericValue = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  // Provider timestamps may be seconds or milliseconds.
  const milliseconds = Math.abs(number) < 100_000_000_000 ? number * 1000 : number;
  const date = new Date(milliseconds);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const toWalletDate = (value) => {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value?.toDate === "function") {
    const date = value.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  }
  if (typeof value === "number") return dateFromNumericValue(value);
  if (typeof value?.seconds === "number") {
    return dateFromNumericValue(value.seconds);
  }
  if (typeof value?._seconds === "number") {
    return dateFromNumericValue(value._seconds);
  }

  const source = String(value).trim();
  if (!source) return null;
  if (/^-?\d+(?:\.\d+)?$/.test(source)) return dateFromNumericValue(source);

  // Chromium accepts provider-style SQL timestamps that WebKit rejects.
  // Convert only that known shape and preserve an explicit timezone if one is
  // present. A timezone-less provider timestamp remains local time, matching
  // the browser behaviour used before this normalisation.
  const webkitSafeSource = source
    .replace(
      /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?)/,
      "$1T$2",
    )
    .replace(/(\.\d{3})\d+(?=(?:Z|[+-]\d{2}:?\d{2})?$)/, "$1");
  const timestamp = Date.parse(webkitSafeSource);
  return Number.isNaN(timestamp) ? null : new Date(timestamp);
};

export const normaliseWalletDate = (value) => {
  const date = toWalletDate(value);
  return date ? date.toISOString() : null;
};

export const walletDateMillis = (value) => toWalletDate(value)?.getTime() || 0;

