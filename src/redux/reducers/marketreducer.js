// src/redux/reducers/marketReducer.js
import { SET_MARKET_IMAGES, SET_MARKET_LOADING } from "../actions/marketaction";

const initialState = {
  marketImages: [],
  marketLoading: true,
};

export const marketReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_MARKET_IMAGES:
      return {
        ...state,
        marketImages: action.payload,
      };
    case SET_MARKET_LOADING:
      return {
        ...state,
        marketLoading: action.payload,
      };
    default:
      return state;
  }
};
