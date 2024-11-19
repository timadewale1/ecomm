import { onSnapshot, query, where, collection } from 'firebase/firestore';
import { db } from '../firebase.config';
import store from '../redux/store';
import { setOrders, clearOrders } from '../redux/actions/orderaction';

let currentVendorId = null; // Tracks the current vendor ID to avoid stale listeners
let unsubscribe = null; // Keeps track of the active listener

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

  // Set up a new Firestore listener for the current vendor ID
  const q = query(collection(db, 'orders'), where('vendorId', '==', vendorId));
  unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const updatedOrders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Dispatch updated orders to the Redux store
      store.dispatch(setOrders(updatedOrders));
    },
    (error) => {
      console.error(`Error fetching orders for vendor ${vendorId}:`, error);
    }
  );
};

export const removeOrderListener = () => {
  // Remove the listener and reset tracking variables
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  currentVendorId = null;

  // Clear orders from the Redux store
  store.dispatch(clearOrders());
};
