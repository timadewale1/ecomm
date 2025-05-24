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
  const navigate = useNavigate();
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

    if (vendorData.phoneNumber.length < 10) {
      toast.error("Phone number is too short.");
      setLoading(false);
      return;
    }

    // Call the cloud function
    const createVendorAccount = httpsCallable(functions, "createVendorAccount");

    try {
      const res = await createVendorAccount(vendorData);

      // If successful, open your success modal
      if (res.data.success) {
        setModalOpen(true);
      }
    } catch (error) {
      console.error("Cloud function error:", error);

      let errorMessage = "Something went wrong. Please try again.";

      // Use if-else to handle specific error codes
      if (error.code === "invalid-argument") {
        errorMessage =
          "Some of the information you provided is invalid. Please review and try again.";
      } else if (error.code === "already-exists") {
        errorMessage =
          "That email or phone number is already in use. Please use a different one.";
      } else if (error.code === "unknown") {
        errorMessage =
          "An unexpected error occurred on our end. Please try again later.";
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
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
      <section>
        <Container>
          <Row>
            <div className="px-2 mb-32">
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
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
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
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
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
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
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
                      onChange={(phone) => {
                        handleInputChange({
                          target: { name: "phoneNumber", value: `+${phone}` },
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
                      className="absolute right-3 top-4 text-gray-500"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <FaRegEye /> : <FaRegEyeSlash />}
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
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
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
                      className="absolute right-3 top-4 text-gray-500"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    >
                      {showConfirmPassword ? <FaRegEye /> : <FaRegEyeSlash />}
                    </motion.button>
                  </FormGroup>
                  <div className="text-gray-600 font-opensans text-xs mt-2 -mx-1 leading-relaxed">
                    By signing up, you agree to our
                    <span
                      onClick={() =>
                        window.open(
                          "/terms-and-conditions",
                          "_blank",
                          "noopener,noreferrer"
                        )
                      }
                      className="text-customOrange font-medium hover:underline cursor-pointer ml-1"
                    >
                      Terms & Conditions
                    </span>
                    and
                    <span
                      onClick={() =>
                        window.open(
                          "/privacy-policy",
                          "_blank",
                          "noopener,noreferrer"
                        )
                      }
                      className="text-customOrange font-medium hover:underline cursor-pointer ml-1"
                    >
                      Privacy Policy
                    </span>
                    .
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 mt-4 rounded-full flex justify-center items-center bg-customOrange text-white font-semibold font-opensans text-sm hover:bg-orange-600"
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
                Verify Your Email
              </h2>
            </div>
            {/* Close Icon */}
            <MdOutlineClose
              className="text-black text-2xl cursor-pointer"
              onClick={handleCloseModal}
            />
          </div>

          {/* Message Section */}
          <p className="font-opensans mt-1 text-base text-black text-center font-medium leading-6">
            Email sent successfully! Please check your inbox for the
            verification link.
            <br />
            <span className="font-light text-xs  font-opensans">
              P.S. If you didn’t receive it, please check your spam or junk
              folder.
            </span>
          </p>
        </div>
      </Modal>
    </>
  );
};

export default VendorSignup;
