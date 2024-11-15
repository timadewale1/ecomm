// src/redux/actions/orderActions.js

export const setOrders = (orders) => ({
    type: 'SET_ORDERS',
    payload: orders,
  });
  
  export const clearOrders = () => ({
    type: 'CLEAR_ORDERS',
  });
  