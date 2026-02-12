import React, { useMemo, useState } from "react";
import { IoMdOptions } from "react-icons/io";
import {
  IoCheckmark,
  IoChevronDownOutline,
  IoHelpCircleOutline,
  IoCloseOutline,
} from "react-icons/io5";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
function Chip({ label, value, active, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "shrink-0 inline-flex items-center gap-1.5 px-3 h-12 rounded-xl  text-[17px] font-opensans font-normal",
        disabled
          ? "border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed"
          : active
            ? "border-customOrange text-customOrange bg-orange-50"
            : "border-gray-200 text-gray-800 bg-gray-50 hover:bg-gray-50",
      ].join(" ")}
    >
      <span className="whitespace-nowrap">{label}</span>
      {value ? (
        <span className="max-w-[90px] truncate text-[11px] font-opensans font-semibold opacity-80">
          {value}
        </span>
      ) : null}
      {active ? (
        <IoCheckmark
          className={disabled ? "text-gray-300" : "text-customOrange"}
        />
      ) : (
        <IoChevronDownOutline
          className={disabled ? "text-gray-300" : "text-gray-500"}
        />
      )}
    </button>
  );
}
function plusBucket(n) {
  const x = Number(n || 0);
  if (!Number.isFinite(x) || x <= 0) return "0";

  // ✅ show exact values for 1–9
  if (x < 10) return String(x);

  // ✅ 10–99 -> 10+, 20+, 30+ ...
  if (x < 100) return `${Math.floor(x / 10) * 10}+`;

  // ✅ 100–999 -> 100+, 200+, 300+ ...
  if (x < 1000) return `${Math.floor(x / 100) * 100}+`;

  // ✅ 1k+ style
  if (x < 1000000) return `${Math.floor(x / 100) / 10}k+`; // 2.3k+
  return `${Math.floor(x / 100000) / 10}m+`;               // 1.2m+
}


function sortLabel(sort) {
  switch (sort) {
    case "newest":
      return "Newest";
    case "price_desc":
      return "Price ↓";
    case "price_asc":
      return "Price ↑";
    case "relevance":
    default:
      return "Relevance";
  }
}
function SearchResultsInfoModal({ open, onClose }) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[2000] bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            className={[
              "fixed inset-x-0 bottom-0 z-[2001]",
              "bg-white rounded-t-2xl shadow-xl",
              "w-full max-w-lg mx-auto",
              "flex flex-col",
              "overflow-hidden", // important: no inner scroll look
            ].join(" ")}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, info) => {
              if (info.offset.y > 100) onClose();
            }}
          >
            {/* Drag Handle */}
            <div className="w-full flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pb-4 border-b border-gray-100">
              <h3 className="text-[16px] font-semibold font-opensans text-gray-900">
                How results are sorted
              </h3>

              <button
                type="button"
                onClick={onClose}
                className="p-2 -mr-2 text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <IoCloseOutline size={22} />
              </button>
            </div>

            {/* Content (NO SCROLL) */}
            <div className="px-6 pt-4 pb-6 font-opensans">
              <div className="space-y-4">
                {/* Inventory Disclaimer */}
                <section className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <p className="text-[13px] font-semibold text-gray-900">
                    Inventory is still growing
                  </p>
                  <p className="mt-1 text-[12.5px] text-gray-600 leading-snug">
                    Some searches may show fewer results while we expand listings.
                  </p>
                </section>

                {/* Ranking Criteria */}
                <section>
                  <p className="text-[13px] font-semibold text-gray-900">
                    Ranking signals
                  </p>

                  <ul className="mt-2 space-y-2">
                    {[
                      "Match to your search terms",
                      "Newly listed items",
                      "Vendor reputation and badge level",
                      "Popularity and engagement",
                      "Featured placement (only when relevant)",
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                        <span className="text-[12.5px] text-gray-700 leading-snug">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Featured */}
                <section className="rounded-xl border border-gray-100 px-4 py-3">
                  <p className="text-[13px] font-semibold text-gray-900">
                    Featured items
                  </p>
                  <p className="mt-1 text-[12.5px] text-gray-600 leading-snug">
                    Vendors can promote select items, but we only boost them when they
                    still match your search and meet quality standards.
                  </p>
                </section>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}


export default function SearchFilterBar({
  appliedFilters,
  total,
  resultsLoading,
  activeFilterCount,
  onOpenFilter, // (sectionOrNull) => void
}) {
  const sortActive = !!(
    appliedFilters.sort && appliedFilters.sort !== "relevance"
  ); // ✅ NEW
  const subTypeActive = !!appliedFilters.subTypes?.length; // ✅ NEW

  const sizeActive = !!(
    appliedFilters.sizeType && appliedFilters.sizes?.length
  );
  const catActive = !!appliedFilters.category;
  const conditionActive = !!appliedFilters.conditions?.length;
const [infoModalOpen, setInfoModalOpen] = useState(false);
  const colorActive = !!appliedFilters.colors?.length;
  const priceActive = !!(appliedFilters.priceMin || appliedFilters.priceMax);

  const chips = useMemo(
    () => [
      {
        key: "size",
        label: "Size",
        active: sizeActive,
      },
      {
        key: "category",
        label: "Category",
        active: catActive,
      },
      {
        key: "sort",
        label: "Sort",
        active: sortActive,
      },
      // ✅ NEW
      {
        key: "subType",
        label: "Sub type",
        active: subTypeActive,
      },
      {
        key: "color",
        label: "Colour",
        active: colorActive,
      },
      {
        key: "price",
        label: "Price",
        active: priceActive,
      },
      {
  key: "condition",
  label: "Condition",
  active: conditionActive,
},

    ],
    [
      appliedFilters,
      sizeActive,
      catActive,
      colorActive,
      sortActive,
      subTypeActive,
      conditionActive,
      priceActive,
    ],
  );

 const resultsText =
  !resultsLoading && typeof total === "number"
    ? `${plusBucket(total)} results`
    : "";

  return (
    <div className="">
      <div className="flex items-center gap-2">
        {/* Filter icon button */}
        <button
          type="button"
          onClick={() => onOpenFilter(null)}
          className="relative w-12 h-12 rounded-xl  bg-gray-50 flex items-center justify-center"
        >
          <IoMdOptions className="text-[19px] text-gray-700" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-customOrange text-white text-[10px] font-opensans font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Chips (horizontal scroll) */}
        <div className="flex-1 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 min-w-max">
            {chips.map((c) => (
              <Chip
                key={c.key}
                label={c.label}
                value={c.value}
                active={c.active}
                disabled={c.disabled}
                onClick={() => onOpenFilter(c.key)}
              />
            ))}
          </div>
        </div>
      </div>

      {!!resultsText && (
        <div className="mt-4 flex items-center justify-between px-1">
          <p className="text-[13px] font-opensans font-medium text-gray-500">
            {resultsText}
          </p>

          <button
            type="button"
            onClick={() => setInfoModalOpen(true)}
            className="flex items-center gap-1.5 text-[12px] font-opensans font-medium text-customOrange hover:text-orange-600 transition-colors"
          >
            Search results
            <IoHelpCircleOutline className="text-base" />
          </button>
        </div>
      )}

      {/* Info Modal */}
      <SearchResultsInfoModal
        open={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
      />
    
    </div>
  );
}
