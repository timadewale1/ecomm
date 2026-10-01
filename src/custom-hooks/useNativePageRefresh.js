import { useEffect, useRef } from "react";
import { appHaptics } from "../services/haptics";
import { nativeRefresh } from "../services/nativeRefresh";

export default function useNativePageRefresh(
  refresh,
  { enabled = true, verticalOffset = 112, minimumVisibleMs = 550 } = {},
) {
  const refreshRef = useRef(refresh);
  const refreshingRef = useRef(false);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!enabled || !nativeRefresh.isAvailable()) return undefined;

    let cancelled = false;
    let listenerHandle;

    const runRefresh = async () => {
      if (refreshingRef.current) return;
      refreshingRef.current = true;
      const startedAt = Date.now();
      appHaptics.light();
      try {
        await refreshRef.current?.();
        if (!cancelled) appHaptics.success();
      } catch (error) {
        console.error("[native-refresh] page refresh failed:", error);
        if (!cancelled) appHaptics.error();
      } finally {
        refreshingRef.current = false;
        // A very fast Firestore response can otherwise end UIRefreshControl
        // before iOS paints a visible frame. Keep only the native spinner alive
        // for a short, consistent minimum; the page content is never blocked.
        if (!cancelled) {
          const remaining = minimumVisibleMs - (Date.now() - startedAt);
          if (remaining > 0) {
            await new Promise((resolve) => window.setTimeout(resolve, remaining));
          }
          if (!cancelled) await nativeRefresh.endRefresh();
        }
      }
    };

    const setup = async () => {
      listenerHandle = await nativeRefresh.addRefreshListener(() => {
        void runRefresh();
      });
      if (cancelled) {
        await listenerHandle.remove();
        return;
      }
      await nativeRefresh.setEnabled({
        enabled: true,
        tintColor: "#f9531e",
        verticalOffset,
      });
    };

    void setup().catch((error) => {
      console.warn("[native-refresh] page setup failed:", error);
    });

    return () => {
      cancelled = true;
      refreshingRef.current = false;
      void listenerHandle?.remove();
      void nativeRefresh.endRefresh();
      void nativeRefresh.setEnabled({ enabled: false });
    };
  }, [enabled, minimumVisibleMs, verticalOffset]);
}
