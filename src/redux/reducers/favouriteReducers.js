import { TOGGLE_FAVORITE } from "../actions/favouriteactions";

const initialState = {};

const favoritesReducer = (state = initialState, action) => {
  switch (action.type) {
    case TOGGLE_FAVORITE:
      const { payload } = action;
      return state[payload]
        ? { ...state, [payload]: undefined }
        : { ...state, [payload]: true };
    default:
      return state;
  }
};

export default favoritesReducer;
