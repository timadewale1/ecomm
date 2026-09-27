import { Capacitor, registerPlugin } from "@capacitor/core";

const NativeBackNavigationPlugin = registerPlugin("NativeBackNavigation");

const isAvailable = () =>
  Capacitor.getPlatform() === "ios" &&
  Capacitor.isPluginAvailable("NativeBackNavigation");

let requestedEnabled = null;
let updateQueue = Promise.resolve();

export const nativeBackNavigation = {
  isAvailable,

  setEnabled(enabled) {
    if (!isAvailable()) return Promise.resolve();

    const nextEnabled = Boolean(enabled);
    if (requestedEnabled === nextEnabled) return updateQueue;
    requestedEnabled = nextEnabled;

    // Native calls are serialized so a rapidly opening/closing sheet cannot
    // leave WKWebView's interactive navigation in the opposite state from the
    // latest React route state.
    updateQueue = updateQueue
      .catch(() => {})
      .then(() =>
        NativeBackNavigationPlugin.setEnabled({ enabled: nextEnabled }),
      )
      .catch((error) => {
        console.warn("[native-back] Could not update gesture state:", error);
      });

    return updateQueue;
  },
};

export default nativeBackNavigation;
