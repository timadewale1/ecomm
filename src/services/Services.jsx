import { getFirestore, doc, getDoc, writeBatch } from "firebase/firestore";

// Utility function to generate a unique order ID
const generateOrderId = () => {
  return `order_${new Date().getTime()}`;
};

export const createOrderAndReduceStock = async (userId, cart) => {
  const db = getFirestore();
  const orderId = generateOrderId();

  console.log("Starting createOrderAndReduceStock function");
  console.log("User ID:", userId);
  console.log("Cart:", cart);

  try {
    // Step 1: Verify stock quantities
    const productRefs = Object.values(cart).map((product) =>
      doc(db, "vendors", product.vendorId, "products", product.id)
    );

    const productDocs = await Promise.all(
      productRefs.map((productRef) => getDoc(productRef))
    );

    console.log("Product Docs:", productDocs);

    // Check for stock availability
    for (const productDoc of productDocs) {
      if (!productDoc.exists()) {
        throw new Error(`Product ${productDoc.id} does not exist!`);
      }

      const product = productDoc.data();
      const cartProduct = Object.values(cart).find((item) => item.id === productDoc.id);

      console.log("Cart Product:", cartProduct);
      console.log("Firestore Product:", product);

      if (!cartProduct) {
        throw new Error(`Cart product ${productDoc.id} not found in cart!`);
      }

      if (product.stockQuantity < cartProduct.quantity) {
        throw new Error(`Insufficient stock for product ${productDoc.id}!`);
      }
    }

    // Step 2: Place order and update stock quantities
    const batch = writeBatch(db);
    const orderRef = doc(db, "orders", orderId);

    batch.set(orderRef, {
      userId, // Ensure the userId is correctly set
      products: cart,
      paymentStatus: "Pending",
      createdAt: new Date(),
    });

    for (const productDoc of productDocs) {
      const cartProduct = Object.values(cart).find((item) => item.id === productDoc.id);
      const newStockQuantity = productDoc.data().stockQuantity - cartProduct.quantity;
      const productRef = productRefs.find((ref) => ref.id === productDoc.id);

      batch.update(productRef, { stockQuantity: newStockQuantity });
    }

    console.log("Committing batch operation");
    await batch.commit();
    console.log("Order created successfully:", orderId);
    return orderId;
  } catch (error) {
    console.error("Error in createOrderAndReduceStock function:", error);
    throw error;
  }
};
