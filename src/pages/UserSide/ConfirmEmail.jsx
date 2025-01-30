import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom"; // Import useNavigate
import { applyActionCode } from "firebase/auth";
import { auth } from "../../firebase.config";
import toast from "react-hot-toast";

const EmailVerification = () => {
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate(); // Initialize useNavigate
  const oobCode = searchParams.get("oobCode");

  const handleEmailVerification = async () => {
    setLoading(true);
    try {
      await applyActionCode(auth, oobCode);
      toast.success("Email verified successfully! Redirecting...");

      // ✅ Redirect user after 3 seconds
      setTimeout(() => {
        navigate("/confirm-state");
      }, 3000);
    } catch (error) {
      console.error("Email verification error:", error);
      toast.error(
        "Invalid or expired verification link. Please request a new one."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (oobCode) {
      handleEmailVerification();
    } else {
      toast.error("Invalid email verification link.");
    }
  }, [oobCode]);

  return (
    <div className="flex items-center justify-center bg-white px-3 py-4 min-h-screen">
      <div className="w-full max-w-md text-center">
        <h2 className="text-3xl font-semibold font-ubuntu text-black mb-4">
          Verifying your email...
        </h2>
        {loading ? (
          <p className="text-gray-600 font-opensans text-xs font-light">
            Please wait while we verify your email.
          </p>
        ) : (
          <p className="text-green-600 font-opensans font-normal">
            Email verification completed! Redirecting to login...
          </p>
        )}
      </div>
    </div>
  );
};

export default EmailVerification;
