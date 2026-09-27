import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  motion,
  useDragControls,
} from "framer-motion";
import { acquireScrollLock } from "../../services/scrollLock";
import { registerAndroidBackSurface } from "../../services/androidBackButton";
import { isIOSApp } from "../../services/platform";

const DISMISS_DISTANCE = 96;
const DISMISS_VELOCITY = 720;

/**
 * Shared presentation shell for bottom-up app surfaces.
 *
 * This intentionally owns presentation only. Callers keep control of their
 * data, validation, submit actions and close rules.
 */
export default function AppBottomSheet({
  open,
  onClose,
  children,
  variant = "sheet",
  height = "65dvh",
  ariaLabel = "Dialog",
  closeOnBackdrop = true,
  dismissible = true,
  surfaceClassName = "",
  surfaceStyle,
  handleClassName = "bg-gray-300",
  backdropClassName = "bg-black/40",
  zIndex = 3000,
  ariaBusy,
  compactTop = false,
  keyboardAware = false,
  freezeBackground = false,
}) {
  const dragControls = useDragControls();
  const sheetRef = useRef(null);
  const previouslyFocusedRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);
  const isSheet = variant === "sheet";
  const [keyboardMetrics, setKeyboardMetrics] = useState({
    bottom: 0,
    maxHeight: null,
  });

  onCloseRef.current = onClose;
  dismissibleRef.current = dismissible;

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocusedRef.current = document.activeElement;

    const releaseScrollLock = acquireScrollLock(`AppBottomSheet:${ariaLabel}`, {
      freezePosition: freezeBackground,
    });

    const focusFrame = window.requestAnimationFrame(() => {
      sheetRef.current?.focus({ preventScroll: true });
    });

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && dismissibleRef.current) {
        onCloseRef.current?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      releaseScrollLock();
      document.removeEventListener("keydown", handleKeyDown);

      const previouslyFocused = previouslyFocusedRef.current;
      if (previouslyFocused instanceof HTMLElement) {
        window.requestAnimationFrame(() => {
          previouslyFocused.focus({ preventScroll: true });
        });
      }
    };
  }, [ariaLabel, freezeBackground, open]);

  useEffect(() => {
    if (!open) return undefined;

    // Android Back belongs to the topmost sheet. A busy/non-dismissible sheet
    // consumes Back without navigating behind itself; dismissible sheets close.
    return registerAndroidBackSurface(() => {
      if (dismissibleRef.current) onCloseRef.current?.();
    });
  }, [open]);

  useEffect(() => {
    if (!open || !keyboardAware || !isSheet) {
      setKeyboardMetrics((current) =>
        current.bottom || current.maxHeight
          ? { bottom: 0, maxHeight: null }
          : current,
      );
      return undefined;
    }

    const viewport = window.visualViewport;
    const updateMetrics = () => {
      const layoutHeight = window.innerHeight;
      const visibleHeight = Math.round(viewport?.height || layoutHeight);
      const viewportTop = Math.max(0, Math.round(viewport?.offsetTop || 0));
      const hiddenBelow = Math.max(
        0,
        Math.round(layoutHeight - (viewportTop + visibleHeight)),
      );
      const next = {
        bottom: hiddenBelow,
        maxHeight: Math.max(240, visibleHeight - 12),
      };
      setKeyboardMetrics((current) =>
        current.bottom === next.bottom && current.maxHeight === next.maxHeight
          ? current
          : next,
      );
    };

    let focusTimer;
    const keepSheetFieldVisible = (event) => {
      const target = event.target;
      if (
        !(target instanceof HTMLElement) ||
        !sheetRef.current?.contains(target)
      ) {
        return;
      }

      updateMetrics();
      window.clearTimeout(focusTimer);
      focusTimer = window.setTimeout(() => {
        if (!target.isConnected || document.activeElement !== target) return;
        target.scrollIntoView({
          block: "center",
          inline: "nearest",
          behavior: "smooth",
        });
      }, 180);
    };

    updateMetrics();
    viewport?.addEventListener("resize", updateMetrics);
    viewport?.addEventListener("scroll", updateMetrics);
    window.addEventListener("resize", updateMetrics);
    // iOS uses the shared viewport coordinator; a second delayed smooth scroll
    // here used to fight the native keyboard resize and move the form twice.
    if (!isIOSApp) document.addEventListener("focusin", keepSheetFieldVisible);

    return () => {
      window.clearTimeout(focusTimer);
      viewport?.removeEventListener("resize", updateMetrics);
      viewport?.removeEventListener("scroll", updateMetrics);
      window.removeEventListener("resize", updateMetrics);
      document.removeEventListener("focusin", keepSheetFieldVisible);
    };
  }, [isSheet, keyboardAware, open]);

  if (typeof document === "undefined") return null;

  const requestBackdropClose = (event) => {
    if (
      closeOnBackdrop &&
      dismissible &&
      event.target === event.currentTarget
    ) {
      onClose?.();
    }
  };

  const handleDragEnd = (_event, info) => {
    if (!dismissible) return;

    if (
      info.offset.y >= DISMISS_DISTANCE ||
      info.velocity.y >= DISMISS_VELOCITY
    ) {
      onClose?.();
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0"
          style={{ zIndex }}
          role="presentation"
        >
          <motion.div
            className={`absolute inset-0 ${backdropClassName}`}
            aria-hidden="true"
            onPointerDown={requestBackdropClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          />

          <motion.section
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            aria-busy={ariaBusy}
            tabIndex={-1}
            data-app-bottom-sheet={isSheet ? "sheet" : "fullscreen"}
            className={[
              "absolute inset-x-0 bottom-0 z-[1] bg-white flex flex-col overflow-hidden outline-none",
              isSheet ? "rounded-t-[28px] shadow-2xl" : "h-[100dvh]",
              surfaceClassName,
            ].join(" ")}
            style={{
              height: isSheet ? height : undefined,
              maxHeight: isSheet
                ? keyboardAware && keyboardMetrics.maxHeight
                  ? `min(calc(100dvh - var(--app-safe-top, env(safe-area-inset-top, 0px)) - 12px), ${keyboardMetrics.maxHeight}px)`
                  : "calc(100dvh - var(--app-safe-top, env(safe-area-inset-top, 0px)) - 12px)"
                : undefined,
              bottom:
                isSheet && keyboardAware && keyboardMetrics.bottom
                  ? `${keyboardMetrics.bottom}px`
                  : undefined,
              paddingTop: isSheet
                ? undefined
                : "var(--app-safe-top, env(safe-area-inset-top, 0px))",
              paddingBottom:
                "var(--app-safe-bottom, env(safe-area-inset-bottom, 0px))",
              ...surfaceStyle,
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{
              type: "spring",
              stiffness: 420,
              damping: 36,
              mass: 0.82,
            }}
            drag={isSheet && dismissible ? "y" : false}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.42 }}
            dragMomentum={false}
            onDragEnd={handleDragEnd}
          >
            {isSheet && (
              <div
                className={`absolute left-1/2 top-0 z-20 flex w-28 -translate-x-1/2 cursor-grab touch-none items-start justify-center active:cursor-grabbing ${
                  compactTop ? "h-5" : "h-9"
                }`}
               
                style={{ paddingTop: compactTop ? "8px" : "10px" }}
                onPointerDown={(event) => {
                  if (dismissible) dragControls.start(event);
                }}
                aria-hidden="true"
              >
                <div className={`h-1 w-14 rounded-full ${handleClassName}`} />
              </div>
            )}

            {children}
          </motion.section>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
