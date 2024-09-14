export const createDummyOrder = async (cart, userId) => {
  const orderId = uuidv4(); // Generate a unique ID for the order
  const orderDate = new Date();

  // Assuming all products belong to the same vendor
  const vendorId = Object.values(cart)[0]?.vendorId || "unknownVendor"; // Extract the vendorId from the first product

  const order = {
    orderId,
    userId,
    vendorId, // Add vendorId here at the top level
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
