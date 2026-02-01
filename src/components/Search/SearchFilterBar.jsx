import React, { useMemo } from "react";
import { IoMdOptions } from "react-icons/io";
import { IoCheckmark, IoChevronDownOutline } from "react-icons/io5";

function Chip({ label, value, active, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "shrink-0 inline-flex items-center gap-1.5 px-3 h-12 rounded-xl  text-[17px] font-opensans font-medium",
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
    <div className="mt-3">
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
        <p className="mt-5 text-[16px] font-opensans text-gray-500">
          {resultsText}
        </p>
      )}
    </div>
  );
}
