const FASHION_GROUPS = [
  {
    label: "Head, face & beauty",
    types: [
      "Hats",
      "Sunglasses",
      "Hair Accessories",
      "Hair Products",
      "Skincare",
      "Perfumes",
    ],
  },
  {
    label: "Tops & outerwear",
    types: [
      "Tops",
      "T-Shirts",
      "Jackets",
      "Hoodies & Sweatshirts",
      "Corsets",
    ],
  },
  {
    label: "Dresses & one-pieces",
    types: ["Dresses"],
  },
  {
    label: "Bottoms",
    types: ["Jeans", "Skirts", "Shorts", "Sweatpants", "Tights & Leggings"],
  },
  {
    label: "Footwear",
    types: ["Footwear", "Slides"],
  },
  {
    label: "Corporate",
    types: ["Corporate Women", "Corporate Men"],
  },
  {
    label: "Activewear",
    types: ["Sportswear", "Gym Wear"],
  },
  {
    label: "Intimates",
    types: ["Underwears", "Sports Bras"],
  },
  {
    label: "Bags & accessories",
    types: ["Bags", "Belts", "Scarves", "Gloves"],
  },
  {
    label: "Jewellery & watches",
    types: ["Jewelry", "Earrings", "Necklaces", "Wristwatches"],
  },
];

const EVERYDAY_GROUPS = [
  {
    label: "Home & living",
    types: [
      "Furniture",
      "Home Decor",
      "Glassware",
      "Kitchen & Dining",
      "Appliances",
    ],
  },
  {
    label: "Tech & cameras",
    types: ["Electronics", "Cameras"],
  },
  {
    label: "Books & media",
    types: ["Books", "Media & Entertainment"],
  },
  {
    label: "Art, hobbies & collectibles",
    types: ["Art & Craft", "Vintage & Collectibles"],
  },
  {
    label: "Sports & outdoors",
    types: ["Sports & Outdoors"],
  },
  {
    label: "Kids, family & pets",
    types: ["Toys & Games", "Baby & Kids", "Pet Supplies"],
  },
  {
    label: "Beauty & personal care",
    types: ["Makeup & Beauty", "Health & Personal Care"],
  },
  {
    label: "Tools, garden & office",
    types: ["Tools & DIY", "Plants & Gardening", "Stationery & Office"],
  },
  {
    label: "Gifts",
    types: ["Gift Packages"],
  },
];

const WOMEN_ONLY_FASHION_TYPES = new Set([
  "Corporate Women",
  "Skirts",
  "Dresses",
  "Sports Bras",
  "Corsets",
]);

const MEN_ONLY_FASHION_TYPES = new Set(["Corporate Men"]);

/**
 * Returns an audience only when the catalogue itself makes the audience
 * unambiguous. Generic types (for example Tops or Footwear) intentionally
 * return null so image automation never guesses a buyer-facing gender.
 */
export const getExplicitAudienceForProductType = (productType) => {
  const value = String(productType || "").trim();
  if (WOMEN_ONLY_FASHION_TYPES.has(value)) return "Womens";
  if (MEN_ONLY_FASHION_TYPES.has(value)) return "Mens";
  return null;
};

/**
 * Presentation-only audience guard for fashion listings. The saved taxonomy
 * and product schema stay unchanged; clearly incompatible top-level types are
 * simply omitted from the selector.
 */
export const filterProductTypeOptionsForAudience = (
  options,
  category,
  itemClass = "fashion",
) => {
  if (itemClass !== "fashion") return options || [];
  const blocked =
    category === "Mens"
      ? WOMEN_ONLY_FASHION_TYPES
      : category === "Womens"
        ? MEN_ONLY_FASHION_TYPES
        : null;
  if (!blocked) return options || [];
  return (options || []).filter((option) => !blocked.has(option.value));
};

export const getTaxonomySubTypeNames = (productType) =>
  (productType?.subTypes || [])
    .map((subType) =>
      typeof subType === "string" ? subType : String(subType?.name || ""),
    )
    .map((subType) => subType.trim())
    .filter(Boolean);

export const buildProductTypePickerOptions = (productTypes, itemClass) => {
  const groups = itemClass === "fashion" ? FASHION_GROUPS : EVERYDAY_GROUPS;
  const typesByName = new Map(
    (productTypes || []).map((productType) => [productType.type, productType]),
  );
  const usedTypes = new Set();
  const options = [];

  groups.forEach((group) => {
    group.types.forEach((typeName) => {
      const productType = typesByName.get(typeName);
      if (!productType) return;

      const subTypeNames = getTaxonomySubTypeNames(productType);
      options.push({
        label: productType.type,
        value: productType.type,
        subTypes: productType.subTypes,
        group: group.label,
        searchTerms: subTypeNames,
        detail: subTypeNames.length
          ? `${subTypeNames.slice(0, 3).join(" · ")}${subTypeNames.length > 3 ? "…" : ""}`
          : "",
      });
      usedTypes.add(productType.type);
    });
  });

  // New catalog entries remain selectable even before a presentation group is
  // assigned. This prevents a UI grouping omission from blocking listings.
  (productTypes || []).forEach((productType) => {
    if (usedTypes.has(productType.type)) return;
    const subTypeNames = getTaxonomySubTypeNames(productType);
    options.push({
      label: productType.type,
      value: productType.type,
      subTypes: productType.subTypes,
      group: "Other",
      searchTerms: subTypeNames,
      detail: subTypeNames.length
        ? `${subTypeNames.slice(0, 3).join(" · ")}${subTypeNames.length > 3 ? "…" : ""}`
        : "",
    });
  });

  return options;
};
