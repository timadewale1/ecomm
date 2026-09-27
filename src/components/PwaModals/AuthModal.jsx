import React, { useState } from "react";
import { LiaTimesSolid } from "react-icons/lia";
import { FcGoogle } from "react-icons/fc";
import { FaApple, FaXTwitter } from "react-icons/fa6";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { RotatingLines } from "react-loader-spinner";

import { fetchSignInMethodsForEmail } from "firebase/auth";
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
import AppBottomSheet from "../layout/AppBottomSheet";
import { clearAuthIntent, rememberAuthIntent } from "../../services/authIntent";
import { fetchAndMergeCart } from "../../services/cartMerge";
import { useAppExperience } from "../Context/AppExperienceContext";
import { APP_EXPERIENCE } from "../../services/appExperience";
import {
  authenticateBuyerWithProvider,
  socialAuthErrorMessage,
} from "../../services/buyerSocialAuth";
import { appHaptics } from "../../services/haptics";
import { isNativeApp } from "../../services/platform";

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
  headerText = "Let’s set up your account",
  vendorId,
  compactTop = false,
  returnTo,
  authIntent = null,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { selectExperience } = useAppExperience();
  const safeReturnDestination = () =>
    typeof returnTo === "string" && returnTo.startsWith("/")
      ? returnTo
      : location.pathname;

  const [loading, setLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState(null);

  // confirm modal state
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmProvider, setConfirmProvider] = useState(null);
  const [pendingUser, setPendingUser] = useState(null);

  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [emailLocked, setEmailLocked] = useState(false);

  const [phoneRaw, setPhoneRaw] = useState(""); // NG 10 digits
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState({ lat: null, lng: null });

  const [saving, setSaving] = useState(false);
  const requiresCheckoutDetails = ["cart-checkout", "product-buy-now"].includes(
    authIntent?.type,
  );
  const showAppleAuth =
    isNativeApp || import.meta.env.VITE_ENABLE_APPLE_WEB_AUTH === "true";

  const markBuyerMode = () => {
    void selectExperience(APP_EXPERIENCE.CUSTOMER);
  };

  const preserveInitialAction = () => {
    if (!authIntent?.type) return;
    rememberAuthIntent({
      ...authIntent,
      returnTo: authIntent.returnTo || safeReturnDestination(),
    });
  };

  const completeInitialAction = (user, mergeResult) => {
    clearAuthIntent();
    onComplete?.(user, mergeResult);
  };

  // Every completed buyer-auth path must cross the same explicit cart-import
  // boundary. Several surfaces do not provide a merge callback, so falling
  // back here prevents a valid login from leaving the device cart stranded.
  const mergeEligibleCart = async (uid) => {
    if (!uid) return null;
    try {
      if (typeof mergeCart === "function") return await mergeCart(uid);
      return await fetchAndMergeCart(db, uid, dispatch);
    } catch (error) {
      console.warn("Cart merge after buyer authentication failed:", error);
      return null;
    }
  };

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
    if (confirmProvider === "twitter.com" && !isEmail(email)) {
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
      if (confirmProvider === "twitter.com") {
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
          preserveInitialAction();
          navigate("/login", { state: { email: e, from: safeReturnDestination() } });
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
          preserveInitialAction();
          navigate("/login", { state: { email: e, from: safeReturnDestination() } });
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

      const mergeResult = await mergeEligibleCart(pendingUser.uid);

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
        if (typeof onComplete === "function") {
          completeInitialAction(pendingUser, mergeResult);
        }
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

    const mergeResult = user?.uid ? await mergeEligibleCart(user.uid) : null;
    if (typeof onComplete === "function" && user) {
      completeInitialAction(user, mergeResult);
    }
  };

  const handleSocialSignIn = async (providerId, providerLabel) => {
    void appHaptics.medium();
    try {
      setLoading(true);
      setLoadingProvider(providerId);
      const authResult = await authenticateBuyerWithProvider({
        auth,
        db,
        providerId,
      });
      const { user, profile, displayName, email: providerEmail } = authResult;
      markBuyerMode();

      if (profile?.profileComplete || !requiresCheckoutDetails) {
        const mergeResult = await mergeEligibleCart(user.uid);
        onClose?.();
        completeInitialAction(user, mergeResult);
        return;
      }

      // Checkout is the one quick-auth context that can collect missing order
      // details inline. Ordinary sign-in, follow, offer and review actions are
      // authentication-only and rely on their existing feature gates.
      const { first: f, last: l } = splitDisplayName(displayName || "");
      const resolvedEmail = providerEmail || user.email || "";
      setFirst(f);
      setLast(l);
      setEmail(resolvedEmail);
      setEmailLocked(Boolean(resolvedEmail));
      setConfirmProvider(providerId);
      setPendingUser(user);
      await prefillFromUserDoc(user.uid, {
        setPhoneRaw,
        setAddress,
        setCoords,
      });
      setShowConfirm(true);
    } catch (error) {
      console.error(`[social-auth:${providerId}]`, error);
      const message = socialAuthErrorMessage(error, providerLabel);
      if (message) toast.error(message);
    } finally {
      setLoading(false);
      setLoadingProvider(null);
    }
  };

  const handleGoogleSignIn = () =>
    handleSocialSignIn("google.com", "Google");
  const handleAppleSignIn = () => {
    void appHaptics.light();
    toast("Apple sign-in is coming soon.");
  };
  const handleTwitterSignIn = () =>
    handleSocialSignIn("twitter.com", "X");

  const confirmCanClose = !saving;
  const closeConfirm = () => {
    if (confirmCanClose) setShowConfirm(false);
  };

  return (
    <>
      <AppBottomSheet
        open={open && !showConfirm}
        onClose={() => !loading && onClose?.()}
        closeOnBackdrop={!loading}
        dismissible={!loading}
        height="65dvh"
        ariaLabel={headerText}
        ariaBusy={loading}
        zIndex={9000}
        backdropClassName="bg-black/40 backdrop-blur-sm"
        surfaceClassName={`scrollbar-hide items-center overflow-y-auto p-6 ${
          compactTop ? "pt-5" : "pt-10"
        }`}
        compactTop={compactTop}
      >
        <button
          onClick={() => !loading && onClose?.()}
          disabled={loading}
          className={`absolute bg-gray-200 rounded-full p-1 right-3 text-2xl ${
            compactTop ? "top-5" : "top-9"
          }`}
          aria-label="Close sign in"
        >
          <LiaTimesSolid />
        </button>

        <h3
          className={`text-lg font-opensans font-semibold mb-4 ${
            compactTop ? "" : "-translate-y-2"
          }`}
        >
          {headerText}
        </h3>

        {showAppleAuth && (
          <div className="relative w-full mt-6 max-w-md mx-auto">
            <button
              type="button"
              onClick={handleAppleSignIn}
              disabled={loading}
              className="w-full h-11 rounded-full border border-black bg-black text-white flex items-center justify-center gap-2 font-satoshi font-medium disabled:opacity-60"
            >
              {loadingProvider === "apple.com" ? (
                <span className="loader-small" />
              ) : (
                <>
                  <FaApple className="mr-2 text-2xl" />
                  Continue with Apple
                </>
              )}
            </button>
          </div>
        )}

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
            {loadingProvider === "google.com" ? (
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
            {loadingProvider === "twitter.com" ? (
              <span className="loader-small" />
            ) : (
              <>
                <FaXTwitter className="mr-2 text-2xl" />
                Continue with X
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
            markBuyerMode();
            preserveInitialAction();
            const destination = safeReturnDestination();
            navigate("/login", { state: { from: destination } });
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
      </AppBottomSheet>

      {/* Native-style confirm-details sheet */}
      <AppBottomSheet
        open={open && showConfirm}
        onClose={closeConfirm}
        closeOnBackdrop={confirmCanClose}
        dismissible={confirmCanClose}
        height="88dvh"
        ariaLabel="Confirm your details"
        ariaBusy={saving}
        zIndex={9800}
        backdropClassName="bg-black/50 backdrop-blur-sm"
        surfaceClassName="px-5 pb-5 pt-5"
        compactTop
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-2 scrollbar-hide">
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

          <div className="mt-5 grid grid-cols-2 gap-3 pb-1">
            <button
              type="button"
              onClick={handleConfirmSkip}
              disabled={saving}
              className="h-11 rounded-full text-sm text-customRichBrown border font-opensans disabled:opacity-60"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={handleConfirmSave}
              disabled={saving}
              className="h-11 rounded-full text-sm bg-customOrange text-white font-opensans
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
      </AppBottomSheet>
      {/* Global loading overlay while provider popup is in-flight */}
      {open && loading && (
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
