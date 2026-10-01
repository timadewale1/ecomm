import React, { useMemo } from "react";
import { LuPackageCheck } from "react-icons/lu";
import NativePickerField from "../../../components/Form/NativePickerField";
import {
  getAllowedParcelSizeOptions,
  getParcelSizeOption,
  getProductParcelPresentation,
} from "../../../services/productParcelPresentation";

export default function ProductParcelEstimateField({
  itemClass,
  productType,
  subType,
  value,
  source,
  invalid,
  onChange,
}) {
  const recommendation = useMemo(
    () =>
      getProductParcelPresentation({ itemClass, productType, subType }),
    [itemClass, productType, subType],
  );
  const options = useMemo(
    () => getAllowedParcelSizeOptions(recommendation),
    [recommendation],
  );
  const selected = getParcelSizeOption(value);

  if (!recommendation) return null;

  return (
    <div
      data-add-product-field="parcel-size"
      className="mb-4 font-satoshi"
      aria-live="polite"
    >
      <div className="mb-1 flex items-center justify-between gap-3">
        <label className="block text-sm font-medium text-black">
          Packed parcel size
        </label>
        {source === "taxonomy-default" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-1 text-[10px] font-semibold text-customOrange">
            <LuPackageCheck className="h-3.5 w-3.5" />
            Suggested
          </span>
        )}
      </div>
      <NativePickerField
        title="Choose packed parcel size"
        value={value}
        options={options}
        onChange={onChange}
        searchable={false}
        placeholder="Choose packed parcel size"
        className={`min-h-14 rounded-xl border-2 px-3.5 py-3 font-satoshi text-sm focus:outline-none focus:ring-2 focus:ring-customOrange ${
          invalid ? "border-red-500" : "border-gray-300"
        }`}
      />
      {selected?.detail && (
        <p className="mt-1.5 text-xs leading-5 text-gray-500">
          {selected.detail}. This is a starting suggestion—choose a larger
          packed size if this particular item needs one.
        </p>
      )}
    </div>
  );
}
