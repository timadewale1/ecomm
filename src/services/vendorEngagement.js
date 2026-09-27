import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase.config";

const CACHE_PREFIX = "mythrift:vendor-engagement:v1:";
const CLIENT_CACHE_MS = 5 * 60 * 1000;

const normalize = (value = {}) => ({
  productViews: Math.max(0, Number(value.productViews || 0)),
  storeViews: Math.max(0, Number(value.storeViews || 0)),
  productCount: Math.max(0, Number(value.productCount || 0)),
});

export const readVendorEngagementCache = (vendorId) => {
  if (!vendorId) return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(`${CACHE_PREFIX}${vendorId}`));
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > CLIENT_CACHE_MS) {
      return null;
    }
    return normalize(parsed);
  } catch {
    return null;
  }
};

export const getMyVendorEngagementSummary = async (vendorId) => {
  const callable = httpsCallable(functions, "getMyVendorEngagementSummaryV1");
  const response = await callable({});
  const summary = normalize(response?.data);
  if (vendorId) {
    try {
      localStorage.setItem(
        `${CACHE_PREFIX}${vendorId}`,
        JSON.stringify({...summary, savedAt: Date.now()}),
      );
    } catch {
      // A private/restricted WebView may not expose storage. The server result
      // is still valid for the current render.
    }
  }
  return summary;
};
