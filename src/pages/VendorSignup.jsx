import React, { useEffect, useState } from "react";
import Helmet from "../components/Helmet/Helmet";
import { Container, Row, Form, FormGroup } from "reactstrap";
import { Link, useNavigate } from "react-router-dom";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "../firebase.config";

import toast from "react-hot-toast";

import { FaAngleLeft } from "react-icons/fa";
import { motion } from "framer-motion";
import VendorLoginAnimation from "../SignUpAnimation/SignUpAnimation";
import OTPverification from "./OTPverification";
import Loading from "../components/Loading/Loading";

const VendorSignup = () => {
  const [vendorData, setVendorData] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
  });
  const [confirmationResult, setConfirmationResult] = useState(null); // Store confirmation result
  const [loading, setLoading] = useState(false);
  const [bloading, setBLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    setupRecaptcha();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setVendorData({ ...vendorData, [name]: value });
  };

  const validateName = (name) => /^[A-Za-z]+$/.test(name);
  const validateNumber = (phoneNumber) => /^[0-9]{10,15}$/.test(phoneNumber); // Update regex as per the region

  const setupRecaptcha = async () => {
    if (!window.recaptchaVerifier) {
      console.log("Initializing recaptcha verifier...");

      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        {
          size: "normal",
          callback: (response) => {
            console.log("reCAPTCHA solved!");
          },
          "expired-callback": () => {
            toast.error("reCAPTCHA expired. Please try again.");
            window.recaptchaVerifier.clear(); // Clear recaptcha and re-render if expired
            setupRecaptcha(); //
          },
        }
      );
    } else {
      console.log("Recaptcha verifier already initialized");
    }

    try {
      // Explicitly disable app verification for testing
      // auth.settings.appVerificationDisabledForTesting = true;
      await window.recaptchaVerifier.render();
      console.log("Recaptcha rendered successfully");
    } catch (error) {
      console.error("Recaptcha rendering error:", error);
      throw new Error("Recaptcha could not be rendered");
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setBLoading(true);

    if (
      !validateName(vendorData.firstName) ||
      !validateName(vendorData.lastName)
    ) {
      toast.error("Names must only contain letters.");
      setLoading(false);
      return;
    }

    if (!validateNumber(vendorData.phoneNumber)) {
      toast.error("Phone number must be valid.");
      setLoading(false);
      return;
    }

    try {
      const Number = "+234" + vendorData.phoneNumber; // Assuming it's Nigeria; change the country code as necessary
      const phoneNumber = Number;

      // Check if the recaptchaVerifier is properly initialized
      if (!window.recaptchaVerifier) {
        await setupRecaptcha();
        toast.error("reCAPTCHA verifier not initialized.");
        setBLoading(false);
        return;
      }

      const appVerifier = window.recaptchaVerifier;

      // Confirm reCAPTCHA rendering before proceeding
      if (typeof appVerifier.verify !== "function") {
        toast.error("reCAPTCHA verification not properly initialized.");
        setBLoading(false);
        return;
      }

      const confirmationResult = await signInWithPhoneNumber(
        auth,
        phoneNumber, // Assuming it's Nigeria; change the country code as necessary
        appVerifier
      );

      // Store the confirmationResult to verify OTP later
      toast.success("OTP sent to your phone number.");

      if (vendorData && confirmationResult) {
        setConfirmationResult(confirmationResult);
        setSent(true);
      } else {
        toast.error("Error sending OTP. missing data");

        console.error("Missing data: vendorData or confirmationResult is null");
      }
    } catch (error) {
      toast.error("Error sending OTP: " + error.message);
      console.log("Error sending OTP: ", error, "message:", error.message);
    } finally {
      setBLoading(false);
    }
  };

  return (
    <Helmet className="font-opensans">
      {sent ? (
        <OTPverification
          vendorData={vendorData}
          confirmationResult={confirmationResult}
          sent={sent}
          setSent={setSent}
        />
      ) : (
        <section>
          <Container>
            <Row>
              {loading ? (
                <Loading />
              ) : (
                <div className="px-3 font-opensans">
                  <Link to="/confirm-user-state">
                    <FaAngleLeft className="text-3xl -translate-y-2 font-extralight text-gray-500" />
                  </Link>
                  <div className="flex flex-col justify-center items-center">
                    <VendorLoginAnimation />
                  </div>
                  <p className="text-3xl font-bold text-customBrown mt-4 mb-2">
                    Create an account
                  </p>
                  <div className="text-sm">
                    Join us and elevate your business to new heights
                  </div>
                  <div className="translate-y-4">
                    <Form className="mt-4" onSubmit={handleSignup}>
                      <FormGroup className="relative mb-2">
                        <input
                          type="text"
                          name="firstName"
                          placeholder="First Name"
                          value={vendorData.firstName}
                          className="w-full h-14 text-gray-800 font-normal pl-2 rounded-lg border-2 focus:border-customOrange focus:outline-none"
                          onChange={handleInputChange}
                          required
                        />
                      </FormGroup>
                      <FormGroup className="relative mb-2">
                        <input
                          type="text"
                          name="lastName"
                          placeholder="Last Name"
                          value={vendorData.lastName}
                          className="w-full h-14 text-gray-800 font-normal pl-2 rounded-lg border-2 focus:border-customOrange focus:outline-none"
                          onChange={handleInputChange}
                          required
                        />
                      </FormGroup>
                      <div className="w-full flex">
                        <div className="w-3/12 h-14 text-gray-800 font-normal p-2 mr-3 rounded-lg border-2 mb-2 flex justify-around md:w-2/12 items-center">
                          <img
                            src="flag.png"
                            alt="flag"
                            className="min-w-5 w-5 max-w-9"
                          />
                          <p>+234</p>
                        </div>
                        <input
                          className="w-9/12 md:w-10/12 h-14 text-gray-800 font-normal pl-2 rounded-lg border-2 mb-2 focus:border-customOrange focus:outline-none"
                          type="number"
                          name="phoneNumber"
                          placeholder="70 0000 0000"
                          value={vendorData.phoneNumber}
                          maxLength={10}
                          onChange={handleInputChange}
                          required
                        />
                      </div>

                      <motion.button
                        whileTap={
                          vendorData.phoneNumber &&
                          vendorData.firstName &&
                          vendorData.lastName &&
                          validateName(vendorData.firstName) &&
                          validateName(vendorData.lastName) && { scale: 1.2 }
                        }
                        type="submit"
                        className={`w-full h-14 bg-customOrange text-white font-semibold rounded-full mt-4 ${
                          vendorData.phoneNumber &&
                          vendorData.firstName &&
                          vendorData.lastName &&
                          validateName(vendorData.firstName) &&
                          validateName(vendorData.lastName)
                            ? ""
                            : "bg-customOrange opacity-30"
                        }`}
                        disabled={
                          !(
                            vendorData.phoneNumber &&
                            vendorData.firstName &&
                            vendorData.lastName &&
                            validateName(vendorData.firstName) &&
                            validateName(vendorData.lastName)
                          )
                        }
                      >
                        {bloading ? "Sending OTP..." : "Continue"}
                      </motion.button>
                      <div className="text-center font-light mt-2 flex justify-center">
                        <p className="text-gray-700">
                          Already have an account?{" "}
                          <span className="font-semibold text-black">
                            <Link
                              to="/vendorlogin"
                              className="text-customOrange"
                            >
                              Login
                            </Link>
                          </span>
                        </p>
                      </div>
                    </Form>
                  </div>
                </div>
              )}
            </Row>
          </Container>
        </section>
      )}
      <div id="recaptcha-container"></div>
    </Helmet>
  );
};

export default VendorSignup;
