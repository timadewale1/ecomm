import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { functions } from "../firebase.config";
import { httpsCallable } from "firebase/functions";
import { RotatingLines } from "react-loader-spinner";

const Amazingdeals = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email) => {
    // Regular expression to validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubscribe = async () => {
    if (!validateEmail(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);

    try {
      await httpsCallable(functions, "subscribeToDealsV1")({email});

      setEmail(""); // Clear input field
      toast.success("Thank you for subscribing!");
    } catch (error) {
      toast.error("Failed to subscribe. Please try again later.");
      console.error("Subscription Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-customBrown rounded-xl mt-4 px-4 py-2.5 w-full max-w-sm">
      <h2 className="font-opensans font-semibold text-white text-sm mb-2">
        Don’t Miss Amazing Deals!
      </h2>
      <p className="font-opensans font-light text-gray-100 text-xs mb-4">
        Thank you for your support! Subscribers get special discounts. Be first
        to grab must-have items at great prices.
      </p>

      <div className="flex items-center bg-white rounded-full overflow-hidden">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-grow px-4 text-sm font-opensans py-2 text-gray-700 focus:outline-none"
        />
        <button
          type="button"
          onClick={handleSubscribe}
          disabled={isLoading}
          className={`${
            isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-customOrange"
          } font-opensans text-white font-semibold px-6 py-2 text-sm transition-colors duration-300 hover:bg-orange-600`}
          style={{
            borderRadius: "0 9999px 9999px 0", // Straight left and rounded right
          }}
        >
          {isLoading ? (
            <RotatingLines
              strokeColor="white"
              strokeWidth="5"
              animationDuration="0.75"
              width="20"
              visible={true}
            />
          ) : (
            "Subscribe"
          )}
        </button>
      </div>

      <p className="font-opensans text-center font-light text-gray-100 ratings-text mt-3">
        We send valuable contents. No spams.
      </p>
    </div>
  );
};

export default Amazingdeals;
