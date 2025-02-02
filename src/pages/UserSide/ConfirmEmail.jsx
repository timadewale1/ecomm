import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { applyActionCode } from "firebase/auth";
import { auth } from "../../firebase.config";
import toast from "react-hot-toast";
import SEO from "../../components/Helmet/SEO";

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
    <>
    <SEO 
        title={`Email Verification - My Thrift`}
        url={`https://www.shopmythrift.store/confirm-email`} 
      />
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
          <p className="text-green-600  font-opensans font-normal">
            Email verification completed!You can close this tab now.
          </p>
        )}
      </div>
    </div>
    </>
  );
};

export default EmailVerification