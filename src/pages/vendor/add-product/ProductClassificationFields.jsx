import React, { useEffect, useMemo, useState } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import {
  FiArrowLeft,
  FiCheck,
  FiChevronDown,
  FiLoader,
  FiSearch,
  FiX,
} from "react-icons/fi";
import { LuSparkles } from "react-icons/lu";
import NativePickerField from "../../../components/Form/NativePickerField";
import AppBottomSheet from "../../../components/layout/AppBottomSheet";
import { appHaptics } from "../../../services/haptics";
import { filterProductTypeOptionsForAudience } from "../../../services/productTaxonomyPresentation";

const NativeFormPicker = registerPlugin("NativeFormPicker");

const FASHION_AUDIENCES = [
  { label: "Women", value: "Womens" },
  { label: "Men", value: "Mens" },
  { label: "Kids", value: "Kids" },
  { label: "Unisex", value: "all" },
];

const cleanSearch = (value) => String(value || "").trim().toLowerCase();

const optionMatches = (option, search) => {
  if (!search) return true;
  return [
    option?.label,
    option?.value,
    option?.group,
    option?.detail,
    ...(option?.searchTerms || []),
  ].some((value) => cleanSearch(value).includes(search));
};

const normalizeSubTypeOptions = (productType) =>
  (productType?.subTypes || [])
    .map((subType) => {
      const value =
        typeof subType === "string"
          ? subType
          : String(subType?.name || subType?.value || "");
      return { label: value, value };
    })
    .filter((option) => option.value);

const presentNativeOptions = async ({
  title,
  options,
  selectedValue,
  allowBack = false,
}) => {
  const result = await NativeFormPicker.present({
    title,
    labels: options.map((option) => option.label),
    values: options.map((option) => option.value),
    groups: options.map((option) => option.group || ""),
    details: options.map((option) => option.detail || ""),
    searchTerms: options.map((option) =>
      (option.searchTerms || []).join("\n"),
    ),
    selectedValues: selectedValue ? [selectedValue] : [],
    multiple: false,
    leadingAction: allowBack ? "back" : "cancel",
  });
  if (result?.cancelled) {
    return {
      action: result?.action === "back" ? "back" : "cancel",
      value: null,
    };
  }
  return {
    action: "select",
    value: String(result?.selectedValues?.[0] || "") || null,
  };
};

function ProductTaxonomySheet({
  open,
  onClose,
  productTypeOptions,
  selectedProductType,
  onProductTypeChange,
  subTypeOptions,
  selectedSubType,
  onSubTypeChange,
  zIndex = 5400,
}) {
  const [step, setStep] = useState("type");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    setStep("type");
    setSearch("");
  }, [open]);

  const normalizedSearch = cleanSearch(search);
  const visibleProductTypes = useMemo(
    () =>
      (productTypeOptions || []).filter((option) =>
        optionMatches(option, normalizedSearch),
      ),
    [normalizedSearch, productTypeOptions],
  );
  const groupedProductTypes = useMemo(() => {
    const groups = [];
    visibleProductTypes.forEach((option) => {
      const label = option.group || "Other";
      const existing = groups.find((group) => group.label === label);
      if (existing) existing.options.push(option);
      else groups.push({ label, options: [option] });
    });
    return groups;
  }, [visibleProductTypes]);
  const visibleSubTypes = useMemo(
    () =>
      (subTypeOptions || []).filter((option) =>
        optionMatches(option, normalizedSearch),
      ),
    [normalizedSearch, subTypeOptions],
  );

  const chooseProductType = (option) => {
    const accepted = onProductTypeChange?.(option.value);
    if (accepted === false) return;
    setSearch("");
    if (normalizeSubTypeOptions(option).length) {
      setStep("subtype");
      void appHaptics.selection();
      return;
    }
    void appHaptics.success();
    onClose?.();
  };

  const chooseSubType = (option) => {
    onSubTypeChange?.(option.value);
    void appHaptics.success();
    onClose?.();
  };

  return (
    <AppBottomSheet
      open={open}
      onClose={onClose}
      height="84dvh"
      ariaLabel="Choose product classification"
      compactTop
      keyboardAware
      zIndex={zIndex}
    >
      <div className="flex min-h-0 flex-1 flex-col pt-3 font-satoshi">
        <header className="flex items-center justify-between border-b border-gray-100 px-4 pb-3">
          {step === "subtype" ? (
            <button
              type="button"
              onClick={() => {
                setStep("type");
                setSearch("");
                void appHaptics.selection();
              }}
              aria-label="Back to product types"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-800"
            >
              <FiArrowLeft className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close product type selector"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-800"
            >
              <FiX className="h-5 w-5" />
            </button>
          )}
          <div className="min-w-0 px-3 text-center">
            <h2 className="truncate text-base font-semibold text-gray-950">
              {step === "subtype" ? "Choose a sub type" : "Choose product type"}
            </h2>
            {step === "subtype" && selectedProductType?.label && (
              <p className="mt-0.5 truncate text-xs text-gray-500">
                {selectedProductType.label}
              </p>
            )}
          </div>
          <span className="h-9 w-9" aria-hidden="true" />
        </header>

        <div className="px-4 pb-2 pt-3">
          <div className="flex h-11 items-center gap-2 rounded-xl bg-gray-100 px-3">
            <FiSearch className="h-4 w-4 shrink-0 text-gray-500" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                step === "subtype"
                  ? "Search sub types"
                  : "Search types or sub types"
              }
              className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500"
              >
                <FiX className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+20px)]">
          {step === "type" ? (
            <>
              {groupedProductTypes.map((group) => (
                <section key={group.label}>
                  <h3 className="product-taxonomy-group-title sticky top-0 z-10 bg-white pb-2 pt-4 text-xs font-bold uppercase tracking-[0.08em] text-gray-500">
                    {group.label}
                  </h3>
                  {group.options.map((option) => {
                    const selected = selectedProductType?.value === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => chooseProductType(option)}
                        className="flex min-h-14 w-full items-center justify-between gap-3 border-b border-gray-100 py-3 text-left"
                      >
                        <span className="min-w-0">
                          <span className="block text-[15px] font-medium text-gray-950">
                            {option.label}
                          </span>
                          {option.detail && (
                            <span className="mt-0.5 block truncate text-xs text-gray-500">
                              {option.detail}
                            </span>
                          )}
                        </span>
                        {selected && (
                          <FiCheck className="h-5 w-5 shrink-0 text-customOrange" />
                        )}
                      </button>
                    );
                  })}
                </section>
              ))}
              {!visibleProductTypes.length && (
                <p className="py-10 text-center text-sm text-gray-500">
                  No matching product types
                </p>
              )}
            </>
          ) : (
            <>
              {visibleSubTypes.map((option) => {
                const selected = selectedSubType?.value === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => chooseSubType(option)}
                    className="flex min-h-14 w-full items-center justify-between gap-3 border-b border-gray-100 py-3 text-left"
                  >
                    <span className="text-[15px] font-medium text-gray-950">
                      {option.label}
                    </span>
                    {selected && (
                      <FiCheck className="h-5 w-5 shrink-0 text-customOrange" />
                    )}
                  </button>
                );
              })}
              {!visibleSubTypes.length && (
                <p className="py-10 text-center text-sm text-gray-500">
                  No matching sub types
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </AppBottomSheet>
  );
}

export default function ProductClassificationFields({
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
  onSubTypeChange,
  onClassificationChange,
  invalidField,
  analysisStatus,
  aiSuggestedFields = [],
  sheetZIndex = 5400,
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const classificationInvalid = ["product-type", "sub-type"].includes(
    invalidField,
  );
  const aiFields = useMemo(() => new Set(aiSuggestedFields), [aiSuggestedFields]);
  const visibleProductTypeOptions = useMemo(
    () =>
      filterProductTypeOptionsForAudience(
        productTypeOptions,
        category,
        itemClass,
      ),
    [category, itemClass, productTypeOptions],
  );
  const selectionLabel = [
    selectedProductType?.label,
    selectedSubType?.label,
  ]
    .filter(Boolean)
    .join(" · ");

  const openClassificationPicker = async () => {
    void appHaptics.selection();
    if (Capacitor.getPlatform() !== "ios") {
      setPickerOpen(true);
      return;
    }

    try {
      let draftType = selectedProductType || null;
      let draftSubType = selectedSubType?.value || "";
      let stage = "type";

      while (stage) {
        if (stage === "type") {
          const result = await presentNativeOptions({
            title: "Choose product type",
            options: visibleProductTypeOptions,
            selectedValue: draftType?.value,
          });
          if (result.action !== "select" || !result.value) return;

          const chosenType = visibleProductTypeOptions.find(
            (option) => option.value === result.value,
          );
          if (!chosenType) return;
          if (chosenType.value !== draftType?.value) draftSubType = "";
          draftType = chosenType;

          const nativeSubTypes = normalizeSubTypeOptions(chosenType);
          if (!nativeSubTypes.length) {
            const accepted = onClassificationChange?.({
              category,
              productTypeValue: chosenType.value,
              subTypeValue: "",
            });
            if (accepted !== false) void appHaptics.success();
            return;
          }
          stage = "subtype";
          continue;
        }

        const nativeSubTypes = normalizeSubTypeOptions(draftType);
        const result = await presentNativeOptions({
          title: `Choose ${draftType?.label || "product"} sub type`,
          options: nativeSubTypes,
          selectedValue: draftSubType,
          allowBack: true,
        });
        if (result.action === "back") {
          stage = "type";
          continue;
        }
        if (result.action !== "select" || !result.value) return;

        draftSubType = result.value;
        const accepted = onClassificationChange?.({
          category,
          productTypeValue: draftType?.value,
          subTypeValue: draftSubType,
        });
        if (accepted !== false) void appHaptics.success();
        return;
      }
    } catch (error) {
      console.warn(
        "[ProductClassification] Native picker unavailable; using app sheet.",
        { code: error?.code || "unknown" },
      );
      setPickerOpen(true);
    }
  };

  const changeCategory = (nextCategory) => {
    onCategoryChange(nextCategory);
    const allowed = filterProductTypeOptionsForAudience(
      productTypeOptions,
      nextCategory,
      itemClass,
    );
    if (
      selectedProductType &&
      !allowed.some((option) => option.value === selectedProductType.value)
    ) {
      onProductTypeChange(null);
    }
  };

  return (
    <>
      <div className="mx-auto mb-6 flex w-full max-w-md items-center justify-between rounded-full bg-gray-200 px-1 py-1">
        {["fashion", "everyday"].map((mode) => {
          const active = itemClass === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => onItemClassChange(mode)}
              className={[
                "flex w-1/2 items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold font-satoshi",
                "transition-all duration-200",
                active ? "bg-white text-customOrange" : "text-gray-800",
              ].join(" ")}
            >
              {active && aiFields.has("itemClass") && (
                <LuSparkles className="h-3.5 w-3.5" aria-label="Suggested from image" />
              )}
              {mode === "fashion" ? "Fashion / Wardrobe" : "Lifestyle Items"}
            </button>
          );
        })}
      </div>

      <div data-add-product-field="name" className="mb-4">
        <label className="mb-1 text-sm font-medium text-black font-satoshi">
          Product Name
        </label>
        <input
          type="text"
          value={productName}
          onChange={(event) => onProductNameChange(event.target.value)}
          aria-invalid={invalidField === "name"}
          className={`h-12 w-full rounded-lg border-2 p-3 text-black font-satoshi focus:border-customOrange focus:outline-none ${
            invalidField === "name" ? "border-red-500" : "border-gray-300"
          }`}
          required
        />
      </div>

      {itemClass === "fashion" && (
        <div data-add-product-field="category" className="mb-4">
          <div className="mb-1 flex items-center gap-1.5">
            <label className="block text-sm font-medium text-black font-satoshi">
              Category
            </label>
            {aiFields.has("category") && (
              <LuSparkles className="h-3.5 w-3.5 text-customOrange" aria-label="Suggested from image" />
            )}
          </div>
          <NativePickerField
            title="Who is it for?"
            value={category}
            options={FASHION_AUDIENCES}
            onChange={changeCategory}
            placeholder="Women, Men, Kids or Unisex"
            className={`h-12 rounded-lg border-2 px-4 text-sm font-satoshi focus:outline-none focus:ring-2 focus:ring-customOrange ${
              invalidField === "category" ? "border-red-500" : "border-gray-300"
            }`}
          />
        </div>
      )}

      <div
        data-add-product-field={
          classificationInvalid ? invalidField : "product-type"
        }
        className="mb-4"
      >
        <div className="mb-1 flex items-center gap-1.5">
          <label className="block text-sm font-medium text-black font-satoshi">
            Product Type
          </label>
          {(aiFields.has("productType") || aiFields.has("subType")) && (
            <LuSparkles className="h-3.5 w-3.5 text-customOrange" aria-label="Suggested from image" />
          )}
        </div>
        <button
          type="button"
          onClick={openClassificationPicker}
          aria-haspopup="dialog"
          aria-invalid={classificationInvalid}
          className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border-2 bg-white px-4 text-left font-satoshi focus:outline-none focus:ring-2 focus:ring-customOrange ${
            classificationInvalid ? "border-red-500" : "border-gray-300"
          }`}
        >
          <span
            className={`min-w-0 flex-1 truncate text-sm ${
              selectionLabel ? "text-gray-900" : "text-gray-400"
            }`}
          >
            {analysisStatus === "analyzing"
              ? "Finding the best match…"
              : selectionLabel || "Choose type and sub type"}
          </span>
          {analysisStatus === "analyzing" ? (
            <FiLoader className="h-4 w-4 shrink-0 animate-spin text-customOrange" />
          ) : (
            <FiChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
          )}
        </button>
      </div>

      <ProductTaxonomySheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        productTypeOptions={visibleProductTypeOptions}
        selectedProductType={selectedProductType}
        onProductTypeChange={onProductTypeChange}
        subTypeOptions={subTypeOptions}
        selectedSubType={selectedSubType}
        onSubTypeChange={onSubTypeChange}
        zIndex={sheetZIndex}
      />
    </>
  );
}
