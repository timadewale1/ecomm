import React from "react";
import { CiLogin } from "react-icons/ci";
import { LiaTimesSolid } from "react-icons/lia";
import AppBottomSheet from "../layout/AppBottomSheet";

/**
 * Native-style replacement for the legacy centered login-required prompts.
 * The caller retains ownership of navigation and the action-specific copy.
 */
export default function LoginRequiredSheet({
  open,
  onClose,
  onLogin,
  onSignUp,
  title = "Let’s set up your account",
  description,
}) {
  return (
    <AppBottomSheet
      open={open}
      onClose={onClose}
      height="auto"
      ariaLabel={title}
      zIndex={9000}
      backdropClassName="bg-black/40 backdrop-blur-sm"
      surfaceClassName="px-4 pb-5 pt-5"
      compactTop
    >
      <header className="flex items-center justify-between gap-3 pt-2">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100">
            <CiLogin className="text-lg text-customRichBrown" aria-hidden="true" />
          </span>
          <h2 className="truncate text-lg font-opensans font-semibold">
            {title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100"
          aria-label="Close sign in"
        >
          <LiaTimesSolid className="text-xl text-black" aria-hidden="true" />
        </button>
      </header>

      <p className="mb-6 mt-4 text-xs font-opensans leading-5 text-gray-800">
        {description}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onSignUp}
          className="h-11 rounded-full border border-customRichBrown bg-transparent text-xs font-opensans font-medium text-customRichBrown"
        >
          Sign Up
        </button>
        <button
          type="button"
          onClick={onLogin}
          className="h-11 rounded-full bg-customOrange text-xs font-opensans font-medium text-white"
        >
          Login
        </button>
      </div>
    </AppBottomSheet>
  );
}
