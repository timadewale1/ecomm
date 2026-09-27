export const setOrders = (orders) => ({
  type: "SET_ORDERS",
  payload: orders,
});

export const patchVendorOrder = (orderId, changes) => ({
  type: "PATCH_VENDOR_ORDER",
  payload: {orderId, changes},
});

export const patchVendorStockpile = (stockpileDocId, changes) => ({
  type: "PATCH_VENDOR_STOCKPILE",
  payload: {stockpileDocId, changes},
});

export const orderListenerStarted = (vendorId) => ({
  type: "ORDER_LISTENER_STARTED",
  payload: { vendorId },
});

export const orderListenerReady = (vendorId) => ({
  type: "ORDER_LISTENER_READY",
  payload: { vendorId, syncedAt: Date.now() },
});

export const orderListenerFailed = (vendorId, error) => ({
  type: "ORDER_LISTENER_FAILED",
  payload: {
    vendorId,
    message: error?.message || "Store orders could not be loaded.",
  },
});
export const clearOrders = () => ({
  type: "CLEAR_ORDERS",
});
