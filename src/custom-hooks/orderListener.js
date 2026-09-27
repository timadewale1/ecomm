import {
  collection,
  getDocsFromServer,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { httpsCallable } from "firebase/functions";
import { db } from '../firebase.config';
import { functions } from "../firebase.config";
import store from '../redux/store';
import {
  setOrders,
  clearOrders,
  orderListenerFailed,
  orderListenerReady,
  orderListenerStarted,
} from '../redux/actions/orderaction';

let currentVendorId = null; // Tracks the current vendor ID to avoid stale listeners
let unsubscribe = null; // Keeps track of the active listener

const backfillVendorOrderViews = async (vendorId) => {
  const backfill = httpsCallable(functions, "backfillMyVendorOrderViewsV1");
  let cursor = null;

  do {
    if (currentVendorId !== vendorId) return;
    const response = await backfill({ cursor, pageSize: 100 });
    cursor = response?.data?.complete ? null : response?.data?.nextCursor || null;
  } while (cursor && currentVendorId === vendorId);
};

export const initializeOrderListener = (vendorId) => {
  // Check if the listener is already set up for this vendor
  if (currentVendorId === vendorId) {
    return;
  }

  // Remove the existing listener if it's set for a different vendor
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }

  // Update the current vendor ID
  currentVendorId = vendorId;

  // If no vendor ID is provided (e.g., user logged out), clear orders and exit
  if (!vendorId) {
    store.dispatch(clearOrders());
    return;
  }

  store.dispatch(orderListenerStarted(vendorId));

  // Vendors subscribe only to the server-owned, contact-safe projection.
  // Existing raw orders are projected lazily in the background on first use.
  const q = query(
    collection(db, 'vendorOrderViews'),
    where('vendorId', '==', vendorId),
  );
  unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const updatedOrders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Dispatch updated orders to the Redux store
      store.dispatch(setOrders(updatedOrders));
      store.dispatch(orderListenerReady(vendorId));
    },
    (error) => {
      console.error(`Error fetching orders for vendor ${vendorId}:`, error);
      store.dispatch(orderListenerFailed(vendorId, error));
    }
  );

  void backfillVendorOrderViews(vendorId)
    .catch((error) => {
      // The live listener remains authoritative. A failed compatibility
      // backfill must not discard an already-cached order list.
      console.warn("Vendor order compatibility sync failed:", error);
    });
};

// Pull-to-refresh should verify the current server projection, not run the
// compatibility backfill across the vendor's entire order history. The live
// listener remains authoritative and will continue receiving later changes.
export const refreshVendorOrders = async (vendorId) => {
  if (!vendorId || currentVendorId !== vendorId) return [];
  const snapshot = await getDocsFromServer(query(
    collection(db, 'vendorOrderViews'),
    where('vendorId', '==', vendorId),
  ));
  if (currentVendorId !== vendorId) return [];
  const updatedOrders = snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }));
  store.dispatch(setOrders(updatedOrders));
  store.dispatch(orderListenerReady(vendorId));
  return updatedOrders;
};

export const removeOrderListener = ({ clear = true } = {}) => {
  // Remove the listener and reset tracking variables
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  currentVendorId = null;

  // Clear orders from the Redux store
  if (clear) store.dispatch(clearOrders());
};
