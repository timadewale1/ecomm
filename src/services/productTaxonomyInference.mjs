const MIN_LABEL_CONFIDENCE = 0.45;
const MIN_SUGGESTION_SCORE = 0.48;

const STOP_WORDS = new Set([
  "and",
  "for",
  "good",
  "goods",
  "item",
  "items",
  "product",
  "products",
  "the",
  "with",
]);

const TAG_LABEL_BLOCKLIST = new Set([
  "apparel",
  "clothing",
  "fashion",
  "fashion accessory",
  "fashion good",
  "footwear",
  "garment",
  "product",
  "shoe",
]);

const FASHION_CLASS_HINTS = new Set([
  "apparel",
  "clothing",
  "fashion",
  "fashion accessory",
  "fashion good",
  "footwear",
  "garment",
  "jewellery",
  "jewelry",
  "shoe",
]);

const EVERYDAY_CLASS_HINTS = new Set([
  "appliance",
  "book",
  "camera",
  "electronic device",
  "electronics",
  "furniture",
  "home good",
  "houseplant",
  "kitchen appliance",
  "plant",
  "tableware",
  "toy",
]);

const TYPE_ALIASES = {
  fashion: {
    Jeans: ["jean", "jeans", "denim pants"],
    Skincare: ["skin care", "skincare", "cosmetic skincare"],
    "Corporate Women": ["women suit", "women business suit", "women workwear"],
    "Corporate Men": ["men suit", "men business suit", "men workwear"],
    Skirts: ["skirt"],
    "T-Shirts": ["t shirt", "tee shirt", "tee"],
    "Hair Accessories": ["hair accessory", "hair accessories"],
    Jackets: ["coat", "jacket", "outerwear"],
    Dresses: ["dress", "gown"],
    Sweatpants: ["sweatpants", "jogger pants"],
    Hats: ["cap", "hat", "headwear"],
    Bags: ["bag", "handbag", "luggage and bags", "purse"],
    Sunglasses: ["sunglasses", "eyewear", "sun glasses"],
    Perfumes: ["cologne", "fragrance", "perfume"],
    Underwears: ["lingerie", "underclothes", "underwear"],
    "Hair Products": ["hair care", "hair product"],
    Sportswear: ["athletic clothing", "sportswear", "sports uniform"],
    Footwear: ["boot", "footwear", "sandal", "shoe", "sneaker"],
    "Gym Wear": ["activewear", "fitness clothing", "gym clothing"],
    Wristwatches: ["watch", "wristwatch"],
    Jewelry: ["jewellery", "jewelry"],
    Earrings: ["earring"],
    Necklaces: ["necklace"],
    "Sports Bras": ["sports bra"],
    "Hoodies & Sweatshirts": ["hoodie", "sweatshirt"],
    Belts: ["belt"],
    Corsets: ["corset"],
    Tops: ["blouse", "crop top", "shirt", "top"],
    Shorts: ["short pants", "shorts"],
    Scarves: ["scarf", "shawl"],
    "Tights & Leggings": ["leggings", "tights"],
    Gloves: ["glove"],
    Slides: ["slide sandal", "slides"],
  },
  everyday: {
    Books: ["book", "publication"],
    Cameras: ["camera", "camera lens", "photographic equipment"],
    Electronics: ["computer", "electronic device", "electronics", "gadget"],
    Furniture: ["furniture"],
    "Makeup & Beauty": ["beauty product", "cosmetics", "makeup"],
    "Art & Craft": ["art", "artwork", "craft"],
    "Home Decor": ["decoration", "home decor", "interior design"],
    Glassware: ["drinkware", "glassware"],
    "Kitchen & Dining": ["cookware", "kitchen utensil", "tableware"],
    "Tools & DIY": ["hand tool", "power tool", "tool"],
    "Toys & Games": ["game", "toy"],
    "Sports & Outdoors": ["outdoor equipment", "sporting goods", "sports equipment"],
    "Baby & Kids": ["baby product", "childrens toy", "nursery"],
    "Health & Personal Care": ["health care", "personal care", "wellness"],
    "Pet Supplies": ["pet product", "pet supplies"],
    "Gift Packages": ["gift basket", "gift box", "gift package"],
    "Vintage & Collectibles": ["antique", "collectible", "memorabilia", "vintage"],
    "Media & Entertainment": ["compact disc", "dvd", "record", "video game", "vinyl record"],
    Appliances: ["appliance", "home appliance", "kitchen appliance"],
    "Plants & Gardening": ["flowerpot", "garden", "gardening", "houseplant", "plant"],
    "Stationery & Office": ["office supplies", "stationery"],
  },
};

const SUBTYPE_ALIASES = [
  ["handbag", "Bags", "Handbags"],
  ["backpack", "Bags", "Backpacks"],
  ["tote bag", "Bags", "Tote Bags"],
  ["crossbody bag", "Bags", "Crossbody Bags"],
  ["sneaker", "Footwear", "Sneakers"],
  ["running shoe", "Footwear", "Sneakers"],
  ["loafer", "Footwear", "Loafers"],
  ["boot", "Footwear", "Boots"],
  ["sandal", "Footwear", "Sandals"],
  ["high heel", "Footwear", "Heels"],
  ["baseball cap", "Hats", "Baseball Caps"],
  ["bucket hat", "Hats", "Bucket Hats"],
  ["beanie", "Hats", "Beanies"],
  ["blazer", "Jackets", "Blazers"],
  ["leather jacket", "Jackets", "Leather Jackets"],
  ["denim jacket", "Jackets", "Denim Jackets"],
  ["puffer jacket", "Jackets", "Puffer Jackets"],
  ["maxi dress", "Dresses", "Maxi Dresses"],
  ["mini dress", "Dresses", "Mini Dresses"],
  ["cocktail dress", "Dresses", "Cocktail Dresses"],
  ["bodycon dress", "Dresses", "Bodycon Dresses"],
  ["graphic tee", "T-Shirts", "Graphic Tees"],
  ["crop top", "T-Shirts", "Crop Tops"],
  ["smartwatch", "Wristwatches", "Smart Watches"],
  ["digital watch", "Wristwatches", "Digital Watches"],
  ["hoop earring", "Earrings", "Hoop Earrings"],
  ["stud earring", "Earrings", "Stud Earrings"],
  ["pendant necklace", "Necklaces", "Pendant Necklaces"],
  ["sofa", "Furniture", "Sofas"],
  ["chair", "Furniture", "Chairs"],
  ["table", "Furniture", "Tables"],
  ["bed", "Furniture", "Beds"],
  ["desk", "Furniture", "Desks"],
  ["bookcase", "Furniture", "Bookcases"],
  ["headphone", "Electronics", "Headphones"],
  ["speaker", "Electronics", "Speakers"],
  ["smartphone", "Electronics", "Smartphones"],
  ["laptop", "Electronics", "Laptops"],
  ["tablet computer", "Electronics", "Tablets"],
  ["monitor", "Electronics", "Monitors"],
  ["dslr", "Cameras", "DSLR"],
  ["polaroid", "Cameras", "Polaroid"],
  ["mirrorless camera", "Cameras", "Mirrorless"],
  ["action camera", "Cameras", "Action Cameras"],
  ["film camera", "Cameras", "Film Cameras"],
  ["wine glass", "Glassware", "Wine Glasses"],
  ["tumbler", "Glassware", "Tumblers"],
  ["vase", "Home Decor", "Vases"],
  ["rug", "Home Decor", "Rugs"],
  ["mirror", "Home Decor", "Mirrors"],
  ["candle", "Home Decor", "Candles"],
  ["refrigerator", "Appliances", "Refrigerators"],
  ["microwave oven", "Appliances", "Microwaves"],
  ["air conditioner", "Appliances", "Air Conditioners"],
  ["vacuum cleaner", "Appliances", "Vacuum Cleaners"],
  ["coffee maker", "Appliances", "Coffee Makers"],
  ["blender", "Appliances", "Blenders"],
];

const AUDIENCE_HINTS = [
  { category: "Kids", phrases: ["baby clothing", "childrens clothing", "kids clothing"] },
  { category: "Womens", phrases: ["womens clothing", "womenswear"] },
  { category: "Mens", phrases: ["mens clothing", "menswear"] },
  { category: "all", phrases: ["unisex clothing", "unisex fashion"] },
];

export const normalizeTaxonomyText = (value) =>
  String(value || "")
    .normalize("NFKD")
    .replace(/[’']/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();

const singularize = (token) => {
  if (token.endsWith("ies") && token.length > 4) return `${token.slice(0, -3)}y`;
  if (token.endsWith("sses")) return token.slice(0, -2);
  if (token.endsWith("s") && !token.endsWith("ss") && token.length > 3) {
    return token.slice(0, -1);
  }
  return token;
};

const tokensFor = (value) =>
  normalizeTaxonomyText(value)
    .split(" ")
    .map(singularize)
    .filter((token) => token && !STOP_WORDS.has(token));

const phrasesMatch = (left, right) => {
  const normalizedLeft = normalizeTaxonomyText(left);
  const normalizedRight = normalizeTaxonomyText(right);
  if (!normalizedLeft || !normalizedRight) return 0;
  if (normalizedLeft === normalizedRight) return 1;
  if (
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  ) {
    return 0.84;
  }
  const leftTokens = new Set(tokensFor(normalizedLeft));
  const rightTokens = new Set(tokensFor(normalizedRight));
  if (!leftTokens.size || !rightTokens.size) return 0;
  const overlap = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return overlap / Math.max(leftTokens.size, rightTokens.size);
};

const normalizeLabels = (labels) =>
  (Array.isArray(labels) ? labels : [])
    .map((label) => ({
      text: String(label?.text || "").trim(),
      normalized: normalizeTaxonomyText(label?.text),
      confidence: Number(label?.confidence),
    }))
    .filter(
      (label) =>
        label.text &&
        Number.isFinite(label.confidence) &&
        label.confidence >= MIN_LABEL_CONFIDENCE,
    )
    .sort((left, right) => right.confidence - left.confidence);

const subtypeName = (subtype) =>
  typeof subtype === "string"
    ? subtype
    : String(subtype?.name || subtype?.value || "");

const taxonomyEntries = (itemClass, types) =>
  (Array.isArray(types) ? types : []).map((type) => ({
    itemClass,
    productType: String(type?.type || ""),
    subTypes: (type?.subTypes || []).map(subtypeName).filter(Boolean),
  }));

const findSubtypeAlias = (label, productType) => {
  let best = null;
  for (const [alias, targetType, targetSubtype] of SUBTYPE_ALIASES) {
    if (targetType !== productType) continue;
    const strength = phrasesMatch(label, alias);
    if (strength >= 0.84 && (!best || strength > best.strength)) {
      best = { subType: targetSubtype, strength };
    }
  }
  return best;
};

const inferAudience = (labels) => {
  for (const hint of AUDIENCE_HINTS) {
    const matched = labels.some((label) =>
      hint.phrases.some((phrase) => phrasesMatch(label.normalized, phrase) >= 0.84),
    );
    if (matched) return hint.category;
  }
  return null;
};

const classEvidenceFor = (labels, itemClass) => {
  const hints = itemClass === "fashion" ? FASHION_CLASS_HINTS : EVERYDAY_CLASS_HINTS;
  return labels.reduce((score, label) => {
    if (hints.has(label.normalized)) return Math.max(score, label.confidence);
    return score;
  }, 0);
};

const scoreEntry = (entry, labels) => {
  const aliases = TYPE_ALIASES[entry.itemClass]?.[entry.productType] || [];
  const evidence = [];
  let score = 0;
  let bestSubtype = "";
  let bestSubtypeScore = 0;

  labels.forEach((label) => {
    const typeStrength = Math.max(
      phrasesMatch(label.normalized, entry.productType),
      ...aliases.map((alias) => phrasesMatch(label.normalized, alias)),
    );
    if (typeStrength >= 0.5) {
      const contribution = label.confidence * typeStrength;
      score += contribution;
      evidence.push({ text: label.text, confidence: label.confidence });
    }

    entry.subTypes.forEach((subType) => {
      const subtypeStrength = phrasesMatch(label.normalized, subType);
      const subtypeScore = label.confidence * subtypeStrength;
      if (subtypeStrength >= 0.6 && subtypeScore > bestSubtypeScore) {
        bestSubtype = subType;
        bestSubtypeScore = subtypeScore;
      }
    });

    const aliasedSubtype = findSubtypeAlias(label.normalized, entry.productType);
    const aliasScore = label.confidence * Number(aliasedSubtype?.strength || 0);
    if (aliasedSubtype && aliasScore > bestSubtypeScore) {
      bestSubtype = aliasedSubtype.subType;
      bestSubtypeScore = aliasScore;
    }
  });

  if (bestSubtypeScore) score += bestSubtypeScore * 0.7;
  score += classEvidenceFor(labels, entry.itemClass) * 0.12;

  return {
    ...entry,
    subType: bestSubtype,
    score,
    matchedLabels: [...new Map(evidence.map((item) => [item.text, item])).values()],
  };
};

export const rankProductTaxonomySuggestions = ({
  labels,
  fashionTypes,
  everydayTypes,
  limit = 3,
} = {}) => {
  const normalizedLabels = normalizeLabels(labels);
  if (!normalizedLabels.length) return [];

  const audience = inferAudience(normalizedLabels);
  const entries = [
    ...taxonomyEntries("fashion", fashionTypes),
    ...taxonomyEntries("everyday", everydayTypes),
  ];

  const ranked = entries
    .map((entry) => scoreEntry(entry, normalizedLabels))
    .filter((entry) => entry.productType && entry.score >= MIN_SUGGESTION_SCORE)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (Boolean(right.subType) !== Boolean(left.subType)) {
        return Number(Boolean(right.subType)) - Number(Boolean(left.subType));
      }
      return left.productType.localeCompare(right.productType);
    });

  const seen = new Set();
  const suggestions = [];
  for (const entry of ranked) {
    const key = `${entry.itemClass}:${entry.productType}:${entry.subType}`;
    if (seen.has(key)) continue;
    seen.add(key);
    suggestions.push({
      itemClass: entry.itemClass,
      category: entry.itemClass === "everyday" ? "all" : audience,
      productType: entry.productType,
      subType: entry.subType || "",
      score: Number(entry.score.toFixed(4)),
      strength: entry.score >= 1.05 ? "strong" : "possible",
      matchedLabels: entry.matchedLabels.slice(0, 3),
    });
    if (suggestions.length >= Math.max(1, Number(limit) || 1)) break;
  }
  return suggestions;
};

/**
 * Converts useful on-device image labels into optional tag chips. These are
 * never committed automatically: the vendor still chooses which tags become
 * part of the listing.
 */
export const buildImageLabelTagSuggestions = (labels, { limit = 8 } = {}) => {
  const seen = new Set();
  return normalizeLabels(labels)
    .filter((label) => label.confidence >= 0.62)
    .filter((label) => {
      if (
        !label.normalized ||
        TAG_LABEL_BLOCKLIST.has(label.normalized) ||
        label.normalized.length < 3 ||
        label.normalized.length > 32
      ) {
        return false;
      }
      if (seen.has(label.normalized)) return false;
      seen.add(label.normalized);
      return true;
    })
    .slice(0, Math.max(0, Number(limit) || 0))
    .map((label) => label.text);
};

export const PRODUCT_IMAGE_LABEL_THRESHOLD = MIN_LABEL_CONFIDENCE;
