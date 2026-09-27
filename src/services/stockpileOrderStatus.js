export const STOCKPILE_ORDER_MEMBERSHIP = Object.freeze({
  AWAITING_VENDOR: "awaiting_vendor",
  READY: "ready",
  DECLINED: "declined",
});

const normalizeStatus = (value) =>
  String(value || "")
    .normalize("NFKC")
    .trim()
    .toLowerCase();

// Keep this mapping aligned with functions/stockpileLifecycle.js. The order
// state describes whether an order belongs in the pile; stockpile.status is a
// separate delivery lifecycle and must not be used for these item badges.
export const getStockpileOrderMembership = (order = {}) => {
  const vendorStatus = normalizeStatus(order.vendorStatus);
  const progressStatus = normalizeStatus(order.progressStatus);

  if (vendorStatus === "declined" || progressStatus === "declined") {
    return STOCKPILE_ORDER_MEMBERSHIP.DECLINED;
  }

  if (
    vendorStatus === "accepted" ||
    ["in progress", "processing", "ready", "shipped", "delivered"].includes(
      progressStatus,
    )
  ) {
    return STOCKPILE_ORDER_MEMBERSHIP.READY;
  }

  return STOCKPILE_ORDER_MEMBERSHIP.AWAITING_VENDOR;
};

