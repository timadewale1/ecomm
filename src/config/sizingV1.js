/**
 * My Thrift sizing contract, version 1.
 *
 * Raw product size labels remain the display/transaction value. This module
 * only adds a scoped reference used by search and recommendations, so values
 * such as footwear 41 and dress 41 can never collide.
 */
export const SIZING_SCHEMA_VERSION = 1;

// Product-level sizing describes how a listing collects a variant value. It is
// intentionally separate from sizeRef.kind, which describes the shape of one
// canonical size value (single/range/waist-inseam).
export const LISTING_SIZE_KINDS = Object.freeze({
  APPAREL: "APPAREL",
  FIT_MODE: "FIT_MODE",
  NONE: "NONE",
});

export const IMPLICIT_ONE_SIZE = "One Size";
export const FIT_MODE_OPTIONS = Object.freeze([IMPLICIT_ONE_SIZE, "Adjustable"]);

export const FIT_DOMAINS = Object.freeze({
  FOOTWEAR: "footwear",
  UPPER_BODY: "upper_body",
  WHOLE_BODY: "whole_body",
  LOWER_BODY: "lower_body",
});

export const SIZE_SYSTEMS = Object.freeze({
  EU_FOOTWEAR: "EU_FOOTWEAR",
  INTL_ALPHA: "INTL_ALPHA",
  EU_APPAREL: "EU_APPAREL",
  WAIST_INSEAM_IN: "WAIST_INSEAM_IN",
});

const SYSTEM_KEY = Object.freeze({
  [SIZE_SYSTEMS.EU_FOOTWEAR]: "eu",
  [SIZE_SYSTEMS.INTL_ALPHA]: "intl",
  [SIZE_SYSTEMS.EU_APPAREL]: "eu",
  [SIZE_SYSTEMS.WAIST_INSEAM_IN]: "waist_inseam",
});

const ALPHA_SIZES = Object.freeze([
  "XXS",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "2XL",
  "3XL",
  "4XL",
  "5XL",
]);

const ALPHA_ALIASES = Object.freeze({
  xxs: "XXS",
  "2xs": "XXS",
  xxsmall: "XXS",
  extraextrasmall: "XXS",
  xs: "XS",
  xsmall: "XS",
  extrasmall: "XS",
  s: "S",
  small: "S",
  m: "M",
  medium: "M",
  med: "M",
  l: "L",
  large: "L",
  xl: "XL",
  xlarge: "XL",
  extralarge: "XL",
  xxl: "2XL",
  xxlarge: "2XL",
  "2xl": "2XL",
  "2x": "2XL",
  extraextralarge: "2XL",
  xxxl: "3XL",
  xxxlarge: "3XL",
  "3xl": "3XL",
  "3x": "3XL",
  xxxxl: "4XL",
  "4xl": "4XL",
  "4x": "4XL",
  xxxxxl: "5XL",
  "5xl": "5XL",
  "5x": "5XL",
});

const FOOTWEAR_OPTIONS = Object.freeze(
  Array.from({ length: 31 }, (_, index) => {
    const value = 35 + index * 0.5;
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }),
);

const EU_APPAREL_OPTIONS = Object.freeze(
  Array.from({ length: 17 }, (_, index) => String(30 + index * 2)),
);

const JEANS_OPTIONS = Object.freeze(
  Array.from({ length: 21 }, (_, waistOffset) => 24 + waistOffset).flatMap(
    (waist) => [28, 30, 32, 34, 36].map((inseam) => `W${waist}/L${inseam}`),
  ),
);

export const MY_SIZES_V1_OPTIONS = Object.freeze({
  footwear: FOOTWEAR_OPTIONS,
  upperBody: ALPHA_SIZES,
  wholeBody: EU_APPAREL_OPTIONS,
  lowerBody: EU_APPAREL_OPTIONS,
  jeans: JEANS_OPTIONS,
});

const UPPER_BODY_TYPES = new Set([
  "t-shirts",
  "jackets",
  "hoodies & sweatshirts",
  "tops",
  "corsets",
]);

const LOWER_BODY_TYPES = new Set([
  "skirts",
  "sweatpants",
  "shorts",
  "tights & leggings",
]);

const WHOLE_BODY_TYPES = new Set(["dresses"]);
const FOOTWEAR_TYPES = new Set(["footwear", "slides"]);

const CORPORATE_WOMEN_DOMAINS = Object.freeze({
  blazers: FIT_DOMAINS.UPPER_BODY,
  "dress shirts": FIT_DOMAINS.UPPER_BODY,
  "office tops": FIT_DOMAINS.UPPER_BODY,
  "long sleeve blouses": FIT_DOMAINS.UPPER_BODY,
  "pencil skirts": FIT_DOMAINS.LOWER_BODY,
  "wideleg trousers": FIT_DOMAINS.LOWER_BODY,
  "corporate dresses": FIT_DOMAINS.WHOLE_BODY,
  "pant suits": FIT_DOMAINS.WHOLE_BODY,
  "shirt dresses": FIT_DOMAINS.WHOLE_BODY,
  "blazer dresses": FIT_DOMAINS.WHOLE_BODY,
  jumpsuits: FIT_DOMAINS.WHOLE_BODY,
});

const CORPORATE_MEN_DOMAINS = Object.freeze({
  "white shirts": FIT_DOMAINS.UPPER_BODY,
  "light blue shirts": FIT_DOMAINS.UPPER_BODY,
  "suit vests": FIT_DOMAINS.UPPER_BODY,
  blazers: FIT_DOMAINS.UPPER_BODY,
  "double-breasted jackets": FIT_DOMAINS.UPPER_BODY,
  "button-up shirts": FIT_DOMAINS.UPPER_BODY,
  "checkered shirts": FIT_DOMAINS.UPPER_BODY,
  cardigans: FIT_DOMAINS.UPPER_BODY,
  "plain trousers": FIT_DOMAINS.LOWER_BODY,
  "dress pants": FIT_DOMAINS.LOWER_BODY,
  // Tailored suits cover two fit domains and deliberately remain neutral.
});

const SPORTSWEAR_DOMAINS = Object.freeze({
  jerseys: FIT_DOMAINS.UPPER_BODY,
  "tank tops": FIT_DOMAINS.UPPER_BODY,
  shorts: FIT_DOMAINS.LOWER_BODY,
  "compression pants": FIT_DOMAINS.LOWER_BODY,
  "yoga pants": FIT_DOMAINS.LOWER_BODY,
  "running shoes": FIT_DOMAINS.FOOTWEAR,
});

const GYM_WEAR_DOMAINS = Object.freeze({
  "tank tops": FIT_DOMAINS.UPPER_BODY,
  "compression shirts": FIT_DOMAINS.UPPER_BODY,
  "sports bras": null,
  hoodies: FIT_DOMAINS.UPPER_BODY,
  "gym t-shirts": FIT_DOMAINS.UPPER_BODY,
  windbreakers: FIT_DOMAINS.UPPER_BODY,
  "sleeveless hoodies": FIT_DOMAINS.UPPER_BODY,
  "gym jackets": FIT_DOMAINS.UPPER_BODY,
  shorts: FIT_DOMAINS.LOWER_BODY,
  joggers: FIT_DOMAINS.LOWER_BODY,
  leggings: FIT_DOMAINS.LOWER_BODY,
  sweatpants: FIT_DOMAINS.LOWER_BODY,
  "athletic tights": FIT_DOMAINS.LOWER_BODY,
  "compression shorts": FIT_DOMAINS.LOWER_BODY,
});

// Only audited leaves belong here. Measurement-led and composite categories
// deliberately fall through to their existing catalogue sizes until they have
// their own schemas.
const NO_SIZE_PRODUCT_TYPES = new Set([
  "bags",
  "earrings",
  "hair accessories",
]);

const NO_SIZE_SUBTYPES = Object.freeze({
  jewelry: new Set(["earrings", "brooches", "pendants"]),
  sportswear: new Set(["sweatbands", "headbands"]),
});

function clean(value) {
  return typeof value === "string"
    ? value.trim().toLowerCase().replace(/\s+/g, " ")
    : "";
}

function compact(value) {
  return clean(value).replace(/[\s_-]+/g, "");
}

function formatNumber(value) {
  const number = Number(value);
  return Number.isInteger(number) ? String(number) : String(number);
}

function domainDefaultSystem(fitDomain, productType) {
  if (fitDomain === FIT_DOMAINS.FOOTWEAR) return SIZE_SYSTEMS.EU_FOOTWEAR;
  if (fitDomain === FIT_DOMAINS.UPPER_BODY) return SIZE_SYSTEMS.INTL_ALPHA;
  if (fitDomain === FIT_DOMAINS.WHOLE_BODY) return SIZE_SYSTEMS.EU_APPAREL;
  if (fitDomain === FIT_DOMAINS.LOWER_BODY) {
    return clean(productType) === "jeans"
      ? SIZE_SYSTEMS.WAIST_INSEAM_IN
      : SIZE_SYSTEMS.EU_APPAREL;
  }
  return null;
}

export function resolveFitDomain(productType, subType = "") {
  const type = clean(productType);
  const subtype = clean(subType);

  // Corsets span more than one fit domain in the existing catalogue. Keep
  // these exceptions aligned with the server normalizer before applying the
  // direct product-type default below.
  if (type === "corsets" && subtype === "corset dress") {
    return FIT_DOMAINS.WHOLE_BODY;
  }
  if (type === "corsets" && subtype === "corset belt") return null;

  if (FOOTWEAR_TYPES.has(type)) return FIT_DOMAINS.FOOTWEAR;
  if (UPPER_BODY_TYPES.has(type)) return FIT_DOMAINS.UPPER_BODY;
  if (LOWER_BODY_TYPES.has(type) || type === "jeans") {
    return FIT_DOMAINS.LOWER_BODY;
  }
  if (WHOLE_BODY_TYPES.has(type)) return FIT_DOMAINS.WHOLE_BODY;
  if (type === "corporate women") return CORPORATE_WOMEN_DOMAINS[subtype] || null;
  if (type === "corporate men") return CORPORATE_MEN_DOMAINS[subtype] || null;
  if (type === "sportswear") return SPORTSWEAR_DOMAINS[subtype] || null;
  if (type === "gym wear") return GYM_WEAR_DOMAINS[subtype] || null;
  return null;
}

export function getSizingSpec(productType, subType = "") {
  const fitDomain = resolveFitDomain(productType, subType);
  if (!fitDomain) return null;
  return {
    schemaVersion: SIZING_SCHEMA_VERSION,
    fitDomain,
    system: domainDefaultSystem(fitDomain, productType),
  };
}

function getApparelProfileId(system) {
  return `apparel-${String(system || "standard").toLowerCase().replace(/_/g, "-")}`;
}

function isNoSizeTaxonomy(productType, subType = "") {
  const type = clean(productType);
  const subtype = clean(subType);
  if (NO_SIZE_PRODUCT_TYPES.has(type)) return true;
  return Boolean(subtype && NO_SIZE_SUBTYPES[type]?.has(subtype));
}

function makeFitModeProfile(profileId = "fit-mode") {
  return {
    schemaVersion: SIZING_SCHEMA_VERSION,
    kind: LISTING_SIZE_KINDS.FIT_MODE,
    profileId,
    fieldLabel: "Fit",
    options: [...FIT_MODE_OPTIONS],
    requiresVendorSelection: true,
  };
}

/**
 * Returns a product-level collection profile only where the taxonomy is
 * authoritative. A null result means "keep the legacy catalogue behaviour".
 * FIT_MODE is supported for already-declared products, but no category is
 * guessed into it here.
 */
export function getListingSizingProfile(
  productType,
  subType = "",
  declaredSizing = null,
) {
  if (isNoSizeTaxonomy(productType, subType)) {
    return {
      schemaVersion: SIZING_SCHEMA_VERSION,
      kind: LISTING_SIZE_KINDS.NONE,
      profileId: "none",
      fieldLabel: "",
      options: [IMPLICIT_ONE_SIZE],
      requiresVendorSelection: false,
      internalValue: IMPLICIT_ONE_SIZE,
    };
  }

  const spec = getSizingSpec(productType, subType);
  if (spec) {
    return {
      ...spec,
      kind: LISTING_SIZE_KINDS.APPAREL,
      profileId: getApparelProfileId(spec.system),
      fieldLabel: "Size",
      options: getStandardSizeOptions(productType, subType) || [],
      requiresVendorSelection: true,
    };
  }

  if (declaredSizing?.kind === LISTING_SIZE_KINDS.FIT_MODE) {
    return makeFitModeProfile(declaredSizing.profileId || "fit-mode");
  }

  return null;
}

export function createListingSizingMetadata(profile) {
  if (!profile) return null;
  return {
    schemaVersion: SIZING_SCHEMA_VERSION,
    kind: profile.kind,
    profileId: profile.profileId,
    ...(profile.fitDomain ? { fitDomain: profile.fitDomain } : {}),
    ...(profile.system ? { system: profile.system } : {}),
  };
}

export function getSizeSystemLabel(productType, subType = "") {
  const system = getSizingSpec(productType, subType)?.system;
  if (system === SIZE_SYSTEMS.EU_FOOTWEAR || system === SIZE_SYSTEMS.EU_APPAREL) {
    return "EU";
  }
  if (system === SIZE_SYSTEMS.INTL_ALPHA) return "International";
  if (system === SIZE_SYSTEMS.WAIST_INSEAM_IN) return "Waist / inseam (inches)";
  return "";
}

export function getStandardSizeOptions(productType, subType = "") {
  const spec = getSizingSpec(productType, subType);
  if (!spec) return null;
  if (spec.system === SIZE_SYSTEMS.EU_FOOTWEAR) return [...FOOTWEAR_OPTIONS];
  if (spec.system === SIZE_SYSTEMS.INTL_ALPHA) return [...ALPHA_SIZES];
  if (spec.system === SIZE_SYSTEMS.WAIST_INSEAM_IN) return [...JEANS_OPTIONS];
  if (spec.system === SIZE_SYSTEMS.EU_APPAREL) return [...EU_APPAREL_OPTIONS];
  return null;
}

function flattenLegacyEntry(entry) {
  if (Array.isArray(entry)) return entry;
  if (!entry || typeof entry !== "object") return [];
  return Object.values(entry).flatMap((value) => flattenLegacyEntry(value));
}

function findLooseKey(record, requestedKey) {
  const target = compact(requestedKey);
  if (!target || !record || typeof record !== "object") return null;
  return Object.keys(record).find((key) => compact(key) === target) || null;
}

export function getLegacyCatalogSizes(catalog, productType, subType = "") {
  const typeKey = findLooseKey(catalog, productType);
  if (!typeKey) return [];
  const entry = catalog[typeKey];
  if (Array.isArray(entry)) return Array.from(new Set(entry.filter(Boolean)));

  const subtypeKey = subType ? findLooseKey(entry, subType) : null;
  const source = subtypeKey ? entry[subtypeKey] : entry;
  return Array.from(new Set(flattenLegacyEntry(source).filter(Boolean)));
}

export function getListingSizeOptions({
  productType,
  subType,
  legacySizes = [],
  sizing = null,
}) {
  const profile = getListingSizingProfile(productType, subType, sizing);
  if (profile) return [...profile.options];
  return Array.from(new Set((legacySizes || []).filter(Boolean)));
}

function makeRef({ fitDomain, system, kind = "single", value, min, max, waist, inseam }) {
  const systemKey = SYSTEM_KEY[system];
  let keyValue = value;
  if (kind === "range") keyValue = `${formatNumber(min)}-${formatNumber(max)}`;
  if (system === SIZE_SYSTEMS.WAIST_INSEAM_IN) keyValue = `${waist}x${inseam}`;
  const ref = {
    schemaVersion: SIZING_SCHEMA_VERSION,
    fitDomain,
    system,
    kind,
    canonicalKey: `${fitDomain}:${systemKey}:${String(keyValue).toLowerCase()}`,
  };
  if (kind === "range") return { ...ref, min, max };
  if (system === SIZE_SYSTEMS.WAIST_INSEAM_IN) {
    return { ...ref, value: keyValue, waist, inseam };
  }
  return { ...ref, value };
}

/**
 * Builds a scoped reference while keeping the caller's raw label untouched.
 * `source: "legacy"` refuses ambiguous bare apparel numbers/ranges. A bare EU
 * footwear number is safe because the product taxonomy supplies its system.
 */
export function createSizeRef(rawSize, productType, subType = "", options = {}) {
  const raw = typeof rawSize === "string" ? rawSize.trim() : String(rawSize ?? "").trim();
  if (!raw) return null;

  const source = options.source || "forward";
  const spec = getSizingSpec(productType, subType);
  if (!spec) return null;

  const alpha = ALPHA_ALIASES[compact(raw)];
  if (alpha && spec.fitDomain !== FIT_DOMAINS.FOOTWEAR) {
    return makeRef({
      fitDomain: spec.fitDomain,
      system: SIZE_SYSTEMS.INTL_ALPHA,
      value: alpha,
    });
  }

  const waistInseam = raw.match(/^\s*(?:w(?:aist)?\s*)?(\d{2})\s*(?:x|\/|\s+l)\s*(?:l(?:ength)?\s*)?(\d{2})\s*$/i);
  if (waistInseam && spec.fitDomain === FIT_DOMAINS.LOWER_BODY) {
    const waist = Number(waistInseam[1]);
    const inseam = Number(waistInseam[2]);
    return makeRef({
      fitDomain: spec.fitDomain,
      system: SIZE_SYSTEMS.WAIST_INSEAM_IN,
      value: `${waist}x${inseam}`,
      waist,
      inseam,
    });
  }

  const explicitEuRange = raw.match(/^eu\s*(\d{2}(?:\.5)?)\s*[-–]\s*(\d{2}(?:\.5)?)$/i);
  if (explicitEuRange && spec.fitDomain !== FIT_DOMAINS.UPPER_BODY) {
    const min = Number(explicitEuRange[1]);
    const max = Number(explicitEuRange[2]);
    return makeRef({
      fitDomain: spec.fitDomain,
      system:
        spec.fitDomain === FIT_DOMAINS.FOOTWEAR
          ? SIZE_SYSTEMS.EU_FOOTWEAR
          : SIZE_SYSTEMS.EU_APPAREL,
      kind: "range",
      min,
      max,
    });
  }

  const explicitEu = raw.match(/^eu\s*(\d{2}(?:\.5)?)$/i);
  const bareNumber = raw.match(/^(\d{2}(?:\.5)?)$/);
  const numericMatch = explicitEu || bareNumber;
  if (numericMatch) {
    const value = Number(numericMatch[1]);
    const explicit = Boolean(explicitEu);
    const safeBareLegacy = spec.fitDomain === FIT_DOMAINS.FOOTWEAR;
    if (source === "legacy" && !explicit && !safeBareLegacy) return null;

    if (spec.fitDomain === FIT_DOMAINS.FOOTWEAR) {
      if (value < 35 || value > 50 || value * 2 % 1 !== 0) return null;
      return makeRef({
        fitDomain: spec.fitDomain,
        system: SIZE_SYSTEMS.EU_FOOTWEAR,
        value,
      });
    }

    if (
      (spec.fitDomain === FIT_DOMAINS.WHOLE_BODY ||
        spec.fitDomain === FIT_DOMAINS.LOWER_BODY) &&
      value >= 30 &&
      value <= 62 &&
      value % 2 === 0
    ) {
      return makeRef({
        fitDomain: spec.fitDomain,
        system: SIZE_SYSTEMS.EU_APPAREL,
        value,
      });
    }
  }

  return null;
}

export function createCanonicalSizeKeys(rawSizes, productType, subType = "", options = {}) {
  return Array.from(
    new Set(
      (rawSizes || [])
        .map((size) => createSizeRef(size, productType, subType, options)?.canonicalKey)
        .filter(Boolean),
    ),
  );
}

export function areSizesCompatible(rawSizes, productType, subType = "") {
  const sizes = (rawSizes || []).filter((value) => String(value || "").trim());
  if (!sizes.length) return true;
  const standard = getStandardSizeOptions(productType, subType);
  if (!standard) return false;
  return sizes.every((size) => Boolean(createSizeRef(size, productType, subType, { source: "legacy" })));
}
