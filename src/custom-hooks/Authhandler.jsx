import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";

const AuthActionHandler = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const mode = searchParams.get("mode"); // Determines the action type: "resetPassword" or "verifyEmail"
  const oobCode = searchParams.get("oobCode"); // The action code provided by Firebase
  const continueUrl = searchParams.get("continueUrl"); // Optional, for post-completion navigation

  useEffect(() => {
    const providerId = searchParams.get("providerId");
    const redirectUrl = searchParams.get("redirectUrl");

    if (providerId === "google.com" && redirectUrl) {
      // Redirect to the app after sign-in
      window.location.href = redirectUrl;
      return;
    }

    // Handle other Firebase actions (e.g., email verification, password reset)
    const mode = searchParams.get("mode");
    const oobCode = searchParams.get("oobCode");

    if (mode && oobCode) {
      switch (mode) {
        case "resetPassword":
          navigate(`/reset-password?oobCode=${oobCode}`);
          break;
        case "verifyEmail":
          navigate(`/confirm-email?oobCode=${oobCode}`);
          break;
        default:
          toast.error("Unsupported action type.");
          navigate("/");
      }
    } else {
      toast.error("Invalid or missing parameters in the URL.");
      navigate("/login");
    }
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-lg font-semibold text-gray-700">
        Processing your request, please wait...
      </p>
    </div>
  );
};

export default AuthActionHandler;
