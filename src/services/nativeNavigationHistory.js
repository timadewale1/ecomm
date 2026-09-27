import { Capacitor, registerPlugin } from "@capacitor/core";

const NativeNavigationHistoryPlugin = registerPlugin(
  "NativeNavigationHistory",
);

const isAvailable = () =>
  Capacitor.getPlatform() === "ios" &&
  Capacitor.isPluginAvailable("NativeNavigationHistory");

export const nativeNavigationHistory = {
  isAvailable,

  async present({ title = "Browsing history", message, options = [] } = {}) {
    if (!isAvailable()) return { unavailable: true };

    return NativeNavigationHistoryPlugin.present({
      title,
      message,
      options: options.map((option) => ({
        id: String(option.id),
        title: String(option.title),
        type: String(option.type || "product"),
      })),
    });
  },
};

export default nativeNavigationHistory;
