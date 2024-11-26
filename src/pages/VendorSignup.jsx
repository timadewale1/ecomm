import React, { useState, useEffect, useCallback } from "react";
import Helmet from "../components/Helmet/Helmet";
import { Container, Row, Form, FormGroup } from "reactstrap";
import { Link, useNavigate } from "react-router-dom";
import {
  getAuth,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  updateProfile,
  linkWithCredential,
  EmailAuthProvider,
  PhoneAuthProvider,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase.config";
import toast from "react-hot-toast";
import {
  FaAngleLeft,
  FaRegEyeSlash,
  FaRegEye,
  FaRegUser,
} from "react-icons/fa";
import { MdEmail, MdPhone } from "react-icons/md";
import { GrSecure } from "react-icons/gr";
import { motion } from "framer-motion";
import Typewriter from "typewriter-effect";
import VendorLoginAnimation from "../SignUpAnimation/SignUpAnimation";
import { RotatingLines } from "react-loader-spinner";
import Loading from "../components/Loading/Loading";
import { GoChevronLeft } from "react-icons/go";
import { collection, where, query, getDocs } from "firebase/firestore";
import { initializeRecaptchaVerifier } from "../services/recaptcha";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
const VendorSignup = () => {
  const [vendorData, setVendorData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState(null);

  const [resendCooldown, setResendCooldown] = useState(0); // Cooldown timer

  const navigate = useNavigate();
  const auth = getAuth();

  const initializeRecaptchaVerifier = () => {
    // Clear existing reCAPTCHA verifier if it exists
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      delete window.recaptchaVerifier;
    }

    // Initialize new reCAPTCHA verifier
    window.recaptchaVerifier = new RecaptchaVerifier(
      auth, // <-- Pass auth as the first argument
      "recaptcha-container-signup",
      {
        size: "invisible",
        callback: (response) => {
          // reCAPTCHA solved, allow signInWithPhoneNumber
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setVendorData({ ...vendorData, [name]: value });
  };

  const validateName = (name) => /^[A-Za-z]+$/.test(name);
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(false);
    setIsSendingOTP(true);

    // Validate Names
    if (
      !validateName(vendorData.firstName) ||
      !validateName(vendorData.lastName)
    ) {
      toast.error("First and Last names must only contain letters.");
      setIsSendingOTP(false);
      return;
    }

    // Validate Email
    if (!validateEmail(vendorData.email)) {
      toast.error("Invalid email format. Please enter a valid email.");
      setIsSendingOTP(false);
      return;
    }

    // Validate Password Match
    if (vendorData.password !== vendorData.confirmPassword) {
      toast.error("Passwords do not match. Please re-enter.");
      setIsSendingOTP(false);
      return;
    }

    // Validate Phone Number Length
    if (vendorData.phoneNumber.length < 10) {
      toast.error(
        "Phone number is incomplete. Please enter at least 10 digits."
      );
      setIsSendingOTP(false);
      return;
    }

    try {
      // Check if Email Already Exists in Firestore (users or vendors)
      const emailQuery = query(
        collection(db, "vendors"),
        where("email", "==", vendorData.email)
      );
      const emailSnapshot = await getDocs(emailQuery);

      if (!emailSnapshot.empty) {
        toast.error(
          "This email is already registered as a vendor. Please log in."
        );
        setIsSendingOTP(false);
        return;
      }

      // Check for Email in User Collection (if applicable)
      const userEmailQuery = query(
        collection(db, "users"), // Replace with your user collection name
        where("email", "==", vendorData.email)
      );
      const userEmailSnapshot = await getDocs(userEmailQuery);

      if (!userEmailSnapshot.empty) {
        toast.error(
          "This email is already registered as a user. Please use a different email."
        );
        setIsSendingOTP(false);
        return;
      }

      // Check if Phone Number Already Exists in Firestore (users or vendors)
      const phoneQuery = query(
        collection(db, "vendors"),
        where("phoneNumber", "==", vendorData.phoneNumber)
      );
      const phoneSnapshot = await getDocs(phoneQuery);

      if (!phoneSnapshot.empty) {
        toast.error(
          "This phone number is already registered as a vendor. Please log in."
        );
        setIsSendingOTP(false);
        return;
      }

      // Check for Phone Number in User Collection (if applicable)
      const userPhoneQuery = query(
        collection(db, "users"), // Replace with your user collection name
        where("phoneNumber", "==", vendorData.phoneNumber)
      );
      const userPhoneSnapshot = await getDocs(userPhoneQuery);

      if (!userPhoneSnapshot.empty) {
        toast.error(
          "This phone number is already registered as a user. Please use a different phone number."
        );
        setIsSendingOTP(false);
        return;
      }

      // Send OTP
      const appVerifier = window.recaptchaVerifier;
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        vendorData.phoneNumber,
        appVerifier
      );

      window.confirmationResult = confirmationResult;
      toast.success("OTP sent successfully!");

      // Navigate to OTP verification page with vendor data
      navigate("/vendor-verify-otp", {
        state: {
          vendorData: {
            email: vendorData.email,
            password: vendorData.password,
            phoneNumber: vendorData.phoneNumber,
            firstName: vendorData.firstName,
            lastName: vendorData.lastName,
          },
          mode: "signup",
        },
      });
    } catch (error) {
      console.error("Signup error:", error);

      // Handle Firebase Authentication-specific errors
      switch (error.code) {
        case "auth/email-already-in-use":
          toast.error("This email is already registered. Please log in.");
          break;
        case "auth/phone-number-already-exists":
          toast.error(
            "This phone number is already registered. Please log in."
          );
          break;
        default:
          toast.error(`Error signing up: ${error.message}`);
      }
    } finally {
      setIsSendingOTP(false);
    }
  };

  const handleReloadToLogin = () => {
    setLoading(true); // Show loading state
    setTimeout(() => {
      window.location.href = "/vendorlogin";
    }, 500);
  };

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

 

  return (
    <Helmet>
      <section>
        <Container>
          <Row>
            {loading ? (
              <Loading />
            ) : (
              <div className="px-2">
                <Link to="/vendorlogin">
                  <GoChevronLeft className="text-3xl -translate-y-2 font-normal text-black" />
                </Link>
                <VendorLoginAnimation />
                <div className="flex justify-center text-xl text-customOrange -translate-y-1">
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
                      Sign Up{" "}
                      <span className="text-customOrange translate-y-4 text-xl">
                        <p>(Vendor)</p>
                      </span>
                    </h1>
                  </div>
                  <p className="text-black text-sm font-semibold">
                    Please sign up to continue
                  </p>
                </div>
                <div className="translate-y-6">
                  <Form onSubmit={handleSignup}>
                    <FormGroup className="relative mb-2">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <FaRegUser className="text-gray-500 text-xl" />
                      </div>{" "}
                      <input
                        type="text"
                        name="firstName"
                        placeholder="First Name"
                        value={vendorData.firstName}
                        onChange={handleInputChange}
                        className="w-full h-12 bg-gray-100 pl-14 text-black font-opensans rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-customOrange"
                        required
                      />
                    </FormGroup>
                    <FormGroup className="relative mb-2">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <FaRegUser className="text-gray-500 text-xl" />
                      </div>{" "}
                      <input
                        type="text"
                        name="lastName"
                        placeholder="Last Name"
                        value={vendorData.lastName}
                        onChange={handleInputChange}
                        className="w-full h-12 bg-gray-100 pl-14 text-black font-opensans rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-customOrange"
                        required
                      />
                    </FormGroup>
                    <FormGroup className="relative mb-2">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <MdEmail className="text-gray-500 text-xl" />
                      </div>{" "}
                      <input
                        type="email"
                        name="email"
                        placeholder="Email"
                        value={vendorData.email}
                        onChange={handleInputChange}
                        className="w-full h-12 bg-gray-100 pl-14 text-black font-opensans rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-customOrange"
                        required
                      />
                    </FormGroup>
                    <FormGroup className="relative mb-2">
                      <PhoneInput
                        country={"ng"}
                        countryCodeEditable={false}
                        value={vendorData.phoneNumber}
                        onChange={(phone) => {
                          handleInputChange({
                            target: { name: "phoneNumber", value: `+${phone}` }, // Ensure the `+` is added
                          });
                        }}
                        inputProps={{
                          name: "phoneNumber",
                          required: true,
                          className:
                            "w-full h-12 bg-gray-100 text-black font-opensans rounded-md text-sm focus:outline-none pl-12 focus:ring-2 focus:ring-customOrange",
                        }}
                      />
                    </FormGroup>
                    <FormGroup className="relative mb-2">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <GrSecure className="text-gray-500 text-xl" />
                      </div>{" "}
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        placeholder="Password"
                        value={vendorData.password}
                        onChange={handleInputChange}
                        className="w-full h-12 bg-gray-100 pl-14 text-black font-opensans rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-customOrange"
                        required
                      />
                      <motion.button
                        whileTap={{ scale: 1.2 }}
                        type="button"
                        className="absolute right-3 top-4 text-gray-500"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <FaRegEye /> : <FaRegEyeSlash />}
                      </motion.button>
                    </FormGroup>
                    <FormGroup className="relative mb-2">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <GrSecure className="text-gray-500 text-xl" />
                      </div>{" "}
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        placeholder="Confirm Password"
                        value={vendorData.confirmPassword}
                        onChange={handleInputChange}
                        className="w-full h-12 bg-gray-100 pl-14 text-black font-opensans rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-customOrange0"
                        required
                      />
                      <motion.button
                        whileTap={{ scale: 1.2 }}
                        type="button"
                        className="absolute right-3 top-4 text-gray-500"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                      >
                        {showConfirmPassword ? <FaRegEye /> : <FaRegEyeSlash />}
                      </motion.button>
                    </FormGroup>

                    <button
                      type="submit"
                      disabled={isSendingOTP}
                      className="w-full h-12 mt-4 rounded-full bg-customOrange text-white  font-semibold font-opensans text-sm hover:bg-orange-600"
                    >
                      {isSendingOTP ? (
                        <RotatingLines
                          width="25"
                          height="25"
                          strokeColor="white"
                          strokeWidth="4"
                        />
                      ) : (
                        "Sign Up"
                      )}{" "}
                    </button>
                    <div
                      id="recaptcha-container-signup"
                      style={{ display: "none" }}
                    />
                  </Form>
                  <p className="mt-3 text-center font-opensans  text-gray-700">
                    Already have an account?{" "}
                    <button
                      onClick={handleReloadToLogin}
                      className="text-customOrange underline"
                    >
                      Log in
                    </button>
                  </p>
                </div>
              </div>
            )}
          </Row>
        </Container>
      </section>
    </Helmet>
  );
};

export default VendorSignup;
