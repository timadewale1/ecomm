import React, { useState, useEffect } from "react";
import Helmet from "../components/Helmet/Helmet";
import { Container, Row, Form, FormGroup } from "reactstrap";
import { Link, useNavigate } from "react-router-dom";
import {
  getAuth,
  signInWithEmailAndPassword,
  RecaptchaVerifier,
  sendEmailVerification,
  signInWithPhoneNumber,
} from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { motion } from "framer-motion";
import { db } from "../firebase.config";
import { toast } from "react-hot-toast";
import { FaRegEyeSlash, FaRegEye } from "react-icons/fa";
import { MdEmail } from "react-icons/md";
import { GrSecure } from "react-icons/gr";
import VendorLoginAnimation from "../SignUpAnimation/SignUpAnimation";
import "react-phone-input-2/lib/style.css";
import { RotatingLines } from "react-loader-spinner";
import Typewriter from "typewriter-effect";
import { FaAngleLeft } from "react-icons/fa6";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

const VendorLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPhoneLogin, setIsPhoneLogin] = useState(false);

  const navigate = useNavigate();
  const auth = getAuth();

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Toggle between email and phone login methods
  const toggleLoginMethod = () => {
    setIsPhoneLogin(!isPhoneLogin);
  };

  // Initialize reCAPTCHA verifier
  const initializeRecaptchaVerifier = () => {
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      delete window.recaptchaVerifier;
    }
    window.recaptchaVerifier = new RecaptchaVerifier(
      auth,
      "recaptcha-container-login",
      {
        size: "invisible",
        callback: (response) => {
          // reCAPTCHA solved
        },
        "expired-callback": () => {
          toast.error("reCAPTCHA expired. Please try again.");
        },
      }
    );
  };

  useEffect(() => {
    initializeRecaptchaVerifier();
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        delete window.recaptchaVerifier;
      }
    };
  }, []);

    const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!isPhoneLogin) {
      // Email Login
      try {
        if (!email || !validateEmail(email) || !password) {
          toast.error("Please fill in all fields correctly.");
          setLoading(false);
          return;
        }

        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
        const user = userCredential.user;

        await user.reload();
        if (!user.emailVerified) {
          // Resend verification email if not verified
          await sendEmailVerification(user, {
            url: "https://mythriftprod.vercel.app/confirm-email", // Update to your confirm email route
            handleCodeInApp: true,
          });
          toast.error(
            "Your email is not verified. A verification link has been sent to your email. Please verify your email and try again."
          );
          setLoading(false);
          return;
        }

        const docRef = doc(db, "vendors", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().isDeactivated) {
          toast.error(
            "Your vendor account is deactivated. Please contact support."
          );
          await auth.signOut();
          setLoading(false);
          return;
        }

        if (docSnap.exists() && docSnap.data().role === "vendor") {
          if (!docSnap.data().profileComplete) {
            toast("Please complete your profile.");
            navigate("/complete-profile");
          } else {
            toast.success("Login successful.");
            navigate("/vendordashboard");
          }
        } else {
          toast.error(
            "This account is registered as a user. Please log in as a user."
          );
          await auth.signOut();
        }
      } catch (error) {
        handleSigninError(error);
      } finally {
        setLoading(false);
      }
    } else {
      // Phone Login
      if (!phone || phone.length < 10) {
        toast.error(
          "Incomplete phone number. Please enter at least 10 digits."
        );
        setLoading(false);
        return;
      }

      try {
        const appVerifier = window.recaptchaVerifier;

        // Check if the phone number exists in the database
        const vendorQuery = query(
          collection(db, "vendors"),
          where("phoneNumber", "==", `+${phone}`)
        );
        const vendorSnapshot = await getDocs(vendorQuery);

        if (vendorSnapshot.empty) {
          toast.error("Phone number not found. Please register first.");
          setLoading(false);
          return;
        }

        // Send OTP using Firebase
        const confirmationResult = await signInWithPhoneNumber(
          auth,
          `+${phone}`,
          appVerifier
        );

        window.confirmationResult = confirmationResult;
        toast.success("OTP sent successfully!");

        // Navigate to VendorVerifyOTP with the phone number and mode
        navigate("/vendor-verify-otp", {
          state: {
            vendorData: { phoneNumber: `+${phone}` },
            mode: "login",
          },
        });
      } catch (error) {
        console.error("Error during phone login:", error);
        toast.error(`Failed to send OTP: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle sign-in errors
  const handleSigninError = (error) => {
    switch (error.code) {
      case "auth/user-not-found":
        toast.error(
          "You have entered a wrong email address, please try again."
        );
        break;
      case "auth/invalid-verification-code":
        toast.error("You have entered a wrong OTP code, please try again.");
        break;
      case "auth/user-disabled":
        toast.error("Your account has been disabled, please contact support.");
        break;
      case "auth/wrong-password":
        toast.error("You have entered a wrong password, please try again.");
        break;
      default:
        toast.error("Error signing in: " + error.message);
    }
  };

  return (
    <Helmet title="Vendor Login">
      <section>
        <Container>
          <Row>
            <div className="px-3">
              <Link to="/confirm-user-state">
                <FaAngleLeft className="text-3xl -translate-y-2 font-normal text-black" />
              </Link>
              <VendorLoginAnimation />
              <div className="flex justify-center text-xl font-opensans text-customOrange -translate-y-1">
                <Typewriter
                  options={{
                    strings: ["Showcase your goods", "Connect with buyers"],
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
                  <h1 className="font-ubuntu text-5xl flex font-semibold text-black">
                    Login{" "}
                    <span className="text-customOrange translate-y-4 text-xl">
                      <p>(Vendor)</p>
                    </span>
                  </h1>
                </div>
                <p className="text-black font-semibold">
                  Please sign in to continue
                </p>
              </div>
              <div className="translate-y-4">
                <div className="flex justify-center my-4">
                  <motion.button
                    className="glow-button w-full h-14 bg-customOrange text-white font-semibold rounded-full flex items-center justify-center"
                    onClick={toggleLoginMethod}
                  >
                    {isPhoneLogin ? "Login with Email" : "Login with Phone"}
                  </motion.button>
                </div>

                <Form className="mt-4" onSubmit={handleLogin}>
                  {isPhoneLogin ? (
                    <>
                      <FormGroup className="relative mb-3">
                        <PhoneInput
                          country={"ng"}
                          countryCodeEditable={false}
                          value={phone}
                          onChange={(phone) => setPhone(phone)}
                          inputProps={{
                            name: "phoneNumber",
                            required: true,
                            className:
                              "w-full h-12 bg-gray-100 text-black font-opensans rounded-md text-sm focus:outline-none pl-12 focus:ring-2 focus:ring-customOrange",
                          }}
                        />
                      </FormGroup>
                    </>
                  ) : (
                    <>
                      <FormGroup className="relative mb-2">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <MdEmail className="text-gray-500 text-xl" />
                        </div>
                        <input
                          type="email"
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full h-14 bg-gray-300 px-10 font-semibold text-gray-800 rounded-lg"
                          required
                        />
                      </FormGroup>
                      <FormGroup className="relative mb-2">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <GrSecure className="text-gray-500 text-xl" />
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full h-14 bg-gray-300 px-10 font-semibold text-gray-800 rounded-lg"
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
                      <div className="flex justify-end font-semibold">
                        <Link
                          to="/forgetpassword"
                          className="text-black underline text-xs"
                        >
                          Forgot password?
                        </Link>
                      </div>
                    </>
                  )}
                  <motion.button
                    type="submit"
                    className="glow-button w-full h-14 mt-7 bg-customOrange text-white font-semibold rounded-full flex items-center justify-center"
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
                <div className="text-center font-opensans font-light mt-2 flex justify-center">
                  <p className="text-gray-700">
                    Want to join our community?{" "}
                    <button
                      onClick={() => navigate("/vendor-signup")}
                      className="font-semibold underline text-black"
                    >
                      Sign Up
                    </button>
                  </p>
                </div>
                <div
                  id="recaptcha-container-login"
                  style={{ display: "none" }}
                />
              </div>
            </div>
          </Row>
        </Container>
      </section>
    </Helmet>
  );
};

export default VendorLogin;
