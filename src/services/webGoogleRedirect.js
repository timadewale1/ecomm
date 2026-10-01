import { beginAuthTransition } from "./authTransition.mjs";
import { writeWebAuthAttempt, clearWebAuthAttempt, WEB_AUTH_HOSTS } from "./webAuthRedirectState.mjs";
import { pendingAuthIntent } from "./authIntent";

export async function startWebGoogleRedirect(auth, provider, context = {}) {
  // Preview/localhost need their own registered callback, never silently use
  // the production domain (which would strand their local cart/session).
  if (!WEB_AUTH_HOSTS.has(window.location.hostname)) {
    throw Object.assign(new Error("Google redirect is not configured for this site."), {code: "app/auth-domain-not-configured"});
  }
  const attempt = writeWebAuthAttempt(sessionStorage, {
    ...context,
    intentId: context.intentId || pendingAuthIntent()?.id || null,
    returnTo: context.returnTo || `${location.pathname}${location.search}${location.hash}`,
    anonymousUid: auth.currentUser?.isAnonymous ? auth.currentUser.uid : null,
  });
  const transition = beginAuthTransition("Opening Google…");
  // Back/forward-cache restoration returns to this document without mounting
  // React again. Release the old attempt so another click is possible.
  const onReturn = (event) => {
    if (!event.persisted) return;
    clearWebAuthAttempt(sessionStorage, attempt.id);
    transition.cancel();
    window.location.reload();
  };
  window.addEventListener("pageshow", onReturn);
  try {
    // Only this dedicated page uses the same-origin Firebase auth helper.
    // X/Apple popup flows and native Firebase configuration stay untouched.
    window.location.assign("/auth/google");
    return await new Promise(() => {}); // This document is leaving, not signed in.
  } catch (error) {
    window.removeEventListener("pageshow", onReturn);
    clearWebAuthAttempt(sessionStorage, attempt.id);
    transition.cancel();
    throw error;
  }
}
