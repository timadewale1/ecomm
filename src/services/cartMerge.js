// src/utils/cartMerge.js
import { doc, getDoc, setDoc } from "firebase/firestore";
import { setCart } from "../redux/actions/action";

/**
 * Merge two cart objects by vendor, deduplicating items by
 * (productId, color, size, variation). Right-hand (newer) cart wins on conflicts.
 */
export function mergeCarts(cartA = {}, cartB = {}) {
  const merged = { ...cartA };

  for (const vendorId of Object.keys(cartB || {})) {
    const bVendor = cartB[vendorId] || {};
    const bProducts = bVendor.products || {};

    if (!merged[vendorId]) {
      merged[vendorId] = { ...(bVendor || {}), products: { ...bProducts } };
      continue;
    }

    const aVendor = merged[vendorId];
    const aProducts = aVendor.products || {};
    const outProducts = { ...aProducts };

    for (const productKey of Object.keys(bProducts)) {
      const newItem = bProducts[productKey];

      const exists = Object.values(outProducts).some((existing) =>
        existing &&
        existing.productId === newItem.productId &&
        existing.color === newItem.color &&
        existing.size === newItem.size &&
        existing.variation === newItem.variation
      );

      if (!exists) {
        outProducts[productKey] = newItem;
      }
    }

    merged[vendorId] = { ...aVendor, products: outProducts };
  }

  return merged;
}

/**
 * Fetch Firestore cart for a user, merge with localCart, save back,
 * and update Redux (setCart).
 *
 * @param {import('firebase/firestore').Firestore} db
 * @param {string} userId
 * @param {function} dispatch - Redux dispatch
 * @param {object} opts
 *   - localCart: object (defaults to localStorage 'cart' if omitted)
 *   - clearLocal: boolean (default true) remove localStorage cart after merge
 *   - onMerged: (mergedCart) => void  (optional callback)
 */
export async function fetchAndMergeCart(db, userId, dispatch, opts = {}) {
  const {
    localCart = JSON.parse(localStorage.getItem("cart") || "{}"),
    clearLocal = true,
    onMerged,
  } = opts;

  try {
    const ref = doc(db, "carts", userId);
    const snap = await getDoc(ref);
    const firestoreCart = snap.exists() ? (snap.data().cart || {}) : {};

    const mergedCart = mergeCarts(firestoreCart, localCart);
    await setDoc(ref, { cart: mergedCart });

    // update Redux
    if (typeof dispatch === "function") {
      dispatch(setCart(mergedCart));
    }

    if (onMerged) onMerged(mergedCart);
    if (clearLocal) localStorage.removeItem("cart");

    return mergedCart;
  } catch (err) {
    console.error("fetchAndMergeCart failed:", err);
    throw err;
  }
}
export async function pushLocalCart(db, userId, dispatch, cartObj) {
  const localCart = cartObj || JSON.parse(localStorage.getItem("cart") || "{}");
  try {
    await setDoc(doc(db, "carts", userId), { cart: localCart });
    if (typeof dispatch === "function") dispatch(setCart(localCart));
  } catch (err) {
    console.error("pushLocalCart failed:", err);
    throw err;
  }
}
