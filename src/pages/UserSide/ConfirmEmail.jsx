import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { applyActionCode } from "firebase/auth";
import { auth } from "../../firebase.config";
import toast from "react-hot-toast";

const EmailVerification = () => {
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const oobCode = searchParams.get("oobCode");

  const handleEmailVerification = async () => {
    setLoading(true);
    try {
      await applyActionCode(auth, oobCode);
      toast.success("Email verified successfully! You can now log in.");
    } catch (error) {
      console.error("Email verification error:", error);
      toast.error(
        "Invalid or expired verification link. Please request a new one."
      );
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (oobCode) {
      handleEmailVerification();
    } else {
      toast.error("Invalid email verification link.");
    }
  }, [oobCode]);

  return (
    <div className="flex items-center justify-center bg-white px-3 py-4 min-h-screen">
      <div className="w-full max-w-md text-center">
        <h2 className="text-2xl font-semibold font-poppins text-black mb-4">
          Verifying your email...
        </h2>
        {loading ? (
          <p className="text-gray-600 font-light">
            Please wait while we verify your email.
          </p>
        ) : (
          <p className="text-green-600 font-light">
            Email verification completed! Redirecting to login...
          </p>
        )}
      </div>
    </div>
  );
};

export default EmailVerification;
