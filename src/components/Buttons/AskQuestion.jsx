import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GoQuestion } from "react-icons/go";

const LS_KEY = "ask_question_nudge_v1";

function getLocalYMD(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function readNudgeState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeNudgeState(state) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {}
}

export default function AskQuestionNudge({
  onAskClick,
  className = "",
  textVisibleMs = 7000,
  debug = false,
  variant = "overlay", // ✅ "overlay" | "inline"
}) {
  const isOverlay = variant === "overlay";

  const [mode, setMode] = useState(() => {
    if (debug) return "initial-text";

    const today = getLocalYMD();
    const st = readNudgeState();

    if (!st || st.day !== today) return "initial-text";

    const times = Array.isArray(st.times) ? st.times : [];
    if (times.length < 2) return "initial-text";

    return "icon";
  });

  const timerRef = useRef(null);

  const markRun = () => {
    if (debug) return;
    const today = getLocalYMD();
    const st = readNudgeState();
    const times = st && st.day === today && Array.isArray(st.times) ? st.times : [];

    const now = Date.now();
    const lastTime = times[times.length - 1];
    if (lastTime && now - lastTime < 1000) return;

    writeNudgeState({ day: today, times: [...times, now] });
  };

  useEffect(() => {
    if (mode === "initial-text") {
      markRun();
      timerRef.current = setTimeout(() => setMode("icon"), textVisibleMs);
    }
    return () => timerRef.current && clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ wrapper styles per variant
  const wrapperClass = isOverlay
    ? `absolute bottom-3 left-3 h-11 bg-black/65 backdrop-blur-sm rounded-lg shadow-md flex items-center justify-center overflow-hidden ${className}`
    : `flex-shrink-0 flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full hover:bg-gray-200 transition-colors ${className}`;

  const Wrapper = isOverlay ? motion.div : motion.button;

  return (
    <Wrapper
      layout
      type={isOverlay ? undefined : "button"}
      onClick={isOverlay ? undefined : onAskClick} // inline: whole pill clickable
      className={wrapperClass}
      style={isOverlay ? { borderRadius: 12, padding: "0 12px", zIndex: 50 } : undefined}
    >
      <AnimatePresence mode="wait" initial={false}>
        {mode === "icon" ? (
          <motion.span
            key="icon"
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <GoQuestion className={isOverlay ? "text-xl text-white" : "text-lg text-black"} />
            {/* ✅ keep overlay icon-only, inline shows label */}
            {!isOverlay && (
              <span className="text-sm font-opensans font-medium text-black">Ask a Question</span>
            )}
          </motion.span>
        ) : (
          <motion.div
            key="text"
            className="flex items-center gap-2 whitespace-nowrap"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <p className={isOverlay ? "text-sm font-opensans text-white" : "text-xs font-opensans text-black"}>
              Still not sure?
            </p>

            {/* overlay: keep your orange link; inline: black text */}
            <button
              type="button"
              onClick={onAskClick}
              className={
                isOverlay
                  ? "text-sm font-semibold font-opensans text-customOrange hover:underline focus:outline-none"
                  : "text-sm font-semibold font-opensans text-black hover:underline focus:outline-none"
              }
            >
              Ask a question
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </Wrapper>
  );
}
