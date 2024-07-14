import { ADD_TO_CART, REMOVE_FROM_CART } from "../actions/action";

const initialState = {};

export const cartReducer = (state = initialState, action) => {
  switch (action.type) {
    case ADD_TO_CART:
      return { ...state, [action.payload.id]: action.payload };
    case REMOVE_FROM_CART:
      const newState = { ...state };
      delete newState[action.payload];
      return newState;
    default:
      return state;
  }
};
