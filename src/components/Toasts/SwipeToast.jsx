import React, { useEffect, useRef, useState } from "react";
import toast, { ToastIcon } from "react-hot-toast";

function titleForType(type, title) {
  if (title) return title;
  if (type === "success") return "Success";
  if (type === "error") return "Something went wrong";
  if (type === "loading") return "Working…";
  return "Notice";
}

export default function SwipeToast({ t }) {
  const startX = useRef(0);
  const dragging = useRef(false);
  const [dx, setDx] = useState(0);
  const dxRef = useRef(0);
  const suppressClick = useRef(false);
  const activating = useRef(false);

  useEffect(() => {
    setDx(0);
    dxRef.current = 0;
    dragging.current = false;
    suppressClick.current = false;
    activating.current = false;
  }, [t.id, t.visible]);

  const onPointerDown = (e) => {
    dragging.current = true;
    startX.current = e.clientX;
    suppressClick.current = false;
    dxRef.current = 0;
    setDx(0);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!dragging.current) return;
    const next = e.clientX - startX.current;
    if (Math.abs(next) > 8) suppressClick.current = true;
    dxRef.current = next > 0 ? 0 : next;
    setDx(dxRef.current);
  };

  const end = () => {
    dragging.current = false;
    if (dxRef.current < -80) toast.dismiss(t.id);
    else {
      dxRef.current = 0;
      setDx(0);
    }
  };

  const opacity = 1 - Math.min(0.65, Math.abs(dx) / 280);

  const message = t.message; // string OR JSX (ReactNode)
  const actionable = typeof t.onPress === "function";
  const activate = async () => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (!actionable) {
      toast.dismiss(t.id);
      return;
    }
    if (activating.current) return;
    activating.current = true;
    try {
      const handled = await t.onPress();
      // Async actions such as reopening a support conversation can explicitly
      // return false. Keep the toast available when the destination did not open.
      if (handled !== false) toast.dismiss(t.id);
    } catch {
      // Keep actionable notifications visible so the user can retry.
    } finally {
      activating.current = false;
    }
  };

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
        onClick={() => {
          void activate();
        }}
        onKeyDown={(event) => {
          if (actionable && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            void activate();
          }
        }}
        className="flex items-stretch bg-black/80 backdrop-blur-md shadow-lg select-none overflow-hidden rounded-2xl"
        style={{
          transform: `translateX(${dx}px)`,
          opacity,
          transition: dragging.current
            ? "none"
            : "transform 220ms ease, opacity 220ms ease",
          width: "min(92vw, 420px)",
          touchAction: "pan-y", // helps scrolling not fight swipe
        }}
        role={actionable ? "button" : "status"}
        tabIndex={actionable ? 0 : undefined}
        aria-live="polite"
      >
        {/* left icon block */}
        <div className="w-16 flex items-center justify-center rounded-l-2xl shrink-0 bg-white/10">
          <span className="text-xl text-white">
            <ToastIcon toast={t} />
          </span>
        </div>

        {/* content */}
        <div className="min-w-0 px-3 py-2">
          <p className="text-sm font-opensans font-semibold text-white leading-tight">
            {titleForType(t.type, t.title)}
          </p>

          {typeof message === "string" ? (
  <p className="text-xs font-opensans mt-1 text-white/70 whitespace-normal break-words">
    {message}
  </p>
) : (
  <div className="text-xs font-opensans mt-1 text-white/70 whitespace-normal break-words">
    {message}
  </div>
)}
        </div>
      </div>
    </div>
  );
}
