import {
  ADD_TO_CART,
  REMOVE_FROM_CART,
  CLEAR_CART,
  INCREASE_QUANTITY,
  DECREASE_QUANTITY,
} from "../actions/action";

const initialState = {};

export const cartReducer = (state = initialState, action) => {
  switch (action.type) {
    case ADD_TO_CART: {
      const { id, selectedSize } = action.payload;
      const productKey = `${id}-${selectedSize}`;
      return {
        ...state,
        [productKey]: {
          ...action.payload,
          quantity: (state[productKey]?.quantity || 0) + action.payload.quantity,
        },
      };
    }
    case REMOVE_FROM_CART: {
      const newState = { ...state };
      delete newState[action.payload];
      return newState;
    }
    case CLEAR_CART:
      return {};
    case INCREASE_QUANTITY: {
      const productKey = action.payload;
      if (state[productKey].quantity < state[productKey].stockQuantity) {
        return {
          ...state,
          [productKey]: {
            ...state[productKey],
            quantity: state[productKey].quantity + 1,
          },
        };
      }
      return state;
    }
    case DECREASE_QUANTITY: {
      const productKey = action.payload;
      if (state[productKey].quantity > 1) {
        return {
          ...state,
          [productKey]: {
            ...state[productKey],
            quantity: state[productKey].quantity - 1,
          },
        };
      } else {
        const newState = { ...state };
        delete newState[productKey];
        return newState;
      }
    }
    default:
      return state;
  }
};
