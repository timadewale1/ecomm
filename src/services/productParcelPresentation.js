// Listing-time parcel guidance. Delivery pricing remains server-authoritative
// and recalculates the complete parcel from every accepted item and quantity.

const normalize = (value) =>
  String(value || "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const includesAny = (value, terms) => terms.some((term) => value.includes(term));

export const PARCEL_SIZE_OPTIONS = Object.freeze([
  {
    value: "very-small",
    label: "Very small",
    detail: "Jewellery, earrings, watches or compact accessories",
    rank: 0,
  },
  {
    value: "small",
    label: "Small",
    detail: "Clothes, jackets, one pair of shoes or compact bags",
    rank: 1,
  },
  {
    value: "medium",
    label: "Medium",
    detail: "Several folded clothes, multiple shoe boxes or bulky items",
    rank: 2,
  },
  {
    value: "large",
    label: "Large",
    detail: "Several shoes, bulky items or large home décor",
    rank: 3,
  },
  {
    value: "special-handling",
    label: "Special handling",
    detail: "Furniture, appliances or oversized items needing a custom quote",
    rank: 4,
  },
]);

const optionFor = (key) =>
  PARCEL_SIZE_OPTIONS.find((option) => option.value === key) || null;

const VERY_SMALL_FASHION = [
  "jewelry",
  "jewellery",
  "earring",
  "necklace",
  "wristwatch",
  "watch",
  "hair accessor",
];

const LARGE_LIFESTYLE = new Set([
  "sports & outdoors",
  "baby & kids",
  "pet supplies",
  "plants & gardening",
  "tools & diy",
]);

const MEDIUM_LIFESTYLE = new Set([
  "cameras",
  "electronics",
  "gift packages",
  "art & craft",
  "home decor",
  "glassware",
  "kitchen & dining",
  "toys & games",
  "vintage & collectibles",
]);

const SPECIAL_HANDLING_TYPES = new Set(["furniture", "appliances"]);
const SPECIAL_HANDLING_SUBTYPES = new Set([
  "bicycles",
  "strollers",
  "car seats",
  "nursery furniture",
  "fitness equipment",
  "golf clubs",
  "building materials",
  "refrigerators",
  "washers & dryers",
  "dishwashers",
  "ovens",
  "air conditioners",
]);

export function getProductParcelPresentation({
  itemClass,
  productType,
  subType,
}) {
  const type = normalize(productType);
  const subtype = normalize(subType);
  if (!type) return null;

  let key;
  if (itemClass === "fashion") {
    const descriptor = `${type} ${subtype}`;
    key = includesAny(descriptor, VERY_SMALL_FASHION)
      ? "very-small"
      : "small";
  } else if (
    SPECIAL_HANDLING_TYPES.has(type) ||
    SPECIAL_HANDLING_SUBTYPES.has(subtype)
  ) {
    key = "special-handling";
  } else if (LARGE_LIFESTYLE.has(type)) {
    key = "large";
  } else if (MEDIUM_LIFESTYLE.has(type)) {
    key = "medium";
  } else {
    key = "small";
  }

  const option = optionFor(key);
  return option
    ? {
        key: option.value,
        label: option.label,
        detail: option.detail,
        minimumRank: option.rank,
      }
    : null;
}

/**
 * Vendors may choose a larger parcel when the item is bulkier than average,
 * but cannot understate the taxonomy's safe minimum. This is deliberately
 * conservative because the selected tier is used in a courier quote.
 */
export function getAllowedParcelSizeOptions(parcelRecommendation) {
  if (!parcelRecommendation) return [];
  if (parcelRecommendation.key === "special-handling") {
    const specialHandling = optionFor("special-handling");
    const { rank: _rank, ...publicOption } = specialHandling;
    return [publicOption];
  }

  return PARCEL_SIZE_OPTIONS.filter(
    (option) =>
      option.value !== "very-small" ||
      parcelRecommendation.key === "very-small",
  ).map(({ rank: _rank, ...option }) => option);
}

export function isParcelSizeSelectionSafe(value, parcelRecommendation) {
  return Boolean(
    parcelRecommendation &&
      getAllowedParcelSizeOptions(parcelRecommendation).some(
        (option) => option.value === value,
      ),
  );
}

export function getParcelSizeOption(value) {
  const option = optionFor(value);
  if (!option) return null;
  const { rank: _rank, ...publicOption } = option;
  return publicOption;
}
