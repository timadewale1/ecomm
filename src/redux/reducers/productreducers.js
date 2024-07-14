import { FETCH_PRODUCT_REQUEST, FETCH_PRODUCT_SUCCESS, FETCH_PRODUCT_FAILURE, FETCH_PRODUCTS_SUCCESS } from "../actions/productaction";

const initialState = {
  loading: false,
  product: null,
  products: [], 
  error: null,
};

const productReducer = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_PRODUCT_REQUEST:
      return { ...state, loading: true, error: null };
    case FETCH_PRODUCT_SUCCESS:
      return { ...state, loading: false, product: action.payload };
    case FETCH_PRODUCTS_SUCCESS:
      return { ...state, products: action.payload };
    case FETCH_PRODUCT_FAILURE:
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
};

export default productReducer;