export function restoreVendorOrderCache(value) {
  const empty = {securityVersion: 3, ownerVendorId: null, orders: [], status: "idle", error: null, lastSyncedAt: null};
  // One-time removal of pre-privacy caches, not a deletion of server orders.
  if (value?.securityVersion !== 3 || !value.ownerVendorId) return empty;
  return {...empty, ownerVendorId: value.ownerVendorId, lastSyncedAt: value.lastSyncedAt || null,
    orders: (Array.isArray(value.orders) ? value.orders : []).filter(order =>
      order?.vendorId === value.ownerVendorId && order.projectionVersion === 3)};
}
