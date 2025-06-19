export const findVariant = (product, size, color) =>
  Array.isArray(product?.variants)
    ? product.variants.find(v => v.size === size && v.color === color)
    : null;