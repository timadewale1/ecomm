import React, { useState, useEffect } from "react";
import { Container, Row, Form, FormGroup } from "reactstrap";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { IoCloseOutline } from "react-icons/io5";
import {
  GoogleAuthProvider,
  signInWithPopup,
  // removed signInWithEmailAndPassword import here, we'll re-add below
} from "firebase/auth";
import { auth, db, functions } from "../firebase.config";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  setDoc,
} from "firebase/firestore";

import { FaRegEyeSlash, FaRegEye } from "react-icons/fa";
import { MdOutlineCancel, MdOutlineEmail, MdOutlineLock } from "react-icons/md";
import toast from "react-hot-toast";
import LoginAnimation from "../components/LoginAssets/LoginAnimation";
import Typewriter from "typewriter-effect";
import { FaAngleLeft } from "react-icons/fa6";
import { FcGoogle } from "react-icons/fc";
import { useDispatch } from "react-redux";
import { setCart } from "../redux/actions/action";
import { RotatingLines } from "react-loader-spinner";
import { GoChevronLeft } from "react-icons/go";
import { usePostHog } from "posthog-js/react";
// We need signInWithEmailAndPassword from Firebase Auth
import { signInWithEmailAndPassword } from "firebase/auth";

// We need httpsCallable from Firebase Functions
import { httpsCallable } from "firebase/functions";
import SEO from "../components/Helmet/SEO";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const posthog = usePostHog();
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

  const syncCartWithFirestore = async (userId) => {
    try {
      const localCart = JSON.parse(localStorage.getItem("cart")) || {};
      console.log("Syncing local cart to Firestore: ", localCart);
      await setDoc(doc(db, "carts", userId), { cart: localCart });
    } catch (error) {
      console.error("Error syncing cart with Firestore: ", error);
    }
  };

  const mergeCarts = (cart1, cart2) => {
    const mergedCart = { ...cart1 };

    for (const vendorId in cart2) {
      if (mergedCart[vendorId]) {
        const vendorCart1 = mergedCart[vendorId].products;
        const vendorCart2 = cart2[vendorId].products;

        for (const productKey in vendorCart2) {
          const newProduct = vendorCart2[productKey];

          const productAlreadyExists = Object.values(vendorCart1).some(
            (existingProduct) =>
              existingProduct.productId === newProduct.productId &&
              existingProduct.color === newProduct.color &&
              existingProduct.size === newProduct.size &&
              existingProduct.variation === newProduct.variation
          );

          if (!productAlreadyExists) {
            vendorCart1[productKey] = newProduct;
          }
        }
      } else {
        mergedCart[vendorId] = cart2[vendorId];
      }
    }

    return mergedCart;
  };

  const fetchCartFromFirestore = async (userId, localCart = {}) => {
    try {
      const cartDoc = await getDoc(doc(db, "carts", userId));
      let firestoreCart = {};
      if (cartDoc.exists()) {
        firestoreCart = cartDoc.data().cart;
        console.log("Fetched cart from Firestore: ", firestoreCart);
      } else {
        console.log("No cart found in Firestore, initializing empty cart");
      }
      const mergedCart = mergeCarts(firestoreCart, localCart);
      console.log("Merged cart: ", mergedCart);
      await setDoc(doc(db, "carts", userId), { cart: mergedCart });
      dispatch(setCart(mergedCart));
    } catch (error) {
      console.error("Error fetching or merging cart from Firestore: ", error);
    }
  };

  // FAST sign-in (all original checks kept)
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

    setLoading(true);

    try {
      posthog?.capture("login_attempted", { method: "email" });
      /* ── 1.  Firebase Auth sign-in  (edge POP ≈ 250 ms) ────────── */
      const { user } = await signInWithEmailAndPassword(auth, email, password);

      /* ── 2.  Firestore doc — role / deactivation check ─────────── */
      const snap = await getDoc(doc(db, "users", user.uid));
      const uData = snap.exists() ? snap.data() : {};

      if (uData.isDeactivated) {
        await auth.signOut();
        setLoading(false);
        return toast.error(
          "Your account has been deactivated. Please contact support."
        );
      }

      if (uData.role !== "user") {
        await auth.signOut();
        setLoading(false);
        return toast.error("This email is already used for a Vendor account!");
      }

      /* ── 3.  Success → greet & navigate immediately ────────────── */
      const name = uData.username || "User";
      toast.success(`Hello ${name}, welcome back!`);
      const redirectTo = location.state?.from || "/newhome";
      navigate(redirectTo, { replace: true });
      setLoading(false);
      identifyUser(posthog, user, { role: uData.role ?? "user" });
      posthog?.capture("login_succeeded", { method: "email" });
      /* ── 4.  Background jobs (non-blocking) ────────────────────── */
      (async () => {
        /* 4a – send your custom verification e-mail once per session */
        // ⛔︎ Block unverified accounts right after sign-in
        if (!user.emailVerified) {
          try {
            const sendMail = httpsCallable(
              functions,
              "sendUserVerificationEmail"
            );
            await sendMail({
              email: user.email,
              username: user.displayName || "Friend",
            });
          } catch (err) {
            console.error("sendUserVerificationEmail:", err);
          }

          await auth.signOut(); // end the session
          navigate("/login", { replace: true }); // ⬅️  back to login screen
          toast.error(
            "Please verify your e-mail address first. We just sent you a new link."
          );
          setLoading(false);
          return; // bail out
        }

        /* 4b – merge local cart into Firestore */
        const localCart = JSON.parse(localStorage.getItem("cart")) || {};
        await fetchCartFromFirestore(user.uid, localCart);
        localStorage.removeItem("cart");
      })();
    } catch (error) {
      setLoading(false);
      console.error("Error during sign-in:", error);
      posthog?.capture("login_failed", {
        method: "email",
        code: error.code,
      });
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
      }
      toast.error(errorMessage);
    }
  };

  // Google Sign-In remains purely client-side
  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      setLoading(true);
      posthog?.capture("login_attempted", { method: "google" });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if email in 'vendors'
      const vendorsRef = collection(db, "vendors");
      const vendorQuery = query(vendorsRef, where("email", "==", user.email));
      const vendorSnapshot = await getDocs(vendorQuery);
      if (!vendorSnapshot.empty) {
        await auth.signOut();
        setLoading(false);
        toast.error("This email is already used for a Vendor account!");
        return;
      }

      // Check if user doc has role=vendor
      const usersRef = collection(db, "users");
      const userQuery = query(usersRef, where("email", "==", user.email));
      const userSnapshot = await getDocs(userQuery);
      if (!userSnapshot.empty) {
        const userData = userSnapshot.docs[0].data();
        if (userData.role === "vendor") {
          await auth.signOut();
          setLoading(false);
          toast.error("This email is already used for a Vendor account!");
          return;
        }
      }

      // Create user doc if doesn't exist
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          username: user.displayName,
          email: user.email,
          profileComplete: false,
          walletSetup: false,
          welcomeEmailSent: false,
          notificationAllowed: false,
          role: "user",
          createdAt: new Date(),
        });
        console.log("New user document created in Firestore");
        posthog?.capture("signup_completed", { method: "google" });
      }

      const localCart = JSON.parse(localStorage.getItem("cart")) || {};
      await fetchCartFromFirestore(user.uid, localCart);
      localStorage.removeItem("cart");
      identifyUser(posthog, user, { role: "user" });
      posthog?.capture("login_succeeded", { method: "google" });
      const redirectTo = location.state?.from || "/newhome";
      toast.success(`Welcome back ${user.displayName}!`);

      navigate(redirectTo, { replace: true });
    } catch (error) {
      setLoading(false);
      posthog?.capture("login_failed", {
        method: "google",
        code: error.code,
      });
      console.error("Google Sign-In Error:", error);
      let errorMessage = "Google Sign-In failed. Please try again.";
      if (error.code === "auth/account-exists-with-different-credential") {
        errorMessage = "An account with the same email already exists.";
      } else if (error.code === "auth/popup-closed-by-user") {
        errorMessage = "Popup closed before completing sign-in.";
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (e.target.value) setEmailError(false);
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (e.target.value) setPasswordError(false);
  };

  useEffect(() => {
    const handleFocus = () => {
      document.body.classList.add("scroll-lock");
    };
    const handleBlur = () => {
      document.body.classList.remove("scroll-lock");
    };
    const inputs = document.querySelectorAll("input");
    inputs.forEach((input) => {
      input.addEventListener("focus", handleFocus);
      input.addEventListener("blur", handleBlur);
    });
    return () => {
      inputs.forEach((input) => {
        input.removeEventListener("focus", handleFocus);
        input.removeEventListener("blur", handleBlur);
      });
    };
  }, []);

  return (
    <>
      <SEO
        title={`Login - My Thrift`}
        description="Login in and get to shopping on My Thrift"
        url={`https://www.shopmythrift.store/login`}
      />
      <section>
        <Container>
          <Row>
            <div className="px-3 md:hidden">
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
                    className="w-full h-12 mt-4 flex items-center justify-center rounded-full bg-customOrange text-white font-semibold font-opensans  hover:bg-orange-600"
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

                  <motion.button
                    type="button"
                    className="w-full h-12 mt-2 bg-white border-2 border-gray-300 text-black font-medium rounded-full flex justify-center items-center"
                    onClick={handleGoogleSignIn}
                  >
                    <FcGoogle className="mr-2 text-2xl" />
                    Sign in with Google
                  </motion.button>
                </Form>

                <div className="text-center font-light font-lato mt-2 flex justify-center">
                  <p className="text-gray-900 text-sm">
                    Don't have an account?{" "}
                    <span className="font-normal text-customOrange">
                      <Link to="/signup">Sign up</Link>
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
