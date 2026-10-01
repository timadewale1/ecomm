import { httpsCallable } from "firebase/functions";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, functions } from "../firebase.config";
import {
  SIZE_SYSTEMS,
  SIZING_SCHEMA_VERSION,
} from "../config/sizingV1";

export const MY_SIZES_SCHEMA_VERSION = SIZING_SCHEMA_VERSION;

export const MY_SIZES_PROFILE_SYSTEMS = Object.freeze({
  footwear: SIZE_SYSTEMS.EU_FOOTWEAR,
  upperBody: SIZE_SYSTEMS.INTL_ALPHA,
  wholeBody: SIZE_SYSTEMS.EU_APPAREL,
  lowerBody: SIZE_SYSTEMS.EU_APPAREL,
  jeans: SIZE_SYSTEMS.WAIST_INSEAM_IN,
});

export const MY_SIZES_PROFILE_KEYS = Object.freeze(
  Object.keys(MY_SIZES_PROFILE_SYSTEMS),
);

const cleanSizeValue = (value) => String(value ?? "").trim();

const uniqueValues = (values) => {
  const seen = new Set();
  return (Array.isArray(values) ? values : [])
    .map(cleanSizeValue)
    .filter((value) => {
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    });
};

export const createEmptyMySizesProfiles = () =>
  MY_SIZES_PROFILE_KEYS.reduce((profiles, key) => {
    profiles[key] = {
      system: MY_SIZES_PROFILE_SYSTEMS[key],
      primary: "",
      alternates: [],
    };
    return profiles;
  }, {});

export const normalizeMySizesProfiles = (profiles) => {
  const source = profiles && typeof profiles === "object" ? profiles : {};

  return MY_SIZES_PROFILE_KEYS.reduce((normalized, key) => {
    const candidate =
      source[key] && typeof source[key] === "object" ? source[key] : {};
    let primary = cleanSizeValue(candidate.primary);
    let alternates = uniqueValues(candidate.alternates).filter(
      (value) => value !== primary,
    );

    // Older clients may have written an array without a separate primary.
    // Promote its first valid value so the new UI remains backward-compatible.
    if (!primary && alternates.length) {
      [primary, ...alternates] = alternates;
    }

    normalized[key] = {
      system:
        cleanSizeValue(candidate.system) || MY_SIZES_PROFILE_SYSTEMS[key],
      primary,
      alternates: alternates.slice(0, 4),
    };
    return normalized;
  }, {});
};

export const serializeMySizesProfiles = (profiles) => {
  const normalized = normalizeMySizesProfiles(profiles);
  return MY_SIZES_PROFILE_KEYS.reduce((serialized, key) => {
    const profile = normalized[key];
    serialized[key] = profile.primary
      ? {
          system: profile.system,
          primary: profile.primary,
          alternates: profile.alternates,
        }
      : null;
    return serialized;
  }, {});
};

export const normalizeMySizesDocument = (value) => {
  const source = value && typeof value === "object" ? value : {};
  let updatedAt = null;
  if (typeof source.updatedAt === "string") {
    updatedAt = source.updatedAt;
  } else if (typeof source.updatedAt?.toDate === "function") {
    try {
      updatedAt = source.updatedAt.toDate().toISOString();
    } catch {
      updatedAt = null;
    }
  }
  return {
    schemaVersion: MY_SIZES_SCHEMA_VERSION,
    profiles: normalizeMySizesProfiles(source.profiles),
    updatedAt,
  };
};

const extractSizing = (result) =>
  normalizeMySizesDocument(result?.data?.sizing || result?.data || {});

const RETRYABLE_READ_CODES = new Set([
  "deadline-exceeded",
  "internal",
  "network-request-failed",
  "resource-exhausted",
  "unavailable",
  "unknown",
]);

const callableErrorCode = (error) =>
  String(error?.code || "").replace(/^functions\//, "");

const wait = (milliseconds) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

let activeSizesRead = null;
let activeSizesReadOwner = null;

const readMySizesDirect = async () => {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    const error = new Error("You must be signed in to manage your sizes.");
    error.code = "functions/unauthenticated";
    throw error;
  }

  const snapshot = await getDoc(
    doc(db, "users", uid, "preferences", "sizing"),
  );
  return normalizeMySizesDocument(snapshot.exists() ? snapshot.data() : {});
};

const readMySizesWithRecovery = async () => {
  // Reading this owner-only preference directly avoids waking the large
  // callable bundle. Live traces showed that cold path taking 8–10 seconds.
  // Writes continue through saveMySizesV1 so validation and canonicalisation
  // stay server-owned.
  try {
    return await readMySizesDirect();
  } catch (directReadError) {
    console.warn(
      "[my-sizes] Direct preference read unavailable; using callable fallback.",
      directReadError?.code || directReadError?.message,
    );
  }

  const callable = httpsCallable(functions, "getMySizesV1");
  let lastError;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return extractSizing(await callable());
    } catch (error) {
      lastError = error;
      const code = callableErrorCode(error);
      const canRecoverAuth = code === "unauthenticated" && auth.currentUser;
      const canRetryTransport = RETRYABLE_READ_CODES.has(code);
      if (attempt > 0 || (!canRecoverAuth && !canRetryTransport)) throw error;

      if (canRecoverAuth) {
        await auth.currentUser.getIdToken(true);
      } else {
        await wait(300);
      }
    }
  }

  throw lastError;
};

export const getMySizes = async () => {
  const ownerUid = auth.currentUser?.uid || null;
  if (activeSizesRead && activeSizesReadOwner === ownerUid) {
    return activeSizesRead;
  }

  activeSizesReadOwner = ownerUid;
  activeSizesRead = readMySizesWithRecovery().finally(() => {
    activeSizesRead = null;
    activeSizesReadOwner = null;
  });
  return activeSizesRead;
};

export const saveMySizes = async (profiles) => {
  const callable = httpsCallable(functions, "saveMySizesV1");
  return extractSizing(
    await callable({
      schemaVersion: MY_SIZES_SCHEMA_VERSION,
      // The callable uses null for an unconfigured fit domain. The Redux/UI
      // layer keeps an empty selectable object for rendering convenience.
      profiles: serializeMySizesProfiles(profiles),
    }),
  );
};

export const getMySizesErrorMessage = (error, operation = "load") => {
  const code = String(error?.code || "").replace(/^functions\//, "");

  if (code === "unauthenticated") {
    return "Please sign in again to manage your sizes.";
  }
  if (code === "unavailable" || code === "deadline-exceeded") {
    return operation === "save"
      ? "Your sizes could not be saved right now. Check your connection and try again."
      : "Your sizes could not be loaded right now. Check your connection and try again.";
  }
  if (code === "invalid-argument") {
    return "One of the selected sizes is not supported. Please review your choices.";
  }

  return operation === "save"
    ? "Your sizes could not be saved. Please try again."
    : "Your sizes could not be loaded. Please try again.";
};
