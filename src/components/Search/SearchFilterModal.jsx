// src/components/Search/SearchFilterModal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IoCloseOutline, IoChevronDownOutline } from "react-icons/io5";
import productSizes from "../../pages/vendor/productsizes";
import { PALETTE, PALETTE_ORDER } from "../../services/pallete";
import { IoCheckmark } from "react-icons/io5";

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

function flattenSizesEntry(entry) {
  if (!entry) return [];
  if (Array.isArray(entry)) return entry;

  if (typeof entry === "object") {
    const out = [];
    for (const v of Object.values(entry)) {
      if (Array.isArray(v)) out.push(...v);
      else if (v && typeof v === "object") {
        for (const vv of Object.values(v)) {
          if (Array.isArray(vv)) out.push(...vv);
        }
      }
    }
    return out;
  }
  return [];
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

export function getSizesForType(typeName) {
  const key = cleanStr(typeName);
  const matchedKey = findKeyCaseInsensitive(productSizes, key);
  const entry = matchedKey ? productSizes?.[matchedKey] : null;
  return uniq(flattenSizesEntry(entry));
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

  if (filters?.sizeType) payload.productType = lcStr(filters.sizeType);
  if (filters?.sizes?.length) payload.sizes = filters.sizes.map(lcStr);

  // Category is now single-select in UI; backend can still accept array
  if (filters?.category) payload.category = [lcStr(filters.category)];
 if (filters?.conditions?.length) payload.conditions = filters.conditions.map(lcStr);
  // Color is multi-select swatches
  if (filters?.colors?.length) payload.colors = filters.colors.map(lcStr);
  if (filters?.subTypes?.length) payload.subTypes = filters.subTypes.map(lcStr);
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
}) {
  const [section, setSection] = useState(null); // "size" | "category" | "price" | "color" | null
  const [draft, setDraft] = useState(DEFAULT_DRAFT);
  const [previewTotal, setPreviewTotal] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

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

  const recommendedType = useMemo(
    () => getRecommendedTypeFromItems(items || []),
    [items],
  );

  const typesInResults = useMemo(() => {
    const raw = uniq((items || []).map(getItemType));
    const filtered = raw.filter((t) => getSizesForType(t).length > 0);
    return filtered.length ? filtered : raw;
  }, [items]);

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

      if (!next.sizeType)
        next.sizeType = recommendedType || typesInResults?.[0] || null;

      if (next.sizeType && getSizesForType(next.sizeType).length === 0) {
        next.sizeType = recommendedType || typesInResults?.[0] || null;
      }
      next.sort = cleanStr(next.sort) || "relevance";
      next.subTypes = Array.isArray(next.subTypes)
        ? next.subTypes.map(lcStr).filter(Boolean)
        : [];
next.conditions = Array.isArray(next.conditions)
  ? next.conditions.map(lcStr).filter(Boolean)
  : [];

      // normalize in-memory values
      next.category = next.category ? lcStr(next.category) : null;
      next.colors = Array.isArray(next.colors)
        ? next.colors.map(lcStr).filter(Boolean)
        : [];
      next.sizes = Array.isArray(next.sizes) ? next.sizes : [];

      return next;
    });

    setSection(initialSection || null);
    setPreviewTotal(null);
  }, [open, appliedFilters, recommendedType, typesInResults, initialSection]);

  // lock body scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = prev);
  }, [open]);

  const activeCount = useMemo(() => {
    let n = 0;
    if (draft.sort && draft.sort !== "relevance") n += 1; // ✅ NEW
    if (draft.subTypes?.length) n += 1;
    if (draft.sizeType && draft.sizes?.length) n += 1;
    if (draft.category) n += 1;
    if (draft.conditions?.length) n += 1;

    if (draft.colors?.length) n += 1;
    if (draft.priceMin || draft.priceMax) n += 1;
    return n;
  }, [draft]);

  const sizesForSelectedType = useMemo(() => {
    if (!draft.sizeType) return [];
    return getSizesForType(draft.sizeType);
  }, [draft.sizeType]);

  const toggleInList = (list, value) => {
    const v = lcStr(value);
    if (!v) return list;
    return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
  };

  const clearAll = () => {
    setDraft({
      ...DEFAULT_DRAFT,
      sizeType: recommendedType || typesInResults?.[0] || null,
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
    if (!query) return;

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
            q: query,
            pageSize: 1,
            sort: draft.sort || "relevance",
            cursor: null,
            strictVariant: false,
            filters: buildFiltersPayload(draft),
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
  }, [open, query, searchUrl, draft]);

  const primaryLabel = useMemo(() => {
    if (previewLoading) return "Checking…";
    if (typeof previewTotal === "number") {
      const t = previewTotal;
      const bucket = bucket10Plus(t);
      if (bucket === 0) return "See Results";
      return `See ${bucket} Results`;
    }
  }, [previewLoading, previewTotal]);

  const canApply =
    !previewLoading &&
    !(typeof previewTotal === "number" && previewTotal === 0);

  const apply = () => {
    if (!canApply) return;
    onApply?.(draft);
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
  }, [draft, sortLabelMap, subTypeLabelMap, colorLabelMap]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1000] bg-black/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose?.();
          }}
        >
          <motion.div
            className="absolute inset-x-0 bottom-0 top-0 bg-white flex flex-col"
            initial={{ y: "8%" }}
            animate={{ y: 0 }}
            exit={{ y: "8%" }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
          >
            {/* Header */}
            <div className="relative px-4 pt-4 pb-3  flex items-center">
              {/* Close Button (Left) - Added 'z-10' to ensure it stays clickable above text if they overlap */}
              <button
                onClick={onClose}
                className="p-2 -ml-2 relative z-10"
                type="button"
              >
                <IoCloseOutline className="text-3xl text-black" />
              </button>

              {/* Filter Text (Absolute Center) */}
              <p className="absolute left-1/2 -translate-x-1/2 font-opensans font-semibold text-2xl text-black">
                Filter
              </p>
            </div>

            {/* Body */}
            {/* ✅ min-h-0 fixes footer not showing */}
  <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">

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
                    {
                      key: "size",
                      label: `Size${draft.sizes?.length ? ` (${draft.sizes.length})` : ""}`,
                    },

                    { key: "category", label: "Category" },
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
                      <IoChevronDownOutline className="text-lg text-gray-500" />
                    </button>
                  ))}
                </div>
              )}

              {/* SIZE SECTION */}
              {section === "size" && (
                <div>
                  <button
                    onClick={() => setSection(null)}
                    className="w-full flex items-center justify-between py-3"
                    type="button"
                  >
                    <span className="font-opensans text-base font-semibold text-black">
                      Size
                    </span>
                    <IoChevronDownOutline className="text-lg text-gray-500 rotate-180" />
                  </button>

                  <div className="mt-2 p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                    <div className="text-xs font-opensans text-gray-700">
                      Save your sizes to shop what fits
                    </div>
                    <button
                      className="text-xs font-opensans font-semibold text-customOrange"
                      type="button"
                    >
                      Set My Sizes
                    </button>
                  </div>

                  <div className="mt-4 overflow-x-auto no-scrollbar">
                    <div className="flex gap-3 min-w-max border-b border-gray-100">
                      {(typesInResults.length
                        ? typesInResults
                        : Object.keys(productSizes)
                      ).map((t) => {
                        const active = draft.sizeType === t;
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
                    <IoChevronDownOutline className="text-lg text-gray-500 rotate-180" />
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
                    <IoChevronDownOutline className="text-lg text-gray-500 rotate-180" />
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
                    <IoChevronDownOutline className="text-lg text-gray-500 rotate-180" />
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
                    <IoChevronDownOutline className="text-lg text-gray-500 rotate-180" />
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
                    <IoChevronDownOutline className="text-lg text-gray-500 rotate-180" />
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
      <IoChevronDownOutline className="text-lg text-gray-500 rotate-180" />
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
            <div className="sticky bottom-0 left-0 right-0 bg-white px-4 py-6 border-t border-gray-100 flex items-center gap-3 z-10">
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
