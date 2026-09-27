// src/components/Search/SearchFilterModal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { IoCloseOutline, IoChevronDownOutline } from "react-icons/io5";
import productSizes from "../../pages/vendor/productsizes";
import { PALETTE, PALETTE_ORDER } from "../../services/pallete";
import { IoCheckmark } from "react-icons/io5";
import AppBottomSheet from "../layout/AppBottomSheet";
import {
  IMPLICIT_ONE_SIZE,
  createCanonicalSizeKeys,
  getLegacyCatalogSizes,
  getListingSizingProfile,
  getListingSizeOptions,
  LISTING_SIZE_KINDS,
} from "../../config/sizingV1";

function cleanStr(x) {
  return typeof x === "string" ? x.trim() : "";
}

function lcStr(x) {
  return typeof x === "string" ? x.trim().toLowerCase() : "";
}

function uniq(arr) {
  return Array.from(new Set((arr || []).filter(Boolean)));
}

function getItemType(p) {
  return cleanStr(p?.productType || p?.product_type || p?.type || "");
}

function getItemSubType(p) {
  return cleanStr(p?.subType || p?.sub_type || "");
}

// case-insensitive key lookup (OpenSearch now returns lowercase productType)
function findKeyCaseInsensitive(obj, key) {
  const target = lcStr(key);
  if (!obj || !target) return null;

  if (Object.prototype.hasOwnProperty.call(obj, key)) return key;

  for (const k of Object.keys(obj)) {
    if (lcStr(k) === target) return k;
  }
  return null;
}

export function getSizesForType(typeName, subTypes = []) {
  const key = cleanStr(typeName);
  if (!key) return [];

  const typeProfile = getListingSizingProfile(key, "");
  if (typeProfile?.kind === LISTING_SIZE_KINDS.NONE) return [];

  const requestedContexts = Array.isArray(subTypes)
    ? subTypes.map(cleanStr).filter(Boolean)
    : [];
  const catalogTypeKey = findKeyCaseInsensitive(productSizes, key);
  const catalogEntry = catalogTypeKey ? productSizes[catalogTypeKey] : null;
  // Mixed parents such as Jewelry and Sportswear must be evaluated one leaf at
  // a time. Flattening the parent reintroduced One Size from audited NONE
  // leaves into otherwise meaningful size filters.
  const catalogContexts =
    catalogEntry && !Array.isArray(catalogEntry) && typeof catalogEntry === "object"
      ? Object.keys(catalogEntry)
      : [];
  const contexts = requestedContexts.length
    ? requestedContexts
    : catalogContexts.length
      ? catalogContexts
      : [""];
  return uniq(
    contexts.flatMap((subType) => {
      const sizingProfile = getListingSizingProfile(key, subType);
      if (sizingProfile?.kind === LISTING_SIZE_KINDS.NONE) return [];

      const legacySizes = getLegacyCatalogSizes(productSizes, key, subType);
      return getListingSizeOptions({
        productType: key,
        subType,
        legacySizes,
      });
    }),
  );
}

export function getRecommendedTypeFromItems(items) {
  const counts = new Map();
  for (const p of items || []) {
    const t = getItemType(p);
    if (!t) continue;
    counts.set(t, (counts.get(t) || 0) + 1);
  }
  let best = "";
  let bestN = 0;
  for (const [t, n] of counts.entries()) {
    if (n > bestN) {
      best = t;
      bestN = n;
    }
  }
  return best;
}

export function buildFiltersPayload(filters) {
  // ✅ normalize everything to lowercase to match OpenSearch indexed fields
  const payload = {};

  const rawSizes = sanitizeSizeFilterValues(filters);
  // sizeType is UI context, not an independent filter. Sending it without a
  // chosen size previously narrowed otherwise-unfiltered search results.
  if (filters?.sizeType && rawSizes.length) {
    payload.productType = lcStr(filters.sizeType);
  }
  if (filters?.productTypes?.length) {
    payload.productTypes = uniq(filters.productTypes.map(lcStr));
  }
  if (rawSizes.length) {
    // Keep the existing raw payload for backward compatibility.
    payload.sizes = rawSizes.map(lcStr);

    const subtypeContexts = filters?.subTypes?.length
      ? filters.subTypes
      : [""];
    const sizeKeys = uniq(
      subtypeContexts.flatMap((subType) =>
        createCanonicalSizeKeys(
          rawSizes,
          filters?.sizeType,
          subType,
          { source: "forward" },
        ),
      ),
    );
    if (sizeKeys.length) payload.sizeKeys = sizeKeys;
  }

  // Category is now single-select in UI; backend can still accept array
  if (filters?.category) {
    const category = lcStr(filters.category);
    const categories = [category];
    if (
      filters?.includeUnisex &&
      (category === "mens" || category === "womens")
    ) {
      categories.push("all");
    }
    payload.category = uniq(categories);
  }
 if (filters?.conditions?.length) payload.conditions = filters.conditions.map(lcStr);
  // Color is multi-select swatches
  if (filters?.colors?.length) payload.colors = filters.colors.map(lcStr);
  if (filters?.subTypes?.length) payload.subTypes = filters.subTypes.map(lcStr);
  if (filters?.brand) payload.brand = lcStr(filters.brand);
  const min = Number(filters?.priceMin);
  const max = Number(filters?.priceMax);
  if (!Number.isNaN(min) && min > 0) payload.priceMin = min;
  if (!Number.isNaN(max) && max > 0) payload.priceMax = max;

  return payload;
}

const CATEGORY_OPTIONS = [
  { value: "mens", label: "Mens" },
  { value: "womens", label: "Womens" },
  { value: "kids", label: "Kids" },
  { value: "all", label: "Unisex" },
];

const PRICE_PRESETS = [
  { id: "u5", label: "Under ₦5,000", min: "", max: "5000" },
  { id: "5-10", label: "₦5,000 - ₦10,000", min: "5000", max: "10000" },
  { id: "10-15", label: "₦10,000 - ₦15,000", min: "10000", max: "15000" },
  { id: "15-20", label: "₦15,000 - ₦20,000", min: "15000", max: "20000" },
  { id: "a20", label: "Above ₦20,000", min: "20000", max: "" },
];

const DEFAULT_DRAFT = {
  sort: "relevance", // ✅ NEW
  subTypes: [],
  sizeType: null,
  sizes: [],
  category: null, // ✅ single
  brand: null,
  colors: [], // ✅ multi
  priceMin: "",
    conditions: [], 
  priceMax: "",
};
const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "newest", label: "Newest first" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "price_asc", label: "Price: low to high" },
];
const CONDITION_OPTIONS = [
  { value: "thrift", label: "Thrift" },
  { value: "brand new", label: "Brand new" },
  { value: "defect", label: "Defect" }, // keep colon (matches DB/OpenSearch)
];


function CheckboxRow({ checked, label, subLabel, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 py-3"
      type="button"
    >
      <span
        className={[
          "w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors",
          checked ? "border-customOrange bg-customOrange" : "border-gray-300",
        ].join(" ")}
      >
        {/* ✅ Replaced the square span with a real Tick icon */}
        {checked && <IoCheckmark className="text-white text-sm" />}
      </span>

      <div className="flex-1 flex items-center justify-between gap-3">
        <span className="font-opensans text-sm text-gray-900">{label}</span>
      </div>
    </button>
  );
}

function RadioRow({ selected, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 py-3"
      type="button"
    >
      <span
        className={[
          "w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0",
          selected ? "border-customOrange" : "border-gray-300",
        ].join(" ")}
      >
        {selected && (
          <span className="w-2.5 h-2.5 rounded-full bg-customOrange" />
        )}
      </span>

      <span className="font-opensans text-sm text-gray-900">{label}</span>
    </button>
  );
}
function bucket10Plus(n) {
  const x = Number(n || 0);
  if (Number.isNaN(x) || x <= 0) return 0;
  if (x < 10) return x; // show exact
  return `${Math.floor(x / 10) * 10}+`; // 12 -> 10+, 27 -> 20+
}

export default function SearchFilterModal({
  open,
  onClose,
  query,
  searchUrl,
  items,
  facets,
  appliedFilters,
  onApply,
  initialSection = null,
  previewTotalOverride = null,
  disableRemotePreview = false,
  enableBrand = false,
  allowEmptyQueryPreview = false,
  requestExtras = null,
  requestFilterExtras = null,
  sizeTypeRequiresSizes = false,
}) {
  const [section, setSection] = useState(null); // "size" | "category" | "price" | "color" | null
  const [draft, setDraft] = useState(DEFAULT_DRAFT);
  const [previewTotal, setPreviewTotal] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
const isHalfSheet = Boolean(initialSection);
  const abortRef = useRef(null);
  const debounceRef = useRef(null);
  const subTypeOptions = useMemo(() => {
    // prefer server facets
    if (facets?.subTypes?.length) {
      return facets.subTypes.map((x) => ({
        key: lcStr(x.key),
        label: x.key,
        count: x.count,
      }));
    }

    // fallback: derive from items
    const counts = new Map();
    for (const p of items || []) {
      const st = lcStr(p?.subType);
      if (!st) continue;
      counts.set(st, (counts.get(st) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({ key, label: key, count }));
  }, [facets, items]);

  const brandOptions = useMemo(() => {
    if (facets?.brands?.length) {
      return facets.brands
        .map((entry) =>
          typeof entry === "string"
            ? entry
            : entry?.key || entry?.label || entry?.value,
        )
        .filter(Boolean);
    }

    return uniq(
      (items || []).map((item) =>
        cleanStr(item?.brand || item?.designer || item?.productBrand),
      ),
    ).sort((left, right) => left.localeCompare(right));
  }, [facets, items]);

  const recommendedType = useMemo(
    () => getRecommendedTypeFromItems(items || []),
    [items],
  );

  const resultTypes = useMemo(() => getResultTypes(items, facets), [facets, items]);
  const typesInResults = useMemo(
    () => getSizeFilterTypes(items, facets),
    [facets, items],
  );
  const fallbackSizeTypes = useMemo(
    () => Object.keys(productSizes).filter((typeName) => getSizesForType(typeName).length),
    [],
  );
  // If result taxonomy is known, never replace an all-NONE result set with the
  // whole catalog. The fallback is reserved for an empty/unknown result set so
  // an existing valid size filter can still be changed after a zero-result query.
  const sizeTypeTabs = resultTypes.length ? typesInResults : fallbackSizeTypes;
  const preferredSizeType = useMemo(() => {
    const recommendedKey = lcStr(recommendedType);
    return (
      sizeTypeTabs.find((typeName) => lcStr(typeName) === recommendedKey) ||
      sizeTypeTabs[0] ||
      null
    );
  }, [recommendedType, sizeTypeTabs]);

  const paletteSwatches = useMemo(() => {
    return PALETTE_ORDER.map((key) => ({
      key,
      ...PALETTE[key],
    })).filter((x) => x && x.key);
  }, []);

  // init draft when modal opens
  useEffect(() => {
    if (!open) return;

    const base =
      appliedFilters && Object.keys(appliedFilters).length
        ? appliedFilters
        : DEFAULT_DRAFT;

    setDraft(() => {
      const next = { ...DEFAULT_DRAFT, ...base };
      next.sort = cleanStr(next.sort) || "relevance";
      next.subTypes = Array.isArray(next.subTypes)
        ? next.subTypes.map(lcStr).filter(Boolean)
        : [];
      next.conditions = Array.isArray(next.conditions)
        ? next.conditions.map(lcStr).filter(Boolean)
        : [];

      // normalize in-memory values
      next.category = next.category ? lcStr(next.category) : null;
      next.brand = next.brand ? lcStr(next.brand) : null;
      next.colors = Array.isArray(next.colors)
        ? next.colors.map(lcStr).filter(Boolean)
        : [];
      next.sizes = Array.isArray(next.sizes) ? next.sizes.filter(Boolean) : [];

      const selectedTypeIsAvailable = sizeTypeTabs.some(
        (typeName) => lcStr(typeName) === lcStr(next.sizeType),
      );
      if (
        !next.sizeType ||
        (resultTypes.length > 0 && !selectedTypeIsAvailable)
      ) {
        next.sizeType = preferredSizeType;
      }

      if (next.sizeType) {
        const contexts = getContextualSubTypesForType(
          next.sizeType,
          next.subTypes,
          items,
          facets,
        );
        const contextualOptions = getContextualSizesForType(
          next.sizeType,
          next.subTypes,
          items,
          facets,
        );
        if (
          isNoSizeFilterContext(next.sizeType, contexts) ||
          (resultTypes.length > 0 && contextualOptions.length === 0)
        ) {
          next.sizeType =
            sizeTypeTabs.find(
              (typeName) =>
                getContextualSizesForType(
                  typeName,
                  next.subTypes,
                  items,
                  facets,
                ).length > 0,
            ) || null;
        }
      }

      const sizeContexts = getContextualSubTypesForType(
        next.sizeType,
        next.subTypes,
        items,
        facets,
      );
      next.sizes = sanitizeSizeFilterValues({
        ...next,
        subTypes: sizeContexts,
      });

      return next;
    });

    setSection(initialSection === "size" && !sizeTypeTabs.length ? null : initialSection || null);
    setPreviewTotal(null);
  }, [
    open,
    appliedFilters,
    facets,
    initialSection,
    items,
    preferredSizeType,
    resultTypes.length,
    sizeTypeTabs,
  ]);

  const activeCount = useMemo(() => {
    let n = 0;
    if (draft.sort && draft.sort !== "relevance") n += 1; // ✅ NEW
    if (draft.subTypes?.length) n += 1;
    if (draft.sizeType && draft.sizes?.length) n += 1;
    if (draft.category) n += 1;
    if (draft.brand) n += 1;
    if (draft.conditions?.length) n += 1;

    if (draft.colors?.length) n += 1;
    if (draft.priceMin || draft.priceMax) n += 1;
    return n;
  }, [draft]);

  const sizeContextsForSelectedType = useMemo(
    () =>
      getContextualSubTypesForType(
        draft.sizeType,
        draft.subTypes,
        items,
        facets,
      ),
    [draft.sizeType, draft.subTypes, facets, items],
  );
  const sizesForSelectedType = useMemo(() => {
    if (!draft.sizeType) return [];
    return getContextualSizesForType(
      draft.sizeType,
      draft.subTypes,
      items,
      facets,
    );
  }, [draft.sizeType, draft.subTypes, facets, items]);

  useEffect(() => {
    if (!open) return;
    setDraft((previous) => {
      let nextSizeType = previous.sizeType;
      if (
        nextSizeType &&
        getContextualSizesForType(
          nextSizeType,
          previous.subTypes,
          items,
          facets,
        ).length === 0 &&
        resultTypes.length > 0
      ) {
        nextSizeType =
          sizeTypeTabs.find(
            (typeName) =>
              getContextualSizesForType(
                typeName,
                previous.subTypes,
                items,
                facets,
              ).length > 0,
          ) || null;
      }
      const contexts = getContextualSubTypesForType(
        nextSizeType,
        previous.subTypes,
        items,
        facets,
      );
      const nextSizes = sanitizeSizeFilterValues({
        ...previous,
        sizeType: nextSizeType,
        subTypes: contexts,
      });
      const sizesUnchanged =
        nextSizes.length === previous.sizes.length &&
        nextSizes.every((size, index) => size === previous.sizes[index]);
      if (nextSizeType === previous.sizeType && sizesUnchanged) return previous;
      return { ...previous, sizeType: nextSizeType, sizes: nextSizes };
    });
  }, [facets, items, open, resultTypes.length, sizeTypeTabs]);

  const toggleInList = (list, value) => {
    const v = lcStr(value);
    if (!v) return list;
    return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
  };

  const clearAll = () => {
    setDraft({
      ...DEFAULT_DRAFT,
      sizeType: preferredSizeType,
    });
  };

  // which price preset is currently selected (based on min/max)
  const selectedPricePresetId = useMemo(() => {
    const min = cleanStr(draft.priceMin);
    const max = cleanStr(draft.priceMax);
    const hit = PRICE_PRESETS.find((p) => p.min === min && p.max === max);
    return hit?.id || null;
  }, [draft.priceMin, draft.priceMax]);

  // preview total (call backend with draft filters) – debounced
  useEffect(() => {
    if (!open) return;
    if (disableRemotePreview) {
      setPreviewTotal(
        typeof previewTotalOverride === "number" ? previewTotalOverride : null,
      );
      setPreviewLoading(false);
      return;
    }
    if (!query && !allowEmptyQueryPreview) return;

    clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort?.();
      const ac = new AbortController();
      abortRef.current = ac;

      setPreviewLoading(true);
      try {
        const res = await fetch(searchUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: ac.signal,
          body: JSON.stringify({
            ...(requestExtras || {}),
            q: query,
            pageSize: 1,
            sort: draft.sort || "relevance",
            cursor: null,
            strictVariant: true,
            filters: {
              ...buildFiltersPayload(
                sizeTypeRequiresSizes && !draft.sizes?.length
                  ? { ...draft, sizeType: null }
                  : draft,
              ),
              ...(requestFilterExtras || {}),
            },
          }),
        });

        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setPreviewTotal(Number(data.total || 0));
      } catch (e) {
        if (String(e?.name) !== "AbortError") setPreviewTotal(null);
      } finally {
        setPreviewLoading(false);
      }
    }, 250);

    return () => clearTimeout(debounceRef.current);
  }, [
    open,
    query,
    searchUrl,
    draft,
    disableRemotePreview,
    previewTotalOverride,
    allowEmptyQueryPreview,
    requestExtras,
    requestFilterExtras,
    sizeTypeRequiresSizes,
  ]);

  const primaryLabel = useMemo(() => {
    if (previewLoading) return "Checking…";
    if (typeof previewTotal === "number") {
      const t = previewTotal;
      const bucket = bucket10Plus(t);
      if (bucket === 0) return "See Results";
      return `See ${bucket} Results`;
    }
    return "See Results";
  }, [previewLoading, previewTotal]);

  const canApply =
    !previewLoading &&
    !(typeof previewTotal === "number" && previewTotal === 0);

  const apply = () => {
    if (!canApply) return;
    const noSelectableSizeContext = Boolean(
      draft.sizeType &&
        (isNoSizeFilterContext(
          draft.sizeType,
          sizeContextsForSelectedType,
        ) ||
          (resultTypes.length > 0 && sizesForSelectedType.length === 0)),
    );
    const nextDraft = {
      ...draft,
      sizeType: noSelectableSizeContext ? null : draft.sizeType,
      sizes: noSelectableSizeContext
        ? []
        : sanitizeSizeFilterValues({
            ...draft,
            subTypes: sizeContextsForSelectedType,
          }),
    };
    onApply?.(nextDraft);
  };

  const displayTypeLabel = (t) => {
    const matched = findKeyCaseInsensitive(productSizes, t);
    return matched || t;
  };
  const sortLabelMap = useMemo(() => {
    const m = new Map();
    SORT_OPTIONS.forEach((s) => m.set(s.value, s.label));
    return m;
  }, []);

  const subTypeLabelMap = useMemo(() => {
    const m = new Map();
    (subTypeOptions || []).forEach((x) => m.set(lcStr(x.key), x.label));
    return m;
  }, [subTypeOptions]);

  const colorLabelMap = useMemo(() => {
    const m = new Map();
    PALETTE_ORDER.forEach((k) => {
      const item = PALETTE?.[k];
      if (item?.label) m.set(k, item.label);
    });
    return m;
  }, []);

  const appliedPills = useMemo(() => {
    const pills = [];

    // sizes (multi) -> one pill per size like "XXL (Top)"
    if (draft.sizeType && Array.isArray(draft.sizes) && draft.sizes.length) {
      const typeLabel = displayTypeLabel(draft.sizeType);
      draft.sizes.forEach((sz) => {
        pills.push({
          id: `size:${sz}`,
          label: `${sz} (${typeLabel})`,
          onRemove: () =>
            setDraft((p) => ({
              ...p,
              sizes: (p.sizes || []).filter((x) => x !== sz),
            })),
        });
      });
    }

    // subTypes (multi)
    if (Array.isArray(draft.subTypes) && draft.subTypes.length) {
      draft.subTypes.forEach((st) => {
        const key = lcStr(st);
        pills.push({
          id: `subType:${key}`,
          label: subTypeLabelMap.get(key) || st,
          onRemove: () =>
            setDraft((p) => ({
              ...p,
              subTypes: toggleInList(p.subTypes || [], key),
            })),
        });
      });
    }

    // colours (multi)
    if (Array.isArray(draft.colors) && draft.colors.length) {
      draft.colors.forEach((c) => {
        const key = lcStr(c);
        pills.push({
          id: `color:${key}`,
          label: colorLabelMap.get(key) || key,
          onRemove: () =>
            setDraft((p) => ({
              ...p,
              colors: toggleInList(p.colors || [], key),
            })),
        });
      });
    }
    // conditions (multi)
if (Array.isArray(draft.conditions) && draft.conditions.length) {
  draft.conditions.forEach((c) => {
    const key = lcStr(c);
    pills.push({
      id: `condition:${key}`,
      label:
        CONDITION_OPTIONS.find((x) => x.value === key)?.label || key,
      onRemove: () =>
        setDraft((p) => ({
          ...p,
          conditions: toggleInList(p.conditions || [], key),
        })),
    });
  });
}


    // category (single)
    if (draft.category) {
      pills.push({
        id: `category:${draft.category}`,
        label:
          CATEGORY_OPTIONS.find((x) => x.value === draft.category)?.label ||
          draft.category,
        onRemove: () => setDraft((p) => ({ ...p, category: null })),
      });
    }

    if (draft.brand) {
      pills.push({
        id: `brand:${draft.brand}`,
        label:
          brandOptions.find((brand) => lcStr(brand) === draft.brand) ||
          draft.brand,
        onRemove: () =>
          setDraft((previous) => ({ ...previous, brand: null })),
      });
    }

    // price (single)
    if (draft.priceMin || draft.priceMax) {
      const min = cleanStr(draft.priceMin);
      const max = cleanStr(draft.priceMax);
      const preset = PRICE_PRESETS.find((p) => p.min === min && p.max === max);
      pills.push({
        id: "price",
        label: preset?.label || "Price",
        onRemove: () => setDraft((p) => ({ ...p, priceMin: "", priceMax: "" })),
      });
    }

    // sort (single) - only if not relevance
    if (draft.sort && draft.sort !== "relevance") {
      pills.push({
        id: "sort",
        label: sortLabelMap.get(draft.sort) || "Sort",
        onRemove: () => setDraft((p) => ({ ...p, sort: "relevance" })),
      });
    }

    return pills;
  }, [draft, sortLabelMap, subTypeLabelMap, colorLabelMap, brandOptions]);

  return (
    <AppBottomSheet
      open={open}
      onClose={onClose}
      variant={isHalfSheet ? "sheet" : "fullscreen"}
      height="65dvh"
      ariaLabel="Search filters"
    >
         <div className="relative flex h-[52px] shrink-0 items-end px-4">
  {/* Close Button */}
  <button
    onClick={onClose}
    type="button"
    className={[
      "relative z-10 flex h-11 w-11 items-center justify-center rounded-full active:bg-gray-100",
      isHalfSheet ? "ml-auto" : "-ml-1",
    ].join(" ")}
    aria-label="Close filters"
  >
    <IoCloseOutline className="text-[28px] text-black" />
  </button>

  {/* Filter Text (Absolute Center) */}
  <p className="absolute left-1/2 top-[30px] -translate-x-1/2 -translate-y-1/2 font-opensans font-semibold text-2xl leading-6 text-black">
    Filter
  </p>
</div>

            {/* Body */}
            {/* ✅ min-h-0 fixes footer not showing */}
  <div className="flex-1 min-h-0 scrollbar-hide overflow-y-auto px-4 py-3">

 {/* LIST MODE */}
              {!section && (
                <>
                  {appliedPills.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between">
                        <p className="font-opensans font-semibold text-base text-black">
                          Applied filters ({appliedPills.length})
                        </p>

                        {/* ✅ only show when there is at least 1 filter */}
                        <button
                          onClick={clearAll}
                          className="text-sm font-opensans text-customOrange font-semibold"
                          type="button"
                        >
                          Clear All
                        </button>
                      </div>

                      <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
                        {appliedPills.map((p) => (
                          <div
                            key={p.id}
                            className="shrink-0 inline-flex items-center gap-2 px-3 h-12 rounded-xl bg-gray-100"
                          >
                            <span className="font-opensans text-sm font-semibold text-gray-500 whitespace-nowrap">
                              {p.label}
                            </span>
                            <button
                              type="button"
                              onClick={p.onRemove}
                              className="p-1 -mr-1"
                              aria-label={`Remove ${p.label}`}
                            >
                              <IoCloseOutline className="text-xl text-gray-600" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
              {!section && (
                <div className="space-y-2">
                  {[
                    ...(sizeTypeTabs.length
                      ? [
                          {
                            key: "size",
                            label: `Size${draft.sizes?.length ? ` (${draft.sizes.length})` : ""}`,
                          },
                        ]
                      : []),

                    { key: "category", label: "Category" },
                    ...(enableBrand ? [{ key: "brand", label: "Brand" }] : []),
                    { key: "sort", label: "Sort" }, // ✅ NEW
                    {
                      key: "subType",
                      label: `Sub type${draft.subTypes?.length ? ` (${draft.subTypes.length})` : ""}`,
                    },

                    {
                      key: "color",
                      label: `Colour${draft.colors?.length ? ` (${draft.colors.length})` : ""}`,
                    },
                    { key: "price", label: "Price" },
                    {
  key: "condition",
  label: `Condition${draft.conditions?.length ? ` (${draft.conditions.length})` : ""}`,
},

                  ].map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setSection(s.key)}
                      className="w-full flex items-center justify-between py-4"
                      type="button"
                    >
                      <span className="font-opensans text-base font-semibold text-black">
                        {s.label}
                      </span>
                      <IoChevronDownOutline className="mr-[13px] shrink-0 text-lg text-gray-500" />
                    </button>
                  ))}
                </div>
              )}

              {/* SIZE SECTION */}
              {section === "size" && sizeTypeTabs.length > 0 && (
                <div>
                  <button
                    onClick={() => setSection(null)}
                    className="w-full flex items-center justify-between py-3"
                    type="button"
                  >
                    <span className="font-opensans text-base font-semibold text-black">
                      Size
                    </span>
                    <IoChevronDownOutline className="mr-[13px] shrink-0 rotate-180 text-lg text-gray-500" />
                  </button>

                  {/* <div className="mt-2 p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                    <div className="text-xs font-opensans text-gray-700">
                      Save your sizes to shop what fits
                    </div>
                    <button
                      className="text-xs font-opensans font-semibold text-customOrange"
                      type="button"
                    >
                      Set My Sizes
                    </button>
                  </div> */}

                  <div className="mt-4 overflow-x-auto no-scrollbar">
                    <div className="flex gap-3 min-w-max border-b border-gray-100">
                      {sizeTypeTabs.map((t) => {
                        const active = lcStr(draft.sizeType) === lcStr(t);
                        return (
                          <button
                            key={t}
                            onClick={() =>
                              setDraft((p) => ({
                                ...p,
                                sizeType: t,
                                sizes: [],
                              }))
                            }
                            className={[
                              "pb-2 text-sm font-opensans font-semibold",
                              active
                                ? "text-black border-b-4  border-customOrange"
                                : "text-gray-600",
                            ].join(" ")}
                            type="button"
                          >
                            {displayTypeLabel(t)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-5 gap-2">
                    {sizesForSelectedType.length === 0 ? (
                      <p className="col-span-4 text-sm font-opensans text-gray-500 py-6">
                        No size list for this type.
                      </p>
                    ) : (
                      sizesForSelectedType.map((s) => {
                        const active = draft.sizes.includes(s);
                        return (
                          <button
                            key={s}
                            onClick={() =>
                              setDraft((p) => ({
                                ...p,
                                // store as-is for display, payload lowercases later
                                sizes: active
                                  ? p.sizes.filter((x) => x !== s)
                                  : [...(p.sizes || []), s],
                              }))
                            }
                            className={[
                              "h-10 rounded-xl border flex items-center justify-center text-xs font-opensans font-semibold  transition",
                              active
                                ? "border-customOrange bg-orange-50 text-customOrange"
                                : "border-gray-200 text-gray-500 hover:bg-gray-50",
                            ].join(" ")}
                            type="button"
                          >
                            {s}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* CATEGORY SECTION (preset + radio) */}
              {section === "category" && (
                <div>
                  <button
                    onClick={() => setSection(null)}
                    className="w-full flex items-center justify-between py-3"
                    type="button"
                  >
                    <span className="font-opensans text-base font-semibold text-black">
                      Category
                    </span>
                    <IoChevronDownOutline className="mr-[13px] shrink-0 rotate-180 text-lg text-gray-500" />
                  </button>

                  <div className="mt-2">
                    {CATEGORY_OPTIONS.map((c) => (
                      <RadioRow
                        key={c.value}
                        label={c.label}
                        selected={draft.category === c.value}
                        onClick={() =>
                          setDraft((p) => ({ ...p, category: c.value }))
                        }
                      />
                    ))}
                  </div>
                </div>
              )}
              {section === "brand" && enableBrand && (
                <div>
                  <button
                    onClick={() => setSection(null)}
                    className="w-full flex items-center justify-between py-3"
                    type="button"
                  >
                    <span className="font-opensans text-base font-semibold text-black">
                      Brand
                    </span>
                    <IoChevronDownOutline className="mr-[13px] shrink-0 rotate-180 text-lg text-gray-500" />
                  </button>
                  <div className="mt-2">
                    {brandOptions.length ? (
                      brandOptions.map((brand) => (
                        <RadioRow
                          key={brand}
                          label={brand}
                          selected={draft.brand === lcStr(brand)}
                          onClick={() =>
                            setDraft((previous) => ({
                              ...previous,
                              brand: lcStr(brand),
                            }))
                          }
                        />
                      ))
                    ) : (
                      <p className="py-6 text-sm font-opensans text-gray-500">
                        No brands are listed for these products.
                      </p>
                    )}
                  </div>
                </div>
              )}
              {section === "sort" && (
                <div>
                  <button
                    onClick={() => setSection(null)}
                    className="w-full flex items-center justify-between py-3"
                    type="button"
                  >
                    <span className="font-opensans text-base font-semibold text-black">
                      Sort
                    </span>
                    <IoChevronDownOutline className="mr-[13px] shrink-0 rotate-180 text-lg text-gray-500" />
                  </button>

                  <div className="mt-2">
                    {SORT_OPTIONS.map((opt) => (
                      <RadioRow
                        key={opt.value}
                        label={opt.label}
                        selected={draft.sort === opt.value}
                        onClick={() =>
                          setDraft((p) => ({ ...p, sort: opt.value }))
                        }
                      />
                    ))}
                  </div>
                </div>
              )}
              {section === "subType" && (
                <div>
                  <button
                    onClick={() => setSection(null)}
                    className="w-full flex items-center justify-between py-3"
                    type="button"
                  >
                    <span className="font-opensans text-sm font-semibold text-black">
                      Sub type
                    </span>
                    <IoChevronDownOutline className="mr-[13px] shrink-0 rotate-180 text-lg text-gray-500" />
                  </button>

                  <div className="mt-2">
                    {subTypeOptions.length === 0 ? (
                      <p className="text-sm font-opensans text-gray-500 py-6">
                        No sub types available for this search.
                      </p>
                    ) : (
                      subTypeOptions.map((st) => {
                        const checked = (draft.subTypes || []).includes(
                          lcStr(st.key),
                        );
                        return (
                          <CheckboxRow
                            key={st.key}
                            checked={checked}
                            label={st.label}
                            subLabel={
                              typeof st.count === "number" ? `${st.count}` : ""
                            }
                            onClick={() =>
                              setDraft((p) => ({
                                ...p,
                                subTypes: toggleInList(
                                  p.subTypes || [],
                                  st.key,
                                ),
                              }))
                            }
                          />
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* COLOUR SECTION (preset palette swatches) */}
              {section === "color" && (
                <div>
                  <button
                    onClick={() => setSection(null)}
                    className="w-full flex items-center justify-between py-3"
                    type="button"
                  >
                    <span className="font-opensans text-base font-semibold text-black">
                      Colour
                    </span>
                    <IoChevronDownOutline className="mr-[13px] shrink-0 rotate-180 text-lg text-gray-500" />
                  </button>

               
                    <div className="grid grid-cols-4   gap-x-4 gap-y-5">
                      {" "}
                      {paletteSwatches.map((sw) => {
                        const selected = draft.colors.includes(sw.key);
                        return (
                          <button
                             key={sw.key}
                           type="button"
                            onClick={() =>
                              setDraft((p) => ({
                                ...p,
                                colors: toggleInList(p.colors || [], sw.key),
                              }))
                            }
                            className="flex flex-col items-center"
                          >
                            <div
                              className={[
                                "w-10 h-10 rounded-full",
                                sw.needsBorder ? "border border-gray-200" : "",
                                selected
                                  ? "ring-2 ring-black ring-offset-2"
                                  : "",
                              ].join(" ")}
                              style={{ background: sw.css }}
                            />
                            <span className="mt-1 text-xs font-opensans text-gray-700 whitespace-nowrap">
                              {sw.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
               
              )}

              {/* PRICE SECTION (inputs + preset radio ranges) */}
              {section === "price" && (
                <div>
                  <button
                    onClick={() => setSection(null)}
                    className="w-full flex items-center justify-between py-3"
                    type="button"
                  >
                    <span className="font-opensans text-sm font-semibold text-black">
                      Price
                    </span>
                    <IoChevronDownOutline className="mr-[13px] shrink-0 rotate-180 text-lg text-gray-500" />
                  </button>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <input
                        value={draft.priceMin}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            priceMin: e.target.value.replace(/[^\d]/g, ""),
                          }))
                        }
                        className="w-full h-11 border border-gray-200 rounded-xl px-3 font-opensans text-sm focus:outline-customOrange"
                        placeholder="From"
                        inputMode="numeric"
                      />
                    </div>

                    <div>
                      <input
                        value={draft.priceMax}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            priceMax: e.target.value.replace(/[^\d]/g, ""),
                          }))
                        }
                        className="w-full h-11 border border-gray-200 rounded-xl px-3 font-opensans text-sm focus:outline-customOrange"
                        placeholder="To"
                        inputMode="numeric"
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    {PRICE_PRESETS.map((p) => (
                      <RadioRow
                        key={p.id}
                        label={p.label}
                        selected={selectedPricePresetId === p.id}
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            priceMin: p.min,
                            priceMax: p.max,
                          }))
                        }
                      />
                    ))}
                  </div>
                </div>
              )}
              {section === "condition" && (
  <div>
    <button onClick={() => setSection(null)} className="w-full flex items-center justify-between py-3" type="button">
      <span className="font-opensans text-base font-semibold text-black">Condition</span>
      <IoChevronDownOutline className="mr-[13px] shrink-0 rotate-180 text-lg text-gray-500" />
    </button>

    <div className="mt-2">
      {CONDITION_OPTIONS.map((c) => {
        const checked = (draft.conditions || []).includes(lcStr(c.value));
        return (
          <CheckboxRow
            key={c.value}
            checked={checked}
            label={c.label}
            onClick={() =>
              setDraft((p) => ({
                ...p,
                conditions: toggleInList(p.conditions || [], c.value),
              }))
            }
          />
        );
      })}
    </div>
  </div>
)}

            </div>

            {/* Footer buttons */}
            <div className="shrink-0 bg-white px-4 py-4 border-t border-gray-100 flex items-center gap-3 z-10">
              <button
                onClick={onClose}
                className="flex-1 h-12 text-base rounded-2xl bg-gray-200 font-opensans font-medium text-gray-900"
                type="button"
              >
                Cancel
              </button>

              <button
                onClick={apply}
                disabled={!canApply}
                className={[
                  "flex-1 h-12 rounded-2xl font-opensans text-base font-medium",
                  canApply
                    ? "bg-customOrange text-white"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed",
                ].join(" ")}
                type="button"
              >
                {primaryLabel}
              </button>
            </div>
    </AppBottomSheet>
  );
}

function getResultTypes(items, facets) {
  const facetTypes = uniq(
    (facets?.productTypes || []).map((entry) =>
      cleanStr(typeof entry === "string" ? entry : entry?.key),
    ),
  );
  return facetTypes.length ? facetTypes : uniq((items || []).map(getItemType));
}

function getResultSubTypesForType(typeName, items, facets) {
  const target = lcStr(typeName);
  if (!target) return [];

  const facetEntry = (facets?.productTypes || []).find(
    (entry) => lcStr(typeof entry === "string" ? entry : entry?.key) === target,
  );
  const facetSubTypes = uniq(
    (facetEntry && typeof facetEntry === "object" ? facetEntry.subTypes : []).map(
      (entry) => cleanStr(typeof entry === "string" ? entry : entry?.key),
    ),
  );
  if (facetSubTypes.length) return facetSubTypes;

  return uniq(
    (items || [])
      .filter((item) => lcStr(getItemType(item)) === target)
      .map(getItemSubType),
  );
}

function getContextualSubTypesForType(typeName, selectedSubTypes, items, facets) {
  const selected = Array.isArray(selectedSubTypes)
    ? selectedSubTypes.map(cleanStr).filter(Boolean)
    : [];
  const resultSubTypes = getResultSubTypesForType(typeName, items, facets);
  if (!selected.length) return resultSubTypes;
  if (!resultSubTypes.length) return selected;

  const resultKeys = new Set(resultSubTypes.map(lcStr));
  return selected.filter((subType) => resultKeys.has(lcStr(subType)));
}

function getContextualSizesForType(typeName, selectedSubTypes, items, facets) {
  const contexts = getContextualSubTypesForType(
    typeName,
    selectedSubTypes,
    items,
    facets,
  );
  if (
    Array.isArray(selectedSubTypes) &&
    selectedSubTypes.length > 0 &&
    getResultSubTypesForType(typeName, items, facets).length > 0 &&
    contexts.length === 0
  ) {
    return [];
  }
  return getSizesForType(typeName, contexts);
}

export function getSizeFilterTypes(items = [], facets = null) {
  return getResultTypes(items, facets).filter((typeName) =>
    getSizesForType(
      typeName,
      getResultSubTypesForType(typeName, items, facets),
    ).length > 0,
  );
}

export function isNoSizeFilterContext(typeName, subTypes = []) {
  const type = cleanStr(typeName);
  if (!type) return false;
  if (
    getListingSizingProfile(type, "")?.kind === LISTING_SIZE_KINDS.NONE
  ) {
    return true;
  }

  const contexts = Array.isArray(subTypes)
    ? subTypes.map(cleanStr).filter(Boolean)
    : [];
  if (!contexts.length) return false;

  let sawNoneLeaf = false;
  for (const subType of contexts) {
    const profile = getListingSizingProfile(type, subType);
    if (profile?.kind !== LISTING_SIZE_KINDS.NONE) return false;
    sawNoneLeaf = true;
  }
  return sawNoneLeaf;
}

export function sanitizeSizeFilterValues(filters) {
  const rawSizes = Array.isArray(filters?.sizes)
    ? filters.sizes.filter(Boolean)
    : [];
  if (!rawSizes.length || !filters?.sizeType) return rawSizes;
  if (isNoSizeFilterContext(filters.sizeType, filters.subTypes)) return [];

  // A stale implicit sentinel can survive after a subtype is cleared. Remove
  // only that exact internal value when the known catalog context does not
  // offer it; preserve every other legacy raw label.
  const catalogTypeKey = findKeyCaseInsensitive(productSizes, filters.sizeType);
  if (!catalogTypeKey) return rawSizes;
  const allowedSizeKeys = new Set(
    getSizesForType(filters.sizeType, filters.subTypes).map(lcStr),
  );
  const implicitSizeKey = lcStr(IMPLICIT_ONE_SIZE);
  return rawSizes.filter(
    (size) =>
      lcStr(size) !== implicitSizeKey || allowedSizeKeys.has(implicitSizeKey),
  );
}
