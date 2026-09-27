import React, { useEffect, useState } from "react";
import { LuArrowUp } from "react-icons/lu";
import { appHaptics } from "../../services/haptics";
import "./AppScrollToTopButton.css";

export default function AppScrollToTopButton({
  threshold = 640,
  bottomOffset = 20,
  zIndex = 45,
  className = "",
}) {
  const [visible, setVisible] = useState(() => window.scrollY > threshold);

  useEffect(() => {
    let frame = null;

    const updateVisibility = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        setVisible(window.scrollY > threshold);
      });
    };

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => {
      window.removeEventListener("scroll", updateVisibility);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [threshold]);

  if (!visible) return null;

  return (
    <button
      type="button"
      className={`app-scroll-to-top-button ${className}`.trim()}
      style={{
        "--app-scroll-top-bottom": `${bottomOffset}px`,
        "--app-scroll-top-z": zIndex,
      }}
      onClick={() => {
        appHaptics.selection();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      aria-label="Scroll to top"
    >
      <LuArrowUp aria-hidden="true" />
    </button>
  );
}
