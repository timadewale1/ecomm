import React, { useEffect, useRef, useSyncExternalStore } from "react";
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "./useAuth";
import { auth } from "../firebase.config";
import { authIntentRevision, subscribeAuthIntent, claimAuthIntent, settleAuthIntent, retryAuthIntent, pendingAuthIntent } from "../services/authIntent";
import { beginAuthTransition } from "../services/authTransition.mjs";

// One consumer owns a request while it runs, including StrictMode re-renders.
// Callers must return true only after handing off to a route/dialog/action.
export default function useAuthContinuation({ types, ready = true, match, run }) {
  const revision = useSyncExternalStore(subscribeAuthIntent, authIntentRevision);
  const { currentUser, currentUserData, loading } = useAuth();
  const { pathname } = useLocation();
  const latest = useRef({ match, run });
  latest.current = { match, run };
  const typeKey = JSON.stringify(types);
  const pending = pendingAuthIntent();
  const matches = Boolean(pending && (!match || match(pending)));
  useEffect(() => {
    if (!matches || !ready || loading || !currentUser?.uid || currentUser.isAnonymous || currentUserData?.role !== "user") return;
    const intent = claimAuthIntent({ types: JSON.parse(typeKey), pathname, uid: currentUser.uid, match: latest.current.match });
    if (!intent) return;
    const transition = beginAuthTransition();
    const stillCurrent = () => auth.currentUser?.uid === intent.uid && pendingAuthIntent()?.id === intent.id && window.location.pathname === pathname;
    void (async () => {
      let result;
      try {
        if (stillCurrent()) result = await latest.current.run(intent, currentUser, stillCurrent);
      } catch (error) {
        console.warn("[auth-continuation] Action could not finish", { type: intent.type, code: error?.code });
      } finally {
        if (!stillCurrent()) result = "blocked";
        settleAuthIntent(intent, result);
        transition.finish();
      }
      if (pendingAuthIntent()?.id === intent.id && pendingAuthIntent()?.phase === "failed") {
        toast((t) => <span>You're signed in. Please try that action again. <button type="button" className="font-semibold underline" onClick={() => { toast.dismiss(t.id); retryAuthIntent(intent.id); }}>Try again</button></span>, { id: "auth-action-retry", duration: 6000 });
      }
    })();
  }, [revision, ready, matches, loading, currentUser?.uid, currentUser?.isAnonymous, currentUserData?.role, pathname, typeKey]);
}
