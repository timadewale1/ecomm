import { Capacitor } from "@capacitor/core";

export const isNativeApp = Capacitor.isNativePlatform();
export const nativePlatform = Capacitor.getPlatform();
export const isIOSApp = isNativeApp && nativePlatform === "ios";

