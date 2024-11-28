import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  getAuth,
  signInWithPhoneNumber,
  signInWithCredential,
  createUserWithEmailAndPassword,
  linkWithCredential,
  PhoneAuthProvider,
  sendEmailVerification,
  RecaptchaVerifier,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebase.config";
import toast from "react-hot-toast";
import OtpInput from "react-otp-input";
import { RotatingLines } from "react-loader-spinner";
import { useAuth } from "../../custom-hooks/useAuth"; // Assuming the updated useAuth hook
import { EmailAuthProvider } from "firebase/auth";

const VendorVerifyOTP = () => {
  const [otp, setOtp] = useState("");
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const [isResendingOTP, setIsResendingOTP] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);
  const navigate = useNavigate();
  const location = useLocation();
  // Retrieve data from location.state
  const { vendorData, mode } = location.state || {};

  const auth = getAuth();

  // const { startOTPVerification, endOTPVerification } = useAuth();

  // Countdown timer for resend OTP
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Set up reCAPTCHA verifier
  const initializeRecaptchaVerifier = () => {
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      delete window.recaptchaVerifier;
    }

    window.recaptchaVerifier = new RecaptchaVerifier(
      auth,
      "recaptcha-container-verify",
      {
        size: "invisible",
        callback: () => {
          // reCAPTCHA solved
        },
        "expired-callback": () => {
          toast.error("reCAPTCHA expired. Please try again.");
        },
      }
    );
  };

  // Ensure reCAPTCHA is initialized
  useEffect(() => {
    initializeRecaptchaVerifier();

    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        delete window.recaptchaVerifier;
      }
    };
  }, []);

  // Validate vendor data on page load
  useEffect(() => {
    if (!vendorData) {
      toast.error(
        "No vendor data found. Please start the sign-up process again."
      );
      navigate("/vendor-signup");
    }
  }, [vendorData, navigate]);

  const handleOTPChange = (otpValue) => setOtp(otpValue);

  const handleOTPVerify = async () => {
    console.log("Starting OTP verification...");
    console.log("Entered OTP:", otp);

    if (!otp || otp.length < 6) {
      console.warn("Invalid OTP length");
      toast.error("Please enter the OTP before proceeding.");
      return;
    }

    // startOTPVerification();
    setIsVerifyingOTP(true);

    try {
      const confirmationResult = window.confirmationResult;
      console.log("Confirmation result:", confirmationResult);

      if (!confirmationResult) {
        console.error("No confirmation result available. OTP session expired.");
        toast.error("Your OTP session has expired. Please resend the OTP.");
        setIsVerifyingOTP(false);
        // endOTPVerification();
        return;
      }

      const phoneCredential = PhoneAuthProvider.credential(
        confirmationResult.verificationId,
        otp
      );
      console.log("Phone credential created:", phoneCredential);

      // **Sign in the user with the phone credential**
      const userCredential = await signInWithCredential(auth, phoneCredential);
      const user = userCredential.user;
      console.log("User signed in with phone credential:", user);

      if (mode === "signup") {
        // **Sign-Up Flow**
        console.log("Handling sign-up mode...");

        // **Link the email/password credential to the user**
        const emailCredential = EmailAuthProvider.credential(
          vendorData.email,
          vendorData.password
        );
        await linkWithCredential(user, emailCredential);
        console.log("Email/password credential linked to user account.");

        const actionCodeSettings = {
          url: "https://mythriftprod.vercel.app/confirm-email", // Replace with your email verification link
          handleCodeInApp: true,
        };
        await sendEmailVerification(user, actionCodeSettings);
        toast.success(
          "Account created successfully. A verification email has been sent to your email. Please verify your email and log in."
        );

        // Save vendor data to your database
        await saveVendorToDatabase(user.uid);
        console.log("Vendor data saved to database.");

        toast.success(
          "Account created successfully. Please verify your email and log in."
        );
        navigate("/vendorlogin");
      } else if (mode === "login") {
        // **Login Flow**
        console.log("Handling login mode...");

        // Retrieve vendor data
        const vendorDoc = await getDoc(doc(db, "vendors", user.uid));
        if (vendorDoc.exists()) {
          const vendorData = vendorDoc.data();

          if (vendorData.isDeactivated) {
            toast.error(
              "Your vendor account is deactivated. Please contact support."
            );
            await auth.signOut();
            return;
          }
          if (!vendorData.profileComplete) {
            navigate("/complete-profile");
          } else {
            toast.success("Login successful!");
            navigate("/vendordashboard");
          }
        } else {
          toast.error("Vendor data not found");
          await auth.signOut();
        }
      }
    } catch (error) {
      console.error("OTP verification error:", error);

      if (error.code === "auth/invalid-verification-code") {
        console.warn("Invalid OTP code entered.");
        toast.error("You have entered a wrong OTP code. Please try again.");
      } else {
        console.error("Unhandled error during OTP process:", error);
        handleSignupError(error);
      }
    } finally {
      setIsVerifyingOTP(false);
      // endOTPVerification();
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0 || isResendingOTP) return;

    setIsResendingOTP(true);
    try {
      initializeRecaptchaVerifier();

      const appVerifier = window.recaptchaVerifier;
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        vendorData.phoneNumber,
        appVerifier
      );
      window.confirmationResult = confirmationResult;
      toast.success("OTP resent successfully!");
      setResendCooldown(30);
    } catch (error) {
      console.error("Resend OTP error:", error);
      toast.error(`Failed to resend OTP: ${error.message}`);
    } finally {
      setIsResendingOTP(false);
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
    } catch (error) {
      console.error("Error saving vendor data:", error);
      toast.error("Failed to save vendor information.");
    }
  };

  const handleSignupError = (error) => {
    switch (error.code) {
      case "auth/email-already-in-use":
        toast.error("This email is already registered. Please log in.");
        break;
      case "auth/invalid-verification-code":
        toast.error("You have entered a wrong OTP code. Please try again.");
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
    <div className="h-screen bg-white p-3 flex flex-col justify-between">
      <div className="text-left mt-20">
        <h1 className="text-3xl font-bold font-opensans text-customRichBrown mb-2">
          Enter OTP Code
        </h1>
        <p className="text-gray-600 font-opensans text-sm ">
          A code that was sent to{" "}
          <span className="text-black font-opensans">
            {vendorData?.phoneNumber}
          </span>
        </p>
      </div>

      <div className="mb-28 flex justify-center items-center flex-col">
        <OtpInput
          value={otp}
          onChange={handleOTPChange}
          numInputs={6}
          renderInput={(inputProps, index) => (
            <input
              {...inputProps}
              key={index}
              style={{
                width: "3rem",
                height: "3rem",
                margin: "0.5rem",
                fontSize: "1.5rem",
                borderRadius: "8px",
                border: "none",
                boxShadow: "0 0 0 1px #ccc",
                outline: "none",
                textAlign: "center", // Horizontally centers the text
                lineHeight: "3rem", // Matches the height for vertical alignment
                verticalAlign: "middle", // Ensures text is vertically aligned
                padding: "0", // Removes any padding that might cause misalignment
              }}
              onFocus={(e) => (e.target.style.boxShadow = "0 0 0 2px #E26A2C")}
              onBlur={(e) => (e.target.style.boxShadow = "0 0 0 1px #ccc")}
            />
          )}
        />

        <p
          onClick={handleResendOTP}
          className={`mt-4 text-sm font-opensans  font-semibold ${
            resendCooldown > 0 || isResendingOTP
              ? "text-gray-400 cursor-not-allowed"
              : "text-customOrange cursor-pointer"
          }`}
        >
          {isResendingOTP
            ? "Resending..."
            : resendCooldown > 0
            ? `Resend in ${resendCooldown}s`
            : "Resend"}
        </p>
      </div>
      <div id="recaptcha-container-verify" style={{ display: "none" }} />

      <div className="mb-6">
        <button
          onClick={handleOTPVerify}
          disabled={isVerifyingOTP}
          className="w-full h-12 rounded-full bg-customOrange font-opensans text-white font-medium text-sm hover:bg-orange-600 flex items-center justify-center"
        >
          {isVerifyingOTP ? (
            <RotatingLines
              width="25"
              height="25"
              strokeColor="white"
              strokeWidth="4"
            />
          ) : (
            "Verify OTP"
          )}
        </button>
      </div>
    </div>
  );
};

export default VendorVerifyOTP;
