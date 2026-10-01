// action.js
import { auth } from "../../firebase.config"; // Import auth to get the current user
import { buildCartKey } from "../../services/cartKey";
import {
  cartOwnerKey,
  GUEST_CART_OWNER,
  hydrateAuthenticatedCart,
  migrateLegacyCart,
  persistCart,
  readCartEnvelope,
} from "../../services/cartPersistence";
import {
  cartCacheReady,
  cartOwnerChanged,
  cartSyncDegraded,
  cartSyncReady,
  cartWriteQueued,
  cartWriteSettled,
} from "../reducers/cartSyncSlice";
export const ADD_TO_CART = "ADD_TO_CART";
export const REMOVE_FROM_CART = "REMOVE_FROM_CART";
export const CLEAR_CART = "CLEAR_CART";
export const INCREASE_QUANTITY = "INCREASE_QUANTITY";
export const DECREASE_QUANTITY = "DECREASE_QUANTITY";
export const SET_CART = "SET_CART";
const ensureCartOwnerReady = async (dispatch, getState) => {
  const userId = auth.currentUser?.uid || null;
  const ownerKey = cartOwnerKey(userId);
  const currentSync = getState().cartSync;
  // A cache is safe to render immediately, but it is not yet authoritative.
  // Waiting for the existing hydration promise here prevents a user mutation
  // from being overwritten when that older server read completes.
  if (
    currentSync?.ownerKey === ownerKey &&
    currentSync?.hydrated &&
    (!userId || currentSync?.source !== "cache")
  ) {
    return { ready: true, userId };
  }

  dispatch(cartOwnerChanged(ownerKey));
  const cached = migrateLegacyCart(ownerKey) || readCartEnvelope(ownerKey);
  if (cached) {
    dispatch({ type: SET_CART, payload: cached.cart });
    dispatch(cartCacheReady(ownerKey));
  }

  if (!userId) {
    dispatch({ type: SET_CART, payload: cached?.cart || {} });
    dispatch(cartSyncReady(GUEST_CART_OWNER, cached ? "cache" : "empty"));
    return { ready: true, userId: null };
  }

  try {
    const result = await hydrateAuthenticatedCart(userId);
    if (auth.currentUser?.uid !== userId) return { ready: false, userId };
    dispatch({ type: SET_CART, payload: result?.mergedCart || {} });
    if (result?.degraded) dispatch(cartSyncDegraded(ownerKey, result.error));
    else dispatch(cartSyncReady(ownerKey, result?.source || "server"));
    return { ready: true, userId };
  } catch (error) {
    if (
      auth.currentUser?.uid !== userId ||
      getState().cartSync?.ownerKey !== ownerKey
    ) {
      return { ready: false, userId };
    }
    // A failed guest-import write can still leave a newer, safely staged
    // owner envelope. Keep that merged local view instead of falling back to
    // the account snapshot captured before hydration began.
    const latestOwnerEnvelope = readCartEnvelope(ownerKey) || cached;
    if (latestOwnerEnvelope) {
      dispatch({ type: SET_CART, payload: latestOwnerEnvelope.cart });
    }
    dispatch(
      cartSyncDegraded(ownerKey, error, Boolean(latestOwnerEnvelope)),
    );
    // Starting from an unknown empty account cart could overwrite valid cloud
    // data. Only permit offline mutation when an owner-bound cache exists.
    return { ready: Boolean(latestOwnerEnvelope), userId };
  }
};

const persistUpdatedCart = async (
  dispatch,
  getState,
  cart,
  mutation = null,
  userId = auth.currentUser?.uid || null,
) => {
  const ownerKey = cartOwnerKey(userId);
  if (userId) dispatch(cartWriteQueued(ownerKey));

  try {
    const result = await persistCart({ userId, cart, mutation });
    // The latest transactional write may include a non-conflicting change made
    // on another device. Reconcile only the newest local revision so an older
    // queued write cannot roll back a newer optimistic Redux state.
    const stillOwnsCart =
      cartOwnerKey(auth.currentUser?.uid || null) === ownerKey &&
      getState().cartSync?.ownerKey === ownerKey;
    if (stillOwnsCart && result?.isLatest && result.cart) {
      dispatch({ type: SET_CART, payload: result.cart });
    }
    if (userId) dispatch(cartWriteSettled(ownerKey));
    return true;
  } catch (error) {
    console.error("Cart sync failed; the owner-scoped offline copy was kept:", error);
    if (userId) {
      dispatch(cartWriteSettled(ownerKey, error));
      dispatch(cartSyncDegraded(ownerKey, error));
    }
    return false;
  }
};

// Add to Cart (Vendor-specific)
export const addToCart =
  (product, setQuantity = false) =>
  async (dispatch, getState) => {
    const owner = await ensureCartOwnerReady(dispatch, getState);
    if (!owner.ready) return false;
    const {
      vendorId,
      id,
      selectedSize,
      selectedColor,
      quantity,
      subProductId,
    } = product;

    if (!vendorId || !id) {
      console.error("Vendor ID or Product ID is missing:", product);
      return false;
    }

    // Generate product key including subProductId if available
    const productKey = buildCartKey({
      vendorId,
      productId: id,
      isFashion: product.isFashion,
      selectedSize,
      selectedColor,
      subProductId,
    });
    const cart = getState().cart;
    const vendorCart = cart[vendorId] || {
      vendorName: product.vendorName,
      products: {},
    };
    const existingProduct = vendorCart.products[productKey];

    const newQuantity =
      existingProduct && !setQuantity
        ? existingProduct.quantity + quantity
        : quantity;

    const productToAdd = {
      ...product,
      quantity: newQuantity,
    };

    const updatedVendorCart = {
      ...vendorCart,
      products: {
        ...vendorCart.products,
        [productKey]: productToAdd,
      },
    };

    const updatedCart = {
      ...cart,
      [vendorId]: updatedVendorCart,
    };

    dispatch({
      type: ADD_TO_CART,
      payload: {
        vendorId,
        productKey,
        product: productToAdd,
      },
    });

    // Save cart to Firestore if user is authenticated
    return persistUpdatedCart(
      dispatch,
      getState,
      updatedCart,
      {
        type: "add_or_update",
        vendorId,
        productKey,
        productId: id,
        product: productToAdd,
        quantityMode: setQuantity ? "replace" : "increment",
        quantityDelta: setQuantity ? 0 : Number(quantity || 1),
      },
      owner.userId,
    );
  };

// Remove from Cart (Vendor-specific)
export const removeFromCart =
  ({ vendorId, productKey }) =>
  async (dispatch, getState) => {
    const owner = await ensureCartOwnerReady(dispatch, getState);
    if (!owner.ready) return false;
    console.log(
      "Removing product:",
      productKey,
      "from vendor:",
      vendorId
    );

    const beforeCart =
      getState().cart;

    const removedItem =
      beforeCart?.[vendorId]
        ?.products?.[productKey] ||
      null;

    dispatch({
      type: REMOVE_FROM_CART,
      payload: {
        vendorId,
        productKey,
      },
    });

    const updatedCart =
      getState().cart;

    return persistUpdatedCart(
      dispatch,
      getState,
      updatedCart,
      {
        type: "remove_item",
        vendorId,
        productKey,
        productId: removedItem?.id || removedItem?.productId || "",
      },
      owner.userId,
    );
  };
// Clear Cart (Vendor-specific or All)
export const clearCart = (vendorId) => async (dispatch, getState) => {
  const owner = await ensureCartOwnerReady(dispatch, getState);
  if (!owner.ready) return false;
  if (vendorId) {
    console.log("Clearing cart for vendor:", vendorId);
    dispatch({ type: CLEAR_CART, payload: { vendorId } });
  } else {
    console.log("Clearing entire cart");
    dispatch({ type: CLEAR_CART, payload: {} });
  }

  const updatedCart = getState().cart;

  // Save cart to Firestore if user is authenticated
  return persistUpdatedCart(
    dispatch,
    getState,
    updatedCart,
    {
      type: vendorId ? "clear_vendor" : "clear_all",
      vendorId: vendorId || null,
    },
    owner.userId,
  );
};

// Increase Quantity (Vendor-specific)
export const increaseQuantity =
  ({ vendorId, productKey }) =>
  async (dispatch, getState) => {
    const owner = await ensureCartOwnerReady(dispatch, getState);
    if (!owner.ready) return false;
    dispatch({
      type: INCREASE_QUANTITY,
      payload: {
        vendorId,
        productKey,
      },
    });

    const updatedCart = getState().cart;

    // Save cart to Firestore if user is authenticated
    return persistUpdatedCart(
      dispatch,
      getState,
      updatedCart,
      {
        type: "quantity_update",
        vendorId,
        productKey,
        quantityDelta: 1,
      },
      owner.userId,
    );
  };

// Decrease Quantity (Vendor-specific)
export const decreaseQuantity =
  ({ vendorId, productKey }) =>
  async (dispatch, getState) => {
    const owner = await ensureCartOwnerReady(dispatch, getState);
    if (!owner.ready) return false;
    const currentProduct =
      getState().cart?.[vendorId]?.products?.[productKey] || null;
    const removesLocalLine = Number(currentProduct?.quantity || 0) <= 1;
    console.log(
      "Dispatching DECREASE_QUANTITY for product:",
      productKey,
      "from vendor:",
      vendorId
    );

    dispatch({
      type: DECREASE_QUANTITY,
      payload: {
        vendorId,
        productKey,
      },
    });

    const updatedCart = getState().cart;

    // Save cart to Firestore if user is authenticated
    return persistUpdatedCart(
      dispatch,
      getState,
      updatedCart,
      {
        // At local quantity one, the reducer removes the line completely.
        // Persist that exact intent as a removal; a -1 delta could otherwise
        // leave (and later resurrect) a concurrently-increased server line.
        type: removesLocalLine ? "remove_item" : "quantity_update",
        vendorId,
        productKey,
        productId: currentProduct?.id || currentProduct?.productId || "",
        ...(removesLocalLine ? {} : { quantityDelta: -1 }),
      },
      owner.userId,
    );
  };

// Set Cart (sync with Firestore or local storage)
export const setCart = (cart) => (dispatch) => {
  dispatch({ type: SET_CART, payload: cart });
};

// Fetch Cart from Firestore
export const fetchCartFromFirestore =
  (userId) => async (dispatch, getState) => {
    const ownerKey = cartOwnerKey(userId);
    try {
      const result = await hydrateAuthenticatedCart(userId);
      if (
        auth.currentUser?.uid !== userId ||
        getState().cartSync?.ownerKey !== ownerKey
      ) {
        return { ...result, stale: true };
      }
      dispatch(setCart(result?.mergedCart || {}));
      dispatch(cartSyncReady(ownerKey, result?.source || "server"));
      return result;
    } catch (error) {
      console.error("Error fetching cart from Firestore:", error);
      if (
        auth.currentUser?.uid !== userId ||
        getState().cartSync?.ownerKey !== ownerKey
      ) {
        return { stale: true, error };
      }
      dispatch(cartSyncDegraded(ownerKey, error));
      throw error;
    }
  };
