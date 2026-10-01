function hasMeaningfulValue(value) {
  if (value === null || value === undefined) return false;
  return typeof value === "string" ? value.trim().length > 0 : true;
}

export function hasVariantDraft(variants = [], subProducts = []) {
  if (Array.isArray(subProducts) && subProducts.length > 0) return true;

  return (variants || []).some(
    (variant) =>
      hasMeaningfulValue(variant?.color) ||
      (variant?.sizes || []).some(
        (entry) =>
          hasMeaningfulValue(entry?.size) || hasMeaningfulValue(entry?.stock),
      ),
  );
}

export function isPristineSizeEntry(entry) {
  return (
    !hasMeaningfulValue(entry?.size) && !hasMeaningfulValue(entry?.stock)
  );
}

/**
 * Drop UI-only blank rows from the end of each variant before validation and
 * persistence. Keep one row when the entire variant is blank so normal
 * required-field validation still reports it, and never hide a partial row.
 */
export function filterPristineTrailingSizeRows(variants = []) {
  return (variants || []).map((variant) => {
    const originalSizes = Array.isArray(variant?.sizes) ? variant.sizes : [];
    const sizes = [...originalSizes];

    while (sizes.length > 1 && isPristineSizeEntry(sizes[sizes.length - 1])) {
      sizes.pop();
    }

    return sizes.length === originalSizes.length
      ? variant
      : { ...variant, sizes };
  });
}

export function crossesNoSizeProfileBoundary(currentProfile, nextProfile) {
  const currentIsNoSize = currentProfile?.kind === "NONE";
  const nextIsNoSize = nextProfile?.kind === "NONE";
  return currentIsNoSize !== nextIsNoSize;
}

export function getVariantDescriptionDimensions(
  variants = [],
  { omitSizes = false } = {},
) {
  const colours = (variants || [])
    .map((variant) => String(variant?.color || "").trim())
    .filter(Boolean);
  const sizes = omitSizes
    ? []
    : (variants || [])
        .flatMap((variant) => variant?.sizes || [])
        .map((entry) => String(entry?.size || "").trim())
        .filter(Boolean);

  return { colours, sizes };
}
