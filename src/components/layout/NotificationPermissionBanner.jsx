// src/components/NotificationPermissionBanner.jsx
import React from "react";
import { Oval } from "react-loader-spinner";

export default function NotificationPermissionBanner({ onEnable, loading }) {
  return (
    <div className="fixed top-0 left-0 w-full bg-customRichBrown text-white flex items-center justify-between px-4 py-4 z-50 shadow-md">
      <div className="text-xs font-satoshi">
        Push notifications are active! Enable them so you never miss any update!🧡
      </div>
      <button
        onClick={onEnable}
        disabled={loading}
        className="flex items-center text-xs ml-4 bg-white text-customRichBrown font-satoshi font-semibold px-3 py-1 rounded-full hover:bg-gray-100 transition disabled:opacity-50"
      >
        {loading ? (
          <Oval
            height={20}
            width={20}
            strokeWidth={5}
            color="#f9531e"
            secondaryColor="#fff"
          />
        ) : (
          "Enable"
        )}
      </button>
    </div>
  );
}
