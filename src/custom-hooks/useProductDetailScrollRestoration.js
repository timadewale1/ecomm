import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { saveScroll } from "../redux/reducers/scrollSlice";

const MAX_RESTORE_WAIT_MS = 8_000;
const RESTORE_TOLERANCE_PX = 3;

const asScrollPosition = (value) => {
  const position = Number(value);
  return Number.isFinite(position) && position > 0 ? position : 0;
};

/**
 * Restores Product Detail only when revisiting the same browser-history entry.
 * A new visit to the same product receives a different location key and starts
 * at the top, while Back/Forward returns to the exact previous entry.
 */
export default function useProductDetailScrollRestoration({
  productId,
  locationKey,
  ready,
  shouldRestore,
}) {
  const dispatch = useDispatch();
  const scrollKey = `product-detail:${String(productId || "unknown")}:${
    locationKey || "default"
  }`;
  const savedPosition = useSelector(
    (state) => state.scroll?.positions?.[scrollKey],
  );
  const savedPositionRef = useRef(savedPosition);
  const lastKnownPositionRef = useRef(0);
  const restoringRef = useRef(false);
  const restoredKeyRef = useRef(null);
  savedPositionRef.current = savedPosition;

  useEffect(() => {
    // In development, React Strict Mode immediately cleans up and reruns this
    // effect. Seed the ref from the saved POP value so that rehearsal cleanup
    // cannot overwrite a valid position with zero.
    lastKnownPositionRef.current = shouldRestore
      ? asScrollPosition(savedPositionRef.current)
      : 0;
    restoringRef.current = false;

    let scrollFrame = null;
    const capturePosition = () => {
      if (restoringRef.current || scrollFrame !== null) return;
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = null;
        if (restoringRef.current) return;
        lastKnownPositionRef.current = Math.max(0, window.scrollY || 0);
      });
    };

    const persistPosition = () => {
      if (scrollFrame !== null) {
        window.cancelAnimationFrame(scrollFrame);
        scrollFrame = null;
        if (!restoringRef.current) {
          lastKnownPositionRef.current = Math.max(0, window.scrollY || 0);
        }
      }

      dispatch(
        saveScroll({
          key: scrollKey,
          y: Math.round(lastKnownPositionRef.current),
        }),
      );
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") persistPosition();
    };

    window.addEventListener("scroll", capturePosition, { passive: true });
    window.addEventListener("pagehide", persistPosition);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("scroll", capturePosition);
      window.removeEventListener("pagehide", persistPosition);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      persistPosition();
    };
  }, [dispatch, scrollKey, shouldRestore]);

  useEffect(() => {
    if (!ready || restoredKeyRef.current === scrollKey) return undefined;

    if (!shouldRestore) {
      restoredKeyRef.current = scrollKey;
      return undefined;
    }

    const targetPosition = asScrollPosition(savedPosition);
    if (targetPosition <= 0) {
      restoredKeyRef.current = scrollKey;
      return undefined;
    }

    restoringRef.current = true;
    lastKnownPositionRef.current = targetPosition;

    let cancelled = false;
    let retryTimer = null;
    let firstFrame = null;
    let secondFrame = null;
    let finishFrame = null;
    const startedAt = performance.now();

    const removeCancellationListeners = () => {
      window.removeEventListener("touchstart", cancelForUserInteraction);
      window.removeEventListener("pointerdown", cancelForUserInteraction);
      window.removeEventListener("wheel", cancelForUserInteraction);
    };

    const finish = (markRestored = true) => {
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      retryTimer = null;
      removeCancellationListeners();
      restoringRef.current = false;
      lastKnownPositionRef.current = Math.max(0, window.scrollY || 0);
      if (markRestored) restoredKeyRef.current = scrollKey;
    };

    function cancelForUserInteraction() {
      if (cancelled) return;
      cancelled = true;
      finish();
    }

    const attemptRestore = () => {
      if (cancelled) return;

      const maximumPosition = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const targetIsReachable =
        maximumPosition + RESTORE_TOLERANCE_PX >= targetPosition;
      const timedOut = performance.now() - startedAt >= MAX_RESTORE_WAIT_MS;

      if (targetIsReachable || timedOut) {
        const finalPosition = Math.min(targetPosition, maximumPosition);
        window.scrollTo({ top: finalPosition, left: 0, behavior: "auto" });
        finishFrame = window.requestAnimationFrame(() => finish(true));
        return;
      }

      retryTimer = window.setTimeout(attemptRestore, 80);
    };

    window.addEventListener("touchstart", cancelForUserInteraction, {
      passive: true,
    });
    window.addEventListener("pointerdown", cancelForUserInteraction, {
      passive: true,
    });
    window.addEventListener("wheel", cancelForUserInteraction, {
      passive: true,
    });

    // Run after the global ScrollToTop effect and after the first painted
    // Product Detail layout. Further retries wait for lazy content if needed.
    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(attemptRestore);
    });

    return () => {
      cancelled = true;
      if (firstFrame !== null) window.cancelAnimationFrame(firstFrame);
      if (secondFrame !== null) window.cancelAnimationFrame(secondFrame);
      if (finishFrame !== null) window.cancelAnimationFrame(finishFrame);
      finish(false);
    };
  }, [ready, savedPosition, scrollKey, shouldRestore]);
}
