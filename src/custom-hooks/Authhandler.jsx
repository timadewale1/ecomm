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
    const mode = searchParams.get("mode"); // Determines the action type
    const oobCode = searchParams.get("oobCode"); // Action code (if applicable)
    const apiKey = searchParams.get("apiKey"); // Firebase API key
    const providerId = searchParams.get("providerId"); // OAuth provider (e.g., Google)

    // Check if this is an OAuth sign-in flow
    if (providerId) {
      return;
    }
    if (!mode || !oobCode) {
      toast.error("Invalid or missing parameters in the URL.");
      navigate("/");
      return;
    }

    // Redirect based on the action type
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
  }, [mode, oobCode, navigate]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-lg font-semibold text-gray-700">
        Processing your request, please wait...
      </p>
    </div>
  );
};

export default AuthActionHandler;
