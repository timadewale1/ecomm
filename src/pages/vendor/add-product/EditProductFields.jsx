import React from "react";
import { FiPlus } from "react-icons/fi";
import { GoTrash } from "react-icons/go";
import NativePickerField from "../../../components/Form/NativePickerField";
import { appHaptics } from "../../../services/haptics";
import { IMPLICIT_ONE_SIZE } from "../../../config/sizingV1";
import ProductClassificationFields from "./ProductClassificationFields";
import ProductDetailsFields from "./ProductDetailsFields";

export default function EditProductFields({
  itemClass,
  onItemClassChange,
  productName,
  onProductNameChange,
  category,
  onCategoryChange,
  productTypeOptions,
  selectedProductType,
  onProductTypeChange,
  subTypeOptions,
  selectedSubType,
  onProductSubTypeChange,
  onClassificationChange,
  productVariants,
  isNoSizeProfile,
  selectedSizingFieldLabel,
  selectedSizeSystemLabel,
  sizeOptions,
  colorLabelMap,
  getColorCss,
  onOpenColorSheet,
  onAddColor,
  onRemoveColor,
  onSizeStockChange,
  onAddSize,
  onRemoveSize,
  productPrice,
  priceWarn,
  onPriceChange,
  stockQuantity,
  onStockChange,
  productCondition,
  productDefectDescription,
  productDescription,
  tags,
  tagInput,
  onConditionChange,
  onDefectDescriptionChange,
  onDescriptionChange,
  onAddTag,
  onRemoveTag,
  onTagInputChange,
  onTagKeyDown,
}) {
  return (
    <div className="font-satoshi">
      <ProductClassificationFields
        itemClass={itemClass}
        onItemClassChange={onItemClassChange}
        productName={productName}
        onProductNameChange={onProductNameChange}
        category={category}
        onCategoryChange={onCategoryChange}
        productTypeOptions={productTypeOptions}
        selectedProductType={selectedProductType}
        onProductTypeChange={onProductTypeChange}
        subTypeOptions={subTypeOptions}
        selectedSubType={selectedSubType}
        onSubTypeChange={onProductSubTypeChange}
        onClassificationChange={onClassificationChange}
        invalidField={null}
        analysisStatus="idle"
        aiSuggestedFields={[]}
        sheetZIndex={5700}
      />

      {itemClass === "fashion" && (
        <section className="mb-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-950">
              Product options
            </h3>
          </div>

          {isNoSizeProfile && (
            <p className="mb-3 text-xs leading-5 text-gray-600">
              This category does not need a size. Add stock for each colour.
            </p>
          )}

          {productVariants.map((variant, colorIndex) => (
            <div key={colorIndex} className="relative mb-4">
              <label className="mb-1 block text-sm font-semibold text-black">
                Color
              </label>
              <button
                type="button"
                onClick={() => onOpenColorSheet(colorIndex)}
                className="flex h-12 w-full items-center justify-between rounded-lg border-2 border-gray-300 bg-white px-3 text-left text-black focus:border-customOrange focus:outline-none focus:ring-2 focus:ring-customOrange"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    className="h-6 w-6 shrink-0 rounded-full border border-gray-200"
                    style={{ background: getColorCss(variant.color) }}
                  />
                  <span
                    className={`truncate text-sm ${
                      variant.color ? "text-gray-900" : "text-gray-400"
                    }`}
                  >
                    {variant.color
                      ? colorLabelMap.get(variant.color) || variant.color
                      : "Choose a colour"}
                  </span>
                </span>
                <span className="ml-3 shrink-0 text-xs text-gray-500">
                  Select
                </span>
              </button>

              {colorIndex > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    void appHaptics.selection();
                    onRemoveColor(colorIndex);
                  }}
                  aria-label={`Remove colour option ${colorIndex + 1}`}
                  className="absolute right-2 top-0 flex h-7 w-7 items-center justify-center rounded-full text-customBrown active:bg-gray-100"
                >
                  <GoTrash className="h-4 w-4" />
                </button>
              )}

              {variant.sizes.map((sizeStock, sizeIndex) => {
                const selectedSizes = variant.sizes
                  .filter((_, index) => index !== sizeIndex)
                  .map((entry) => entry.size);
                const availableSizeOptions = sizeOptions.filter(
                  (option) => !selectedSizes.includes(option.value),
                );

                return (
                  <div key={sizeIndex} className="relative mt-2">
                    {!isNoSizeProfile && sizeIndex > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          void appHaptics.selection();
                          onRemoveSize(colorIndex, sizeIndex);
                        }}
                        aria-label={`Remove size option ${sizeIndex + 1}`}
                        className="absolute right-0 top-0 z-10 flex h-6 w-6 items-center justify-center rounded-full text-customBrown active:bg-gray-100"
                      >
                        <GoTrash className="h-4 w-4" />
                      </button>
                    )}

                    <div className="flex items-stretch gap-4">
                      {!isNoSizeProfile ? (
                        <div className="mt-2 flex min-w-0 flex-1 flex-col">
                          <label className="mb-1 block min-h-5 pr-7 text-sm font-semibold text-black">
                            {selectedSizingFieldLabel}
                            {selectedSizeSystemLabel
                              ? ` (${selectedSizeSystemLabel})`
                              : ""}
                          </label>
                          <NativePickerField
                            title={`${selectedSizingFieldLabel}${
                              selectedSizeSystemLabel
                                ? ` (${selectedSizeSystemLabel})`
                                : ""
                            }`}
                            options={availableSizeOptions}
                            value={sizeStock.size || ""}
                            onChange={(value) =>
                              onSizeStockChange(
                                colorIndex,
                                sizeIndex,
                                "size",
                                value,
                              )
                            }
                            placeholder="Select Size"
                            sheetZIndex={5700}
                            className="mt-auto h-12 rounded-lg border-2 border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-customOrange"
                          />
                        </div>
                      ) : sizeStock.size !== IMPLICIT_ONE_SIZE ? (
                        <div className="mt-2 flex min-w-0 flex-1 flex-col">
                          <label className="mb-1 block min-h-5 text-sm font-semibold text-black">
                            Existing size option
                          </label>
                          <div className="mt-auto flex min-h-12 items-center rounded-lg border-2 border-gray-200 bg-gray-50 px-3 text-sm text-gray-700">
                            {sizeStock.size}
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-2 flex min-w-0 flex-1 flex-col">
                        <label className="mb-1 block min-h-5 text-sm font-semibold text-black">
                          Stock Quantity
                        </label>
                        <input
                          type="number"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          min={1}
                          value={sizeStock.stock}
                          onChange={(event) =>
                            onSizeStockChange(
                              colorIndex,
                              sizeIndex,
                              "stock",
                              event.target.value,
                            )
                          }
                          className="mt-auto h-12 w-full rounded-lg border-2 border-gray-300 p-3 text-black focus:border-customOrange focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              {!isNoSizeProfile && (
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      void appHaptics.selection();
                      onAddSize(colorIndex);
                    }}
                    className="flex items-center text-sm font-medium text-customOrange"
                  >
                    <FiPlus className="mr-1 h-4 w-4" />
                    Add another size
                  </button>
                </div>
              )}
            </div>
          ))}

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => {
                void appHaptics.selection();
                onAddColor();
              }}
              className="flex items-center text-sm font-medium text-customOrange"
            >
              <FiPlus className="mr-1 h-4 w-4" />
              Add Another Option
            </button>
          </div>
        </section>
      )}

      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-black">
          Price (₦)
        </label>
        <input
          inputMode="numeric"
          placeholder="e.g. 5000 → type 500000 for ₦5,000.00"
          value={productPrice}
          onChange={onPriceChange}
          className="h-12 w-full rounded-lg border-2 border-gray-300 p-3 text-black focus:border-customOrange focus:outline-none"
        />
        {priceWarn && (
          <p className="mt-1 text-sm text-red-600">
            Price must not be less than 300
          </p>
        )}
      </div>

      {itemClass === "everyday" && (
        <div className="mb-4">
          <label className="mb-1 block text-sm font-semibold text-black">
            Stock Quantity
          </label>
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            min={1}
            value={stockQuantity}
            onChange={onStockChange}
            className="h-12 w-full rounded-lg border-2 border-gray-300 p-3 text-black focus:border-customOrange focus:outline-none"
          />
        </div>
      )}

      <ProductDetailsFields
        condition={productCondition}
        defectDescription={productDefectDescription}
        description={productDescription}
        tags={tags}
        tagInput={tagInput}
        tagSuggestions={[]}
        invalidField={null}
        onConditionChange={onConditionChange}
        onDefectDescriptionChange={onDefectDescriptionChange}
        onDescriptionChange={onDescriptionChange}
        onAddTag={onAddTag}
        onRemoveTag={onRemoveTag}
        onTagInputChange={onTagInputChange}
        onTagKeyDown={onTagKeyDown}
      />
    </div>
  );
}
