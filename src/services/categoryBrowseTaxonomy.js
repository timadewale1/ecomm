import productTypes from "../pages/vendor/producttype";
import everydayTypes from "../pages/vendor/everydayType";

const WOMEN_ONLY_PRODUCT_TYPES = new Set([
  "Corporate Women",
  "Skirts",
  "Dresses",
  "Sports Bras",
  "Corsets",
  "Tops",
]);

const MEN_ONLY_PRODUCT_TYPES = new Set(["Corporate Men"]);

/**
 * Frontend-only audience grouping for the Categories experience.
 * This deliberately does not alter the product taxonomy, upload flow, or index.
 */
export function getCategoryBrowseTypes(audience) {
  if (audience === "everyday") return everydayTypes;

  if (audience === "womens") {
    return productTypes.filter(
      (productType) => !MEN_ONLY_PRODUCT_TYPES.has(productType.type),
    );
  }

  if (audience === "mens") {
    return productTypes.filter(
      (productType) => !WOMEN_ONLY_PRODUCT_TYPES.has(productType.type),
    );
  }

  return [];
}

export function getCategoryBrowseProductTypeValues(audience) {
  return getCategoryBrowseTypes(audience)
    .map((productType) => String(productType?.type || "").trim().toLowerCase())
    .filter(Boolean);
}
