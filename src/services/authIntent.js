const AUTH_INTENT_KEY = "mythrift:pending-auth-intent:v1";
const AUTH_INTENT_TTL_MS = 15 * 60 * 1000;

const AUTH_ENTRY_PATHS = new Set([
  "/login",
  "/vendorlogin",
  "/confirm-state",
  "/confirm-user",
]);

const safePath = (value) =>
  typeof value === "string" &&
  value.startsWith("/") &&
  !value.startsWith("//")
    ? value
    : null;

export const normalizeAuthDestination = (value, fallback = "/") => {
  if (typeof value === "string") return safePath(value) || fallback;
  if (value && typeof value === "object") {
    const pathname = safePath(value.pathname);
    if (!pathname) return fallback;
    const search = typeof value.search === "string" ? value.search : "";
    const hash = typeof value.hash === "string" ? value.hash : "";
    return `${pathname}${search}${hash}`;
  }
  return fallback;
};

export const authDestinationFromState = (state, fallback = "/") => {
  const destination = normalizeAuthDestination(
    state?.returnTo || state?.from,
    fallback,
  );
  const pathname = destination.split(/[?#]/)[0];
  return AUTH_ENTRY_PATHS.has(pathname) ? fallback : destination;
};

const readStoredIntent = () => {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(AUTH_INTENT_KEY) || "null");
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.type || Date.now() - Number(parsed.createdAt || 0) > AUTH_INTENT_TTL_MS) {
      sessionStorage.removeItem(AUTH_INTENT_KEY);
      return null;
    }
    return parsed;
  } catch {
    sessionStorage.removeItem(AUTH_INTENT_KEY);
    return null;
  }
};

export const rememberAuthIntent = (intent) => {
  if (!intent?.type) return null;
  const stored = {
    type: String(intent.type),
    payload:
      intent.payload && typeof intent.payload === "object" ? intent.payload : {},
    returnTo: safePath(intent.returnTo),
    createdAt: Date.now(),
  };
  try {
    sessionStorage.setItem(AUTH_INTENT_KEY, JSON.stringify(stored));
  } catch {
    return null;
  }
  return stored;
};

export const clearAuthIntent = () => {
  try {
    sessionStorage.removeItem(AUTH_INTENT_KEY);
  } catch {
    // Session storage can be unavailable in privacy-restricted webviews.
  }
};

export const takeAuthIntent = ({types, pathname} = {}) => {
  const intent = readStoredIntent();
  if (!intent) return null;
  const acceptedTypes = Array.isArray(types) ? types : types ? [types] : [];
  if (acceptedTypes.length && !acceptedTypes.includes(intent.type)) return null;
  if (pathname && intent.returnTo) {
    const expectedPath = intent.returnTo.split(/[?#]/)[0];
    if (expectedPath !== pathname) return null;
  }
  clearAuthIntent();
  return intent;
};

export const pendingAuthIntent = () => readStoredIntent();
