import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { appHaptics } from "../../services/haptics";
import "./app-navigation.css";

const joinClasses = (...values) => values.filter(Boolean).join(" ");
const DEFAULT_LONG_PRESS_MS = 520;
const POINTER_CANCEL_DISTANCE = 12;

export default function AppBackButton({
  onClick,
  onLongPress,
  longPressMs = DEFAULT_LONG_PRESS_MS,
  hintText = "",
  hintStorageKey = "mythrift:product-history-hint:v1",
  hintMaxShows = 2,
  label = "Go back",
  className = "",
  variant = "header",
  scrolled = false,
  fixed = false,
  icon = null,
  disabled = false,
}) {
  const pressTimerRef = useRef(null);
  const suppressResetTimerRef = useRef(null);
  const pressStartRef = useRef(null);
  const suppressClickRef = useRef(false);
  const [showHint, setShowHint] = useState(false);
  const longPressEnabled = Boolean(onLongPress);

  const clearPressTimer = () => {
    if (pressTimerRef.current !== null) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const clearSuppressResetTimer = () => {
    if (suppressResetTimerRef.current !== null) {
      window.clearTimeout(suppressResetTimerRef.current);
      suppressResetTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (!longPressEnabled || !hintText || hintMaxShows <= 0) return undefined;

    let currentCount = 0;
    try {
      currentCount = Number(localStorage.getItem(hintStorageKey) || 0);
    } catch {
      return undefined;
    }
    if (!Number.isFinite(currentCount) || currentCount < 0) currentCount = 0;
    if (currentCount >= hintMaxShows) return undefined;

    const showTimer = window.setTimeout(() => {
      setShowHint(true);
      try {
        localStorage.setItem(hintStorageKey, String(currentCount + 1));
      } catch {
        // The hint is optional; storage restrictions must not affect Back.
      }
    }, 850);
    const hideTimer = window.setTimeout(() => setShowHint(false), 5000);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [hintMaxShows, hintStorageKey, hintText, longPressEnabled]);

  useEffect(
    () => () => {
      clearPressTimer();
      clearSuppressResetTimer();
    },
    [],
  );

  const handlePointerDown = (event) => {
    if (disabled || !onLongPress || (event.button !== undefined && event.button !== 0)) {
      return;
    }

    clearPressTimer();
    clearSuppressResetTimer();
    suppressClickRef.current = false;
    pressStartRef.current = { x: event.clientX, y: event.clientY };
    pressTimerRef.current = window.setTimeout(async () => {
      pressTimerRef.current = null;
      suppressClickRef.current = true;
      suppressResetTimerRef.current = window.setTimeout(() => {
        suppressClickRef.current = false;
        suppressResetTimerRef.current = null;
      }, 1200);
      setShowHint(false);
      await appHaptics.medium();
      onLongPress();
    }, longPressMs);
  };

  const handlePointerMove = (event) => {
    const start = pressStartRef.current;
    if (!start || pressTimerRef.current === null) return;
    const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    if (distance > POINTER_CANCEL_DISTANCE) clearPressTimer();
  };

  const handlePointerEnd = () => {
    clearPressTimer();
    pressStartRef.current = null;
  };

  const handleClick = (event) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      clearSuppressResetTimer();
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onClick?.(event);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onPointerLeave={handlePointerEnd}
      onLostPointerCapture={handlePointerEnd}
      onContextMenu={onLongPress ? (event) => event.preventDefault() : undefined}
      onSelectStart={onLongPress ? (event) => event.preventDefault() : undefined}
      onDragStart={onLongPress ? (event) => event.preventDefault() : undefined}
      aria-label={label}
      aria-description={onLongPress ? "Press and hold for browsing history" : undefined}
      disabled={disabled}
      className={joinClasses(
        "app-back-button",
        `app-back-button--${variant}`,
        longPressEnabled && "has-long-press",
        scrolled && "is-scrolled",
        fixed && "is-fixed",
        className
      )}
    >
      {icon || <ArrowLeft aria-hidden="true" />}
      {showHint && (
        <span className="app-back-button__hint" role="status">
          {hintText}
        </span>
      )}
    </button>
  );
}
