// src/reducers/authReducer.js

import {
  LOGIN_REQUEST,
  LOGIN_SUCCESS,
  LOGIN_FAILURE,
  LOGOUT,
} from "../actions/authActiontypes";

const initialState = {
  loading: false,
  currentUser: null,
  error: null,
  userData: null,
};

const authReducer = (state = initialState, action) => {
  switch (action.type) {
    case LOGIN_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };
    case LOGIN_SUCCESS:
      return {
        ...state,
        loading: false,
        currentUser: action.payload,
        error: null,
      };
    case LOGIN_FAILURE:
      return {
        ...state,
        loading: false,
        currentUser: null,
        error: action.payload,
      };
    case LOGOUT:
      return {
        ...state,
        loading: false,
        currentUser: null,
        error: null,
      };
    case "RESET_USER_DATA":
      return {
        ...state,
        userData: null,
       
      };
    default:
      return state;
  }
};

export default authReducer;
