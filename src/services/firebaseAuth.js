import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import {
  GoogleAuthProvider,
  OAuthProvider,
  TwitterAuthProvider,
  signInWithCredential,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { isNativeApp } from "./platform";
import { stageAnonymousCartAsGuest } from "./cartPersistence";

const preserveReplacedAnonymousCart = (anonymousUid, nextUid) => {
  if (!anonymousUid || anonymousUid === nextUid) return;
  try {
    stageAnonymousCartAsGuest(anonymousUid);
  } catch (error) {
    // Authentication succeeded, so do not manufacture a login failure. The
    // auth-owned cart listener also attempts the same idempotent handoff and
    // the original anonymous envelope remains intact as a recovery copy.
    console.error("Anonymous cart handoff after social sign-in failed:", error);
  }
};

/**
 * Uses Google's native iOS/Android sign-in UI in Capacitor, then signs the
 * Firebase Web SDK into the same account so the existing React auth state,
 * Firestore rules, and onAuthStateChanged listeners continue to work.
 */
const completeWebLayerSignIn = async (
  auth,
  credential,
  anonymousUid,
  providerProfile = null,
) => {
  const result = await signInWithCredential(auth, credential);
  const providerDisplayName = providerProfile?.displayName?.trim?.() || "";

  // Apple only supplies the person's name during the first authorization.
  // The native bridge returns it separately because the Web SDK credential
  // constructor accepts only the token and nonce. Persist it immediately so a
  // later login can never erase that one-time value.
  if (providerDisplayName && !result.user?.displayName) {
    try {
      await updateProfile(result.user, { displayName: providerDisplayName });
    } catch (error) {
      console.warn("Provider name could not be attached to Firebase Auth:", error);
    }
  }

  result.providerProfile = providerProfile;
  preserveReplacedAnonymousCart(anonymousUid, result.user?.uid);
  return result;
};

const credentialError = (provider) => {
  const error = new Error(
    `${provider} did not return the credentials needed to finish sign-in.`,
  );
  error.code = "app/provider-credential-missing";
  return error;
};

export const signInWithGoogle = async (auth, provider) => {
  const anonymousUid = auth.currentUser?.isAnonymous
    ? auth.currentUser.uid
    : null;
  if (!isNativeApp) {
    const result = await signInWithPopup(
      auth,
      provider || new GoogleAuthProvider(),
    );
    preserveReplacedAnonymousCart(anonymousUid, result.user?.uid);
    return result;
  }

  const nativeResult = await FirebaseAuthentication.signInWithGoogle({
    skipNativeAuth: true,
  });
  console.info("[NativeAuth] Google credential received; connecting Firebase session.");
  const idToken = nativeResult.credential?.idToken;
  const accessToken = nativeResult.credential?.accessToken;

  if (!idToken) {
    throw new Error("Google Sign-In did not return an ID token.");
  }

  const credential = GoogleAuthProvider.credential(idToken, accessToken);
  const result = await completeWebLayerSignIn(
    auth,
    credential,
    anonymousUid,
    nativeResult.user,
  );
  console.info("[NativeAuth] Firebase session connected.");
  return result;
};

export const signInWithApple = async (auth, provider) => {
  const anonymousUid = auth.currentUser?.isAnonymous
    ? auth.currentUser.uid
    : null;
  if (!isNativeApp) {
    const appleProvider = provider || new OAuthProvider("apple.com");
    appleProvider.addScope("email");
    appleProvider.addScope("name");
    const result = await signInWithPopup(auth, appleProvider);
    preserveReplacedAnonymousCart(anonymousUid, result.user?.uid);
    return result;
  }

  const nativeResult = await FirebaseAuthentication.signInWithApple({
    skipNativeAuth: true,
  });
  const idToken = nativeResult.credential?.idToken;
  const rawNonce = nativeResult.credential?.nonce;
  if (!idToken || !rawNonce) throw credentialError("Apple Sign-In");

  const appleProvider = new OAuthProvider("apple.com");
  const credential = appleProvider.credential({ idToken, rawNonce });
  return completeWebLayerSignIn(
    auth,
    credential,
    anonymousUid,
    nativeResult.user,
  );
};

export const signInWithTwitter = async (auth, provider) => {
  const anonymousUid = auth.currentUser?.isAnonymous
    ? auth.currentUser.uid
    : null;
  if (!isNativeApp) {
    const result = await signInWithPopup(
      auth,
      provider || new TwitterAuthProvider(),
    );
    preserveReplacedAnonymousCart(anonymousUid, result.user?.uid);
    return result;
  }

  const nativeResult = await FirebaseAuthentication.signInWithTwitter({
    skipNativeAuth: true,
  });
  const accessToken = nativeResult.credential?.accessToken;
  const secret = nativeResult.credential?.secret;
  if (!accessToken || !secret) throw credentialError("X Sign-In");

  const credential = TwitterAuthProvider.credential(accessToken, secret);
  return completeWebLayerSignIn(
    auth,
    credential,
    anonymousUid,
    nativeResult.user,
  );
};
