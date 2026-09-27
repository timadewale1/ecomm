const finiteNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export const isProductSoldOut = (product) => {
  if (!product || typeof product !== "object") return false;
  if (product.inStock === false) return true;

  const variants = Array.isArray(product.variants) ? product.variants : [];
  if (variants.length) {
    return !variants.some((variant) => {
      const stock = finiteNumber(variant?.stock ?? variant?.stockQuantity);
      return stock !== null && stock > 0;
    });
  }

  // Compatibility for historical products only; new catalogue entries do not
  // create sub-products.
  const subProducts = Array.isArray(product.subProducts)
    ? product.subProducts
    : [];
  if (subProducts.length) {
    return !subProducts.some((entry) => {
      const stock = finiteNumber(entry?.stock ?? entry?.stockQuantity);
      return stock !== null && stock > 0;
    });
  }

  const stock = finiteNumber(product.stockQuantity ?? product.stock);
  return stock !== null ? stock <= 0 : false;
};
