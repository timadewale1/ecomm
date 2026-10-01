import { Capacitor, registerPlugin } from "@capacitor/core";

const NativeRefreshPlugin = registerPlugin("NativeRefresh");

export const HOME_FEED_REFRESH_EVENT = "mythrift:home-feed-refresh";

function isNativeRefreshAvailable() {
  return (
    Capacitor.getPlatform() === "ios" &&
    Capacitor.isPluginAvailable("NativeRefresh")
  );
}

const noopListener = {
  remove: async () => {},
};

export const nativeRefresh = {
  isAvailable: isNativeRefreshAvailable,

  async setEnabled({
    enabled,
    tintColor = "#f9531e",
    verticalOffset = 0,
  } = {}) {
    if (!isNativeRefreshAvailable()) return;

    return NativeRefreshPlugin.setEnabled({
      enabled: Boolean(enabled),
      tintColor,
      verticalOffset,
    });
  },

  async endRefresh() {
    if (!isNativeRefreshAvailable()) return;
    return NativeRefreshPlugin.endRefresh();
  },

  async beginRefresh() {
    if (!isNativeRefreshAvailable()) return { triggered: false };
    return NativeRefreshPlugin.beginRefresh();
  },

  async addRefreshListener(listener) {
    if (!isNativeRefreshAvailable()) return noopListener;
    return NativeRefreshPlugin.addListener("refresh", listener);
  },
};

export default nativeRefresh;
