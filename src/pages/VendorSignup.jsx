import React, { useState, useEffect } from "react";
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
  const [showOTP, setShowOTP] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0); // Cooldown timer

  const navigate = useNavigate();
  const auth = getAuth();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setVendorData({ ...vendorData, [name]: value });
  };

  const validateName = (name) => /^[A-Za-z]+$/.test(name);
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhoneNumber = (phone) => /^[0-9]{11}$/.test(phone);

  const initializeRecaptchaVerifier = () => {
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
    }
    window.recaptchaVerifier = new RecaptchaVerifier(
      auth,
      "recaptcha-container",
      {
        size: "invisible",
        callback: () => {
          handleSignup();
        },
        "expired-callback": () => {
          toast.error("reCAPTCHA expired. Please try again.");
        },
      }
    );

    window.recaptchaVerifier.render().catch((error) => {
      console.error("reCAPTCHA render error:", error);
      toast.error("Failed to load reCAPTCHA. Please refresh the page.");
    });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(false);
    setIsSendingOTP(true);

    // Validation
    if (
      !validateName(vendorData.firstName) ||
      !validateName(vendorData.lastName)
    ) {
      toast.error("Names must only contain letters.");
      setLoading(false);
      setIsSendingOTP(false);

      return;
    }
    if (!validateEmail(vendorData.email)) {
      toast.error("Invalid email format.");
      setLoading(false);
      setIsSendingOTP(false);

      return;
    }
    if (!validatePhoneNumber(vendorData.phoneNumber)) {
      toast.error("Phone number should be exactly 11 digits.");
      setLoading(false);
      setIsSendingOTP(false);

      return;
    }
    if (vendorData.password !== vendorData.confirmPassword) {
      toast.error("Passwords do not match.");
      setLoading(false);
      setIsSendingOTP(false);

      return;
    }

    // Initialize reCAPTCHA
    if (!window.recaptchaVerifier) {
      initializeRecaptchaVerifier();
    }

    const appVerifier = window.recaptchaVerifier;

    try {
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        "+234" + vendorData.phoneNumber,
        appVerifier
      );
      window.confirmationResult = confirmationResult;
      setShowOTP(true);
      toast.success("OTP sent successfully!");
    } catch (error) {
      console.error("OTP send error:", error);
      toast.error("Failed to send OTP. Please reload the page.");
    } finally {
      setLoading(false);
      setIsSendingOTP(false);
    }
  };

  const onOTPVerify = async () => {
    setIsVerifyingOTP(true);
    try {
      const confirmationResult = window.confirmationResult;
      const phoneCredential = PhoneAuthProvider.credential(
        confirmationResult.verificationId,
        otp
      );

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        vendorData.email,
        vendorData.password
      );
      const user = userCredential.user;

      await linkWithCredential(user, phoneCredential);

      await sendEmailVerification(user);

      await saveVendorToDatabase(user.uid);

      toast.success(
        "Account created successfully. Please verify your email and log in."
      );
      setLoading(true);
      setTimeout(() => {
        window.location.href = "/vendorlogin";
      }, 500);
    } catch (error) {
      handleSignupError(error);
      console.error("OTP verification error:", error);
    } finally {
      setIsVerifyingOTP(false);
    }
  };
  const saveVendorToDatabase = async (uid) => {
    const timestamp = new Date();
    const vendorInfo = {
      uid,
      firstName: vendorData.firstName,
      lastName: vendorData.lastName,
      email: vendorData.email,
      phoneNumber: vendorData.phoneNumber,
      role: "vendor",
      profileComplete: false,
      createdSince: timestamp,
      lastUpdate: timestamp,
      isApproved: false,
    };
    try {
      await setDoc(doc(db, "vendors", uid), vendorInfo);
    } catch (error) {}
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

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    setIsSendingOTP(true);
    try {
      const appVerifier = window.recaptchaVerifier;
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        "+234" + vendorData.phoneNumber,
        appVerifier
      );
      window.confirmationResult = confirmationResult;
      toast.success("OTP resent successfully!");
      setResendCooldown(30); // Start 30-second cooldown
    } catch (error) {
      console.error("Resend OTP error:", error);
      toast.error("Failed to resend OTP. Please try again.");
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
  const handleSignupError = (error) => {
    switch (error.code) {
      case "auth/email-already-in-use":
        toast.error("This email is already registered. Please log in.");
        break;
      case "auth/invalid-verification-code":
        toast.error("You have entered a wrong OTP code, please try again.");
        break;
      case "auth/phone-number-already-exists":
        toast.error("This phone number is already registered. Please log in.");
        break;
      case "auth/credential-already-in-use":
        toast.error("This phone number is already registered. Please log in.");
        break;
      case "auth/weak-password":
        toast.error("Password should be at least 6 characters.");
        break;
      case "auth/invalid-email":
        toast.error("Invalid email format.");
        break;
      default:
        toast.error("Error signing up vendor: " + error.message);
    }
  };

  return (
    <Helmet>
      <section>
        <Container>
          <Row>
            {loading ? (
              <Loading />
            ) : (
              <div className="px-3">
                <Link to="/confirm-user-state">
                  <FaAngleLeft className="text-3xl -translate-y-2 font-normal text-black" />
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
                  <p className="text-black font-semibold">
                    Please sign up to continue
                  </p>
                </div>
                <div className="translate-y-4">
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
                        className="w-full h-14 text-gray-800 pl-10 rounded-lg bg-gray-300"
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
                        className="w-full h-14 text-gray-800 pl-10 rounded-lg bg-gray-300"
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
                        className="w-full h-14 text-gray-800 pl-10 rounded-lg bg-gray-300"
                        required
                      />
                    </FormGroup>
                    <FormGroup className="relative mb-2">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <MdPhone className="text-gray-500 text-xl" />
                      </div>{" "}
                      <input
                        type="text"
                        name="phoneNumber"
                        placeholder="Phone Number"
                        value={vendorData.phoneNumber}
                        onChange={handleInputChange}
                        className="w-full h-14 text-gray-800 pl-10 rounded-lg bg-gray-300"
                        required
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
                        className="w-full h-14 text-gray-800 pl-10 rounded-lg bg-gray-300"
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
                        className="w-full h-14 text-gray-800 pl-10 rounded-lg bg-gray-300"
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
                    {showOTP && (
                      <FormGroup className="relative mb-2">
                        <input
                          type="text"
                          name="otp"
                          placeholder="Enter OTP"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          className="w-full h-14 text-gray-800 pl-3 rounded-lg bg-gray-300"
                          required
                        />
                        <motion.button
                          whileTap={{ scale: 1.2 }}
                          type="button"
                          className="absolute right-3 top-4 text-customOrange"
                          onClick={onOTPVerify}
                          disabled={isVerifyingOTP}
                        >
                          {isVerifyingOTP ? (
                            <RotatingLines
                              width="25"
                              height="25"
                              strokeColor="gray"
                              strokeWidth="4"
                            />
                          ) : (
                            "Verify OTP"
                          )}
                        </motion.button>
                        <button
                          onClick={handleResendOTP}
                          disabled={resendCooldown > 0 || isSendingOTP}
                          className={`mt-2 px-4 py-2 rounded-lg ${
                            resendCooldown > 0
                              ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                              : "bg-customOrange text-white hover:bg-orange-600"
                          }`}
                        >
                          {resendCooldown > 0
                            ? `Resend OTP in ${resendCooldown}s`
                            : "Resend OTP"}
                        </button>
                      </FormGroup>
                    )}

                    <button
                      type="submit"
                      disabled={isSendingOTP}
                      className="w-full h-14 mt-4 rounded-lg bg-customOrange text-white text-lg font-semibold hover:bg-orange-600"
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
                    <div id="recaptcha-container" />
                  </Form>
                  <p className="mt-3 text-center text-gray-700">
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
