// redux/actions/action.js
export const ADD_TO_CART = "ADD_TO_CART";
export const REMOVE_FROM_CART = "REMOVE_FROM_CART";
export const CLEAR_CART = "CLEAR_CART";
export const INCREASE_QUANTITY = "INCREASE_QUANTITY";
export const DECREASE_QUANTITY = "DECREASE_QUANTITY";

export const addToCart = (product) => ({
  type: ADD_TO_CART,
  payload: product,
});
export const removeFromCart = (productKey) => ({
  type: REMOVE_FROM_CART,
  payload: productKey,
});

export const clearCart = () => ({
  type: CLEAR_CART,
});

export const increaseQuantity = (productId) => ({
  type: INCREASE_QUANTITY,
  payload: productId,
});

export const decreaseQuantity = (productId) => ({
  type: DECREASE_QUANTITY,
  payload: productId,
});
