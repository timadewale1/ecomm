import React from "react";

const LoginPrompt = ({ onLogin }) => {
  return (
    <div className="mx-auto flex  flex-col items-center bg-white p py-4 text-center font-sans">
      {/* Stacked Icon Container */}
      <div className="relative  flex h-20 w-full items-center justify-center">
        
        {/* Left Card (Ring) - Lowest Z-Index */}
        <div 
          className="absolute translate-y-[2px] translate-x-[-29px] -rotate-[16deg] origin-bottom z-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-customPinkyBrown shadow-sm"
        >
          <span className="text-2xl">💍</span>
        </div>
        
        {/* Middle Card (Shirt) - Higher than Left */}
        <div 
          className="absolute z-20 flex h-12 w-12 items-center justify-center rounded-xl bg-customPinkyBrown translate-y-1 border-2 border-white"
        >
          <span className="text-2xl">👕</span>
        </div>
        
        {/* Right Card (Sneaker) - Highest Z-Index (Top) */}
        <div 
          className="absolute translate-x-[35px] rotate-[12deg] origin-bottom z-30 flex h-12 w-12 items-center justify-center rounded-2xl bg-customPinkyBrown  border-2 border-white"
        >
          <span className="text-2xl">👟</span>
        </div>
      </div>

      {/* Text Content */}
      <h2 className="mb-1 text-lg font-medium font-opensans  tracking-tight text-[#111827]">
        Discover great finds
      </h2>
      <p className="mb-4 text-xs font-opensans text-gray-600 font-light">
        Sign up to buy items or create a vendor account to sell.
      </p>

      {/* CTA Button */}
      <button
        type="button"
        onClick={onLogin}
        className="w-full rounded-xl bg-customOrange py-2.5 text-sm text-white transition-all hover:brightness-110 active:scale-[0.98]"
      >
        Log In or Sign Up
      </button>
    </div>
  );
};

export default LoginPrompt;