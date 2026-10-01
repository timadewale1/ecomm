import React, { useEffect, useLayoutEffect, useState } from "react";
import { GoogleAuthProvider, getRedirectResult, signInWithRedirect } from "firebase/auth";
import { useDispatch } from "react-redux";
import { Toaster } from "react-hot-toast";
import { auth, db } from "../../firebase.config";
import { isNativeApp } from "../../services/platform";
import { readWebAuthAttempt, updateWebAuthAttempt, clearWebAuthAttempt, WEB_AUTH_HOSTS } from "../../services/webAuthRedirectState.mjs";
import { clearAuthIntent } from "../../services/authIntent";
import { completeBuyerProviderSignIn, socialAuthErrorMessage } from "../../services/buyerSocialAuth";
import { stageAnonymousCartAsGuest, cartOwnerKey } from "../../services/cartPersistence";
import { fetchAndMergeCart } from "../../services/cartMerge";
import { cartOwnerChanged, cartSyncReady } from "../../redux/reducers/cartSyncSlice";
import { loadAppExperience, persistAppExperience, APP_EXPERIENCE } from "../../services/appExperience";
import { beginAuthTransition } from "../../services/authTransition.mjs";
import { createGoogleRedirectCoordinator } from "../../services/googleRedirectCoordinator.mjs";
import QuickAuthModal from "../PwaModals/AuthModal";
import SwipeToast from "../Toasts/SwipeToast";
import { AuthTransitionSurface } from "./AuthTransitionOverlay";

const isCallback = !isNativeApp && location.pathname === "/auth/google";
const initialAttempt = isNativeApp ? null : readWebAuthAttempt(sessionStorage);
// Shared across StrictMode mounts: getRedirectResult is consumable and profile
// provisioning/cart import must not race each other on a double effect.
let completion;

const finishReturn = (attempt, uid) => {
  updateWebAuthAttempt(sessionStorage, attempt.id, { phase: "complete", uid });
  // Reinitialize the ordinary app with its original authDomain. This isolates
  // Google redirect configuration from X/Apple and the installed app flows.
  window.location.replace(attempt.returnTo);
};

function completeReturn(dispatch) {
  if (!WEB_AUTH_HOSTS.has(location.hostname)) {
    return Promise.reject(Object.assign(new Error("Sign-in not configured here."), {code: "app/auth-domain-not-configured"}));
  }
  return createGoogleRedirectCoordinator({
    readAttempt: () => readWebAuthAttempt(sessionStorage),
    updateAttempt: (id, patch) => updateWebAuthAttempt(sessionStorage, id, patch),
    startGoogle: () => signInWithRedirect(auth, new GoogleAuthProvider()),
    authReady: () => auth.authStateReady(),
    getResult: () => getRedirectResult(auth),
    currentUser: () => auth.currentUser,
    completeProfile: (result) => completeBuyerProviderSignIn({ auth, db, result }),
    importCart: async (attempt, user) => {
      if (attempt.anonymousUid && attempt.anonymousUid !== user.uid) stageAnonymousCartAsGuest(attempt.anonymousUid);
      const owner = cartOwnerKey(user.uid);
      dispatch(cartOwnerChanged(owner));
      try {
        await fetchAndMergeCart(db, user.uid, dispatch);
        dispatch(cartSyncReady(owner, "auth-return"));
      } catch (error) {
        console.warn("[auth-return] Cart import will retry", { code: error?.code });
      }
    },
    selectExperience: async () => {
      await loadAppExperience();
      await persistAppExperience(APP_EXPERIENCE.CUSTOMER);
    },
    cancel: (attempt) => {
      clearWebAuthAttempt(sessionStorage, attempt.id);
      clearAuthIntent();
      window.location.replace(attempt.returnTo);
    },
    finish: finishReturn,
  })();
}

export default function WebGoogleReturnGate({ children }) {
  const dispatch = useDispatch();
  const [ready, setReady] = useState(!isCallback && !initialAttempt);
  const [confirmation, setConfirmation] = useState(null);
  const [error, setError] = useState(null);
  useLayoutEffect(() => {
    document.getElementById("auth-return-boot")?.remove();
  }, []);

  useEffect(() => {
    if (isNativeApp || (!isCallback && !initialAttempt)) return undefined;
    let mounted = true;
    if (!isCallback) {
      // Full-page return has finished provisioning. Mount AuthProvider only
      // now, so guards never mistake a new Google account for a missing user.
      if (!completion) completion = (async () => {
        const attempt = readWebAuthAttempt(sessionStorage);
        await auth.authStateReady();
        if (attempt?.phase === "complete" && attempt.uid === auth.currentUser?.uid) {
          if (attempt.source === "quick-basket") {
            sessionStorage.setItem("mythrift:quick-google-resume:v1", JSON.stringify(attempt));
          }
          const transition = beginAuthTransition();
          transition.finish();
        } else {
          clearAuthIntent();
        }
        clearWebAuthAttempt(sessionStorage, attempt?.id);
      })();
      completion.then(() => { if (mounted) setReady(true); })
        .catch((failure) => { if (mounted) setError(failure); });
    } else {
      if (!completion) completion = completeReturn(dispatch);
      completion.then((value) => { if (mounted && value) setConfirmation(value); })
        .catch((failure) => { if (mounted) setError(failure); });
    }
    return () => { mounted = false; };
  }, [dispatch]);

  if (ready) return children;
  if (error) return <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center font-satoshi">
    <h1 className="text-xl font-semibold">We couldn’t finish signing you in</h1>
    <p role="alert" className="mt-3 max-w-sm text-sm">{socialAuthErrorMessage(error, "Google") || "Sign-in was cancelled."}</p>
    <button type="button" className="mt-6 rounded-md bg-customOrange px-6 py-3 text-white" onClick={() => window.location.reload()}>Try again</button>
    <button type="button" className="mt-3 min-h-[44px] underline" onClick={() => {
      clearWebAuthAttempt(sessionStorage);
      clearAuthIntent();
      window.location.replace("/login");
    }}>Back to sign-in</button>
  </main>;
  if (confirmation) return <>
    <main className="min-h-screen bg-white" />
    <QuickAuthModal open={false} resumeSession={confirmation.authenticated}
      retainAuthIntentOnComplete headerText="Let’s set up your order"
      onComplete={(user) => finishReturn(confirmation.attempt, user.uid)} />
    <Toaster position="bottom-center" toastOptions={{ duration: 3500 }}>{(t) => <SwipeToast t={t} />}</Toaster>
  </>;
  return <AuthTransitionSurface label={initialAttempt?.phase === "start" ? "Opening Google…" : "Finishing sign-in…"} />;
}
