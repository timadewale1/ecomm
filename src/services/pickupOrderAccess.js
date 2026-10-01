import { httpsCallable } from "firebase/functions";
import { auth, functions } from "../firebase.config";

// Deliberately not persisted: exact pickup locations belong to an authenticated
// order, not a reusable public-store cache. Batches bound each server request.
export async function getOwnedPickupDetails(orders, ownerUid) {
  if (!ownerUid || auth.currentUser?.uid !== ownerUid) return {};
  const ids = [...new Set(orders.filter((order) =>
    order.isPickup === true || order.userInfo?.isPickup === true,
  ).map((order) => order.id).filter(Boolean))];
  const result = {};
  const call = httpsCallable(functions, "getPickupOrderDetailsV1");
  for (let start = 0; start < ids.length; start += 50) {
    if (auth.currentUser?.uid !== ownerUid) return {};
    const response = await call({orderIds: ids.slice(start, start + 50)});
    if (auth.currentUser?.uid !== ownerUid) return {};
    Object.assign(result, response.data?.orders || {});
  }
  return result;
}
