import React, { useState } from "react";
import { Container, Row, Form, FormGroup } from "reactstrap";
import { Link, useNavigate } from "react-router-dom";
import {
  getAuth,
  signInWithEmailAndPassword,
  sendEmailVerification,
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

const VendorLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const auth = getAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Quick check for empty fields
    if (!email.trim() || !password.trim()) {
      toast.error("Please fill in both email and password fields.");
      setLoading(false);
      return;
    }

    try {
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
        // Immediately sign out and throw a custom "vendor" error
        await auth.signOut();
        throw { code: "vendor/no-record" };
      }

      const vendorData = docSnap.data();

      if (vendorData.isDeactivated) {
        // Sign out and throw custom error
        await auth.signOut();
        throw { code: "vendor/account-deactivated" };
      }

      // 3) Check if email is verified
      if (!user.emailVerified) {
        // Send verification link via Cloud Function
        const sendVerificationEmailCallable = httpsCallable(
          functions,
          "sendVendorVerificationEmail"
        );
        await sendVerificationEmailCallable({
          email: user.email,
          firstName: vendorData.firstName,
          lastName: vendorData.lastName,
        });

        // Sign out and throw custom error
        await auth.signOut();
        throw { code: "vendor/email-unverified" };
      }

      // 4) If verified, check other vendor fields
      if (!vendorData.profileComplete) {
        toast("Please complete your profile.");
        navigate("/complete-profile");
      } else {
        toast.success("Login successful!");
        navigate("/vendordashboard");
      }
    } catch (error) {
      console.error("Error logging in:", error);
      console.error("Error code:", error?.code);
      console.error("Error message:", error?.message);

      const code = error?.code;

      // ---- IF–ELSE CHAIN for error codes ----
      if (!code) {
        // If there's no code at all
        toast.error(
          "Oops! Something went wrong while logging you in. Please try again."
        );
      } else if (code === "auth/invalid-email") {
        toast.error("Please enter a valid email address.");
      } else if (code === "auth/user-not-found") {
        toast.error("We couldn't find an account with that email.");
      } else if (code === "auth/wrong-password") {
        toast.error("Incorrect password. Please double-check and try again.");
      } else if (code === "auth/user-disabled") {
        toast.error("This account has been disabled. Contact support.");
      } else if (code === "auth/too-many-requests") {
        toast.error(
          "Too many unsuccessful login attempts. Please wait and try again."
        );
      } else if (code === "auth/invalid-credential") {
        toast.error(
          "Invalid credentials. Please check your login details and try again."
        );
      }
      // ---- CUSTOM "vendor/*" ERROR CODES ----
      else if (code === "vendor/no-record") {
        toast.error("No vendor record found. This account is not a vendor.");
      } else if (code === "vendor/account-deactivated") {
        toast.error(
          "Your vendor account is deactivated. Please contact support."
        );
      } else if (code === "vendor/email-unverified") {
        toast.error(
          "Your email is not verified. Please check your inbox for a verification link."
        );
      } else {
        // Catch-all for any code not explicitly handled
        toast.error(
          "Oops! Something went wrong while logging you in. Please try again."
        );
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
              <Link to="/confirm-state">
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
                    strings: [
                      "and make OWO!",
                      "and make KUDI!",
                      "and make EGO!",
                    ],
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
                      onChange={(e) => setEmail(e.target.value)}
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
                      onChange={(e) => setPassword(e.target.value)}
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
                      <RotatingLines
                        strokeColor="white"
                        strokeWidth="5"
                        width="30"
                      />
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
