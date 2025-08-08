// components/AccountLinkBanner.jsx
import React from "react";
import { IoWarningOutline } from "react-icons/io5";
import { LiaTimesSolid } from "react-icons/lia";

export default function AccountLinkBanner({ onLink, onClose }) {
  return (
    <div className="w-full bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <IoWarningOutline className="text-amber-600 text-7xl" />
        <div className="text-xs font-satoshi">
          <span className="font-semibold">You’re signed in as a guest.</span>{" "}
          Link your email to secure your account and keep your orders safe.
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onLink}
          className="px-2 py-1.5 font-opensans text-[6px] rounded-full text-white bg-amber-600 hover:bg-amber-700 text-sm font-medium"
        >
          Update
        </button>
      
      </div>
    </div>
  );
}
