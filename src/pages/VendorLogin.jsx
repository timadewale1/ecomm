import React, { useState, useEffect } from "react";
import { Container, Row, Form, FormGroup } from "reactstrap";
import { Link, useNavigate } from "react-router-dom";
import {
  getAuth,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import { db, functions } from "../firebase.config";
import { httpsCallable } from "firebase/functions";
import { toast } from "react-hot-toast";
import { FaRegEyeSlash, FaRegEye } from "react-icons/fa";
import { MdEmail } from "react-icons/md";
import { GrSecure } from "react-icons/gr";
import VendorLoginAnimation from "../SignUpAnimation/SignUpAnimation";
import { RotatingLines } from "react-loader-spinner";
import Typewriter from "typewriter-effect";
import { GoChevronLeft } from "react-icons/go";
import SEO from "../components/Helmet/SEO";
import { usePostHog } from "posthog-js/react"; // ✅ Added

const VendorLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const auth = getAuth();
  const posthog = usePostHog(); // ✅ Added

  // ✅ Track page view
  useEffect(() => {
    posthog?.capture("page_view", { page: "vendor_login" });
  }, [posthog]);

  // ✅ Identify vendor in PostHog
  const identifyVendor = (ph, userRecord, extra = {}) => {
    if (!ph) return;
    const aliasKey = `ph_alias_${userRecord.uid}`;
    if (!localStorage.getItem(aliasKey)) {
      ph.alias(userRecord.uid);
      localStorage.setItem(aliasKey, "1");
    }
    ph.identify(userRecord.uid, {
      email: userRecord.email,
      name: userRecord.displayName ?? extra.username ?? "Unknown",
      created_at: userRecord.metadata.creationTime,
      ...extra,
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!email.trim() || !password.trim()) {
      toast.error("Please fill in both email and password fields.");
      posthog?.capture("vendor_login_error_missing_fields");
      setLoading(false);
      return;
    }

    try {
      posthog?.capture("vendor_login_attempted", { method: "email" });

      // 1) Sign in via Firebase Auth
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // 2) Check Firestore "vendors" collection
      const docRef = doc(db, "vendors", user.uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        await auth.signOut();
        posthog?.capture("vendor_no_record_found");
        throw { code: "vendor/no-record" };
      }

      const vendorData = docSnap.data();

      if (vendorData.isDeactivated) {
        await auth.signOut();
        posthog?.capture("vendor_account_deactivated");
        throw { code: "vendor/account-deactivated" };
      }

      // 3) Check if email is verified
      if (!user.emailVerified) {
        const sendVerificationEmailCallable = httpsCallable(
          functions,
          "sendVendorVerificationEmail"
        );
        await sendVerificationEmailCallable({
          email: user.email,
          firstName: vendorData.firstName,
          lastName: vendorData.lastName,
        });

        await auth.signOut();
        posthog?.capture("vendor_email_unverified");
        throw { code: "vendor/email-unverified" };
      }

      // ✅ Successful login
      identifyVendor(posthog, user, { role: "vendor" });
      posthog?.capture("vendor_login_succeeded", { method: "email" });

      if (!vendorData.profileComplete) {
        toast("Please complete your profile.");
        navigate("/complete-profile");
      } else {
        toast.success("Login successful!");
        navigate("/vendordashboard");
      }
    } catch (error) {
      console.error("Error logging in:", error);
      posthog?.capture("vendor_login_failed", {
        method: "email",
        code: error?.code,
      });

      const code = error?.code;
      if (!code) {
        toast.error("Oops! Something went wrong. Please try again.");
      } else if (code === "auth/invalid-email") {
        toast.error("Please enter a valid email address.");
      } else if (code === "auth/user-not-found") {
        toast.error("We couldn't find an account with that email.");
      } else if (code === "auth/wrong-password") {
        toast.error("Incorrect password. Please try again.");
      } else if (code === "auth/user-disabled") {
        toast.error("This account has been disabled. Contact support.");
      } else if (code === "auth/too-many-requests") {
        toast.error("Too many unsuccessful login attempts. Try later.");
      } else if (code === "auth/invalid-credential") {
        toast.error("Invalid credentials. Try again.");
      } else if (code === "vendor/no-record") {
        toast.error("No vendor record found. This account is not a vendor.");
      } else if (code === "vendor/account-deactivated") {
        toast.error("Your vendor account is deactivated. Contact support.");
      } else if (code === "vendor/email-unverified") {
        toast.error("Your email is not verified. Check your inbox.");
      } else {
        toast.error("Oops! Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO
        title={`Vendor Login - My Thrift`}
        description={`Login to your My Thrift vendor account`}
        url={`https://www.shopmythrift.store/vendorlogin`}
      />
      <section>
        <Container>
          <Row>
            <div className="px-2">
              <Link
                to="/confirm-state"
                onClick={localStorage.removeItem("mythrift_role")}
              >
                <GoChevronLeft className="text-3xl -translate-y-2 font-normal text-black" />
              </Link>
              <VendorLoginAnimation />
              <div className="flex justify-center text-xl font-ubuntu text-customOrange -translate-y-1">
                <Typewriter
                  options={{
                    strings: ["Showcase your products", "Connect with buyers"],
                    autoStart: true,
                    loop: true,
                    delay: 100,
                    deleteSpeed: 10,
                  }}
                />
              </div>
              <div className="flex justify-center text-xs font-medium text-customOrange -translate-y-2">
                <Typewriter
                  options={{
                    strings: ["and make OWO!", "and make KUDI!", "and make EGO!"],
                    autoStart: true,
                    loop: true,
                    delay: 50,
                    deleteSpeed: 30,
                  }}
                />
              </div>
              <div className="translate-y-4">
                <div className="mb-2">
                  <h1 className="font-ubuntu text-5xl flex items-center font-semibold text-black gap-2">
                    Login
                    <span className="rounded-full px-3 py-1 bg-customOrange text-xs flex items-center justify-center">
                      <p className="text-white text-xs leading-none">Vendor</p>
                    </span>
                  </h1>
                </div>
                <p className="text-black text-sm font-opensans font-semibold">
                  Please sign in to continue
                </p>
              </div>
              <div className="translate-y-1 mt-6 px-2">
                <Form onSubmit={handleLogin}>
                  <FormGroup className="relative mb-3">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <MdEmail className="text-gray-500 text-xl" />
                    </div>
                    <input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        posthog?.capture("vendor_email_input_started");
                      }}
                      className="w-full h-12 bg-white text-black font-opensans rounded-md text-base border border-gray-200 pl-14 focus:outline-none focus:ring-2 focus:ring-customOrange"
                      required
                    />
                  </FormGroup>
                  <FormGroup className="relative mb-3">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <GrSecure className="text-gray-500 text-xl" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        posthog?.capture("vendor_password_input_started");
                      }}
                      className="w-full h-12 bg-white text-black font-opensans rounded-md text-base border border-gray-200 pl-14 focus:outline-none focus:ring-2 focus:ring-customOrange"
                      required
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
                  <div className="flex justify-end">
                    <Link
                      to="/forgetpassword"
                      onClick={() => posthog?.capture("vendor_forgot_password_clicked")}
                      className="text-customOrange font-lato text-xs"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <motion.button
                    type="submit"
                    className="w-full h-12 mt-4 rounded-full flex items-center justify-center bg-customOrange text-white font-semibold font-opensans text-sm hover:bg-orange-600 shadow-md"
                    disabled={loading}
                  >
                    {loading ? (
                      <RotatingLines strokeColor="white" strokeWidth="5" width="30" />
                    ) : (
                      "Login"
                    )}
                  </motion.button>
                </Form>
                <div className="text-center font-opensans text-xs font-light mt-4">
                  <p className="text-gray-900 ">
                    Want to become a vendor?{" "}
                    <button
                      onClick={() => navigate("/vendor-signup")}
                      className="font-normal text-customOrange"
                    >
                      Sign Up
                    </button>
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

export default VendorLogin;
