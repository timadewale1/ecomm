import React from "react";

export default function AddProductDraftNotice({
  visible,
  requiresImages,
  onDiscard,
}) {
  if (!visible) return null;

  return (
    <aside className="rounded-xl border border-orange-100 bg-orange-50 px-3.5 py-3 font-satoshi">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-950">
            Your draft was restored
          </p>
          <p className="mt-0.5 text-xs leading-5 text-gray-600">
            Your listing details are saved on this device.
            {requiresImages
              ? " For your privacy, photos are not stored in drafts—please select them again."
              : " Continue where you stopped."}
          </p>
        </div>
        <button
          type="button"
          onClick={onDiscard}
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-customOrange active:bg-orange-100"
        >
          Discard
        </button>
      </div>
    </aside>
  );
}
