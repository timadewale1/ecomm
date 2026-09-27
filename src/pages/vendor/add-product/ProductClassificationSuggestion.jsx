import React from "react";
import { FiCheck, FiThumbsDown, FiThumbsUp } from "react-icons/fi";
import { LuSparkles } from "react-icons/lu";
import { appHaptics } from "../../../services/haptics";

export default function ProductClassificationSuggestion({
  suggestion,
  feedback,
  onFeedback,
}) {
  if (!suggestion) return null;

  return (
    <section className="mb-4 flex min-h-11 items-center gap-2.5 rounded-xl border border-orange-100 bg-orange-50/70 px-3 py-2.5 font-satoshi">
      <LuSparkles className="h-4 w-4 shrink-0 text-customOrange" />
      {feedback ? (
        <>
          <p className="min-w-0 flex-1 text-xs font-medium text-gray-700">
            Thanks—your feedback helps improve future suggestions.
          </p>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-green-600 shadow-sm">
            <FiCheck className="h-4 w-4" />
          </span>
        </>
      ) : (
        <>
          <p className="min-w-0 flex-1 text-xs font-medium text-gray-700">
            Was this photo recommendation accurate?
          </p>
          <button
            type="button"
            onClick={() => {
              void appHaptics.success();
              onFeedback?.("positive");
            }}
            aria-label="The photo recommendation was accurate"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm active:text-customOrange"
          >
            <FiThumbsUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              void appHaptics.selection();
              onFeedback?.("negative");
            }}
            aria-label="The photo recommendation was not accurate"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm active:text-customOrange"
          >
            <FiThumbsDown className="h-4 w-4" />
          </button>
        </>
      )}
    </section>
  );
}
