// src/utils/enrichOrders.ts
import { collection, query, where, getDocs, documentId } from "firebase/firestore";
import { db } from "../firebase.config";

export async function enrichWithProductInfo(rawOrders) {
  // gather all productIds
  const ids = Array.from(
    new Set(rawOrders.flatMap(o => o.cartItems.map(i => i.productId)))
  );
  if (ids.length === 0) return rawOrders;

  // fetch all those products in one go
  const prodSnap = await getDocs(
    query(collection(db, "products"), where(documentId(), "in", ids))
  );
  const products = {};
  prodSnap.forEach(d => (products[d.id] = d.data()));

  // attach name/price/image/color/size into each cartItem
  return rawOrders.map(order => ({
    ...order,
    cartItems: order.cartItems.map(item => {
      const p = products[item.productId] || {};
      return {
        ...item,
        name: p.name,
        price: item.price ?? p.price,
        imageUrl: p.coverImageUrl || p.imageUrls?.[0] || "",
        color: item.color || item.variantAttributes?.color || p.color || "",
        size: item.size || item.variantAttributes?.size || p.size || "",
      };
    }),
  }));
}
