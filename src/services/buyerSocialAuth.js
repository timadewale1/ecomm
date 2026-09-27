import { getAdditionalUserInfo } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import {
  signInWithApple,
  signInWithGoogle,
  signInWithTwitter,
} from "./firebaseAuth";

export const BUYER_SOCIAL_AUTH_PROVISIONING_KEY =
  "mythrift:buyer-social-auth-provisioning";

const setProvisioningState = (value) => {
  try {
    if (value) sessionStorage.setItem(BUYER_SOCIAL_AUTH_PROVISIONING_KEY, value);
    else sessionStorage.removeItem(BUYER_SOCIAL_AUTH_PROVISIONING_KEY);
  } catch {
    // Session storage can be unavailable in hardened WebViews. The profile
    // creation itself remains authoritative; this marker only widens the
    // AuthProvider's bounded race-protection window.
  }
};

export const isBuyerSocialAuthProvisioning = (uid) => {
  try {
    const value = sessionStorage.getItem(BUYER_SOCIAL_AUTH_PROVISIONING_KEY);
    return value === "pending" || (!!uid && value === uid);
  } catch {
    return false;
  }
};

const providerSignIn = (auth, providerId) => {
  if (providerId === "apple.com") return signInWithApple(auth);
  if (providerId === "twitter.com") return signInWithTwitter(auth);
  return signInWithGoogle(auth);
};

const lower = (value) => String(value || "").trim().toLowerCase();

const normalizedName = (result) => {
  const additional = getAdditionalUserInfo(result);
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

const fulfilledDocs = (result) =>
  result.status === "fulfilled" ? result.value.docs : [];

const accountBelongsToVendor = async ({ db, uid, email, userDoc, vendorDoc }) => {
  if (vendorDoc.exists() || userDoc.data()?.role === "vendor") return true;
  if (!email) return false;

  const results = await Promise.allSettled([
    getDocs(query(collection(db, "vendors"), where("email", "==", email))),
    getDocs(
      query(collection(db, "vendors"), where("emailLower", "==", email)),
    ),
    getDocs(query(collection(db, "users"), where("email", "==", email))),
    getDocs(
      query(collection(db, "users"), where("emailLower", "==", email)),
    ),
  ]);

  const failedLookup = results.find((result) => result.status === "rejected");
  if (failedLookup) throw failedLookup.reason;

  if (fulfilledDocs(results[0]).length || fulfilledDocs(results[1]).length) {
    return true;
  }

  return [...fulfilledDocs(results[2]), ...fulfilledDocs(results[3])].some(
    (snapshot) => snapshot.id !== uid && snapshot.data()?.role === "vendor",
  );
};

const endBlockedSession = async (auth, result) => {
  const isNewUser = !!getAdditionalUserInfo(result)?.isNewUser;
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

export const authenticateBuyerWithProvider = async ({ auth, db, providerId }) => {
  setProvisioningState("pending");
  let result = null;
  try {
    result = await providerSignIn(auth, providerId);
    const user = result?.user;
    if (!user?.uid) {
      const error = new Error("The sign-in provider did not return an account.");
      error.code = "app/provider-user-missing";
      throw error;
    }

    setProvisioningState(user.uid);
    const userRef = doc(db, "users", user.uid);
    const vendorRef = doc(db, "vendors", user.uid);
    const [userDoc, vendorDoc] = await Promise.all([
      getDoc(userRef),
      getDoc(vendorRef),
    ]);
    const email = lower(user.email || result.providerProfile?.email);

    if (
      await accountBelongsToVendor({
        db,
        uid: user.uid,
        email,
        userDoc,
        vendorDoc,
      })
    ) {
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

    return {
      result,
      user,
      isNewUser: !!getAdditionalUserInfo(result)?.isNewUser,
      displayName: displayName || existing.displayName || "",
      email: email || existing.email || "",
      profile: userDoc.exists()
        ? { ...existing, email: existing.email || email || null }
        : { profileComplete: false, email: email || null, displayName },
    };
  } finally {
    setProvisioningState(null);
  }
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
  return `${providerLabel} sign-in failed. Please try again.`;
};
