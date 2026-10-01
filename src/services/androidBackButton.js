import { Capacitor } from "@capacitor/core";

const surfaces = [];

const isAndroidNative = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

/**
 * Registers a native surface that must receive Android Back before the router.
 * The last opened surface wins, matching Android's topmost-window behaviour.
 */
export const registerAndroidBackSurface = (onBack) => {
  if (!isAndroidNative() || typeof onBack !== "function") return () => {};

  const entry = { id: Symbol("android-back-surface"), onBack };
  surfaces.push(entry);

  return () => {
    const index = surfaces.findIndex((candidate) => candidate.id === entry.id);
    if (index >= 0) surfaces.splice(index, 1);
  };
};

export const consumeAndroidSurfaceBack = () => {
  if (!isAndroidNative()) return false;

  const entry = surfaces[surfaces.length - 1];
  if (!entry) return false;

  entry.onBack();
  return true;
};

