import { onSnapshot, query, where, collection } from 'firebase/firestore';
import { db } from '../firebase.config';
import store from '../redux/store';
import { setOrders } from '../redux/actions/orderaction';

let unsubscribe = null;

export const initializeOrderListener = (vendorId) => {
  if (unsubscribe) {
    return;
  }

  const q = query(collection(db, 'orders'), where('vendorId', '==', vendorId));
  unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const updatedOrders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      store.dispatch(setOrders(updatedOrders));
    },
    (error) => {
      console.error('Error fetching orders:', error);
    }
  );
};

export const removeOrderListener = () => {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
};
