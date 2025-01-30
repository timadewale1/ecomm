import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaCheck } from "react-icons/fa";
import logo from "../Images/logo.png";
import { GiClothes } from "react-icons/gi";
import { BsShop } from "react-icons/bs";
import { useAuth } from "../custom-hooks/useAuth";
import { RotatingLines } from "react-loader-spinner";

const ConfirmUserState = () => {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState(null);
  const { currentUser, currentUserData, loading } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleContinue = async () => {
    if (selectedRole === "vendor") {
      if (loading) {
        setIsProcessing(true);
        // Fallback timeout in case loading takes too long
        setTimeout(() => {
          if (currentUser && currentUserData?.role === "vendor") {
            navigate("/vendordashboard");
          } else {
            navigate("/vendorlogin");
          }
          setIsProcessing(false);
        }, 3000); // 3-second fallback
        return;
      }
      if (currentUserData?.role === "vendor") {
        navigate("/vendordashboard");
      } else {
        navigate("/vendorlogin");
      }
    } else if (selectedRole === "customer") {
      navigate("/newhome");
    }
  };
  

  return (
    <>
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
            <div className="w-12 h-12 rounded-full bg-lighOrange flex-shrink-0 flex items-center justify-center">
              <GiClothes className="text-lg text-customBrown" />
            </div>
            <div className="flex items-center">
              <div className="mt-2">
                <h2 className="text-lg font-semibold text-black">Customer</h2>
                <p className="text-gray-600">
                  Find thrifted treasures from curated vendors!
                </p>
              </div>
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
            <div className="w-12 h-12 rounded-full bg-lighOrange flex-shrink-0 flex items-center justify-center">
              <BsShop className="text-lg text-customBrown" />
            </div>
            <div className="flex items-center">
              <div className="mt-2">
                <h2 className="text-lg font-semibold text-black">Vendor</h2>
                <p className="text-gray-600 font-opensans text-base">
                  List your products on{" "}
                  <span className="text-customOrange">My Thrift</span> with
                  seamless transactions
                </p>
              </div>
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
            className={`w-full h-14 text-white font-semibold justify-center items-center flex rounded-full ${
              selectedRole
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
