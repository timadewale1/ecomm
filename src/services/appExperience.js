import { Preferences } from "@capacitor/preferences";
import { isNativeApp } from "./platform";

export const APP_EXPERIENCE = Object.freeze({
  CUSTOMER: "customer",
  VENDOR: "vendor",
});

export const APP_EXPERIENCE_KEY = "mythrift.appExperience.v1";
const LEGACY_EXPERIENCE_KEY = "mythrift_role";
export const APP_EXPERIENCE_CHANGED_EVENT = "mythrift:app-experience-change";

let cachedExperience;
let loadPromise;

export const normalizeAppExperience = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === APP_EXPERIENCE.CUSTOMER || normalized === "user") {
    return APP_EXPERIENCE.CUSTOMER;
  }
  if (normalized === APP_EXPERIENCE.VENDOR) {
    return APP_EXPERIENCE.VENDOR;
  }
  return null;
};

export const experienceForAccountRole = (role) =>
  role === "vendor"
    ? APP_EXPERIENCE.VENDOR
    : role === "user"
      ? APP_EXPERIENCE.CUSTOMER
      : null;

const readBrowserValue = () => {
  try {
    return (
      normalizeAppExperience(localStorage.getItem(APP_EXPERIENCE_KEY)) ||
      normalizeAppExperience(localStorage.getItem(LEGACY_EXPERIENCE_KEY))
    );
  } catch {
    return null;
  }
};

const mirrorBrowserValue = (experience) => {
  try {
    if (experience) {
      localStorage.setItem(APP_EXPERIENCE_KEY, experience);
      // Keep this mirror during the migration window because a few older
      // production bundles still read the legacy key after a hot update.
      localStorage.setItem(LEGACY_EXPERIENCE_KEY, experience);
    } else {
      localStorage.removeItem(APP_EXPERIENCE_KEY);
      localStorage.removeItem(LEGACY_EXPERIENCE_KEY);
    }
  } catch {
    // Native Preferences remains the source of truth in the installed app.
  }
};

const announceExperience = (experience) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(APP_EXPERIENCE_CHANGED_EVENT, {
      detail: { experience },
    }),
  );
};

export const getCachedAppExperience = () => {
  if (cachedExperience !== undefined) return cachedExperience;
  cachedExperience = readBrowserValue();
  return cachedExperience;
};

export const loadAppExperience = async () => {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    let experience = null;

    if (isNativeApp) {
      try {
        const result = await Preferences.get({ key: APP_EXPERIENCE_KEY });
        experience = normalizeAppExperience(result.value);
      } catch (error) {
        console.warn("[experience] Native preference read failed:", error);
      }
    }

    if (!experience) experience = readBrowserValue();
    cachedExperience = experience;

    // Migrate a valid legacy localStorage value into native Preferences once.
    if (isNativeApp && experience) {
      try {
        await Preferences.set({ key: APP_EXPERIENCE_KEY, value: experience });
      } catch (error) {
        console.warn("[experience] Native preference migration failed:", error);
      }
    }

    mirrorBrowserValue(experience);
    return experience;
  })();

  return loadPromise;
};

export const persistAppExperience = async (value) => {
  const experience = normalizeAppExperience(value);
  if (!experience) throw new Error("Invalid My Thrift app experience.");

  cachedExperience = experience;
  loadPromise = Promise.resolve(experience);
  mirrorBrowserValue(experience);
  announceExperience(experience);

  if (isNativeApp) {
    try {
      await Preferences.set({ key: APP_EXPERIENCE_KEY, value: experience });
    } catch (error) {
      console.warn("[experience] Native preference write failed:", error);
    }
  }

  return experience;
};

export const clearAppExperience = async () => {
  cachedExperience = null;
  loadPromise = Promise.resolve(null);
  mirrorBrowserValue(null);
  announceExperience(null);

  if (isNativeApp) {
    try {
      await Preferences.remove({ key: APP_EXPERIENCE_KEY });
    } catch (error) {
      console.warn("[experience] Native preference removal failed:", error);
    }
  }
};
