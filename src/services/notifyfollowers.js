import { collection, query, where, getDocs, addDoc, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase.config"; // Adjust the path to your firebase config

const notifyFollowers = async (vendorId, productDetails) => {
  try {
    // Fetch the vendor details from Firestore
    const vendorRef = doc(db, "vendors", vendorId);
    const vendorDoc = await getDoc(vendorRef);
    const vendorData = vendorDoc.exists() ? vendorDoc.data() : null;

    // Query for followers
    const followRef = collection(db, "follows");
    const q = query(followRef, where("vendorId", "==", vendorId));
    const followersSnapshot = await getDocs(q);

    const followerPromises = followersSnapshot.docs.map(async (doc) => {
      const userId = doc.data().userId;

      // Store the notification in the 'notifications' collection
      await addDoc(collection(db, "notifications"), {
        userId,
        message: `New product added by ${vendorData.shopName}: ${productDetails.name}`,
        productLink: `/product/${productDetails.id}`,
        productImage: productDetails.coverImageUrl || '', // Include product image if available
        vendorName: vendorData.shopName, // Include vendor name
        createdAt: new Date(),
        seen: false,
      });
    });

    await Promise.all(followerPromises);

    console.log("Followers have been notified.");
  } catch (error) {
    console.error("Error notifying followers:", error);
  }
};

export default notifyFollowers;
