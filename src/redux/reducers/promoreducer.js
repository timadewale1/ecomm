import { SET_PROMO_IMAGES, SET_PROMO_LOADING } from "../actions/promoaction";

const initialState = {
  promoImages: [],
  promoLoading: true,
};

export const promoReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_PROMO_IMAGES:
      return {
        ...state,
        promoImages: action.payload,
      };
    case SET_PROMO_LOADING:
      return {
        ...state,
        promoLoading: action.payload,
      };
    default:
      return state;
  }
};
