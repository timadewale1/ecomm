// redux/reducers/cartReducer.js
import { SET_CART, ADD_TO_CART, REMOVE_FROM_CART, CLEAR_CART, INCREASE_QUANTITY, DECREASE_QUANTITY } from "../actions/action";

const initialState = {};

export const cartReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_CART:
      console.log("Reducer SET_CART:", action.payload);
      return action.payload;
    case ADD_TO_CART: {
      const { id, selectedSize } = action.payload;
      const productKey = `${id}-${selectedSize}`;
      const newState = {
        ...state,
        [productKey]: {
          ...action.payload,
          quantity: (state[productKey]?.quantity || 0) + action.payload.quantity,
        },
      };
      console.log("Reducer ADD_TO_CART:", newState);
      return newState;
    }
    case REMOVE_FROM_CART: {
      const newState = { ...state };
      delete newState[action.payload];
      console.log("Reducer REMOVE_FROM_CART:", newState);
      return newState;
    }
    case CLEAR_CART:
      console.log("Reducer CLEAR_CART:", {});
      return {};
    case INCREASE_QUANTITY: {
      const productKey = action.payload;
      if (state[productKey].quantity < state[productKey].stockQuantity) {
        const newState = {
          ...state,
          [productKey]: {
            ...state[productKey],
            quantity: state[productKey].quantity + 1,
          },
        };
        console.log("Reducer INCREASE_QUANTITY:", newState);
        return newState;
      }
      return state;
    }
    case DECREASE_QUANTITY: {
      const productKey = action.payload;
      if (state[productKey].quantity > 1) {
        const newState = {
          ...state,
          [productKey]: {
            ...state[productKey],
            quantity: state[productKey].quantity - 1,
          },
        };
        console.log("Reducer DECREASE_QUANTITY:", newState);
        return newState;
      } else {
        const newState = { ...state };
        delete newState[productKey];
        console.log("Reducer DECREASE_QUANTITY:", newState);
        return newState;
      }
    }
    default:
      return state;
  }
};
