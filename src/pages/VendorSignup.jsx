import React, { useState } from "react";
import Helmet from "../components/Helmet/Helmet";
import { Container, Row, Form, FormGroup } from "reactstrap";
import { Link, useNavigate } from "react-router-dom";
import {
  getAuth,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase.config";
import bcrypt from "bcryptjs";
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
  const [isPhoneSignup, setIsPhoneSignup] = useState(false);
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);

  const navigate = useNavigate();
  const auth = getAuth();

  // Toggle between phone and email signup
  const toggleSignupMethod = () => {
    setIsPhoneSignup(!isPhoneSignup);
    setShowOTP(false);
  };

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
          handlePhoneSignup();
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

  // Email-based signup handler
  const handleEmailSignup = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (
      !validateName(vendorData.firstName) ||
      !validateName(vendorData.lastName)
    ) {
      toast.error("Names must only contain letters.");
      setLoading(false);
      return;
    }

    if (!validateEmail(vendorData.email)) {
      toast.error("Invalid email format.");
      setLoading(false);
      return;
    }

    if (vendorData.password !== vendorData.confirmPassword) {
      toast.error("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        vendorData.email,
        vendorData.password
      );
      const user = userCredential.user;
      const hashedPassword = await bcrypt.hash(vendorData.password, 10);
      await sendEmailVerification(user);

      await saveVendorToDatabase(user.uid, hashedPassword);

      toast.success(
        "Account created successfully. Please check your email for verification."
      );
      navigate("/vendorlogin");
    } catch (error) {
      handleSignupError(error);
    } finally {
      setLoading(false);
    }
  };

  // Phone-based signup handler
  const handlePhoneSignup = async (e) => {
    e.preventDefault();
    setLoading(false);
    setIsSendingOTP(true);

    if (!validatePhoneNumber(vendorData.phoneNumber)) {
      toast.error("Phone number should be exactly 11 digits.");
      setIsSendingOTP(false);
      return;
    }

    if (!window.recaptchaVerifier) {
      initializeRecaptchaVerifier();
    }

    const appVerifier = window.recaptchaVerifier;
    signInWithPhoneNumber(auth, "+234" + vendorData.phoneNumber, appVerifier)
      .then((confirmationResult) => {
        window.confirmationResult = confirmationResult;
        setShowOTP(true);
        setIsSendingOTP(false);
        toast.success("OTP sent successfully!");
      })
      .catch((error) => {
        console.log("OTP send error:", error);
        setIsSendingOTP(false);
        toast.error("Failed to send OTP. Please reload the page.");
      });
  };

  const onOTPVerify = () => {
    setIsVerifyingOTP(true);
    window.confirmationResult
      .confirm(otp)
      .then(async (res) => {
        const user = res.user;
        await saveVendorToDatabase(user.uid);
        toast.success("Account created successfully!");
        navigate("/vendorlogin");
      })
      .catch((error) => {
        handleSignupError(error);
        console.log("OTP verification error:", error);
        setIsVerifyingOTP(false);
      });
  };

  const saveVendorToDatabase = async (uid, hashedPassword = null) => {
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
    if (hashedPassword) vendorInfo.password = hashedPassword;
    await setDoc(doc(db, "vendors", uid), vendorInfo);
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
                  <motion.button
                    className="glow-button w-full h-14 bg-customOrange text-white font-semibold rounded-full"
                    onClick={toggleSignupMethod}
                  >
                    {isPhoneSignup ? "Signup with Email" : "Signup with Phone"}
                  </motion.button>

                  <Form
                    className="mt-4"
                    onSubmit={
                      isPhoneSignup ? handlePhoneSignup : handleEmailSignup
                    }
                  >
                    <FormGroup className="relative mb-2">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <FaRegUser className="text-gray-500 text-xl" />
                      </div>
                      <input
                        type="text"
                        name="firstName"
                        placeholder="First Name"
                        value={vendorData.firstName}
                        className="w-full h-14 text-gray-800 pl-10 rounded-lg bg-gray-300"
                        onChange={handleInputChange}
                        required
                      />
                    </FormGroup>
                    <FormGroup className="relative mb-2">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <FaRegUser className="text-gray-500 text-xl" />
                      </div>
                      <input
                        type="text"
                        name="lastName"
                        placeholder="Last Name"
                        value={vendorData.lastName}
                        className="w-full h-14 text-gray-800 pl-10 rounded-lg bg-gray-300"
                        onChange={handleInputChange}
                        required
                      />
                    </FormGroup>

                    {isPhoneSignup ? (
                      <>
                        <FormGroup className="relative mb-2">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <MdEmail className="text-gray-500 text-xl" />
                          </div>
                          <input
                            type="email"
                            name="email"
                            placeholder="Email"
                            value={vendorData.email}
                            className="w-full h-14 text-gray-800 pl-10 rounded-lg bg-gray-300"
                            onChange={handleInputChange}
                            required
                          />
                        </FormGroup>
                        <FormGroup className="relative mb-2">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <MdPhone className="text-gray-500 text-xl" />
                          </div>
                          <input
                            type="text"
                            name="phoneNumber"
                            placeholder="Phone Number"
                            value={vendorData.phoneNumber}
                            className="w-full h-14 text-gray-800 pl-10 rounded-lg bg-gray-300"
                            onChange={handleInputChange}
                            required
                          />
                        </FormGroup>
                        <div>
                          {isPhoneSignup && isSendingOTP && (
                            <RotatingLines
                              width="30"
                              height="30"
                              strokeColor="gray"
                              strokeWidth="5"
                            />
                          )}
                          {isPhoneSignup && !isVerifyingOTP && showOTP && (
                            <FormGroup className="relative mb-2">
                              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <GrSecure className="text-gray-500 text-xl" />
                              </div>

                              <input
                                type="text"
                                name="otp"
                                placeholder="Enter OTP"
                                value={otp}
                                className="w-full h-14 text-gray-800 pl-10 rounded-lg bg-gray-300"
                                onChange={(e) => setOtp(e.target.value)}
                                required
                              />
                            </FormGroup>
                          )}
                          <motion.button
                            whileTap={{ scale: 1.2 }}
                            onClick={showOTP ? onOTPVerify : handlePhoneSignup}
                            className="w-full h-14 bg-customOrange text-white font-semibold rounded-full mt-4"
                          >
                            {showOTP ? "Verify OTP" : "Send OTP"}
                          </motion.button>
                        </div>
                      </>
                    ) : (
                      <>
                        <FormGroup className="relative mb-2">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <MdPhone className="text-gray-500 text-xl" />
                          </div>
                          <input
                            type="text"
                            name="phoneNumber"
                            placeholder="Phone Number"
                            value={vendorData.phoneNumber}
                            className="w-full h-14 text-gray-800 pl-10 rounded-lg bg-gray-300"
                            onChange={handleInputChange}
                            required
                          />
                        </FormGroup>
                        <FormGroup className="relative mb-2">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <MdEmail className="text-gray-500 text-xl" />
                          </div>
                          <input
                            type="email"
                            name="email"
                            placeholder="Email"
                            value={vendorData.email}
                            className="w-full h-14 text-gray-800 pl-10 rounded-lg bg-gray-300"
                            onChange={handleInputChange}
                            required
                          />
                        </FormGroup>
                        <FormGroup className="relative mb-2">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <GrSecure className="text-gray-500 text-xl" />
                          </div>
                          <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            placeholder="Password"
                            value={vendorData.password}
                            className="w-full h-14 text-gray-800 pl-10 rounded-lg bg-gray-300"
                            onChange={handleInputChange}
                            required
                          />
                          <div
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-0 inset-y-0 flex items-center pr-3 cursor-pointer"
                          >
                            {showPassword ? (
                              <FaRegEye className="text-gray-500 text-xl" />
                            ) : (
                              <FaRegEyeSlash className="text-gray-500 text-xl" />
                            )}
                          </div>
                        </FormGroup>
                        <FormGroup className="relative mb-2">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <GrSecure className="text-gray-500 text-xl" />
                          </div>
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            name="confirmPassword"
                            placeholder="Confirm Password"
                            value={vendorData.confirmPassword}
                            className="w-full h-14 text-gray-800 pl-10 rounded-lg bg-gray-300"
                            onChange={handleInputChange}
                            required
                          />
                          <div
                            onClick={() =>
                              setShowConfirmPassword(!showConfirmPassword)
                            }
                            className="absolute right-0 inset-y-0 flex items-center pr-3 cursor-pointer"
                          >
                            {showConfirmPassword ? (
                              <FaRegEye className="text-gray-500 text-xl" />
                            ) : (
                              <FaRegEyeSlash className="text-gray-500 text-xl" />
                            )}
                          </div>
                        </FormGroup>
                        <motion.button
                          whileTap={{ scale: 1.2 }}
                          type="submit"
                          className="w-full h-14 bg-customOrange text-white font-semibold rounded-full mt-4"
                        >
                          Sign Up
                        </motion.button>
                      </>
                    )}

                    <p className="mt-3 text-center text-gray-500">
                      Already have an account?{" "}
                      <Link to="/vendorlogin" className="text-customOrange">
                        Log In
                      </Link>
                    </p>
                  </Form>
                </div>
                <div id="recaptcha-container"></div>
              </div>
            )}
          </Row>
        </Container>
      </section>
    </Helmet>
  );
};

export default VendorSignup;