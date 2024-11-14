// src/redux/reducers/orderReducer.js

const initialState = {
    orders: [],
  };
  
  const orderReducer = (state = initialState, action) => {
    switch (action.type) {
      case 'SET_ORDERS':
        return {
          ...state,
          orders: action.payload,
        };
      case 'CLEAR_ORDERS':
        return initialState;
      default:
        return state;
    }
  };
  
  export default orderReducer;
  