import React, { useRef, useState } from "react";
import toast from "react-hot-toast";

function SwipeLeftToast({ t, title, subtitle, actionLabel, onAction }) {
  const startX = useRef(0);
  const dragging = useRef(false);
  const [dx, setDx] = useState(0);

  const isInteractive = (target) =>
    target?.closest?.("button,a,input,textarea,select,[data-no-drag]");

  const onPointerDown = (e) => {
    // ✅ if user is pressing the action button (or any interactive element), don't drag-capture
    if (isInteractive(e.target)) return;

    dragging.current = true;
    startX.current = e.clientX;
    setDx(0);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!dragging.current) return;
    const next = e.clientX - startX.current;
    setDx(next > 0 ? 0 : next); // swipe LEFT only
  };

  const end = () => {
    dragging.current = false;
    if (dx < -80) toast.dismiss(t.id);
    else setDx(0);
  };

  const opacity = 1 - Math.min(0.65, Math.abs(dx) / 280);

  return (
    <div
      className={`${t.visible ? "animate-enter" : "animate-leave"} pointer-events-auto`}
      style={{ marginBottom: 90 }}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={end}
        onPointerCancel={end}
        className="bg-black backdrop-blur-md p-2 shadow-lg select-none overflow-hidden rounded-2xl"
        style={{
          transform: `translateX(${dx}px)`,
          opacity,
          transition: dragging.current
            ? "none"
            : "transform 220ms ease, opacity 220ms ease",
          width: "min(92vw, 440px)",
        }}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center">
          <div className="min-w-0 px-4 py-3">
            <p className="text-sm font-opensans font-medium text-white leading-tight">
              {title}
            </p>
            <p className="text-xs font-opensans text-white/70 leading-tight mt-1">
              {subtitle}
            </p>
          </div>

          {actionLabel ? (
            <button
              data-no-drag
              onPointerDown={(e) => e.stopPropagation()} // ✅ extra safety
              onClick={(e) => {
                e.stopPropagation();
                toast.dismiss(t.id);
                onAction?.(); // ✅ navigate will work
              }}
              className="ml-auto mr-3 rounded-xl bg-white/15 px-3 py-2 text-xs font-opensans font-semibold text-white hover:bg-white/20"
            >
              {actionLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function toastOfferSent({
  title = "Offer sent successfully",
  subtitle = "Waiting for vendor response.",
  actionLabel = "View Offers",
  onAction,
  duration = 9500,
}) {
  toast.custom(
    (t) => (
      <SwipeLeftToast
        t={t}
        title={title}
        subtitle={subtitle}
        actionLabel={actionLabel}
        onAction={onAction}
      />
    ),
    { duration, position: "bottom-center" },
  );
}
