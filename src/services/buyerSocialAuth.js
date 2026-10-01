import { getAdditionalUserInfo } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { isCurrentAccountBuyer, assertCurrentAccount } from "./accountLookups";
import { authProvisioning } from "./authProvisioning.mjs";
import { beginAuthTransition } from "./authTransition.mjs";
import { mustSignOutRestrictedAccount } from "./accountRestrictionPolicy.mjs";
import {
  signInWithApple,
  signInWithGoogle,
  signInWithTwitter,
} from "./firebaseAuth";

const providerSignIn = (auth, providerId, redirectContext) => {
  if (providerId === "apple.com") return signInWithApple(auth);
  if (providerId === "twitter.com") return signInWithTwitter(auth);
  return signInWithGoogle(auth, undefined, redirectContext);
};

const additionalInfo = (result) => {
  // A reload can resume profile provisioning from the authenticated Firebase
  // user. Never infer "new user" from untrusted browser continuation data.
  if (!result?._tokenResponse) return null;
  return getAdditionalUserInfo(result);
};

const lower = (value) => String(value || "").trim().toLowerCase();

const normalizedName = (result) => {
  const additional = additionalInfo(result);
  return (
    result.providerProfile?.displayName ||
    result.user?.displayName ||
    additional?.profile?.name ||
    additional?.username ||
    ""
  ).trim();
};

const generatedUsername = ({ displayName, email, uid }) => {
  const base = String(displayName || email?.split("@")[0] || "thrifter")
    .trim()
    .replace(/\s+/g, "");
  return `${base || "thrifter"}${String(uid || "").slice(0, 6)}`;
};

const endBlockedSession = async (auth, result) => {
  const isNewUser = !!additionalInfo(result)?.isNewUser;
  if (isNewUser) {
    try {
      await result.user?.delete();
      return;
    } catch (error) {
      console.warn("Could not remove a blocked newly-created buyer account:", error);
    }
  }
  try {
    await auth.signOut();
  } catch (error) {
    console.warn("Could not close blocked social-auth session:", error);
  }
};

export const authenticateBuyerWithProvider = async ({ auth, db, providerId, redirectContext }) => {
  const provisioning = authProvisioning.begin();
  let transition;
  try {
    const result = await providerSignIn(auth, providerId, redirectContext);
    transition = beginAuthTransition();
    const completed = await completeBuyerProviderSignIn({ auth, db, result, provisioning });
    return { ...completed, transition };
  } catch (error) {
    transition?.cancel();
    throw error;
  } finally {
    provisioning.finish();
  }
};

export const completeBuyerProviderSignIn = async ({ auth, db, result, provisioning }) => {
    const user = result?.user;
    if (!user?.uid) {
      const error = new Error("The sign-in provider did not return an account.");
      error.code = "app/provider-user-missing";
      throw error;
    }

    provisioning?.bind(user.uid);
    const userRef = doc(db, "users", user.uid);
    const [userDoc, buyerAllowed] = await Promise.all([
      getDoc(userRef), isCurrentAccountBuyer(),
    ]);
    const email = lower(user.email || result.providerProfile?.email);
    assertCurrentAccount(user);

    if (!buyerAllowed) {
      await endBlockedSession(auth, result);
      try {
        localStorage.setItem("BLOCKED_VENDOR_EMAIL", "1");
      } catch {}
      const error = new Error("This account belongs to a vendor.");
      error.code = "app/vendor-account";
      throw error;
    }

    const displayName = normalizedName(result);
    const existing = userDoc.exists() ? userDoc.data() || {} : {};
    if (mustSignOutRestrictedAccount({ ...existing, role: "user" })) {
      await auth.signOut();
      throw Object.assign(new Error("Account unavailable."), {code: "app/account-restricted"});
    }
    if (!userDoc.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        username: generatedUsername({ displayName, email, uid: user.uid }),
        displayName: displayName || null,
        email: email || null,
        emailLower: email || null,
        profileComplete: false,
        walletSetup: false,
        birthday: "not-set",
        welcomeEmailSent: false,
        notificationAllowed: false,
        role: "user",
        referrer: localStorage.getItem("referrer") || null,
        createdAt: new Date(),
      });
    } else {
      const patch = {};
      if (!existing.displayName && displayName) patch.displayName = displayName;
      if (!existing.username) {
        patch.username = generatedUsername({ displayName, email, uid: user.uid });
      }
      if (!existing.email && email) patch.email = email;
      if (!existing.emailLower && email) patch.emailLower = email;
      if (!existing.role) patch.role = "user";
      if (Object.keys(patch).length) {
        patch.updatedAt = new Date();
        await setDoc(userRef, patch, { merge: true });
      }
    }

    assertCurrentAccount(user);
    return {
      result,
      user,
      isNewUser: !!additionalInfo(result)?.isNewUser,
      displayName: displayName || existing.displayName || "",
      email: email || existing.email || "",
      profile: userDoc.exists()
        ? { ...existing, email: existing.email || email || null }
        : { profileComplete: false, email: email || null, displayName },
    };
};

export const socialAuthErrorMessage = (error, providerLabel) => {
  const code = error?.code || "";
  const message = String(error?.message || "");
  if (
    code === "auth/popup-closed-by-user" ||
    code === "auth/cancelled-popup-request" ||
    /authorizationerror.*1001|cancelled|canceled/i.test(message)
  ) {
    return null;
  }
  if (code === "app/vendor-account") {
    return "This account is already used for a Vendor account.";
  }
  if (code === "app/account-restricted") return "Your account is unavailable. Please contact support.";
  if (code === "auth/account-exists-with-different-credential") {
    return "This email already uses another sign-in method. Please use the method you originally chose.";
  }
  if (code === "auth/operation-not-allowed") {
    return `${providerLabel} sign-in is not available yet. Please use email or Google.`;
  }
  if (code === "auth/network-request-failed") {
    return "We couldn’t reach the sign-in service. Check your connection and try again.";
  }
  if (code === "auth/too-many-requests") {
    return "Too many sign-in attempts. Please wait a moment and try again.";
  }
  if (code === "auth/popup-blocked") return "Your browser blocked the sign-in window. Please allow popups for this site and try again.";
  if (code === "app/auth-storage-unavailable" || code === "auth/web-storage-unsupported") return "Your browser couldn’t save this sign-in request. Allow site storage and try again.";
  if (code === "app/auth-domain-not-configured" || code === "auth/unauthorized-domain") return "Google sign-in is not configured for this website. Please use email sign-in.";
  if (code === "app/auth-in-progress") return "Sign-in is already in progress. Please wait for it to finish.";
  if (code === "app/auth-session-expired") return "This sign-in request has expired. Please try again.";
  if (code === "app/login-timeout") return "Sign-in is taking longer than expected. Check your connection and try again.";
  return `${providerLabel} sign-in failed. Please try again.`;
};
