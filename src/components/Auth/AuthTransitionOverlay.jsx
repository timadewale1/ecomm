import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../custom-hooks/useAuth";
import { acquireScrollLock } from "../../services/scrollLock";
import { authTransitionSnapshot, subscribeAuthTransition, releaseAuthTransition } from "../../services/authTransition.mjs";
import "./auth-transition.css";

export function AuthTransitionSurface({ label = "Finishing sign-in…" }) {
  const element = useRef(null);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const release = acquireScrollLock("auth-transition");
    const root = document.getElementById("root");
    const wasInert = root?.inert;
    const previous = document.activeElement;
    if (root) root.inert = true;
    element.current?.focus({ preventScroll: true });
    const timer = setTimeout(() => setSlow(true), 20000);
    return () => {
      clearTimeout(timer);
      release();
      if (root) root.inert = wasInert;
      if (previous?.isConnected) previous.focus?.({ preventScroll: true });
    };
  }, []);
  return createPortal(
    <div ref={element} className="auth-transition" role="dialog" aria-modal="true" aria-label="Completing sign-in" tabIndex={-1}>
      <div role="status" aria-live="polite" className="auth-transition__status">
        <span className="auth-transition__spinner" aria-hidden="true" />
        <p>{label}</p>
      </div>
      {slow && <div className="auth-transition__recovery">
        <p>This is taking longer than expected. Check your connection.</p>
        <button type="button" onClick={() => window.location.reload()}>Reload and try again</button>
      </div>}
    </div>, document.body,
  );
}

export default function AuthTransitionOverlay() {
  const transition = useSyncExternalStore(subscribeAuthTransition, authTransitionSnapshot);
  const { loading } = useAuth();
  const location = useLocation();
  useEffect(() => {
    if (!transition?.finishing || transition.routeLoading || loading) return undefined;
    let secondFrame;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => releaseAuthTransition(transition.id));
    });
    return () => { cancelAnimationFrame(firstFrame); cancelAnimationFrame(secondFrame); };
  }, [transition, loading, location.key]);
  return transition ? <AuthTransitionSurface label={transition.label} /> : null;
}
