import { AUTH_LOADING, LOGIN_SUCCESS, LOGIN_FAILURE, LOGOUT } from "../actions/authactions";

const initialState = {
  currentUser: null,
  loading: false,
  error: null,
};

const authReducer = (state = initialState, action) => {
  switch (action.type) {
    case AUTH_LOADING:
      return { ...state, loading: true };
    case LOGIN_SUCCESS:
      return { ...state, currentUser: action.payload, loading: false };
    case LOGIN_FAILURE:
      return { ...state, error: action.payload, loading: false };
    case LOGOUT:
      return { ...state, currentUser: null, loading: false };
    default:
      return state;
  }
};

export default authReducer;
