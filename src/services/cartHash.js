import MD5 from "crypto-js/md5";

/**
 * @param {Object} products  map of productKey → product details
 * @returns {string} md5 hash fingerprint of the normalized cart contents
 */
export function generateCartHash(products) {
  if (!products || typeof products !== "object") return null;

  // 1) Normalize to a sorted array
  const items = Object.keys(products)
    .sort()
    .map((key) => {
      const p = products[key];
      return {
        productId: p.id,
        subProductId: p.subProductId || null,
        selectedSize: p.selectedSize || null,
        selectedColor: p.selectedColor || null,
        quantity: p.quantity || 0,
      };
    });

  // 2) Stringify & MD5
  const payload = JSON.stringify(items);
  return MD5(payload).toString();
}
