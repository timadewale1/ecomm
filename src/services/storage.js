import createWebStorage from "redux-persist/lib/storage/createWebStorage";

/** A no-op storage engine for WebViews that block localStorage */
const createNoopStorage = () => ({
  getItem: () => Promise.resolve(null),
  setItem: (_k, v) => Promise.resolve(v),
  removeItem: () => Promise.resolve(),
});

/** Detect whether localStorage is usable (it isn’t in IG/Snap/Telegram iOS) */
export const safeStorage = (() => {
  try {
    const test = "__p__";
    window.localStorage.setItem(test, "1");
    window.localStorage.removeItem(test);
    return createWebStorage("local"); // normal path
  } catch {
    return createNoopStorage();       // fallback for zero-quota WebView
  }
})();
