import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LiaTimesSolid } from "react-icons/lia";
import { FcGoogle } from "react-icons/fc";
import { FaXTwitter } from "react-icons/fa6";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { RotatingLines } from "react-loader-spinner";

import {
  GoogleAuthProvider,
  TwitterAuthProvider,
  signInWithPopup,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
} from "firebase/firestore";

import { auth, db } from "../../firebase.config";
import LocationPicker from "../Location/LocationPicker";
import { AiOutlineMail } from "react-icons/ai";

function onlyLetters(s = "") {
  return /^[A-Za-z][A-Za-z\s'-]*$/.test(String(s).trim());
}
function isEmail(s = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).toLowerCase());
}
function isValidNg10(s = "") {
  return /^[1-9]\d{9}$/.test(String(s));
}
function genUsername(base) {
  const seed = (base ?? "user").toString().trim().toLowerCase() || "user";
  return `${seed}${Math.floor(100 + Math.random() * 900)}`;
}
function splitDisplayName(displayName = "") {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}
// utils
const normalizeNg10 = (value) => {
  // returns local 10-digit NG number without leading 0
  const digits = String(value || "").replace(/\D/g, "");
  let local = digits;
  if (local.startsWith("234")) local = local.slice(3);
  if (local.startsWith("0")) local = local.slice(1);
  return local.slice(-10);
};

const prefillFromUserDoc = async (
  uid,
  { setPhoneRaw, setAddress, setCoords }
) => {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return;
    const d = snap.data() || {};

    if (d.phoneNumber) {
      const ng10 = normalizeNg10(d.phoneNumber);
      if (ng10.length === 10) setPhoneRaw(ng10);
    }
    if (d.address) setAddress(d.address);
    if (d.location?.lat && d.location?.lng) {
      setCoords({ lat: d.location.lat, lng: d.location.lng });
    }
  } catch (e) {
    console.warn("Prefill user doc failed:", e);
  }
};

/**
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - onComplete: (user) => void   // called after confirm/skip completes
 * - mergeCart: (uid: string) => Promise<void> // merge local cart into Firestore
 * - openDisclaimer: (path: string) => (e) => void
 * - vendorId?: string
 */
export default function QuickAuthModal({
  open,
  onClose,
  onComplete,
  mergeCart,
  openDisclaimer,
  vendorId,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(false);

  // confirm modal state
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmProvider, setConfirmProvider] = useState(null); // "google" | "twitter"
  const [pendingUser, setPendingUser] = useState(null);

  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [emailLocked, setEmailLocked] = useState(false);

  const [phoneRaw, setPhoneRaw] = useState(""); // NG 10 digits
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState({ lat: null, lng: null });

  const [saving, setSaving] = useState(false);

  if (!open) return null;

  /* ─────────────────────────────────────────────
   *   Vendor e-mail hard block (defense in depth)
   * ───────────────────────────────────────────── */
  const isVendorEmail = async (cleanEmail) => {
    const vSnap = await getDocs(
      query(collection(db, "vendors"), where("email", "==", cleanEmail))
    );
    if (!vSnap.empty) return true;

    const uSnap = await getDocs(
      query(collection(db, "users"), where("email", "==", cleanEmail))
    );
    return !uSnap.empty && uSnap.docs[0].data()?.role === "vendor";
  };

  /* ─────────────────────────────────────────────
   *   Confirm modal save/skip
   * ───────────────────────────────────────────── */
  const handleConfirmSave = async () => {
    if (confirmProvider === "twitter" && !isEmail(email)) {
      toast.error("Please enter a valid email to continue.");
      return;
    }
    const f = first.trim();
    const l = last.trim();
    const e = email.trim().toLowerCase();

    if (!f || !l || !e) return toast.error("Fill in first, last and email.");
    if (!onlyLetters(f)) return toast.error("First name: letters only.");
    if (!onlyLetters(l)) return toast.error("Last name: letters only.");
    if (!isEmail(e)) return toast.error("Enter a valid email.");
    if (!pendingUser) return toast.error("No session found. Please retry.");

    try {
      setSaving(true);

      // Guard: vendor email
      if (await isVendorEmail(e)) {
        try {
          await pendingUser?.delete?.();
        } catch (delErr) {
          try {
            if (auth.currentUser && auth.currentUser.uid === pendingUser?.uid) {
              await auth.currentUser.delete?.();
            }
          } catch {
            await auth.signOut();
          }
        }
        toast.error("This email is already used for a Vendor account!");
        return;
      }

      // Twitter cross-provider checks
      if (confirmProvider === "twitter") {
        const methods = await fetchSignInMethodsForEmail(auth, e);
        if (methods.includes("password") && !methods.includes("twitter.com")) {
          try {
            await pendingUser.delete?.();
          } catch {
            await auth.signOut();
          }
          toast.info(
            "This email is registered with a password. Please log in."
          );
          navigate("/login", { state: { email: e } });
          return;
        }
        if (
          methods.includes("google.com") &&
          !methods.includes("twitter.com")
        ) {
          try {
            await pendingUser.delete?.();
          } catch {
            await auth.signOut();
          }
          toast.info(
            "This email is registered with Google. Please log in with Google."
          );
          navigate("/login", { state: { email: e } });
          return;
        }
      }

      // Build completeness + optional fields
      const hasPhone = !!(phoneRaw && isValidNg10(phoneRaw));
      const hasLocation = !!(address && coords?.lat && coords?.lng);
      const hasNames = !!(f && l);
      const hasEmail = !!e;
      const isProfileComplete = hasNames && hasEmail && hasPhone && hasLocation;

      const optionalUpdates = {};
      if (hasPhone) optionalUpdates.phoneNumber = `+234${phoneRaw}`;
      if (hasLocation) {
        optionalUpdates.address = address.trim();
        optionalUpdates.location = { lat: coords.lat, lng: coords.lng };
      }

      // Create/merge user doc
      const userRef = doc(db, "users", pendingUser.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // New doc: write everything at once
        await setDoc(userRef, {
          uid: pendingUser.uid,
          email: e,
          displayName: `${f} ${l}`.trim(),
          username: genUsername(f),
          role: "user",
          referrer: localStorage.getItem("referrer") || null,
          birthday: "not-set",
          profileComplete: isProfileComplete,
          walletSetup: false,
          welcomeEmailSent: false,
          notificationAllowed: false,
          createdAt: new Date(),
          ...optionalUpdates,
        });
      } else {
        // Existing doc: patch fields and only ever set profileComplete -> true (never force false)
        const patch = {
          email: e,
          displayName: `${f} ${l}`.trim(),
          updatedAt: new Date(),
          ...optionalUpdates,
        };
        if (!userSnap.data()?.username) patch.username = genUsername(f);
        if (isProfileComplete) patch.profileComplete = true;

        await setDoc(userRef, patch, { merge: true });
      }

      // merge cart (parent-provided)
      if (typeof mergeCart === "function") {
        await mergeCart(pendingUser.uid);
      }

      // clean confirm UI
      setShowConfirm(false);
      setPendingUser(null);
      setFirst("");
      setLast("");
      setEmail("");
      setEmailLocked(false);
      setPhoneRaw("");
      setAddress("");
      setCoords({ lat: null, lng: null });

      Promise.resolve().then(() => {
        if (typeof onComplete === "function") onComplete(pendingUser);
      });
    } catch (err) {
      console.error(err);
      toast.error("Could not save details. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmSkip = async () => {
    // no writes beyond account creation step
    setShowConfirm(false);
    const user = pendingUser;
    setPendingUser(null);
    setFirst("");
    setLast("");
    setEmail("");
    setEmailLocked(false);
    setPhoneRaw("");
    setAddress("");
    setCoords({ lat: null, lng: null });

    if (typeof mergeCart === "function" && user?.uid) {
      try {
        await mergeCart(user.uid);
      } catch {}
    }
    if (typeof onComplete === "function" && user) onComplete(user);
  };

  /* ─────────────────────────────────────────────
   *   Google Sign-In
   * ───────────────────────────────────────────── */
  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Vendor block
      const clean = (user.email || "").toLowerCase().trim();
      if (await isVendorEmail(clean)) {
        localStorage.setItem("BLOCKED_VENDOR_EMAIL", "1");
        await auth.signOut();
        toast.error("This email is already used for a Vendor account!");
        return;
      }

      // Initialize/patch user doc (non-destructive)
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      if (snap.exists() && snap.data().profileComplete) {
        onClose?.();
        onComplete(user); // parent shows overlay & merges
        return;
      }

      if (!snap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email: clean || null,
          displayName: user.displayName ?? null,
          username: genUsername(user.displayName),
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
        const data = snap.data() || {};
        const patch = {};
        if (data.displayName == null && user.displayName)
          patch.displayName = user.displayName;
        if (!data.username) patch.username = genUsername(user.displayName);
        if (Object.keys(patch).length)
          await setDoc(userRef, patch, { merge: true });
      }

      // Confirm modal
      const { first: f, last: l } = splitDisplayName(user.displayName || "");
      setFirst(f);
      setLast(l);
      setEmail(user.email || "");
      setEmailLocked(true); // lock email for Google
      setConfirmProvider("google");
      setPendingUser(user);
      await prefillFromUserDoc(user.uid, {
        setPhoneRaw,
        setAddress,
        setCoords,
      });
      setShowConfirm(true);
    } catch (error) {
      if (error?.code === "auth/account-exists-with-different-credential") {
        const em = error?.customData?.email;
        if (!em) {
          toast.error("This account already exists. Please log in.");
          navigate("/login");
          setLoading(false);
          return;
        }
        try {
          const methods = await fetchSignInMethodsForEmail(auth, em);
          // vendor guard
          if (await isVendorEmail(em.toLowerCase())) {
            toast.error("This email is already used for a Vendor account!");
            setLoading(false);
            return;
          }
          if (methods.includes("password") && !methods.includes("google.com")) {
            toast.info("This email uses a password. Please log in.");
            navigate("/login", {
              state: { email: em, linkGoogle: true, from: location.pathname },
            });
            setLoading(false);
            return;
          }
          toast.info(
            "This email is registered. Please use your original method."
          );
          navigate("/login", { state: { email: em, from: location.pathname } });
        } catch (mErr) {
          console.error("fetchSignInMethodsForEmail:", mErr);
          toast.error(
            "Sign-in conflict. Log in first, then link Google in settings."
          );
        }
      } else if (error?.code === "auth/popup-closed-by-user") {
        toast.error("Popup closed before completing sign-in.");
      } else {
        console.error(error);
        toast.error("Google sign-in failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTwitterSignIn = async () => {
    const provider = new TwitterAuthProvider();
    const TAG = "[TWITTER_SIGNIN]";
    console.log(`${TAG} init`);
    try {
      setLoading(true);
      console.log(`${TAG} calling signInWithPopup...`);
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      console.log(`${TAG} popup resolved`);
      console.log(`${TAG} user.uid=`, user?.uid);
      console.log(`${TAG} user.displayName=`, user?.displayName);
      console.log(`${TAG} user.email=`, user?.email || "(empty)");

      // Optional: vendor-email guard, same as Google
      const clean = (user.email || "").toLowerCase().trim();
      if (clean) {
        console.log(`${TAG} vendor email guard check for:`, clean);
        try {
          if (await isVendorEmail(clean)) {
            console.log(`${TAG} vendor email detected -> signOut + block`);
            localStorage.setItem("BLOCKED_VENDOR_EMAIL", "1");
            await auth.signOut();
            toast.error("This email is already used for a Vendor account!");
            return;
          }
        } catch (guardErr) {
          console.warn(`${TAG} vendor email guard error:`, guardErr);
        }
      }

      // Ensure users/{uid} exists BEFORE confirm modal
      const userRef = doc(db, "users", user.uid);
      console.log(`${TAG} fetching users/${user.uid}...`);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        console.log(`${TAG} no user doc -> creating stub`);
        await setDoc(userRef, {
          uid: user.uid,
          email: clean || null, // Twitter may not give email
          displayName: user.displayName ?? null,
          username: genUsername(user.displayName),
          role: "user",
          referrer: localStorage.getItem("referrer") || null,
          profileComplete: false,
          walletSetup: false,
          birthday: "not-set",
          welcomeEmailSent: false,
          notificationAllowed: false,
          createdAt: new Date(),
        });
        console.log(`${TAG} stub user doc created`);
      } else {
        console.log(
          `${TAG} user doc exists -> patch minimal fields if missing`
        );
        const data = snap.data() || {};
        const patch = {};
        if (data.displayName == null && user.displayName)
          patch.displayName = user.displayName;
        if (!data.username) patch.username = genUsername(user.displayName);
        if (Object.keys(patch).length) {
          await setDoc(userRef, patch, { merge: true });
          console.log(`${TAG} patched existing user doc:`, patch);
        }
      }

      // If already complete, finish quickly
      const userSnap = await getDoc(userRef);
      if (userSnap.exists() && userSnap.data()?.profileComplete) {
        onClose?.();
        onComplete(user); // parent shows overlay & merges
        return;
      }

      // Open confirm modal to collect missing fields (like last name, email)
      const { first: f, last: l } = splitDisplayName(user.displayName || "");
      console.log(`${TAG} splitDisplayName ->`, { f, l });

      setFirst(f);
      setLast(l); // may be empty; user must fill
      setEmail(user.email || ""); // may be empty; user must fill
      setEmailLocked(false);
      setConfirmProvider("twitter");
      setPendingUser(user);
      console.log(`${TAG} state set. prefillFromUserDoc...`);

      await prefillFromUserDoc(user.uid, {
        setPhoneRaw,
        setAddress,
        setCoords,
      });
      console.log(`${TAG} prefill done. showConfirm=true`);
      setShowConfirm(true);
    } catch (error) {
      console.error(`${TAG} error:`, {
        code: error?.code,
        message: error?.message,
        error,
      });
      if (error?.code === "auth/account-exists-with-different-credential") {
        const em = error?.customData?.email;
        if (!em) {
          toast.error("This account already exists. Please log in.");
          navigate("/login");
          setLoading(false);
          return;
        }
        try {
          const methods = await fetchSignInMethodsForEmail(auth, em);
          if (
            methods.includes("password") &&
            !methods.includes("twitter.com")
          ) {
            toast.info("This email uses a password. Please log in.");
            navigate("/login", {
              state: { email: em, linkTwitter: true, from: location.pathname },
            });
            setLoading(false);
            return;
          }
          toast.info(
            "This email is registered. Please use your original method."
          );
          navigate("/login", { state: { email: em, from: location.pathname } });
        } catch (mErr) {
          console.error(`${TAG} fetchSignInMethodsForEmail error:`, mErr);
          toast.error(
            "Sign-in conflict. Log in first, then link Twitter in settings."
          );
        }
      } else if (error?.code === "auth/popup-closed-by-user") {
        toast.error("Popup closed before completing sign-in.");
      } else {
        console.error(`${TAG} unhandled error:`, error);
        toast.error("Twitter sign-in failed. Please try again.");
      }
    } finally {
      console.log(`${TAG} finally -> setLoading(false)`);
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => !loading && onClose?.()}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
      />

      {/* Sheet */}
      <div
        className="fixed z-[9000] bottom-0 scrollbar-hide h-[65vh] w-full bg-white p-6
          flex flex-col items-center right-0 left-0 rounded-t-lg shadow-lg overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        aria-busy={loading}
      >
        <button
          onClick={() => !loading && onClose?.()}
          disabled={loading}
          className="absolute bg-gray-200 rounded-full p-1 top-3 right-3 text-2xl"
        >
          <LiaTimesSolid />
        </button>

        <h3 className="text-lg font-opensans -translate-y-2 font-semibold mb-4">
          Let’s set up your order
        </h3>

        {/* Google */}
        <div className="relative w-full mt-6 max-w-md mx-auto">
          <div className="absolute -top-3 -right-3 z-10">
            <div
              className="bg-gradient-to-r from-red-500 to-red-600 text-white
                px-3 py-1 rounded-full text-xs font-bold font-satoshi shadow-lg animate-pulse"
            >
              60% faster
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full h-11 rounded-full border flex items-center justify-center
              gap-2 font-opensans font-medium disabled:opacity-60"
          >
            {loading ? (
              <span className="loader-small" />
            ) : (
              <>
                <FcGoogle className="mr-2 text-2xl" />
                Continue with Google
              </>
            )}
          </button>
        </div>

        {/* Twitter */}
        <div className="relative w-full mt-4 max-w-md mx-auto">
          <button
            onClick={handleTwitterSignIn}
            disabled={loading}
            className="w-full h-11 rounded-full border flex items-center justify-center
              gap-2 font-opensans font-medium disabled:opacity-60"
          >
            {loading ? (
              <span className="loader-small" />
            ) : (
              <>
                <FaXTwitter className="mr-2 text-2xl" />
                Continue with Twitter
              </>
            )}
          </button>
        </div>

        {/* divider */}
        <div className="my-6 w-full flex items-center">
          <span className="flex-1 h-px bg-gray-300" />
          <span className="mx-3 text-xs uppercase text-gray-400">or</span>
          <span className="flex-1 h-px bg-gray-300" />
        </div>

        {/* Continue with Email -> /login, return to this page after */}
        <button
          onClick={() => {
            navigate("/login", { state: { from: location.pathname } });
            onClose?.();
          }}
          disabled={loading}
          className="w-full max-w-md h-11 rounded-full border font-opensans
            flex items-center justify-center font-medium"
        >
          <AiOutlineMail className="mr-2 text-2xl" />
          Continue with Email
        </button>

        <p className="text-[10px] mt-5 font-satoshi text-gray-600 mb-2 text-center">
          By continuing, you agree to our{" "}
          <a
            href="#terms"
            onClick={openDisclaimer?.("/terms-and-conditions")}
            className="underline text-customOrange"
          >
            Terms&nbsp;&amp;&nbsp;Conditions
          </a>{" "}
          and{" "}
          <a
            href="#privacy"
            onClick={openDisclaimer?.("/privacy-policy")}
            className="underline text-customOrange"
          >
            Privacy Policy
          </a>
          .
        </p>
      </div>

      {/* Confirm Modal */}
      <AnimatePresence>
        {showConfirm && (
          <>
            <motion.div
              key="confirm-backdrop"
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9700]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (confirmProvider === "twitter" && !isEmail(email)) return;
                if (!saving) setShowConfirm(false);
              }}
            />

            <motion.div
              key="confirm-modal"
              className="fixed inset-0 z-[9800] flex items-center justify-center p-4"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-[92%] max-w-md bg-white rounded-2xl shadow-xl p-5">
                <h3 className="text-lg font-opensans font-semibold mb-1 text-center">
                  Confirm your details
                </h3>
                <p className="text-xs text-gray-600 font-opensans mb-4 text-center">
                  We’ll use these for your orders and updates.
                </p>

                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="First name"
                    value={first}
                    onChange={(e) => setFirst(e.target.value)}
                    className="w-full h-11 font-opensans px-4 rounded-lg border text-base focus:outline-none focus:border-customOrange"
                  />
                  <input
                    type="text"
                    placeholder="Last name"
                    value={last}
                    onChange={(e) => setLast(e.target.value)}
                    className="w-full h-11 font-opensans px-4 rounded-lg border text-base focus:outline-none focus:border-customOrange"
                  />
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => !emailLocked && setEmail(e.target.value)}
                    disabled={emailLocked}
                    className={`w-full h-11 font-opensans px-4 rounded-lg border text-base focus:outline-none focus:border-customOrange ${
                      emailLocked ? "bg-gray-100 cursor-not-allowed" : ""
                    }`}
                  />

                  {/* optional phone */}
                  <div>
                    <label className="text-xs font-opensans text-gray-700 mb-1 block">
                      Phone (optional)
                    </label>
                    <PhoneInput
                      country={"ng"}
                      countryCodeEditable={false}
                      value={phoneRaw ? `234${phoneRaw}` : ""}
                      onChange={(val) => {
                        const digits = (val || "").replace(/\D/g, "");
                        const local10 = digits.startsWith("234")
                          ? digits.slice(3)
                          : digits;
                        setPhoneRaw(local10.slice(0, 10));
                      }}
                      inputProps={{
                        name: "phoneNumber",
                        className:
                          "w-full h-11 bg-gray-100 text-black font-opensans rounded-md text-base focus:outline-none pl-12 focus:ring-2 focus:ring-customOrange",
                      }}
                    />
                    <p className="text-[11px] mt-1 text-gray-500 font-opensans">
                      If you add it now, we’ll save it for delivery.
                    </p>
                  </div>

                  {/* optional address */}
                  <div>
                    <label className="text-xs font-opensans text-gray-700 mb-1 block">
                      Address
                    </label>
                    <LocationPicker
                      initialAddress={address || ""}
                      initialCoords={
                        coords?.lat && coords?.lng
                          ? { lat: coords.lat, lng: coords.lng }
                          : null
                      }
                      onLocationSelect={({ lat, lng, address }) => {
                        setCoords({ lat, lng });
                        setAddress(address || "");
                      }}
                    />
                    {address && (
                      <p className="text-[11px] mt-2 text-gray-700 font-opensans">
                        Selected:{" "}
                        <span className="font-semibold">{address}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    onClick={handleConfirmSkip}
                    disabled={saving}
                    className="h-11 rounded-full text-sm text-customRichBrown border  font-opensans"
                  >
                    Skip
                  </button>
                  <button
                    onClick={handleConfirmSave}
                    disabled={saving}
                    className="h-11  rounded-full text-sm bg-customOrange text-white font-opensans
                      font-semibold disabled:opacity-60 flex items-center justify-center"
                  >
                    {saving ? (
                      <RotatingLines
                        width={24}
                        strokeColor="#fff"
                        strokeWidth={4}
                        visible
                      />
                    ) : (
                      "Save & Continue"
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Global loading overlay while provider popup is in-flight */}
      {loading && (
        <div className="fixed inset-0 z-[9999] bg-white/40 backdrop-blur-sm flex items-center justify-center">
          <RotatingLines
            strokeColor="#f9531e"
            strokeWidth="5"
            width="24"
            visible
          />
        </div>
      )}
    </>
  );
}
