const status = (value) => String(value || "").trim().toLowerCase();
const complete = (value) => ["delivered", "collected", "completed"].includes(status(value));
const rejected = (value) => ["declined", "cancelled", "canceled"].includes(status(value));
const millis = (value) => {
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.seconds === "number") return value.seconds * 1000 + (value.nanoseconds || 0) / 1e6;
  if (typeof value === "number") return value;
  return new Date(value || 0).getTime() || 0;
};

const ownCompletion = (order) => order.orderDelivered === true ||
  [order.progressStatus, order.deliveryStatus, order.pickupStatus].some(complete);
const ownRejection = (order) => [order.vendorStatus, order.progressStatus].some(rejected);
const refunded = (order) => [order.paymentStatus, order.progressStatus, order.deliveryStatus]
  .some((value) => status(value) === "refunded");

function normalState(order) {
  // A declined addition may inherit its pile's deliveryStatus in the projection.
  if (ownRejection(order)) return "closed";
  if (ownCompletion(order)) return "fulfilled";
  // Courier cancellation/failure is not cancellation of the customer's order.
  if (refunded(order)) return "closed";
  return "unfulfilled";
}

function stockpileState(orders) {
  // Only individual membership decisions can remove an addition from a pile.
  // Inactive/expired/awaiting-delivery is not the same as fulfilled or cancelled.
  const remaining = orders.filter((order) => !ownRejection(order) &&
    !(refunded(order) && !ownCompletion(order)));
  if (!remaining.length) return "closed";
  const canonical = orders.filter((order) => order.stockpile).reduce((latest, order) => {
    const updated = (entry) => millis(entry.projectedAt || entry.updatedAt || entry.createdAt);
    return !latest || updated(order) > updated(latest) ? order : latest;
  }, null)?.stockpile;
  if (canonical) {
    if (complete(canonical.status) || complete(canonical.deliveryStatus)) return "fulfilled";
    // The compatibility projector labels some old inactive piles "cancelled"
    // when they predate the lifecycle field. Actual completed member orders
    // still prove fulfilment; an inactive flag alone does not undo delivery.
    if (status(canonical.status) === "cancelled" && remaining.every(ownCompletion)) return "fulfilled";
    // The parcel's lifecycle is authoritative; don't borrow the latest repile's
    // status, or treat isActive:false as cancelled while accepted goods remain.
    return "unfulfilled";
  }
  // Legacy records without a pile projection: require every non-declined
  // addition to be complete, not just one delivered order in the group.
  return remaining.every(ownCompletion) ? "fulfilled" : "unfulfilled";
}

export function vendorOrderStatistics(orders = []) {
  const units = new Map();
  const seenOrders = new Set();
  for (const order of Array.isArray(orders) ? orders : []) {
    if (!order) continue;
    const payment = status(order.paymentStatus);
    // Preserve legacy paid records without this field and retain refunded paid
    // orders in history. Explicit unpaid/draft payments do not enter the totals.
    if (payment && !["paid", "success", "completed", "refunded", "partially_refunded"].includes(payment)) continue;
    const id = String(order.orderId || order.id || "").trim();
    const vendorId = String(order.vendorId || "");
    if (!id || seenOrders.has(`${vendorId}:${id}`)) continue;
    seenOrders.add(`${vendorId}:${id}`);
    const pileId = String(order.stockpileDocId || order.stockpile?.id || "").trim();
    const isPile = order.kind === "stockpile" || order.isStockpile === true || Boolean(pileId);
    // Never merge unrelated legacy orders just because their pile ID is missing.
    const key = `${vendorId}:${isPile && pileId ? `pile:${pileId}` : `order:${id}`}`;
    if (!units.has(key)) units.set(key, {isPile, orders: []});
    units.get(key).orders.push(order);
  }
  const totals = {total: units.size, fulfilled: 0, unfulfilled: 0, closed: 0};
  for (const unit of units.values()) {
    totals[unit.isPile ? stockpileState(unit.orders) : normalState(unit.orders[0])] += 1;
  }
  return totals;
}
