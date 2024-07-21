import { db } from '../firebase.config';
import { doc, setDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

export const createDummyOrder = async (cart, userId) => {
  const orderId = uuidv4(); // Generate a unique ID for the order
  const orderDate = new Date();
  const order = {
    orderId,
    userId,
    products: Object.values(cart),
    totalAmount: Object.values(cart).reduce((sum, product) => sum + product.price * product.quantity, 0),
    paymentStatus: 'Paid', // Mark the order as paid
    orderDate,
    isDummy: true // Flag to indicate this is a dummy order
  };

  try {
    console.log("Creating order with user ID:", userId); 
    await setDoc(doc(db, 'orders', orderId), order);
    console.log('Dummy order created successfully');
    return orderId;
  } catch (error) {
    console.error('Error creating dummy order:', error);
    throw error;
  }
};
