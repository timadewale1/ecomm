import React, { useEffect, useRef, useState } from "react";
import toast, { ToastIcon } from "react-hot-toast";

function titleForType(type) {
  if (type === "success") return "Success";
  if (type === "error") return "Something went wrong";
  if (type === "loading") return "Working…";
  return "Notice";
}

export default function SwipeToast({ t }) {
  const startX = useRef(0);
  const dragging = useRef(false);
  const [dx, setDx] = useState(0);

  useEffect(() => {
    setDx(0);
    dragging.current = false;
  }, [t.id, t.visible]);

  const onPointerDown = (e) => {
    dragging.current = true;
    startX.current = e.clientX;
    setDx(0);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!dragging.current) return;
    const next = e.clientX - startX.current;
    setDx(next > 0 ? 0 : next);
  };

  const end = () => {
    dragging.current = false;
    if (dx < -80) toast.dismiss(t.id);
    else setDx(0);
  };

  const opacity = 1 - Math.min(0.65, Math.abs(dx) / 280);

  const message = t.message; // string OR JSX (ReactNode)

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
        onClick={() => toast.dismiss(t.id)}
        className="flex items-center bg-black/80 backdrop-blur-md shadow-lg select-none overflow-hidden rounded-2xl"
        style={{
          transform: `translateX(${dx}px)`,
          opacity,
          transition: dragging.current
            ? "none"
            : "transform 220ms ease, opacity 220ms ease",
          width: "min(92vw, 420px)",
          touchAction: "pan-y", // helps scrolling not fight swipe
        }}
        role="status"
        aria-live="polite"
      >
        {/* left icon block */}
        <div className="h-16 w-16 flex items-center justify-center rounded-l-2xl shrink-0 bg-white/10">
          <span className="text-xl text-white">
            <ToastIcon toast={t} />
          </span>
        </div>

        {/* content */}
        <div className="min-w-0 px-3 py-2">
          <p className="text-sm font-opensans font-semibold text-white leading-tight">
            {titleForType(t.type)}
          </p>

          {typeof message === "string" ? (
            <p className="text-xs font-opensans mt-1 text-white/70 truncate max-w-[260px]">
              {message}
            </p>
          ) : (
            <div className="text-xs font-opensans mt-1 text-white/70 truncate max-w-[260px]">
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
