const rows = order => Array.isArray(order?.cartItems) ? order.cartItems : [];

export function localOrderProduct(item) {
  const saved = item?.productSnapshot || {};
  return {...saved,
    name:item?.name || item?.productName || saved.name || "Product",
    imageUrl:item?.selectedImageUrl || item?.imageUrl || item?.image || saved.imageUrl || saved.coverImageUrl || saved.imageUrls?.[0] || "",
    price:item?.unitPrice ?? saved.price ?? item?.price ?? null,
  };
}

// Only legacy incomplete rows need a network read. Complete purchase snapshots
// render immediately. Batch calls stay bounded and never erase paid line items.
export function createOrderProductReader({getSession, call, onError=()=>{}}) {
  return async (orders,{source="orders"}={}) => {
    const session=getSession();
    const result=Object.fromEntries(orders.map(order=>[order.id,rows(order).map(localOrderProduct)]));
    if (!session?.uid) return result;
    const incomplete=orders.filter(order=>order.id && rows(order).some(item=>{
      const view=localOrderProduct(item);
      return !view.imageUrl || view.name==="Product";
    }));
    const current=()=>getSession()===session;
    for(let offset=0;offset<incomplete.length;offset+=20) {
      if(!current()) throw Object.assign(new Error("Your account changed. Reopen your orders."),{code:"auth/session-changed"});
      const batch=incomplete.slice(offset,offset+20);
      try {
        const response=await call({orderIds:batch.map(order=>order.id),source});
        if(!current()) throw Object.assign(new Error("Your account changed. Reopen your orders."),{code:"auth/session-changed"});
        for(const order of batch) {
          const remote=response?.data?.orders?.[order.id];
          if(!Array.isArray(remote)) continue;
          result[order.id]=rows(order).map((item,index)=>{
            const entry=remote[index];
            if(!entry || entry.productId!==item?.productId) return localOrderProduct(item);
            const local=localOrderProduct(item);
            return {...entry,...item.productSnapshot,
              name:local.name!=="Product"?local.name:entry.name || "Product",
              imageUrl:local.imageUrl || entry.imageUrl || "",
              price:local.price ?? entry.price ?? null};
          });
        }
      } catch(error) {
        if(!current() || error?.code==="auth/session-changed") throw error;
        onError(error); // Keep immutable local details; optional enrichment may retry later.
      }
    }
    return result;
  };
}
