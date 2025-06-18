
export const buildCartKey = ({
  vendorId,
  productId,
  isFashion,
  selectedSize,
  selectedColor,
  subProductId,
}) => {
  if (subProductId)          return `${vendorId}-${productId}-${subProductId}`;
  if (!isFashion)            return `${vendorId}-${productId}`;
  /* fashion variant */
  return `${vendorId}-${productId}-${selectedSize}-${selectedColor}`;
};
