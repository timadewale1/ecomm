import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaCheck } from "react-icons/fa";
import logo from "../Images/logo.png";
import { GiClothes } from "react-icons/gi";
import { BsShop } from "react-icons/bs";
import { useAuth } from "../custom-hooks/useAuth";
import { RotatingLines } from "react-loader-spinner";
import SEO from "../components/Helmet/SEO";

const ConfirmUserState = () => {
  const navigate = useNavigate();
  const { currentUser, currentUserData, loading } = useAuth();
  const [selectedRole, setSelectedRole] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const savedRole = localStorage.getItem("mythrift_role"); // "customer" | "vendor"
    if (!savedRole) return; // first launch → stay on selector

    if (savedRole === "vendor") {
      // you still need the auth check, but this mimics your existing logic
      if (currentUser && currentUserData?.role === "vendor") {
        navigate("/vendordashboard", { replace: true });
      } else {
        navigate("/vendorlogin", { replace: true });
      }
    } else {
      navigate("/newhome", { replace: true });
    }
  }, [currentUser, currentUserData, navigate]);
  useEffect(() => {
    if (isProcessing && !loading) {
      if (currentUser && currentUserData?.role === "vendor") {
        navigate("/vendordashboard", { replace: true });
      } else if (selectedRole === "vendor") {
        navigate("/vendorlogin", { replace: true });
      } else {
        navigate("/newhome", { replace: true });
      }
      setIsProcessing(false);
    }
  }, [
    isProcessing,
    loading,
    currentUser,
    currentUserData,
    navigate,
    selectedRole,
  ]);

  const handleContinue = () => {
    if (!selectedRole) return;
    localStorage.setItem("mythrift_role", selectedRole);
    if (selectedRole === "vendor") {
      setIsProcessing(true);
    } else {
      navigate("/newhome");
    }
  };

  return (
    <>
      <SEO
        title={`Let’s Get You Started`}
        url={`https://www.shopmythrift.store/confirm-state`}
      />
      <div className="flex px-3 py-2 mt-3 justify-between mb-3">
        <img src={logo} alt="Logo" />
      </div>

      <div className="p-3 bg-white w-full h-screen font-opensans pb-20">
        <div className="flex justify-center text-center mb-10">
          <h1 className="font-opensans text-2xl text-black font-semibold">
            Use <span className="text-customOrange">My Thrift</span> as a?
          </h1>
        </div>

        <div className="space-y-5">
          <div
            className={`relative p-4 border-2 rounded-3xl ${
              selectedRole === "customer"
                ? "border-customBrown"
                : "border-gray-200"
            } cursor-pointer`}
            onClick={() => setSelectedRole("customer")}
          >
            <div className="w-12 h-12 rounded-full bg-lighOrange flex items-center justify-center">
              <GiClothes className="text-lg text-customBrown" />
            </div>
            <div className="mt-2">
              <h2 className="text-lg font-semibold text-black">Customer</h2>
              <p className="text-gray-600">
                Find thrifted treasures from curated vendors!🧡
              </p>
            </div>
            {selectedRole === "customer" && (
              <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-customOrange flex items-center justify-center">
                <FaCheck className="text-white text-sm" />
              </div>
            )}
          </div>

          <div
            className={`relative p-4 border-2 rounded-3xl ${
              selectedRole === "vendor"
                ? "border-customBrown"
                : "border-gray-200"
            } cursor-pointer`}
            onClick={() => setSelectedRole("vendor")}
          >
            <div className="w-12 h-12 rounded-full bg-lighOrange flex items-center justify-center">
              <BsShop className="text-lg text-customBrown" />
            </div>
            <div className="mt-2">
              <h2 className="text-lg font-semibold text-black">Vendor</h2>
              <p className="text-gray-600 font-opensans text-base">
                Showcase your thrift finds on{" "}
                <span className="text-customOrange">My Thrift</span> and sell
                with ease.
              </p>
            </div>
            {selectedRole === "vendor" && (
              <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-customOrange flex items-center justify-center">
                <FaCheck className="text-white text-sm" />
              </div>
            )}
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 flex justify-center p-3">
          <button
            onClick={handleContinue}
            className={`w-full h-14 flex items-center justify-center rounded-full font-semibold text-white ${
              isProcessing
                ? "bg-customOrange"
                : selectedRole
                ? "bg-customOrange"
                : "bg-gray-300 cursor-not-allowed"
            }`}
            disabled={!selectedRole || isProcessing}
          >
            {isProcessing && selectedRole === "vendor" ? (
              <RotatingLines
                strokeColor="#ffffff"
                strokeWidth="5"
                animationDuration="0.75"
                width="24"
                visible={true}
              />
            ) : (
              "Continue"
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default ConfirmUserState;
