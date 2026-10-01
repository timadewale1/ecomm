import React, { useState, useEffect } from "react";
import { Container, Row, Form, FormGroup } from "reactstrap";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { IoCloseOutline } from "react-icons/io5";
import {
  EmailAuthProvider,
  fetchSignInMethodsForEmail,
  linkWithCredential,
  sendEmailVerification,
} from "firebase/auth";
import { auth, db, functions } from "../firebase.config";
import { canUseBuyerContactEmail, CONTACT_SIGN_IN_MESSAGE } from "../services/accountLookups";
import {
  getDoc,
  doc,
  setDoc,
} from "firebase/firestore";

import { FaRegEyeSlash, FaRegEye } from "react-icons/fa";
import { MdOutlineCancel, MdOutlineEmail, MdOutlineLock } from "react-icons/md";
import toast from "react-hot-toast";
import LoginAnimation from "../components/LoginAssets/LoginAnimation";
import Typewriter from "typewriter-effect";
import { FaAngleLeft, FaApple, FaXTwitter } from "react-icons/fa6";
import { FcGoogle } from "react-icons/fc";
import { useDispatch } from "react-redux";
import { fetchAndMergeCart } from "../services/cartMerge";
import { stageAnonymousCartAsGuest } from "../services/cartPersistence";
import { RotatingLines } from "react-loader-spinner";
import { GoChevronLeft } from "react-icons/go";
import { usePostHog } from "posthog-js/react";
import { signInWithEmailAndPassword } from "firebase/auth";

// We need httpsCallable from Firebase Functions
import { httpsCallable } from "firebase/functions";
import SEO from "../components/Helmet/SEO";
import LinkAccountModal from "../components/QuickMode/LinkAccountModal";
import VendorRedirectModal from "../components/layout/VendorRedirectModal";
import { appHaptics } from "../services/haptics";
import { useAppExperience } from "../components/Context/AppExperienceContext";
import { APP_EXPERIENCE } from "../services/appExperience";
import { activateAuthIntent, authDestinationFromState, pendingAuthReturnTo } from "../services/authIntent";
import {
  authenticateBuyerWithProvider,
  socialAuthErrorMessage,
} from "../services/buyerSocialAuth";
import { isNativeApp } from "../services/platform";
import { beginAuthTransition } from "../services/authTransition.mjs";

const withLoginTimeout = async (promise, label, timeoutMs = 15000) => {
  let timer;
  try { return await Promise.race([
    promise,
    new Promise((_, reject) =>
      timer = setTimeout(() => {
        const error = new Error(`${label} timed out`);
        error.code = "app/login-timeout";
        reject(error);
      }, timeoutMs),
    ),
  ]); } finally { clearTimeout(timer); }
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const authDestination = () => authDestinationFromState(location.state, pendingAuthReturnTo());
  const dispatch = useDispatch();
  const posthog = usePostHog();
  const { selectExperience } = useAppExperience();
  const showAppleAuth =
    isNativeApp || import.meta.env.VITE_ENABLE_APPLE_WEB_AUTH === "true";
  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };
  const identifyUser = (ph, userRecord, extra = {}) => {
    if (!ph) return; // provider not ready

    /* alias only the first time on this browser */
    const aliasKey = `ph_alias_${userRecord.uid}`;
    if (!localStorage.getItem(aliasKey)) {
      ph.alias(userRecord.uid);
      localStorage.setItem(aliasKey, "1");
    }

    ph.identify(userRecord.uid, {
      email: userRecord.email,
      name: userRecord.displayName ?? extra.username ?? "Unknown",
      phone: userRecord.phoneNumber ?? null,
      created_at: userRecord.metadata.creationTime,
      ...extra, // role, plan, etc.
    });
  };

  const fetchCartFromFirestore = async (userId) => {
    try {
      return await fetchAndMergeCart(db, userId, dispatch);
    } catch (error) {
      // Authentication succeeded independently of cart persistence. Keep the
      // retry silent so a background cart write cannot masquerade as a login
      // failure or produce a sync toast.
      console.warn("Cart import will retry after login:", error);
      return null;
    }
  };
  const linkAnonymousAccount = async ({ email, password }) => {
    const u = auth.currentUser;
    if (!u || !u.isAnonymous) {
      toast.error("You're not signed in as a guest.");
      return;
    }

    const inputEmail = email.trim().toLowerCase();

    try {
      // 0) Load anon user's Firestore doc to enforce same email if you saved one
      const userRef = doc(db, "users", u.uid);
      const snap = await getDoc(userRef);
      const savedEmail =
        (snap.exists() ? snap.data()?.email : "")
          ?.toString()
          .trim()
          .toLowerCase() || "";

      if (savedEmail && savedEmail !== inputEmail) {
        const mask = (e) => {
          const [name, domain] = e.split("@");
          if (!domain) return e;
          const safeName =
            name.length <= 2 ? name[0] + "*" : name[0] + "***" + name.slice(-1);
          return `${safeName}@${domain}`;
        };
        toast.error(
          `Please use the same email you used earlier: ${mask(savedEmail)}`,
        );
        return;
      }

      if (!(await canUseBuyerContactEmail(inputEmail))) {
        toast.error(CONTACT_SIGN_IN_MESSAGE);
        return;
      }

      // 2) If email already registered in Auth, don’t link here
      const methods = await fetchSignInMethodsForEmail(auth, inputEmail);
      if (methods.length > 0) {
        toast.error(
          "This email is already registered. Please sign in and we’ll merge your data.",
        );
        return;
      }

      // 3) Link anonymous → email/password
      const cred = EmailAuthProvider.credential(inputEmail, password);
      const res = await linkWithCredential(u, cred);

      // 4) Upsert Firestore (non-destructive)
      const patch = {
        uid: res.user.uid,
        email: inputEmail,
        accountLinked: true,
        updatedAt: new Date(),
      };
      await setDoc(
        userRef,
        snap.exists()
          ? patch
          : { createdAt: new Date(), role: "user", ...patch },
        { merge: true },
      );

      try {
        const sendMail = httpsCallable(functions, "sendUserVerificationEmail");
        await sendMail({
          email: inputEmail,
          username: res.user.displayName || "Friend",
        });
      } catch (e) {
        console.error("sendUserVerificationEmail failed:", e);
      }

      toast.success(
        "Account linked! We’ve sent a verification email. Please log in again.",
      );
      setShowLinkDialog(false);
      await auth.signOut();
    } catch (err) {
      console.error("linkWithCredential failed:", err);
      if (err.code === "auth/email-already-in-use") {
        toast.error(
          "This email is already in use. Please sign in and link from settings.",
        );
      } else if (err.code === "auth/invalid-credential") {
        toast.error("Invalid email or password.");
      } else {
        toast.error("Could not link account. Please try again.");
      }
    }
  };

  const signIn = async (e) => {
    e.preventDefault();

    /* ── 0.  client-side validations ────────────────────────────── */
    if (!email || !validateEmail(email)) {
      setEmailError(true);
      return toast.error("Please enter a valid email address.");
    }
    if (!password) {
      setPasswordError(true);
      return toast.error("Please enter your password.");
    }

    void appHaptics.medium();
    setLoading(true);
    let transition;
    try {
      posthog?.capture("login_attempted", { method: "email" });
      /* ── 1.  Firebase Auth sign-in  (edge POP ≈ 250 ms) ────────── */
      const anonymousUid = auth.currentUser?.isAnonymous
        ? auth.currentUser.uid
        : null;
      const { user } = await withLoginTimeout(
        signInWithEmailAndPassword(auth, email, password),
        "Email authentication",
      );
      transition = beginAuthTransition();

      if (anonymousUid && anonymousUid !== user.uid) {
        try {
          stageAnonymousCartAsGuest(anonymousUid);
        } catch (cartHandoffError) {
          console.error(
            "Anonymous cart handoff after email sign-in failed:",
            cartHandoffError,
          );
        }
      }

      /* ── 2.  Firestore doc — role / deactivation check ─────────── */
      const snap = await withLoginTimeout(
        getDoc(doc(db, "users", user.uid)),
        "Account lookup",
      );
      const uData = snap.exists() ? snap.data() : {};

      if (uData.isDeactivated) {
        await auth.signOut();
        setLoading(false);
        return toast.error(
          "Your account has been deactivated. Please contact support.",
        );
      }

      if (uData.role !== "user") {
        await auth.signOut();
        setLoading(false);
        setShowVendorModal(true);
        return toast.error("This email is already used for a Vendor account!");
      }

      /* ── 3.  Verification must finish before buyer cart import ─── */
      if (!user.emailVerified) {
        try {
          const sendMail = httpsCallable(functions, "sendUserVerificationEmail");
          await sendMail({
            email: user.email,
            username: user.displayName || "Friend",
          });
        } catch (mailError) {
          console.error("sendUserVerificationEmail:", mailError);
        }

        await auth.signOut();
        navigate("/login", { replace: true });
        setLoading(false);
        toast.error(
          "Please verify your e-mail address first. We just sent you a new link.",
        );
        return;
      }

      /* ── 4.  Import device cart once, then greet and navigate ───── */
      await fetchCartFromFirestore(user.uid);
      await selectExperience(APP_EXPERIENCE.CUSTOMER);
      const name = uData.username || "User";
      toast.success(`Hello ${name}, welcome back!`);
      const redirectTo = authDestination();
      if (auth.currentUser?.uid !== user.uid) return;
      activateAuthIntent(user, redirectTo);
      navigate(redirectTo, { replace: true });
      setLoading(false);
      identifyUser(posthog, user, { role: uData.role ?? "user" });
      posthog?.capture("login_succeeded", { method: "email" });
    } catch (error) {
      setLoading(false);
      console.error("Error during sign-in:", error);
      posthog?.capture("login_failed", {
        method: "email",
        code: error.code,
      });
      const code = error?.code;
      const cur = auth.currentUser;
      if (
        (code === "auth/user-not-found" ||
          code === "auth/invalid-credential") &&
        cur?.isAnonymous
      ) {
        try {
          const inputEmail = email.trim().toLowerCase();

          // optional: enforce same saved guest email
          const userRef = doc(db, "users", cur.uid);
          const snap = await getDoc(userRef);
          const savedEmail =
            (snap.exists() ? snap.data()?.email : "")
              ?.toString()
              .trim()
              .toLowerCase() || "";

          if (!savedEmail || savedEmail === inputEmail) {
            if (await canUseBuyerContactEmail(inputEmail)) {
              // only open if email is NOT already registered in Auth
              const methods = await fetchSignInMethodsForEmail(
                auth,
                inputEmail,
              );
              if (methods.length === 0) {
                setLoading(false);
                setShowLinkDialog(true);

                return; // stop generic error toast
              }
            }
          }
          // if mismatch or vendor/registered, fall through to normal error
        } catch (lookupErr) {
          console.warn("Anonymous lookup failed:", lookupErr);
          // fall through to generic toast
        }
      }
      /* ── identical, friendly error messages ───────────────────── */
      let errorMessage = "Sorry, we couldn't sign you in. Please try again.";

      if (error.code === "auth/user-not-found" || error.code === "not-found") {
        errorMessage =
          "No user found with this email. Please sign up or check the email you typed.";
      } else if (
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-credential"
      ) {
        errorMessage =
          "The password you entered is incorrect. Please try again.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email format. Please check and try again.";
      } else if (error.code === "auth/network-request-failed") {
        errorMessage = "Network error. Check your connection and try again.";
      } else if (error.code === "permission-denied") {
        errorMessage =
          "Your account has been disabled. Please contact support.";
      } else if (error.code === "app/login-timeout") {
        errorMessage =
          "Sign-in reached Firebase but the account lookup timed out. Please try again.";
      }
      toast.error(errorMessage);
    } finally { transition?.finish(); }
  };

  const handleSocialSignIn = async (providerId, method, providerLabel) => {
    void appHaptics.medium();
    let transition;
    try {
      setSocialLoading(true);
      posthog?.capture("login_attempted", { method });
      const authResult = await authenticateBuyerWithProvider({ auth, db, providerId,
        redirectContext: { source: "login", returnTo: authDestination() },
      });
      transition = authResult.transition;
      const { user, isNewUser, displayName } = authResult;

      await fetchCartFromFirestore(user.uid);
      await selectExperience(APP_EXPERIENCE.CUSTOMER);
      identifyUser(posthog, user, { role: "user" });
      if (isNewUser) posthog?.capture("signup_completed", { method });
      posthog?.capture("login_succeeded", { method });

      const redirectTo = authDestination();
      if (auth.currentUser?.uid !== user.uid) return;
      activateAuthIntent(user, redirectTo);
      toast.success(`Welcome back ${displayName || user.displayName || "there"}!`);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      posthog?.capture("login_failed", { method, code: error?.code });
      console.error(`${providerLabel} Sign-In Error:`, error);
      if (error?.code === "app/vendor-account") setShowVendorModal(true);
      const message = socialAuthErrorMessage(error, providerLabel);
      if (message) toast.error(message);
    } finally {
      transition?.finish();
      setSocialLoading(false);
    }
  };

  const handleGoogleSignIn = () =>
    handleSocialSignIn("google.com", "google", "Google");
  const handleAppleSignIn = () => {
    void appHaptics.light();
    toast("Apple sign-in is coming soon.");
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (e.target.value) setEmailError(false);
  };
  const handleTwitterSignIn = () =>
    handleSocialSignIn("twitter.com", "twitter", "X");

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (e.target.value) setPasswordError(false);
  };

  return (
    <>
      <SEO
        title={`Login - My Thrift`}
        description="Login in and get to shopping on My Thrift"
        url={`https://www.shopmythrift.store/login`}
      />
      <LinkAccountModal
        open={showLinkDialog}
        onClose={() => setShowLinkDialog(false)}
        onSubmit={linkAnonymousAccount}
      />
      <VendorRedirectModal
        open={showVendorModal}
        onClose={() => setShowVendorModal(false)}
      />
      {socialLoading && (
        <div className="fixed inset-0 z-[9999] bg-white/70 backdrop-blur-sm flex items-center justify-center">
          <RotatingLines
            strokeColor="#f97316"
            strokeWidth="5"
            width="24"
            visible
          />
        </div>
      )}
      <section className="w-full">
        <Container className="mx-auto w-full max-w-[574px] px-0">
          <Row className="mx-0 w-full">
            <div className="w-full px-4">
              <Link to={-1}>
                <IoCloseOutline className="text-3xl -translate-y-2 font-normal text-black" />
              </Link>
              <LoginAnimation />
              <div className="flex transform text-customOrange -translate-y-10 mb-2 justify-center">
                <Typewriter
                  options={{
                    strings: ["The Real Marketplace"],
                    autoStart: true,
                    loop: true,
                  }}
                />
              </div>
              <div className="-translate-y-4 px-1 flex flex-col justify-center">
                <div>
                  <h1 className="text-3xl font-bold font-lato text-black mb-1">
                    Welcome Back!
                  </h1>
                  <p className="text-gray-400 mb-1 font-lato">
                    Get thrifted items at amazing deals
                  </p>
                </div>
                <Form onSubmit={signIn}>
                  <FormGroup className="relative w-full mt-4">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-6 pointer-events-none">
                      <MdOutlineEmail className="text-gray-500 text-xl" />
                    </div>
                    <input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      className={`w-full h-12 ${
                        emailError ? "border-red-500" : "border-none"
                      } bg-gray-100 pl-14 text-black font-opensans rounded-md text-base focus:outline-none focus:ring-2 focus:ring-customOrange`}
                      onChange={handleEmailChange}
                    />
                  </FormGroup>

                  <FormGroup className="relative w-full">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-6 pointer-events-none">
                      <MdOutlineLock className="text-gray-500 text-xl" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      className={`w-full h-12 ${
                        passwordError ? "border-red-500" : "border-none"
                      } bg-gray-100 pl-14 text-black font-opensans rounded-md text-base focus:outline-none focus:ring-2 focus:ring-customOrange`}
                      placeholder="Enter your password"
                      value={password}
                      onChange={handlePasswordChange}
                    />
                    <div
                      className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <FaRegEyeSlash className="text-gray-500 text-xl" />
                      ) : (
                        <FaRegEye className="text-gray-500 text-xl" />
                      )}
                    </div>
                  </FormGroup>

                  <div className="flex justify-end font-normal">
                    <p className="text-customOrange font-lato text-xs">
                      <Link to="/forgetpassword">Forgot password?</Link>
                    </p>
                  </div>

                  <motion.button
                    type="submit"
                    className="w-full h-12 mt-4 flex items-center justify-center rounded-xl bg-customOrange text-white font-semibold font-opensans  hover:bg-orange-600"
                    disabled={!email || !password}
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <RotatingLines
                          strokeColor="white"
                          strokeWidth="5"
                          animationDuration="0.75"
                          width="30"
                          visible={true}
                        />
                      </div>
                    ) : (
                      "Sign In"
                    )}
                  </motion.button>

                  <div className="flex items-center justify-center mt-2 mb-2">
                    <div className="flex-grow border-t border-gray-300"></div>
                    <span className="mx-4 text-xs text-gray-500">OR</span>
                    <div className="flex-grow border-t border-gray-300"></div>
                  </div>

                  {showAppleAuth && (
                    <motion.button
                      type="button"
                      className="w-full h-12 mt-2 bg-black border-2 font-satoshi border-black text-white font-medium rounded-xl flex justify-center items-center disabled:opacity-60"
                      onClick={handleAppleSignIn}
                      disabled={loading || socialLoading}
                    >
                      <FaApple className="mr-2 text-2xl" />
                      Sign in with Apple
                    </motion.button>
                  )}

                  {/* Google button: no inline spinner */}
                  <motion.button
                    type="button"
                    className="w-full h-12 mt-2 bg-white border-2 font-opensans border-gray-100 text-black font-medium rounded-xl flex justify-center items-center disabled:opacity-60"
                    onClick={handleGoogleSignIn}
                    disabled={loading || socialLoading}
                  >
                    <FcGoogle className="mr-2 text-2xl" />
                    Sign in with Google
                  </motion.button>

                  {/* Twitter button: no inline spinner */}
                  <motion.button
                    type="button"
                    className="w-full h-12 mt-2 bg-white border-2 font-opensans border-gray-100 text-black font-medium rounded-xl flex justify-center items-center disabled:opacity-60"
                    onClick={handleTwitterSignIn}
                    disabled={loading || socialLoading}
                  >
                    <FaXTwitter className="mr-2 text-xl" />
                    Sign in with X
                  </motion.button>
                </Form>

                <div className="text-center font-light font-lato mt-2 flex justify-center">
                  <p className="text-gray-900 text-sm">
                    Don't have an account?{" "}
                    <span className="font-normal text-customOrange">
                      <Link to="/signup" state={{ from: authDestination() }}>Sign up</Link>
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </Row>
        </Container>
      </section>
    </>
  );
};

export default Login;
