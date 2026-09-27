import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { nativeBackNavigation } from "../services/nativeBackNavigation";

const BLOCKING_SURFACE_SELECTOR = [
  "[data-app-bottom-sheet]",
  "[data-native-back-block]",
  '.ReactModal__Overlay',
  '[role="dialog"][aria-modal="true"]',
].join(",");

const hasVisibleBlockingSurface = () => {
  const candidates = document.querySelectorAll(BLOCKING_SURFACE_SELECTOR);

  return Array.from(candidates).some((element) => {
    if (element.hidden || element.getAttribute("aria-hidden") === "true") {
      return false;
    }

    const style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden";
  });
};

/**
 * Enables WKWebView's native interactive back preview only when this React
 * Router history entry has somewhere safe to return to.
 */
export default function useNativeBackNavigation() {
  const location = useLocation();
  const [hasBlockingSurface, setHasBlockingSurface] = useState(false);

  useEffect(() => {
    if (!nativeBackNavigation.isAvailable()) return undefined;

    let frame = null;
    const updateBlockingState = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        setHasBlockingSurface(hasVisibleBlockingSurface());
      });
    };

    updateBlockingState();
    const observer = new MutationObserver(updateBlockingState);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-hidden", "aria-modal", "class", "hidden"],
    });

    return () => {
      observer.disconnect();
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!nativeBackNavigation.isAvailable()) return undefined;

    const historyIndex = Number(window.history.state?.idx);
    const hasPreviousEntry = Number.isFinite(historyIndex) && historyIndex > 0;
    const shouldEnable = hasPreviousEntry && !hasBlockingSurface;

    void nativeBackNavigation.setEnabled(shouldEnable);

    return undefined;
  }, [hasBlockingSurface, location.key]);

  useEffect(
    () => () => {
      void nativeBackNavigation.setEnabled(false);
    },
    [],
  );
}
