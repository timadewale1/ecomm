import { getFirestore, doc, getDoc, writeBatch } from "firebase/firestore";

// Utility function to generate a unique order ID
const generateOrderId = () => {
  return `order_${new Date().getTime()}`;
};

export const createOrderAndReduceStock = async (userId, cart, { userInfo, note, subTotal, bookingFee, serviceFee, total }) => {
  const db = getFirestore();
  const orderId = generateOrderId();

  
  try {
    // Step 1: Verify stock quantities from the centralized "products" collection
    const productRefs = Object.values(cart).map((product) =>
      doc(db, "products", product.id)
    );

    const productDocs = await Promise.all(
      productRefs.map((productRef) => getDoc(productRef))
    );

    console.log("Product Docs fetched:", productDocs.map(doc => ({ id: doc.id, data: doc.data() })));

    // Check for stock availability
    for (const productDoc of productDocs) {
      if (!productDoc.exists()) {
        console.error(`Product ${productDoc.id} does not exist!`);
        throw new Error(`Product ${productDoc.id} does not exist!`);
      }

      const product = productDoc.data();
      const cartProduct = Object.values(cart).find((item) => item.id === productDoc.id);

      if (!cartProduct) {
        console.error(`Cart product ${productDoc.id} not found in cart!`);
        throw new Error(`Cart product ${productDoc.id} not found in cart!`);
      }

      if (product.stockQuantity < cartProduct.quantity) {
        console.error(`Insufficient stock for product ${productDoc.id}! Stock available: ${product.stockQuantity}, Requested: ${cartProduct.quantity}`);
        throw new Error(`Insufficient stock for product ${productDoc.id}!`);
      }
    }

    // Step 2: Fetch user information from Firestore if not provided in checkout
    let finalUserInfo = userInfo;
    if (!userInfo || !userInfo.displayName || !userInfo.email || !userInfo.address) {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        finalUserInfo = {
          displayName: userInfo.displayName || userData.displayName || "",
          email: userInfo.email || userData.email || "",
          phoneNumber: userInfo.phoneNumber || userData.phoneNumber || "",
          address: userInfo.address || userData.address || "",
        };
      } else {
        throw new Error("User document does not exist in Firestore.");
      }
    }

    // Step 3: Place order and update stock quantities
    const batch = writeBatch(db);
    const orderRef = doc(db, "orders", orderId);

    console.log("Creating order with ID:", orderId);

    // Extract vendorId from the first product (assuming all products are from the same vendor for simplicity)
    const vendorId = Object.values(cart)[0]?.vendorId || "unknownVendor";
    console.log("Vendor ID:", vendorId);

    // Store order with subtotal, booking fee, service fee, and total
    batch.set(orderRef, {
      userId,
      vendorId, // Add vendorId at the top level
      products: cart,
      subTotal, // Vendor's subtotal (without fees)
      bookingFee, // Marketplace booking fee (if applicable)
      serviceFee, // Platform service fee
      total, // Total the customer is paying (including fees)
      paymentStatus: "Pending",
      createdAt: new Date(),
      note: note || "", // Add the note here
      deliveryInfo: finalUserInfo, // Use the finalUserInfo, which is either from the checkout or Firestore
    });

    console.log("Order set in Firestore batch");

    for (const productDoc of productDocs) {
      const cartProduct = Object.values(cart).find((item) => item.id === productDoc.id);
      const newStockQuantity = productDoc.data().stockQuantity - cartProduct.quantity;
      const productRef = productRefs.find((ref) => ref.id === productDoc.id);

      console.log(`Updating stock for product ${productDoc.id}. New stock quantity: ${newStockQuantity}`);
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
