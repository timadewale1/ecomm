// src/utils/cartMerge.js
import { doc, getDoc, setDoc } from "firebase/firestore";
import { setCart } from "../redux/actions/action";

// Build a stable identity for a cart line-item so we can dedupe correctly.
// Works with your current item shape (id, selectedColor, selectedSize, subProductId, variation).
export function itemIdentity(item = {}) {
  const pid = item.id ?? item.productId ?? "";
  const color = item.selectedColor ?? item.color ?? "";
  const size = item.selectedSize ?? item.size ?? "";
  const sub = item.subProductId ?? "";
  const variation = item.variation ?? item.variant ?? "";
  return [pid, color, size, sub, variation].join("|");
}

// Safer merge that preserves device (local) items.
// cartA = Firestore, cartB = Local. Right-hand wins on conflicts by SUMing quantity.
// Returns { merged, addedByVendor, conflicts } for UX decisions upstream.
export function mergeCarts(cartA = {}, cartB = {}) {
  const merged = {};
  const addedByVendor = {}; // vendorId -> [names added OR increased]
  const conflicts = []; // array of { vendorId, name, how: "quantity-summed" | "replaced-key" }

  const vendorIds = new Set([
    ...Object.keys(cartA || {}),
    ...Object.keys(cartB || {}),
  ]);

  for (const vendorId of vendorIds) {
    const aVendor = cartA[vendorId] || {};
    const bVendor = cartB[vendorId] || {};
    const aProducts = aVendor.products || {};
    const bProducts = bVendor.products || {};
    const outProducts = { ...aProducts };

    // Map existing A items by identity to their productKey for fast lookup
    const idToKey = new Map();
    for (const [key, item] of Object.entries(outProducts)) {
      idToKey.set(itemIdentity(item), key);
    }

    for (const [bKey, bItem] of Object.entries(bProducts)) {
      // Ignore null/invalid entries
      if (!bItem || (!bItem.id && !bItem.productId)) continue;

      const bId = itemIdentity(bItem);

      if (idToKey.has(bId)) {
        // Same product/variant already exists in A. Sum quantities instead of dropping.
        const existingKey = idToKey.get(bId);
        const aItem = outProducts[existingKey] || {};
        const aQty = Number(aItem.quantity || 0);
        const bQty = Number(bItem.quantity || 0);
        const newQty = Math.max(1, aQty + bQty); // ensure >=1
        outProducts[existingKey] = { ...aItem, quantity: newQty };

        conflicts.push({
          vendorId,
          name: bItem.name || aItem.name || "Item",
          how: "quantity-summed",
        });

        if (!addedByVendor[vendorId]) addedByVendor[vendorId] = [];
        addedByVendor[vendorId].push(
          bItem.name || aItem.name || "Item (updated qty)"
        );
      } else {
        // New identity. Add, but avoid productKey collisions.
        let newKey = bKey;
        if (outProducts[newKey]) {
          newKey = `${bKey}__m${Math.random().toString(36).slice(2, 8)}`;
          conflicts.push({
            vendorId,
            name: bItem.name || "Item",
            how: "replaced-key",
          });
        }
        outProducts[newKey] = bItem;
        idToKey.set(bId, newKey);

        if (!addedByVendor[vendorId]) addedByVendor[vendorId] = [];
        addedByVendor[vendorId].push(bItem.name || "Item");
      }
    }

    // carry forward vendor meta (like vendorName) from whichever is present
    const baseVendor = Object.keys(outProducts).length
      ? aVendor.vendorName
        ? aVendor
        : bVendor
      : aVendor.vendorName
      ? aVendor
      : bVendor;
    merged[vendorId] = { ...(baseVendor || {}), products: outProducts };
  }

  return { merged, addedByVendor, conflicts };
}

/**
 * Fetch Firestore cart for a user, merge with localCart, save back,
 * update Redux, and return merge metadata.
 *
 * @param {import('firebase/firestore').Firestore} db
 * @param {string} userId
 * @param {function} dispatch
 * @param {object} opts
 *   - localCart: object (defaults to localStorage 'cart')
 *   - clearLocal: boolean (default true)
 *   - onMerged: (mergedCart) => void
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
    const firestoreCart = snap.exists() ? snap.data().cart || {} : {};

    const { merged, addedByVendor, conflicts } = mergeCarts(
      firestoreCart,
      localCart
    );

    // Persist
    await setDoc(ref, { cart: merged });

    // Redux
    if (typeof dispatch === "function") dispatch(setCart(merged));
    if (onMerged) onMerged(merged);
    if (clearLocal) localStorage.removeItem("cart");

    return { mergedCart: merged, addedByVendor, conflicts };
  } catch (err) {
    console.error("fetchAndMergeCart failed:", err);
    throw err;
  }
}
