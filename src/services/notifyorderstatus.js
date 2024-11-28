// services/notifyorderstatus.js
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase.config";

const notifyOrderStatusChange = async (
  userId,
  orderId,
  newStatus,
  vendorName,
  vendorCoverImage, 
  productImage,
  declineReason = null,
  riderInfo = null
) => {
  try {
    // Check if userId is valid
    if (!userId) {
      throw new Error(
        "User ID is undefined or null. Cannot send notification."
      );
    }

    // Check if orderId is valid
    if (!orderId) {
      throw new Error(
        "Order ID is undefined or null. Cannot send notification."
      );
    }

    // Check if order document exists in Firestore
    const orderRef = doc(db, "orders", orderId);
    const orderDoc = await getDoc(orderRef);

    if (!orderDoc.exists()) {
      throw new Error("Order document does not exist.");
    }

    // Create notification object and include vendorName
    const notificationData = {
      userId,
      vendorName,
      vendorCoverImage,
      productImage,
      message: `Your order with ${vendorName} has been updated to: ${newStatus}`,
      orderId,
      declineReason,
      riderInfo,
      createdAt: new Date(),
      seen: false,
      type: "order",
    };

    // Add the notification to Firestore
    await addDoc(collection(db, "notifications"), notificationData);
    console.log("User notified about order status change.");
  } catch (error) {
    console.error("Error notifying user about order status change:", error);
  }
};

export default notifyOrderStatusChange;
