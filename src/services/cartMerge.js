// Backward-compatible facade for older login/auth call sites.
import { auth } from "../firebase.config";
import { setCart } from "../redux/actions/action";
import {
  GUEST_CART_OWNER,
  cartOwnerKey,
  hydrateAuthenticatedCart,
  itemIdentity,
  mergeGuestCart,
  readCartEnvelope,
} from "./cartPersistence";

// Build a stable identity for a cart line-item so we can dedupe correctly.
// Works with your current item shape (id, selectedColor, selectedSize, subProductId, variation).
export { itemIdentity };

// Safer merge that preserves device (local) items.
// cartA = Firestore, cartB = Local. Right-hand wins on conflicts by SUMing quantity.
// Returns { merged, addedByVendor, conflicts } for UX decisions upstream.
export function mergeCarts(cartA = {}, cartB = {}) {
  return mergeGuestCart(cartA, cartB);
}

/**
 * Hydrate the account cart through the centralized, idempotent lifecycle,
 * update Redux, and return merge metadata.
 *
 * @param {import('firebase/firestore').Firestore} db
 * @param {string} userId
 * @param {function} dispatch
 * @param {object} opts - supports onMerged for legacy callers
 */
export async function fetchAndMergeCart(_db, userId, dispatch, opts = {}) {
  const { onMerged } = opts;
  try {
    // A guest basket is a new handoff event. Do not reuse a memoized account
    // hydration result from an earlier session, otherwise those guest lines
    // can remain in the guest envelope without becoming visible after login.
    const guestEnvelope = readCartEnvelope(GUEST_CART_OWNER);
    const hasGuestItems = Object.values(guestEnvelope?.cart || {}).some(
      (vendor) => Object.keys(vendor?.products || {}).length > 0,
    );
    const result = await hydrateAuthenticatedCart(userId, {
      force: hasGuestItems,
      importGuest: true,
    });
    let published = auth.currentUser?.uid === userId;
    if (published && typeof dispatch === "function") {
      // Publish through Redux Thunk so the owner check and SET_CART happen in
      // one synchronous turn. A late account-A request can never overwrite a
      // guest or account-B basket.
      published = dispatch((innerDispatch, getState) => {
        if (
          auth.currentUser?.uid !== userId ||
          getState().cartSync?.ownerKey !== cartOwnerKey(userId)
        ) {
          return false;
        }
        innerDispatch(setCart(result.mergedCart));
        return true;
      });
    }
    if (!published) return { ...result, stale: true };
    if (onMerged) onMerged(result.mergedCart);
    return result;
  } catch (err) {
    console.error("fetchAndMergeCart failed:", err);
    throw err;
  }
}
