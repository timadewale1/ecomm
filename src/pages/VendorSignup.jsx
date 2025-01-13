import React, { useState, useEffect } from "react";
import Helmet from "../components/Helmet/Helmet";
import { Container, Row, Form, FormGroup } from "reactstrap";
import { Link, useNavigate } from "react-router-dom";
import { doc, setDoc } from "firebase/firestore";
import { db, functions } from "../firebase.config";
import toast from "react-hot-toast";
import { FaRegEyeSlash, FaRegEye, FaRegUser } from "react-icons/fa";
import { MdEmail } from "react-icons/md";
import { getAuth, signInWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { GrSecure } from "react-icons/gr";
import { motion } from "framer-motion";
import Typewriter from "typewriter-effect";
import VendorLoginAnimation from "../SignUpAnimation/SignUpAnimation";
import { RotatingLines } from "react-loader-spinner";
import { GoChevronLeft } from "react-icons/go";
import { collection, where, query, getDocs } from "firebase/firestore";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { httpsCallable } from "firebase/functions";

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
  const [showPasswordCriteria, setShowPasswordCriteria] = useState(false);
  const [loading, setLoading] = useState(false);
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
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setVendorData({ ...vendorData, [name]: value });
  };
  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    const auth = getAuth();
    console.log("Calling cloud function createVendorAccount");
    const createVendorAccount = httpsCallable(functions, "createVendorAccount");
  
    try {
      // Call your cloud function to create a vendor account
      const res = await createVendorAccount(vendorData);
      console.log("Cloud function response:", res.data);
  
      if (res.data.success) {
        // Show success message for account creation
        toast.success("Account created successfully.");
  
        // Get the email verification link from the response
        const verifyLink = res.data.verifyLink;
  
        // Optionally send the verification link using the Firebase Auth client
        const userCredential = await signInWithEmailAndPassword(
          auth,
          vendorData.email,
          vendorData.password
        );
  
        const user = userCredential.user;
  
        // Use the Firebase Auth client to send verification if needed
        await sendEmailVerification(user, {
          url: "https://shopmythrift.store/confirm-email", // Your custom URL
          handleCodeInApp: true,
        });
  
        // Inform the user to check their email
        toast.success(
          "A verification email has been sent. Please verify your email to log in."
        );
  
        // Redirect to the vendor login page
        navigate("/vendorlogin");
      }
    } catch (error) {
      console.error("Error during signup:", error);
  
      // Handle errors and show appropriate error messages
      if (error.message.includes("already-exists")) {
        toast.error(error.message);
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };
  return (
    <Helmet>
      <section>
        <Container>
          <Row>
            <div className="px-2">
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
                    </div>
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
                    </div>
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
                    </div>
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
                      className="w-full h-12 bg-gray-100 pl-14 text-black font-opensans rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-customOrange"
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
                      className="w-full h-12 bg-gray-100 pl-14 text-black font-opensans rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-customOrange"
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
    </Helmet>
  );
};

export default VendorSignup;
