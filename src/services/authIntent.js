const AUTH_INTENT_KEY = "mythrift:pending-auth-intent:v1";
const AUTH_INTENT_TTL_MS = 15 * 60 * 1000;
const listeners = new Set();
const claims = new Set();
let revision = 0;
const publish = () => { revision += 1; listeners.forEach((notify) => notify()); };
export const subscribeAuthIntent = (notify) => { listeners.add(notify); return () => listeners.delete(notify); };
export const authIntentRevision = () => revision;

const AUTH_ENTRY_PATHS = new Set([
  "/login",
  "/vendorlogin",
  "/confirm-state",
  "/confirm-user",
  "/signup",
  "/auth/google",
]);

const safePath = (value) =>
  typeof value === "string" &&
  value.startsWith("/") &&
  !value.startsWith("//") && !/[\\\u0000-\u0020]/.test(value)
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
  fallback = safePath(fallback) || "/";
  if (AUTH_ENTRY_PATHS.has(fallback.split(/[?#]/)[0])) fallback = "/";
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
    const age = Date.now() - Number(parsed.createdAt || 0);
    if (!parsed.id || !parsed.type || !safePath(parsed.returnTo) || !Number.isFinite(age) || age < 0 || age > AUTH_INTENT_TTL_MS) {
      sessionStorage.removeItem(AUTH_INTENT_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const rememberAuthIntent = (intent) => {
  if (!intent?.type) return null;
  const stored = {
    id: globalThis.crypto.randomUUID(),
    phase: "awaiting-auth",
    uid: null,
    type: String(intent.type),
    payload:
      intent.payload && typeof intent.payload === "object" ? intent.payload : {},
    returnTo: safePath(intent.returnTo) || "/",
    createdAt: Date.now(),
  };
  try {
    sessionStorage.setItem(AUTH_INTENT_KEY, JSON.stringify(stored));
    if (readStoredIntent()?.id !== stored.id) throw new Error("Storage did not retain the request.");
  } catch {
    // Do not send the user through OAuth when we cannot retain their action.
    throw Object.assign(new Error("Could not save the sign-in action."), { code: "app/auth-storage-unavailable" });
  }
  publish();
  return stored;
};

export const clearAuthIntent = (id) => {
  if (id && readStoredIntent()?.id !== id) return;
  try {
    sessionStorage.removeItem(AUTH_INTENT_KEY);
  } catch {
    // Session storage can be unavailable in privacy-restricted webviews.
  }
  publish();
};

const updateIntent = (id, patch) => {
  const current = readStoredIntent();
  if (current?.id !== id) return null;
  const next = { ...current, ...patch };
  try { sessionStorage.setItem(AUTH_INTENT_KEY, JSON.stringify(next)); }
  catch { return null; }
  publish();
  return next;
};

// Only call after provider, account-role and provisioning checks succeeded.
export const activateAuthIntent = (user, destination, id) => {
  const intent = readStoredIntent();
  if (!intent || !user?.uid || user.isAnonymous) return null;
  if (id && intent.id !== id) return null;
  if (intent.uid && intent.uid !== user.uid) { clearAuthIntent(intent.id); return null; }
  if (destination && intent.returnTo?.split(/[?#]/)[0] !== destination.split(/[?#]/)[0]) return null;
  return updateIntent(intent.id, { uid: user.uid, phase: "ready" });
};

export const claimAuthIntent = ({types, pathname, uid, match} = {}) => {
  const intent = readStoredIntent();
  if (!intent || intent.phase !== "ready" || intent.uid !== uid || claims.has(intent.id)) return null;
  const acceptedTypes = Array.isArray(types) ? types : types ? [types] : [];
  if (acceptedTypes.length && !acceptedTypes.includes(intent.type)) return null;
  if (pathname && intent.returnTo) {
    const expectedPath = intent.returnTo.split(/[?#]/)[0];
    if (expectedPath !== pathname) return null;
  }
  if (match && !match(intent)) return null;
  claims.add(intent.id);
  return intent;
};

export const settleAuthIntent = (intent, outcome) => {
  claims.delete(intent.id);
  const current = readStoredIntent();
  if (current?.id !== intent.id || current.uid !== intent.uid) return;
  // A profile gate deliberately keeps the request until the user returns.
  if (current.phase === "waiting-profile") return;
  if (outcome === true || outcome === "blocked") clearAuthIntent(intent.id);
  else updateIntent(intent.id, { phase: "failed" });
};
export const retryAuthIntent = (id) => {
  if (readStoredIntent()?.phase === "failed") updateIntent(id, { phase: "ready" });
};
export const pauseAuthIntentForProfile = (uid) => {
  const intent = readStoredIntent();
  if (intent?.uid === uid && claims.has(intent.id)) updateIntent(intent.id, { phase: "waiting-profile" });
};
export const resumeAuthIntentAfterProfile = (uid) => {
  const intent = readStoredIntent();
  if (intent?.uid === uid && intent.phase === "waiting-profile") updateIntent(intent.id, { phase: "ready" });
};
export const pendingAuthIntent = () => readStoredIntent();
export const pendingAuthReturnTo = () => {
  const intent = readStoredIntent();
  return intent?.phase === "awaiting-auth" ? intent.returnTo : "/";
};

export const authCartReady = (sync, uid) => Boolean(uid && sync?.ownerKey === `user:${uid}` && sync.hydrated && (sync.lastSyncedAt || sync.status === "degraded"));
