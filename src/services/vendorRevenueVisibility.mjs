const PREFIX = "mythrift.vendor.revenue-hidden.v1:";
const EVENT = "mythrift:vendor-revenue-visibility";
const fallback = new Map();

export function readRevenueHidden(vendorId) {
  // Do not reveal a previous account's figures during account hydration.
  if (!vendorId) return true;
  const key = PREFIX + vendorId;
  if (fallback.has(key)) return fallback.get(key);
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback.get(key) ?? false : value !== "false";
  } catch {
    return fallback.get(key) ?? false;
  }
}

export function toggleRevenueHidden(vendorId) {
  if (!vendorId) return;
  const key = PREFIX + vendorId;
  const hidden = !readRevenueHidden(vendorId);
  try {
    window.localStorage.setItem(key, String(hidden));
    fallback.delete(key);
  } catch {
    // Storage can be disabled; retain the choice for this app session.
    fallback.set(key, hidden);
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
}

export function subscribeRevenueVisibility(vendorId, callback) {
  const key = PREFIX + vendorId;
  const onLocalChange = (event) => { if (event.detail === key) callback(); };
  const onStorageChange = (event) => {
    if (event.key === key || event.key === null) {
      fallback.delete(key);
      callback();
    }
  };
  window.addEventListener(EVENT, onLocalChange);
  window.addEventListener("storage", onStorageChange);
  return () => {
    window.removeEventListener(EVENT, onLocalChange);
    window.removeEventListener("storage", onStorageChange);
  };
}
