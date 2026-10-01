export function createPublicVendorReader(read) {
  const inFlight = new Map();
  return function getPublicVendor(vendorId) {
    if (typeof vendorId !== "string" || !vendorId || vendorId.includes("/")) return Promise.resolve(null);
    if (inFlight.has(vendorId)) return inFlight.get(vendorId);
    const request = Promise.resolve().then(() => read(vendorId)).then((snapshot) => {
      const data = snapshot.data();
      return snapshot.exists() && data?.isPublic === true ? {...data, id: snapshot.id} : null;
    }).finally(() => inFlight.delete(vendorId));
    inFlight.set(vendorId, request);
    return request;
  };
}

export function createOwnedVendorSummaryReader({currentUid, call}) {
  return async function getOwnedOrderVendorSummaries(orders, ownerUid) {
    if (!ownerUid || currentUid() !== ownerUid) return {};
    const representatives = new Map();
    for (const order of orders) {
      if (order?.id && order?.vendorId) representatives.set(order.vendorId, order.id);
    }
    const ids = [...representatives.values()];
    const result = new Map();
    for (let start = 0; start < ids.length; start += 50) {
      if (currentUid() !== ownerUid) return {};
      const response = await call({orderIds: ids.slice(start, start + 50)});
      if (currentUid() !== ownerUid) return {};
      for (const summary of Object.values(response.data?.orders || {})) {
        if (representatives.has(summary.vendorId)) result.set(summary.vendorId, summary);
      }
    }
    return Object.fromEntries(result);
  };
}
