import { getSwatchFromRawColor } from "./colorutils";
import { normalizeColorKey, normalizeSizeKey } from "./getVariant";
import {
  IMPLICIT_ONE_SIZE,
  LISTING_SIZE_KINDS,
  getListingSizingProfile,
} from "../config/sizingV1";

const hasText = (value) => String(value ?? "").trim().length > 0;

const numericStock = (value) => {
  const stock = Number(value);
  return Number.isFinite(stock) ? stock : 0;
};

/**
 * The palette's generic `unknown` key can represent several unrelated raw
 * colours. Include its label in the UI key so those choices never collapse.
 * Known palette colours intentionally keep their shared canonical key.
 */
export function getVariantSwatchSelectionKey(rawColor) {
  const swatch = getSwatchFromRawColor(rawColor);
  if (!swatch?.key) return "";
  if (swatch.key !== "unknown") return swatch.key;

  const label = String(swatch.label || rawColor || "")
    .trim()
    .toLowerCase();
  return label ? `unknown:${label}` : "";
}

export function getSwatchSelectionKey(swatch) {
  if (!swatch?.key) return "";
  if (swatch.key !== "unknown") return swatch.key;

  const label = String(swatch.label || "").trim().toLowerCase();
  return label ? `unknown:${label}` : "";
}

export function isVariantInStock(variant) {
  return numericStock(variant?.stock) > 0;
}

export function isVariantSizeHidden(product) {
  const declaredKind = String(
    product?.sizing?.kind || product?.sizingKind || "",
  )
    .trim()
    .toUpperCase();
  const inferredKind = getListingSizingProfile(
    product?.productType,
    product?.subType,
  )?.kind;
  const sizingKind = declaredKind || inferredKind;

  if (sizingKind !== LISTING_SIZE_KINDS.NONE) {
    return false;
  }

  // Inventory rows are the source of truth on full product documents. Search
  // and feed payloads are intentionally slimmer, so fall back to their flat
  // size facets only when no inventory rows are present.
  const inventorySizes = [
    ...(Array.isArray(product?.variants) ? product.variants : []).map(
      (variant) => variant?.size,
    ),
    ...(Array.isArray(product?.subProducts) ? product.subProducts : []).map(
      (subProduct) => subProduct?.size,
    ),
  ].filter(hasText);
  const availableSizes = (
    Array.isArray(product?.availableSizes)
      ? product.availableSizes
      : hasText(product?.availableSizes)
        ? String(product.availableSizes).split(",")
        : []
  ).filter(hasText);
  const productSizes = hasText(product?.size)
    ? String(product.size).split(",").filter(hasText)
    : [];
  const persistedSizes = inventorySizes.length
    ? inventorySizes
    : availableSizes.length
      ? availableSizes
      : productSizes;
  const implicitSizeKey = normalizeSizeKey(IMPLICIT_ONE_SIZE);

  // New NONE listings have no buyer-facing size, even if a slim result has not
  // carried its implicit row. Any legacy nonblank value other than the exact
  // internal sentinel keeps the control visible so old stock remains usable.
  return persistedSizes.every(
    (size) => normalizeSizeKey(size) === implicitSizeKey,
  );
}

export function shouldInitializeProductVariantSelection({
  loading,
  routeProductId,
  loadedProductId,
  hasVariants,
  initializedProductId,
} = {}) {
  const routeId = String(routeProductId || "");
  if (!routeId || String(loadedProductId || "") !== routeId) return false;
  if (loading || !hasVariants) return false;
  return String(initializedProductId || "") !== routeId;
}

function describeVariant(variant, index) {
  if (!variant || !hasText(variant.color) || !hasText(variant.size)) {
    return null;
  }

  const swatchKey = getVariantSwatchSelectionKey(variant.color);
  if (!swatchKey) return null;

  return {
    variant,
    index,
    // These are deliberately the untouched database values. Cart and order
    // matching downstream depend on their exact value and type.
    color: variant.color,
    size: variant.size,
    stock: numericStock(variant.stock),
    swatchKey,
    operationalColorKey: normalizeColorKey(variant.color),
    operationalSizeKey: normalizeSizeKey(variant.size),
  };
}

function completeRows(variants) {
  return (Array.isArray(variants) ? variants : [])
    .map(describeVariant)
    .filter(Boolean);
}

function isOperationallyUnambiguous(candidate, rows) {
  const matches = rows.filter(
    (row) =>
      row.operationalColorKey === candidate.operationalColorKey &&
      row.operationalSizeKey === candidate.operationalSizeKey,
  );

  return matches.length === 1 && matches[0].variant === candidate.variant;
}

function singleSafeCandidate(rows, predicate) {
  const candidates = rows.filter(
    (row) => row.stock > 0 && (!predicate || predicate(row)),
  );

  if (candidates.length !== 1) return null;
  const candidate = candidates[0];
  return isOperationallyUnambiguous(candidate, rows) ? candidate : null;
}

/**
 * Auto-selection is allowed only when there is one complete, positive-stock
 * physical row and the existing operational matcher cannot confuse it with
 * another row (including an out-of-stock duplicate/alias).
 */
export function resolveSinglePurchasableVariant(variants) {
  const rows = completeRows(variants);
  return singleSafeCandidate(rows);
}

/** Resolve the one safe row represented by a colour swatch. */
export function resolveSinglePurchasableVariantForSwatch(
  variants,
  swatchKey,
) {
  if (!swatchKey) return null;
  const rows = completeRows(variants);
  return singleSafeCandidate(rows, (row) => row.swatchKey === swatchKey);
}

/** Resolve one safe, in-stock colour/size combination selected in the UI. */
export function resolvePurchasableVariantChoice(
  variants,
  { swatchKey, size } = {},
) {
  if (!swatchKey || !hasText(size)) return null;
  const wantedSize = normalizeSizeKey(size);
  const rows = completeRows(variants);

  return singleSafeCandidate(
    rows,
    (row) =>
      row.swatchKey === swatchKey && row.operationalSizeKey === wantedSize,
  );
}

/**
 * Re-resolve an already stored raw selection without changing its values.
 * This may return an out-of-stock row so the sheet can show that state rather
 * than silently switching the buyer to a different variant.
 */
export function resolveVariantByRawSelection(
  variants,
  { color, size } = {},
) {
  if (!hasText(color) || !hasText(size)) return null;
  const rows = completeRows(variants);
  const matches = rows.filter(
    (row) => row.color === color && row.size === size,
  );

  if (matches.length !== 1) return null;
  const candidate = matches[0];
  return isOperationallyUnambiguous(candidate, rows) ? candidate : null;
}

/**
 * Resolve current sheet state without ever normalizing/remapping a supplied
 * raw colour. Normalized swatch matching is only a fallback before a physical
 * raw row has been selected.
 */
export function resolveCurrentVariantSelection(
  variants,
  { rawColor, size, swatchKey } = {},
) {
  if (!swatchKey || !hasText(size)) return null;

  if (hasText(rawColor)) {
    const exact = resolveVariantByRawSelection(variants, {
      color: rawColor,
      size,
    });
    return exact?.swatchKey === swatchKey ? exact : null;
  }

  return resolvePurchasableVariantChoice(variants, { swatchKey, size });
}

export function hasPurchasableVariantForSwatch(variants, swatchKey) {
  if (!swatchKey) return false;
  return completeRows(variants).some(
    (row) => row.swatchKey === swatchKey && row.stock > 0,
  );
}

export function hasPurchasableVariantForSize(variants, size) {
  if (!hasText(size)) return false;
  const wantedSize = normalizeSizeKey(size);
  return completeRows(variants).some(
    (row) => row.operationalSizeKey === wantedSize && row.stock > 0,
  );
}
