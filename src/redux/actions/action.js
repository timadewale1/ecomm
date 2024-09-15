// redux/actions/action.js
import { db } from "../../firebase.config";
import { doc, setDoc, getDoc } from "firebase/firestore";

export const ADD_TO_CART = "ADD_TO_CART";
export const REMOVE_FROM_CART = "REMOVE_FROM_CART";
export const CLEAR_CART = "CLEAR_CART";
export const INCREASE_QUANTITY = "INCREASE_QUANTITY";
export const DECREASE_QUANTITY = "DECREASE_QUANTITY";
export const SET_CART = "SET_CART";

const saveCartToLocalStorage = (cart) => {
  console.log("Saving cart to local storage:", cart);
  localStorage.setItem("cart", JSON.stringify(cart));
};

const saveCartToFirestore = async (userId, cart) => {
  console.log("Saving cart to Firestore for user:", userId, cart);
  await setDoc(doc(db, "carts", userId), { cart });
};

export const addToCart = (product) => (dispatch, getState) => {
  dispatch({ type: ADD_TO_CART, payload: product });
  const cart = getState().cart;
  saveCartToLocalStorage(cart);
  console.log("Added to cart:", cart);
};

export const removeFromCart = (productKey) => (dispatch, getState) => {
  dispatch({ type: REMOVE_FROM_CART, payload: productKey });
  const cart = getState().cart;
  saveCartToLocalStorage(cart);
  console.log("Removed from cart:", cart);
};

export const clearCart = () => (dispatch, getState) => {
  dispatch({ type: CLEAR_CART });
  const cart = getState().cart;
  saveCartToLocalStorage(cart);
  console.log("Cleared cart:", cart);
};

export const increaseQuantity = (productId) => (dispatch, getState) => {
  dispatch({ type: INCREASE_QUANTITY, payload: productId });
  const cart = getState().cart;
  saveCartToLocalStorage(cart);
  console.log("Increased quantity:", cart);
};

export const decreaseQuantity = (productId) => (dispatch, getState) => {
  dispatch({ type: DECREASE_QUANTITY, payload: productId });
  const cart = getState().cart;
  saveCartToLocalStorage(cart);
  console.log("Decreased quantity:", cart);
};

export const setCart = (cart) => (dispatch) => {
  dispatch({ type: SET_CART, payload: cart });
  saveCartToLocalStorage(cart);
  console.log("Set cart:", cart);
};

export const syncCartWithFirestore = (userId) => async (dispatch) => {
  const cart = JSON.parse(localStorage.getItem("cart")) || {};
  await saveCartToFirestore(userId, cart);
  console.log("Synced cart with Firestore for user:", userId);
};

export const fetchCartFromFirestore = (userId) => async (dispatch) => {
  const cartDoc = await getDoc(doc(db, "carts", userId));
  if (cartDoc.exists()) {
    const cart = cartDoc.data().cart;
    dispatch(setCart(cart));
    console.log("Fetched cart from Firestore:", cart);
  } else {
    dispatch(setCart({}));
    console.log("No cart found in Firestore for user:", userId);
  }
};
