const initialState = {
  securityVersion: 3,
  orders: [],
  ownerVendorId: null,
  status: "idle",
  error: null,
  lastSyncedAt: null,
};
const orderReducer = (state = initialState, action) => {
  switch (action.type) {
    case "SET_ORDERS":
      if (!state.ownerVendorId || action.meta?.vendorId !== state.ownerVendorId) return state;
      return {
        ...state,
        orders: action.payload.filter(order => order.vendorId === state.ownerVendorId),
        status: "ready",
        error: null,
      };
    case "PATCH_VENDOR_ORDER":
      return {
        ...state,
        orders: state.orders.map((order) =>
          (order.orderId || order.id) === action.payload.orderId
            ? {...order, ...action.payload.changes}
            : order),
      };
    case "PATCH_VENDOR_STOCKPILE":
      return {
        ...state,
        orders: state.orders.map((order) =>
          String(order.stockpileDocId || order.stockpile?.id || "") ===
          String(action.payload.stockpileDocId || "")
            ? {
                ...order,
                ...action.payload.changes,
                stockpile: {
                  ...(order.stockpile || {}),
                  ...(action.payload.changes.stockpile || {}),
                },
              }
            : order),
      };
    case "ORDER_LISTENER_STARTED":
      return {
        ...(state.ownerVendorId === action.payload.vendorId && state.securityVersion === 3 ? state : initialState),
        ownerVendorId: action.payload.vendorId,
        status: state.ownerVendorId === action.payload.vendorId && state.securityVersion === 3 && state.orders.length ? "refreshing" : "connecting",
        error: null,
      };
    case "ORDER_LISTENER_READY":
      if (action.payload.vendorId !== state.ownerVendorId) return state;
      return {
        ...state,
        ownerVendorId: action.payload.vendorId,
        status: "ready",
        error: null,
        lastSyncedAt: action.payload.syncedAt,
      };
    case "ORDER_LISTENER_FAILED":
      if (action.payload.vendorId !== state.ownerVendorId) return state;
      return {
        ...state,
        status: state.orders.length ? "ready" : "error",
        error: action.payload.message,
      };
    case "CLEAR_ORDERS":
      return initialState;
    default:
      return state;
  }
};

export default orderReducer;
