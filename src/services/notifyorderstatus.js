import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase.config";
import axios from "axios"; // Add axios for API call

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
    console.log("Starting notification process...");
    console.log("Input Data:", {
      userId,
      orderId,
      newStatus,
      vendorName,
      vendorCoverImage,
      productImage,
      declineReason,
      riderInfo,
    });

    // Validate userId
    if (!userId) {
      console.error("User ID is undefined or null.");
      throw new Error("User ID is undefined or null. Cannot send notification.");
    }

    // Validate orderId
    if (!orderId) {
      console.error("Order ID is undefined or null.");
      throw new Error("Order ID is undefined or null. Cannot send notification.");
    }

    // Fetch the order document from Firestore
    console.log(`Fetching order with ID: ${orderId}...`);
    const orderRef = doc(db, "orders", orderId);
    const orderDoc = await getDoc(orderRef);

    if (!orderDoc.exists()) {
      console.error(`Order with ID ${orderId} does not exist in Firestore.`);
      throw new Error("Order document does not exist.");
    }

    // Validate newStatus
    const validStatuses = ["Pending", "In Progress", "Shipped", "Declined", "Delivered"];
    if (!validStatuses.includes(newStatus)) {
      console.error(`Invalid order status: ${newStatus}`);
      throw new Error("Invalid order status. Cannot send notification.");
    }

    // Restrict fields based on newStatus
    if (newStatus !== "Declined") {
      declineReason = null; // Reset declineReason if not Declined
    }

    if (newStatus !== "Shipped") {
      riderInfo = null; // Reset riderInfo if not Shipped
    }

    // Create notification object
    const notificationData = {
      userId,
      vendorName: vendorName || "Unknown Vendor",
      vendorCoverImage: vendorCoverImage || "",
      productImage: productImage || "",
      message: `Your order with ${vendorName || "Unknown Vendor"} has been updated to: ${newStatus}`,
      orderId,
      declineReason,
      riderInfo,
      createdAt: new Date(),
      seen: false,
      type: "order",
    };

    console.log("Prepared Notification Data:", notificationData);

    // Add notification to Firestore
    console.log("Adding notification to Firestore...");
    await addDoc(collection(db, "notifications"), notificationData);
    console.log("Notification successfully sent to Firestore.");

    // Call the API to send an email notification
    console.log("Sending email notification via Cloud Function...");
    await axios.post("https://us-central1-ecommerce-ba520.cloudfunctions.net/sendNotification", {
      userId,
      orderId,
      newStatus,
      vendorName,
      vendorCoverImage,
      productImage,
      declineReason,
      riderInfo,
    });
    console.log("Email notification sent successfully via Cloud Function.");
  } catch (error) {
    console.error("Error notifying user about order status change:", error.message);
  }
};

export default notifyOrderStatusChange;
