import React, { useMemo } from "react";
import { CiCircleInfo } from "react-icons/ci";
import { MdOutlineClose } from "react-icons/md";
import AppBottomSheet from "../layout/AppBottomSheet";

const conditionDetails = (condition) => {
  const normalized = String(condition || "").trim().toLowerCase();

  if (normalized.includes("defect")) {
    return {
      title: "Defect condition",
      body: "This item has one or more known issues disclosed by the seller. Review the photos and the seller’s defect details carefully before buying. Offers are available on defect items.",
    };
  }

  if (normalized.includes("thrift")) {
    return {
      title: "Thrifted condition",
      body: "This item has been previously owned and is being listed for another life. Check the photos and description for its current condition and any signs of wear. Offers are available on thrifted items.",
    };
  }

  if (normalized.includes("brand new")) {
    return {
      title: "Brand new condition",
      body: "This item is listed as new and never used or worn. Packaging and tags may vary, so check the listing photos and description to confirm exactly what is included.",
    };
  }

  return {
    title: "Item condition",
    body: "The condition shown here is the condition selected by the seller. Review the listing photos and description before completing your purchase.",
  };
};

export default function ProductConditionInfoSheet({
  open,
  onClose,
  condition,
  defectDescription,
}) {
  const details = useMemo(() => conditionDetails(condition), [condition]);
  const isDefect = String(condition || "").toLowerCase().includes("defect");
  const disclosure = String(defectDescription || "").trim();

  return (
    <AppBottomSheet
      open={open}
      onClose={onClose}
      height="auto"
      ariaLabel={details.title}
      zIndex={10000}
      surfaceClassName="font-satoshi"
      compactTop
    >
      <div className="overflow-y-auto px-5 pb-5 pt-5">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-orange-50 text-customOrange">
              <CiCircleInfo className="text-xl" aria-hidden="true" />
            </span>
            <h2 className="m-0 text-base font-semibold text-gray-900">
              {details.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gray-100 text-gray-700"
            aria-label="Close condition information"
          >
            <MdOutlineClose className="text-xl" />
          </button>
        </header>

        <p className="mt-4 text-sm leading-6 text-gray-700">{details.body}</p>

        {isDefect && disclosure && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="m-0 text-xs font-semibold text-amber-900">
              Seller’s disclosure
            </p>
            <p className="mb-0 mt-1 text-sm leading-5 text-amber-900">
              {disclosure}
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-5 h-12 w-full rounded-xl bg-customOrange text-base font-medium text-white"
        >
          Got it
        </button>
      </div>
    </AppBottomSheet>
  );
}
