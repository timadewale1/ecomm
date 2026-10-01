import React, { useState, useEffect } from "react";
import Helmet from "../components/Helmet/SEO";
import { Container, Row, Form, FormGroup } from "reactstrap";
import { Link, useNavigate } from "react-router-dom";

import { functions } from "../firebase.config";
import toast from "react-hot-toast";
import { FaRegEyeSlash, FaRegEye, FaRegUser } from "react-icons/fa";
import {
  MdEmail,
  MdOutlineClose,
  MdOutlineDomainVerification,
} from "react-icons/md";

import { GrSecure } from "react-icons/gr";
import { motion } from "framer-motion";
import Typewriter from "typewriter-effect";
import VendorLoginAnimation from "../SignUpAnimation/SignUpAnimation";
import { RotatingLines } from "react-loader-spinner";
import { GoChevronLeft } from "react-icons/go";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import Modal from "react-modal";
import { httpsCallable } from "firebase/functions";
import SEO from "../components/Helmet/SEO";
import { appHaptics } from "../services/haptics";

const createSignupRequestId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `vendor_${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

const normalizeCallableCode = (error) =>
  String(error?.code || "unknown").replace(/^functions\//, "");

const vendorSignupErrorMessage = (error) => {
  const code = normalizeCallableCode(error);
  const reason = error?.details?.reason;

  if (code === "invalid-argument") {
    if (reason === "invalid-name") return "Enter a valid first and last name.";
    if (reason === "invalid-email") return "Enter a valid email address.";
    if (reason === "invalid-phone") {
      return "Enter a valid Nigerian mobile number.";
    }
    if (reason === "password-mismatch") return "The passwords do not match.";
    if (reason === "invalid-password") {
      return "Your password must meet all of the security requirements shown.";
    }
    return "Please check the information you entered and try again.";
  }

  if (code === "already-exists") {
    if (reason === "phone-in-use") {
      return "That phone number is already connected to an account.";
    }
    if (reason === "customer-account-exists") {
      return "That email is already connected to a customer account.";
    }
    return "A vendor account already exists with these details. Please sign in instead.";
  }

  if (code === "resource-exhausted") {
    const seconds = Number(error?.details?.retryAfterSeconds) || 60;
    return `Please wait ${seconds} seconds before requesting another verification email.`;
  }
  if (code === "unavailable" || code === "deadline-exceeded") {
    return "We couldn't reach the service. Check your connection and try again.";
  }
  if (code === "permission-denied" || code === "unauthenticated") {
    return "Please sign in to continue with this vendor account.";
  }

  return "We couldn't create your vendor account right now. Please try again.";
};

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
  const [showPasswordCriteria, setShowPasswordCriteria] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [signupRequestId] = useState(createSignupRequestId);
  const [signupOutcome, setSignupOutcome] = useState({
    accountCreated: false,
    verificationEmailSent: true,
    message: "",
  });
  const [retryingVerification, setRetryingVerification] = useState(false);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!modalOpen) return;
    if (signupOutcome.verificationEmailSent === false) {
      void appHaptics.warning();
    } else {
      void appHaptics.success();
    }
  }, [modalOpen, signupOutcome.verificationEmailSent]);

  useEffect(() => {
    if (!modalOpen || retryAfterSeconds <= 0) return undefined;
    const timer = window.setTimeout(() => {
      setRetryAfterSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [modalOpen, retryAfterSeconds]);

  // Validation functions
  const validateName = (name) => name.trim() !== "";
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePassword = (password) => {
    const hasUppercase = /[A-Z]/.test(password);
    const hasSpecialCharacter = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const hasNumeric = /[0-9]/.test(password);
    const isValidLength = password.length >= 8 && password.length <= 24;
    return hasUppercase && hasSpecialCharacter && hasNumeric && isValidLength;
  };
  const getNGNational = (v) => String(v).replace(/\D/g, "").replace(/^234/, "");

  const isValidNGMobile = (v) => {
    const nat = getNGNational(v);
    return /^0\d{10}$/.test(nat) || /^[1-9]\d{9}$/.test(nat);
  };
  const toE164NG = (v) => {
    const nat = getNGNational(v);
    const nsn = nat.startsWith("0") ? nat.slice(1) : nat; // drop the 0
    return `+234${nsn}`;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setVendorData({ ...vendorData, [name]: value });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Frontend validation
    if (
      !validateName(vendorData.firstName) ||
      !validateName(vendorData.lastName)
    ) {
      toast.error("Invalid name. Please enter your first and last name.");
      setLoading(false);
      return;
    }

    if (!validateEmail(vendorData.email)) {
      toast.error("Invalid email address.");
      setLoading(false);
      return;
    }

    if (!validatePassword(vendorData.password)) {
      toast.error("Password must meet all criteria.");
      setLoading(false);
      return;
    }

    if (vendorData.password !== vendorData.confirmPassword) {
      toast.error("Passwords do not match.");
      setLoading(false);
      return;
    }

    if (!isValidNGMobile(vendorData.phoneNumber)) {
      toast.error(
        "Enter a valid NG number (e.g. 0705… or 705…), we’ll save it as +234XXXXXXXXXX."
      );
      setLoading(false);
      return;
    }

    const createVendorAccount = httpsCallable(functions, "createVendorAccount");

    try {
      const res = await createVendorAccount({
        ...vendorData,
        signupRequestId,
      });

      if (res.data?.success && res.data?.accountCreated !== false) {
        setSignupOutcome({
          accountCreated: true,
          verificationEmailSent: res.data.verificationEmailSent !== false,
          message: res.data.message || "",
        });
        setRetryAfterSeconds(Number(res.data.retryAfterSeconds) || 0);
        setModalOpen(true);
      } else {
        throw new Error("Vendor signup did not complete.");
      }
    } catch (error) {
      console.error("Cloud function error:", error);
      void appHaptics.error();
      toast.error(vendorSignupErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleRetryVerificationEmail = async () => {
    if (retryingVerification || retryAfterSeconds > 0) return;

    setRetryingVerification(true);
    try {
      const createVendorAccount = httpsCallable(functions, "createVendorAccount");
      const res = await createVendorAccount({
        ...vendorData,
        signupRequestId,
      });
      const sent = res.data?.verificationEmailSent === true;
      setSignupOutcome({
        accountCreated: res.data?.accountCreated !== false,
        verificationEmailSent: sent,
        message: res.data?.message || "",
      });
      setRetryAfterSeconds(Number(res.data?.retryAfterSeconds) || 0);

      if (sent) {
        toast.success("Verification email sent. Please check your inbox.");
      } else {
        toast("Your account is safe, but the email could not be sent yet.");
      }
    } catch (error) {
      const seconds = Number(error?.details?.retryAfterSeconds) || 0;
      if (seconds > 0) setRetryAfterSeconds(seconds);
      void appHaptics.error();
      toast.error(vendorSignupErrorMessage(error));
    } finally {
      setRetryingVerification(false);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setVendorData({
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      password: "",
      confirmPassword: "",
    });
    navigate("/vendorlogin"); // Redirect to vendor login
  };

  return (
    <>
      <SEO
        title={`Vendor Signup - My Thrift`}
        description={`Sign up to grow your brand as My Thrift vendor!`}
        url={`https://www.shopmythrift.store/vendor-signup`}
      />
      <section className="w-full">
        <Container className="mx-auto w-full max-w-[574px] px-0">
          <Row className="mx-0 w-full">
            <div className="mb-32 w-full px-4">
              <Link to="/vendorlogin">
                <GoChevronLeft className="text-3xl -translate-y-2 font-normal text-black" />
              </Link>
              <VendorLoginAnimation />
              <div className="flex justify-center text-xl text-customOrange -translate-y-1">
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
              <div className="flex justify-center font-ubuntu text-xs font-medium text-customOrange -translate-y-2">
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
                    Sign Up
                    <span className="rounded-full px-3 py-1 bg-customOrange text-xs flex items-center justify-center">
                      <p className="text-white text-xs leading-none">Vendor</p>
                    </span>
                  </h1>
                </div>
                <p className="text-black font-opensans text-sm font-semibold">
                  Please sign up to continue
                </p>
              </div>
              <div className="translate-y-6">
                <Form onSubmit={handleSignup}>
                  <FormGroup className="relative mb-2">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-6 pointer-events-none">
                      <FaRegUser className="text-gray-500 text-xl" />
                    </div>
                    <input
                      type="text"
                      name="firstName"
                      placeholder="First Name"
                      value={vendorData.firstName}
                      onChange={handleInputChange}
                      className="w-full h-12 bg-gray-100 pl-14 text-black font-opensans rounded-md text-base focus:outline-none focus:ring-2 focus:ring-customOrange"
                      required
                    />
                  </FormGroup>
                  <FormGroup className="relative mb-2">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-6 pointer-events-none">
                      <FaRegUser className="text-gray-500 text-xl" />
                    </div>
                    <input
                      type="text"
                      name="lastName"
                      placeholder="Last Name"
                      value={vendorData.lastName}
                      onChange={handleInputChange}
                      className="w-full h-12 bg-gray-100 pl-14 text-black font-opensans rounded-md text-base focus:outline-none focus:ring-2 focus:ring-customOrange"
                      required
                    />
                  </FormGroup>
                  <FormGroup className="relative mb-2">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-6 pointer-events-none">
                      <MdEmail className="text-gray-500 text-xl" />
                    </div>
                    <input
                      type="email"
                      name="email"
                      placeholder="Email"
                      value={vendorData.email}
                      onChange={handleInputChange}
                      className="w-full h-12 bg-gray-100 pl-14 text-black font-opensans rounded-md text-base focus:outline-none focus:ring-2 focus:ring-customOrange"
                      required
                    />
                  </FormGroup>
                  <FormGroup className="relative mb-2">
                    <PhoneInput
                      country={"ng"}
                      countryCodeEditable={false}
                      value={vendorData.phoneNumber}
                      onChange={(raw) => {
                        handleInputChange({
                          target: { name: "phoneNumber", value: toE164NG(raw) },
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
                    <div className="absolute inset-y-0 left-0 flex items-center pl-6 pointer-events-none">
                      <GrSecure className="text-gray-500 text-xl" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Password"
                      value={vendorData.password}
                      onChange={handleInputChange}
                      className="w-full h-12 bg-gray-100 pl-14 text-black font-opensans rounded-md text-base focus:outline-none focus:ring-2 focus:ring-customOrange"
                      required
                      onFocus={() => setShowPasswordCriteria(true)}
                      onBlur={() => setShowPasswordCriteria(false)}
                    />
                    <motion.button
                      whileTap={{ scale: 1.2 }}
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 cursor-pointer"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <FaRegEye className="text-xl" />
                      ) : (
                        <FaRegEyeSlash className="text-xl" />
                      )}
                    </motion.button>
                  </FormGroup>
                  {showPasswordCriteria && (
                    <ul className="text-xs text-gray-600 mt-2 mb-2">
                      <li
                        className={
                          /[A-Z]/.test(vendorData.password)
                            ? "text-green-500"
                            : "text-red-500"
                        }
                      >
                        {/[A-Z]/.test(vendorData.password) ? "✔" : "✘"} At least
                        one uppercase
                      </li>
                      <li
                        className={
                          /[0-9]/.test(vendorData.password)
                            ? "text-green-500"
                            : "text-red-500"
                        }
                      >
                        {/[0-9]/.test(vendorData.password) ? "✔" : "✘"} At least
                        one number
                      </li>
                      <li
                        className={
                          /[!@#$%^&*(),.?":{}|<>]/.test(vendorData.password)
                            ? "text-green-500"
                            : "text-red-500"
                        }
                      >
                        {/[!@#$%^&*(),.?":{}|<>]/.test(vendorData.password)
                          ? "✔"
                          : "✘"}{" "}
                        At least one special char
                      </li>
                      <li
                        className={
                          vendorData.password.length >= 8
                            ? "text-green-500"
                            : "text-red-500"
                        }
                      >
                        {vendorData.password.length >= 8 ? "✔" : "✘"} Min length
                        8
                      </li>
                    </ul>
                  )}
                  <FormGroup className="relative mb-2">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-6 pointer-events-none">
                      <GrSecure className="text-gray-500 text-xl" />
                    </div>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      placeholder="Confirm Password"
                      value={vendorData.confirmPassword}
                      onChange={handleInputChange}
                      className="w-full h-12 bg-gray-100 pl-14 text-black font-opensans rounded-md text-base focus:outline-none focus:ring-2 focus:ring-customOrange"
                      required
                    />
                    <motion.button
                      whileTap={{ scale: 1.2 }}
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 cursor-pointer"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    >
                      {showConfirmPassword ? (
                        <FaRegEye className="text-xl" />
                      ) : (
                        <FaRegEyeSlash className="text-xl" />
                      )}
                    </motion.button>
                  </FormGroup>
                  <div className="text-gray-600 font-opensans text-xs mt-2 -mx-1 leading-relaxed">
                    By signing up, you agree to our
                    <span
                      onClick={() => navigate("/terms-and-conditions")}
                      className="text-customOrange font-medium hover:underline cursor-pointer ml-1"
                    >
                      Terms & Conditions
                    </span>
                    and
                    <span
                      onClick={() => navigate("/privacy-policy")}
                      className="text-customOrange font-medium hover:underline cursor-pointer ml-1"
                    >
                      Privacy Policy
                    </span>
                    .
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="glow-button w-full h-12 mt-4 bg-customOrange text-white font-medium rounded-xl flex justify-center font-opensans items-center"
                  >
                    {loading ? (
                      <RotatingLines
                        width="25"
                        height="25"
                        strokeColor="white"
                        strokeWidth="4"
                      />
                    ) : (
                      "Sign Up"
                    )}
                  </button>
                </Form>
                <div className="text-center font-light font-lato mt-2 flex justify-center">
                  <p className="text-center text-gray-700">
                    Already have an account?{" "}
                    <Link
                      to="/vendorlogin"
                      className="font-normal text-customOrange"
                    >
                      Login
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </Row>
        </Container>
      </section>
      <Modal
        isOpen={modalOpen}
        onRequestClose={handleCloseModal}
        contentLabel="Email Verification"
        style={{
          content: {
            position: "absolute",
            bottom: "0",
            left: "0",
            right: "0",
            top: "auto",
            borderRadius: "20px 20px 0 0",
            padding: "20px",
            backgroundColor: "#ffffff",
            border: "none",
            height: "35%",
            animation: "slide-up 0.3s ease-in-out",
          },
          overlay: {
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            zIndex: 3000,
          },
        }}
      >
        <div className="flex flex-col items-center  py-2">
          <div className="flex items-center justify-between w-full mb-6">
            {/* Left Icon and Title */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-rose-100 flex justify-center items-center rounded-full">
                <MdOutlineDomainVerification className="text-customRichBrown text-lg" />
              </div>
              <h2 className="font-opensans text-lg font-semibold text-customRichBrown">
                {signupOutcome.verificationEmailSent
                  ? "Verify Your Email"
                  : "Your Account Is Ready"}
              </h2>
            </div>
            {/* Close Icon */}
            <MdOutlineClose
              className="text-black text-2xl cursor-pointer"
              onClick={handleCloseModal}
            />
          </div>

          {/* Message Section */}
          {signupOutcome.verificationEmailSent ? (
            <p className="font-opensans mt-1 text-base text-black text-center font-medium leading-6">
              Email sent successfully! Please check your inbox for the
              verification link.
              <br />
              <span className="font-light text-xs font-opensans">
                P.S. If you didn’t receive it, please check your spam or junk
                folder.
              </span>
            </p>
          ) : (
            <div className="w-full text-center">
              <p className="font-opensans mt-1 text-base text-black font-medium leading-6">
                Your vendor account was created successfully, but we couldn’t
                send the verification email right now. Your account is safe.
              </p>
              <button
                type="button"
                onClick={handleRetryVerificationEmail}
                disabled={retryingVerification || retryAfterSeconds > 0}
                className="mt-5 h-12 w-full rounded-md bg-customOrange text-white font-opensans font-medium disabled:opacity-50 flex items-center justify-center"
              >
                {retryingVerification ? (
                  <RotatingLines
                    width="24"
                    height="24"
                    strokeColor="white"
                    strokeWidth="4"
                  />
                ) : retryAfterSeconds > 0 ? (
                  `Try again in ${retryAfterSeconds}s`
                ) : (
                  "Retry verification email"
                )}
              </button>
              <p className="mt-3 text-xs text-gray-500 font-opensans">
                You can also close this message and sign in to request another
                verification email.
              </p>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default VendorSignup;
