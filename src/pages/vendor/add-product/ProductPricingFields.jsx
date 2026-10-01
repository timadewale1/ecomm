import React from "react";
import { GoTrash } from "react-icons/go";
import DiscountToggle from "../../../components/Toggle/DiscountToggle";

const summarizeFreebie = (value, maxLength = 20) => {
  const text = String(value || "");
  return text.length <= maxLength ? text : `${text.slice(0, maxLength)}...`;
};

export default function ProductPricingFields({
  itemClass,
  discountDetails,
  runDiscount,
  productPrice,
  stockQuantity,
  priceDisabled,
  invalidField,
  onRemoveDiscount,
  onToggleDiscount,
  onClearDiscount,
  onPriceChange,
  onStockChange,
}) {
  return (
    <>
      {discountDetails ? (
        <div className="my-2 flex items-center justify-between rounded-lg border border-customRichBrown bg-gray-50 p-2">
          <div className="flex min-w-0 items-center gap-3">
            <span className="text-sm font-semibold text-customRichBrown font-satoshi">
              {discountDetails.discountType.startsWith("inApp")
                ? "In‑App Discount"
                : "Personal Discount"}
            </span>
            <span
              className={`rounded-md px-1.5 py-1 text-center text-xs font-semibold text-white font-satoshi ${
                discountDetails.discountType.startsWith("inApp") ||
                discountDetails.discountType === "personal-monetary"
                  ? "bg-green-600"
                  : "bg-customOrange"
              }`}
            >
              {discountDetails.discountType.startsWith("inApp") ||
              discountDetails.discountType === "personal-monetary"
                ? `${discountDetails.percentageCut}% Off`
                : discountDetails.discountType === "personal-freebies"
                  ? summarizeFreebie(discountDetails.freebieText)
                  : ""}
            </span>
          </div>
          <button
            type="button"
            onClick={onRemoveDiscount}
            title="Remove Discount"
            aria-label="Remove discount"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full active:bg-red-50"
          >
            <GoTrash className="text-lg text-red-600" />
          </button>
        </div>
      ) : (
        <div className="mb-4">
          <DiscountToggle
            runDiscount={runDiscount}
            setRunDiscount={onToggleDiscount}
            discountDetails={discountDetails}
            onClearDiscount={onClearDiscount}
          />
        </div>
      )}

      <div data-add-product-field="price" className="mb-4">
        <label className="mb-1 text-sm font-medium text-black font-satoshi">
          Product Price
        </label>
        <input
          type="text"
          inputMode="decimal"
          pattern="[0-9]*"
          value={productPrice}
          onChange={onPriceChange}
          disabled={priceDisabled}
          aria-invalid={invalidField === "price"}
          className={`h-12 w-full rounded-lg border-2 p-3 text-black font-satoshi focus:border-customOrange focus:outline-none disabled:bg-gray-100 ${
            invalidField === "price" ? "border-red-500" : "border-gray-300"
          }`}
          required
        />
        {Number(productPrice) < 300 && productPrice !== "" && (
          <p className="mt-1 text-xs text-red-500 font-satoshi">
            Minimum product price is 300 naira.
          </p>
        )}
      </div>

      {itemClass === "everyday" && (
        <div data-add-product-field="stock" className="mb-4">
          <label className="text-sm font-semibold text-black font-satoshi">
            Stock Quantity
          </label>
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            min={1}
            value={stockQuantity}
            onChange={onStockChange}
            aria-invalid={invalidField === "stock"}
            className={`h-12 w-full rounded-lg border-2 p-3 text-black font-satoshi focus:border-customOrange focus:outline-none ${
              invalidField === "stock" ? "border-red-500" : "border-gray-300"
            }`}
            required
          />
        </div>
      )}
    </>
  );
}
