import React, { useEffect, useState } from "react";
import { Check, SlidersHorizontal, TriangleAlert, X } from "lucide-react";
import AppBottomSheet from "../layout/AppBottomSheet";
import { appHaptics } from "../../services/haptics";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest to oldest" },
  { value: "oldest", label: "Oldest to newest" },
  { value: "price_desc", label: "Expensive to cheap" },
  { value: "price_asc", label: "Cheap to expensive" },
];

export default function VendorProductSortSheet({
  open,
  onClose,
  sort,
  lowStockOnly,
  onApply,
}) {
  const [draftSort, setDraftSort] = useState(sort || "newest");
  const [draftLowStock, setDraftLowStock] = useState(Boolean(lowStockOnly));

  useEffect(() => {
    if (!open) return;
    setDraftSort(sort || "newest");
    setDraftLowStock(Boolean(lowStockOnly));
  }, [lowStockOnly, open, sort]);

  return (
    <AppBottomSheet
      open={open}
      onClose={onClose}
      height="62dvh"
      compactTop
      ariaLabel="Sort and filter products"
      zIndex={5200}
      surfaceClassName="font-satoshi"
    >
      <div className="flex min-h-0 flex-1 flex-col bg-white pt-5">
        <header className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 pb-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-orange-50 text-customOrange">
            <SlidersHorizontal className="h-5 w-5" strokeWidth={1.8} />
          </span>
          <h2 className="text-[18px] font-semibold text-gray-950">
            Sort &amp; filter
          </h2>
          <button
            type="button"
            aria-label="Close sort and filter"
            onClick={() => {
              void appHaptics.selection();
              onClose?.();
            }}
            className="grid h-10 w-10 place-items-center rounded-full text-gray-900 active:bg-gray-100"
          >
            <X className="h-6 w-6" strokeWidth={1.8} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-gray-500">
            Sort catalogue
          </p>
          <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white px-3">
            {SORT_OPTIONS.map((option) => {
              const selected = draftSort === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    void appHaptics.selection();
                    setDraftSort(option.value);
                  }}
                  className="flex min-h-12 w-full items-center justify-between gap-3 text-left"
                >
                  <span className="text-sm font-medium text-gray-900">
                    {option.label}
                  </span>
                  <span
                    className={`grid h-5 w-5 place-items-center rounded-full border ${
                      selected
                        ? "border-customOrange bg-customOrange text-white"
                        : "border-gray-300 text-transparent"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </span>
                </button>
              );
            })}
          </div>

          <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-[0.08em] text-gray-500">
            Stock filter
          </p>
          <button
            type="button"
            aria-pressed={draftLowStock}
            onClick={() => {
              void appHaptics.selection();
              setDraftLowStock((current) => !current);
            }}
            className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border px-3 text-left ${
              draftLowStock
                ? "border-orange-200 bg-orange-50"
                : "border-gray-100 bg-gray-50"
            }`}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-amber-600 shadow-sm">
                <TriangleAlert className="h-5 w-5" strokeWidth={1.8} />
              </span>
              <span className="min-w-0">
                <strong className="block text-sm text-gray-950">
                  Low-stock products only
                </strong>
                <small className="mt-0.5 block text-[11px] leading-4 text-gray-500">
                  Products that started above 15 units and have fallen to 3 or
                  fewer, plus unavailable variants.
                </small>
              </span>
            </span>
            <span
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                draftLowStock ? "bg-customOrange" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                  draftLowStock ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </span>
          </button>
        </div>

        <footer className="shrink-0 border-t border-gray-100 bg-white px-4 py-3">
          <button
            type="button"
            onClick={() => {
              void appHaptics.medium();
              onApply?.({ sort: draftSort, lowStockOnly: draftLowStock });
            }}
            className="h-12 w-full rounded-xl bg-customOrange text-sm font-bold text-white active:scale-[0.99]"
          >
            Apply to catalogue
          </button>
        </footer>
      </div>
    </AppBottomSheet>
  );
}
