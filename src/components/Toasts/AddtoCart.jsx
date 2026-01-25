// customToast.js
import React, { useRef, useState } from "react";
import toast from "react-hot-toast";

function SwipeLeftToast({ t, imageUrl, name }) {
  const startX = useRef(0);
  const dragging = useRef(false);

  const [dx, setDx] = useState(0);

  const onPointerDown = (e) => {
    dragging.current = true;
    startX.current = e.clientX;
    setDx(0);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!dragging.current) return;
    const next = e.clientX - startX.current;

    // only allow swipe LEFT (negative). (optional: allow small right swipe)
    setDx(next > 0 ? 0 : next);
  };

  const end = () => {
    dragging.current = false;

    // threshold to dismiss
    if (dx < -80) toast.dismiss(t.id);
    else setDx(0);
  };

  // fade a bit as it moves left
  const opacity = 1 - Math.min(0.65, Math.abs(dx) / 280);

  return (
    // OUTER: handles enter/leave animation (so it won't clash with swipe transform)
    <div
      className={`${t.visible ? "animate-enter" : "animate-leave"} pointer-events-auto`}
      style={{
        // push it up from the absolute bottom (so it sits mid-bottom)
        marginBottom: 90,
      }}
    >
      {/* INNER: swipe transform */}
   <div
  onPointerDown={onPointerDown}
  onPointerMove={onPointerMove}
  onPointerUp={end}
  onPointerCancel={end}
  onClick={() => toast.dismiss(t.id)}
  className="flex items-center bg-black/80  backdrop-blur-md shadow-lg select-none overflow-hidden rounded-2xl"
  style={{
    transform: `translateX(${dx}px)`,
    opacity,
    transition: dragging.current
      ? "none"
      : "transform 220ms ease, opacity 220ms ease",
    width: "min(92vw, 420px)",
  }}
  role="status"
  aria-live="polite"
>
  {/* image bleeds to edge */}
  <img
    src={imageUrl}
    alt=""
    className="h-16 w-16 object-cover rounded-l-2xl shrink-0"
  />

  {/* content padding only */}
  <div className="min-w-0 px-3 py-2">
    <p className="text-sm font-opensans font-semibold text-white leading-tight">
      Added to cart
    </p>
    <p className="text-xs font-opensans mt-1 text-white/70 truncate max-w-[260px]">
      {name}
    </p>
  </div>
</div>

    </div>
  );
}

export function toastAddedToCart({ imageUrl, name }) {
  toast.custom(
    (t) => <SwipeLeftToast t={t} imageUrl={imageUrl} name={name} />,
    {
      duration: 2500,
      position: "bottom-center",
    },
  );
}
