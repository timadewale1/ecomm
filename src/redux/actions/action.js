import { db } from "../../firebase.config";
import { doc, setDoc, getDoc } from "firebase/firestore";

export const ADD_TO_CART = "ADD_TO_CART";
export const REMOVE_FROM_CART = "REMOVE_FROM_CART";
export const CLEAR_CART = "CLEAR_CART";
export const INCREASE_QUANTITY = "INCREASE_QUANTITY";
export const DECREASE_QUANTITY = "DECREASE_QUANTITY";
export const SET_CART = "SET_CART";

// Save cart to local storage
const saveCartToLocalStorage = (cart) => {
  console.log("Saving cart to local storage:", cart);
  localStorage.setItem("cart", JSON.stringify(cart));
};

// Save cart to Firestore
const saveCartToFirestore = async (userId, cart) => {
  console.log("Saving cart to Firestore for user:", userId, cart);
  await setDoc(doc(db, "carts", userId), { cart });
};

// Add to Cart (Vendor-specific)
// action.js
export const addToCart =
  (product, setQuantity = false) =>
  async (dispatch, getState) => {
    const { vendorId, id, selectedSize, selectedColor, quantity } = product;

    if (!vendorId || !id) {
      console.error("Vendor ID or Product ID is missing:", product);
      return;
    }

    const productKey = `${vendorId}-${id}-${selectedSize}-${selectedColor}`;
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

    const userId = getState().auth.currentUser?.uid;
    if (userId) {
      await saveCartToFirestore(userId, updatedCart);
    }
    saveCartToLocalStorage(updatedCart);
  };

// Remove from Cart (Vendor-specific)
export const removeFromCart =
  ({ vendorId, productKey }) =>
  (dispatch, getState) => {
    console.log("Removing product:", productKey, "from vendor:", vendorId);

    // Dispatch the action
    dispatch({
      type: REMOVE_FROM_CART,
      payload: { vendorId, productKey },
    });

    const updatedCart = getState().cart;
    saveCartToLocalStorage(updatedCart);
  };

// Clear Cart (Vendor-specific or All)
export const clearCart = (vendorId) => (dispatch, getState) => {
  if (vendorId) {
    console.log("Clearing cart for vendor:", vendorId);
    dispatch({ type: CLEAR_CART, payload: { vendorId } });
  } else {
    console.log("Clearing entire cart");
    dispatch({ type: CLEAR_CART, payload: {} });
  }

  const updatedCart = getState().cart;
  saveCartToLocalStorage(updatedCart);
};

// Increase Quantity (Vendor-specific)
export const increaseQuantity =
  ({ vendorId, productKey }) =>
  (dispatch, getState) => {
    console.log(
      "Dispatching INCREASE_QUANTITY for product:",
      productKey,
      "from vendor:",
      vendorId
    );

    dispatch({
      type: INCREASE_QUANTITY,
      payload: {
        vendorId,
        productKey,
      },
    });

    const updatedCart = getState().cart;
    saveCartToLocalStorage(updatedCart);
  };

// Decrease Quantity (Vendor-specific)
export const decreaseQuantity =
  ({ vendorId, productKey }) =>
  (dispatch, getState) => {
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
    saveCartToLocalStorage(updatedCart);
  };

// Set Cart (sync with Firestore or local storage)
export const setCart = (cart) => (dispatch) => {
  console.log("Setting cart from Firestore/local storage:", cart);
  dispatch({ type: SET_CART, payload: cart });
  saveCartToLocalStorage(cart);
};

// Fetch Cart from Firestore
export const fetchCartFromFirestore = (userId) => async (dispatch) => {
  console.log("Fetching cart for user:", userId);
  const cartDoc = await getDoc(doc(db, "carts", userId));
  if (cartDoc.exists()) {
    const cart = cartDoc.data().cart;
    console.log("Cart found in Firestore:", cart);
    dispatch(setCart(cart));
  } else {
    console.log("No cart found in Firestore, initializing empty cart");
    dispatch(setCart({}));
  }
};
