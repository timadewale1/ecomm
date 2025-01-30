import React, { useState } from "react";
import { auth } from "../../firebase.config";
import { useNavigate, useSearchParams } from "react-router-dom";
import { confirmPasswordReset } from "firebase/auth";
import { MdOutlineLock } from "react-icons/md";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";
import toast from "react-hot-toast";
import { RotatingLines } from "react-loader-spinner";
import { AiOutlineInfoCircle } from "react-icons/ai";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const oobCode = searchParams.get("oobCode");

  const handlePasswordReset = async (e) => {
    e.preventDefault();

    const passwordCriteria = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordCriteria.test(password)) {
      toast.error(
        "Password must be at least 8 characters long, include an uppercase letter, a number, and a special character."
      );
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      // Confirm password reset with Firebase
      await confirmPasswordReset(auth, oobCode, password);
      toast.success("Your password has been reset successfully!");

      // Redirect to login page
      navigate("/confirm-state");
    } catch (error) {
      toast.error(
        "Failed to reset password. Please try again or request a new reset email."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center bg-white px-3 py-4 min-h-screen">
      <div className="w-full max-w-md">
        <h2 className="text-2xl font-semibold font-poppins text-black mb-4">
          Reset your Password
        </h2>
        <div className="flex items-center text-red-600 mb-4">
          <AiOutlineInfoCircle className="mr-2 text-xl" />
          <p className="text-xs text-gray-700 font-light font-opensans">
            Password must be at least 8 characters long, include an uppercase
            letter, a number, and a special character.
          </p>
        </div>
        <form onSubmit={handlePasswordReset}>
          <div className="mb-4 relative w-full">
            <label className="block text-black font-opensans text-sm mb-2">
              New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-5 pointer-events-none">
                <MdOutlineLock className="text-xl text-gray-500" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 bg-gray-100 pl-14 text-black font-opensans rounded-md border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-customOrange"
                placeholder="Enter new password"
                required
              />
              <div
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-5 cursor-pointer"
              >
                {showPassword ? (
                  <FaRegEyeSlash className="text-gray-500 text-xl" />
                ) : (
                  <FaRegEye className="text-gray-500 text-xl" />
                )}
              </div>
            </div>
          </div>

          <div className="mb-6 relative w-full">
            <label className="block text-black font-opensans text-sm mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-5 pointer-events-none">
                <MdOutlineLock className="text-xl text-gray-500" />
              </div>
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-12 bg-gray-100 pl-14 text-black font-opensans rounded-md border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-customOrange"
                placeholder="Confirm new password"
                required
              />
              <div
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-5 cursor-pointer"
              >
                {showConfirmPassword ? (
                  <FaRegEyeSlash className="text-gray-500 text-xl" />
                ) : (
                  <FaRegEye className="text-gray-500 text-xl" />
                )}
              </div>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-customOrange text-white font-medium font-opensans rounded-full transition duration-200 flex items-center justify-center"
          >
            {loading ? (
              <RotatingLines
                strokeColor="white"
                strokeWidth="5"
                animationDuration="0.75"
                width="24"
                visible={true}
              />
            ) : (
              "Reset Password"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
