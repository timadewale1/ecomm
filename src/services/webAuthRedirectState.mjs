export const WEB_AUTH_REDIRECT_KEY = "mythrift:web-google-redirect:v1";
export const WEB_AUTH_REDIRECT_TTL = 15 * 60 * 1000;
export const WEB_AUTH_HOSTS = new Set([
  "app.shopmythrift.com", "shopmythrift.store", "www.shopmythrift.store",
]);

// Never trust a stored continuation as a URL supplied to the browser.
export function safeAuthReturnPath(value, fallback = "/") {
  if (typeof value !== "string" || !value.startsWith("/") ||
      value.startsWith("//") || /[\\\u0000-\u0020]/.test(value)) return fallback;
  try {
    const url = new URL(value, "https://app.shopmythrift.com");
    if (url.origin !== "https://app.shopmythrift.com" ||
        url.pathname.startsWith("/__/") || url.pathname === "/auth/google") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return fallback; }
}

export function readWebAuthAttempt(storage, now = Date.now()) {
  try {
    const value = JSON.parse(storage.getItem(WEB_AUTH_REDIRECT_KEY) || "null");
    if (!value) return null;
    const age = now - value.createdAt;
    if (value.version !== 1 || !value.id || value.providerId !== "google.com" ||
        !Number.isFinite(age) || age < 0 || age > WEB_AUTH_REDIRECT_TTL) {
      storage.removeItem(WEB_AUTH_REDIRECT_KEY);
      return null;
    }
    return { ...value, returnTo: safeAuthReturnPath(value.returnTo) };
  } catch { return null; }
}

export function writeWebAuthAttempt(storage, context, now = Date.now()) {
  if (readWebAuthAttempt(storage, now)) {
    throw Object.assign(new Error("Sign-in is already in progress."), {code: "app/auth-in-progress"});
  }
  const attempt = {
    version: 1,
    id: globalThis.crypto.randomUUID(),
    createdAt: now,
    providerId: "google.com",
    returnTo: safeAuthReturnPath(context.returnTo),
    source: context.source || "login",
    phase: "start",
    requiresCheckoutDetails: context.requiresCheckoutDetails === true,
    anonymousUid: context.anonymousUid || null,
    vendorId: context.vendorId || null,
    note: typeof context.note === "string" ? context.note.slice(0, 2000) : "",
  };
  try {
    storage.setItem(WEB_AUTH_REDIRECT_KEY, JSON.stringify(attempt));
    if (readWebAuthAttempt(storage, now)?.id !== attempt.id) throw new Error();
  } catch {
    throw Object.assign(new Error("Browser storage is unavailable."), {code: "app/auth-storage-unavailable"});
  }
  return attempt;
}

export function updateWebAuthAttempt(storage, id, patch) {
  const current = readWebAuthAttempt(storage);
  if (!current || current.id !== id) {
    throw Object.assign(new Error("This sign-in request has expired."), {code: "app/auth-session-expired"});
  }
  const next = { ...current, ...patch, id: current.id, createdAt: current.createdAt };
  storage.setItem(WEB_AUTH_REDIRECT_KEY, JSON.stringify(next));
  return next;
}

export function clearWebAuthAttempt(storage, id) {
  try {
    const value = JSON.parse(storage.getItem(WEB_AUTH_REDIRECT_KEY) || "null");
    if (!id || value?.id === id) storage.removeItem(WEB_AUTH_REDIRECT_KEY);
  } catch { /* Unavailable storage must not crash error recovery. */ }
}
