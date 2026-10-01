const isRecord = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const normalizeCart = (value) => {
  if (!isRecord(value)) return {};

  return Object.entries(value).reduce((cart, [vendorId, vendor]) => {
    if (!vendorId || !isRecord(vendor) || !isRecord(vendor.products)) {
      return cart;
    }

    const products = Object.entries(vendor.products).reduce(
      (nextProducts, [productKey, item]) => {
        if (!productKey || !isRecord(item)) return nextProducts;
        nextProducts[productKey] = item;
        return nextProducts;
      },
      {},
    );

    if (Object.keys(products).length > 0) {
      cart[vendorId] = { ...vendor, products };
    }
    return cart;
  }, {});
};

/**
 * Return only positive quantity changes made after a guest snapshot was
 * imported. Shared quantities are subtracted so a concurrent guest edit can
 * be rolled into a fresh import generation without duplicating old lines.
 */
export const deriveGuestCartAdditions = (currentCart, importedCart) => {
  const current = normalizeCart(currentCart);
  const imported = normalizeCart(importedCart);
  const additions = {};

  for (const [vendorId, currentVendor] of Object.entries(current)) {
    const importedProducts = imported[vendorId]?.products || {};
    const products = {};
    for (const [productKey, currentItem] of Object.entries(
      currentVendor.products || {},
    )) {
      const currentQuantity = Math.max(0, Number(currentItem.quantity || 0));
      const importedQuantity = Math.max(
        0,
        Number(importedProducts[productKey]?.quantity || 0),
      );
      const addedQuantity = currentQuantity - importedQuantity;
      if (addedQuantity > 0) {
        products[productKey] = { ...currentItem, quantity: addedQuantity };
      }
    }
    if (Object.keys(products).length > 0) {
      additions[vendorId] = { ...currentVendor, products };
    }
  }
  return additions;
};

export const CART_OPERATION_TYPES = new Set([
  "add_or_update",
  "remove_item",
  "clear_vendor",
  "clear_all",
  "quantity_update",
]);

const finiteQuantity = (value, fallback = 0) => {
  const quantity = Number(value);
  return Number.isFinite(quantity) ? quantity : fallback;
};

export const normalizePendingCartMutations = (mutations = []) => {
  const seen = new Set();
  return (Array.isArray(mutations) ? mutations : [])
    .filter(
      (mutation) =>
        mutation &&
        CART_OPERATION_TYPES.has(mutation.type) &&
        typeof mutation.mutationId === "string" &&
        mutation.mutationId,
    )
    .filter((mutation) => {
      if (seen.has(mutation.mutationId)) return false;
      seen.add(mutation.mutationId);
      return true;
    });
};

/**
 * Build a create-safe top-level field mask. In particular, `cart` is replaced
 * as one field rather than recursively merged, so absent line items stay
 * deleted while unrelated cart-document metadata survives.
 */
export const buildCartSetOptions = (payload = {}) => ({
  mergeFields: Object.keys(payload),
});

/** Apply one local cart intent to the latest server cart. */
export const applyCartMutation = (serverCart, intendedCart, mutation) => {
  const remote = normalizeCart(serverCart);
  const intended = normalizeCart(intendedCart);
  if (!mutation || !CART_OPERATION_TYPES.has(mutation.type)) return intended;

  if (mutation.type === "clear_all") return {};

  const vendorId = mutation.vendorId;
  if (!vendorId) return intended;

  if (mutation.type === "clear_vendor") {
    const next = { ...remote };
    delete next[vendorId];
    return next;
  }

  const productKey = mutation.productKey;
  if (!productKey) return intended;

  const next = { ...remote };
  const remoteVendor = remote[vendorId] || {};
  const intendedVendor = intended[vendorId] || {};
  const products = { ...(remoteVendor.products || {}) };
  const intendedProduct = intendedVendor.products?.[productKey];

  if (mutation.type === "remove_item") {
    delete products[productKey];
  } else if (mutation.type === "quantity_update") {
    const remoteProduct = products[productKey];
    const delta = finiteQuantity(mutation.quantityDelta);

    if (!remoteProduct) {
      // A decrement must never resurrect an item removed by another device.
      if (delta > 0 && intendedProduct) products[productKey] = intendedProduct;
    } else if (delta) {
      const nextQuantity = finiteQuantity(remoteProduct.quantity, 1) + delta;
      if (nextQuantity <= 0) {
        delete products[productKey];
      } else {
        products[productKey] = {
          ...remoteProduct,
          ...(intendedProduct || {}),
          quantity: nextQuantity,
        };
      }
    } else if (!intendedProduct) {
      // Compatibility with mutations cached by the previous app build.
      delete products[productKey];
    } else {
      products[productKey] = intendedProduct;
    }
  } else if (mutation.type === "add_or_update") {
    const remoteProduct = products[productKey];
    const mutationProduct = mutation.product || intendedProduct;
    const delta = finiteQuantity(mutation.quantityDelta);

    if (mutation.quantityMode === "increment" && delta > 0) {
      products[productKey] = {
        ...(remoteProduct || {}),
        ...(mutationProduct || intendedProduct || {}),
        quantity: remoteProduct
          ? finiteQuantity(remoteProduct.quantity, 0) + delta
          : delta,
      };
    } else if (mutationProduct || intendedProduct) {
      products[productKey] = mutationProduct || intendedProduct;
    }
  } else if (!intendedProduct) {
    delete products[productKey];
  } else {
    products[productKey] = intendedProduct;
  }

  if (Object.keys(products).length === 0) {
    delete next[vendorId];
  } else {
    next[vendorId] = {
      ...intendedVendor,
      ...remoteVendor,
      vendorName: intendedVendor.vendorName || remoteVendor.vendorName,
      products,
    };
  }
  return next;
};

export const applyCartMutations = (
  serverCart,
  intendedCart,
  mutations = [],
) =>
  normalizePendingCartMutations(mutations).reduce(
    (cart, mutation) => applyCartMutation(cart, intendedCart, mutation),
    normalizeCart(serverCart),
  );
