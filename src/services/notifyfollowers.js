import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase.config";

const notifyFollowers = async (vendorId, productDetails) => {
  try {
    // Fetch the vendor details using the vendorId
    const vendorRef = doc(db, "vendors", vendorId);
    const vendorDoc = await getDoc(vendorRef);

    if (!vendorDoc.exists()) {
      console.error("Vendor not found for ID:", vendorId);
      return;
    }

    const vendorData = vendorDoc.data();
    const vendorCoverImage = vendorData.coverImageUrl || "";

    console.log("Vendor Cover Image:", vendorCoverImage); // Debugging log

    // Query followers of the vendor
    const followRef = collection(db, "follows");
    const q = query(followRef, where("vendorId", "==", vendorId));
    const followersSnapshot = await getDocs(q);

    // Notify all followers
    const followerPromises = followersSnapshot.docs.map(async (doc) => {
      const userId = doc.data().userId;

      // Create a notification for the user
      await addDoc(collection(db, "notifications"), {
        userId,
        message: `New product added by ${vendorData.shopName}: ${productDetails.name}`,
        productLink: `/product/${productDetails.id}`,
        productId: productDetails.id,
        productImage: productDetails.coverImageUrl || "",
        vendorName: vendorData.shopName,
        vendorCoverImage: vendorCoverImage, // Pass the vendor's cover image here
        createdAt: new Date(),
        seen: false,
        type: "vendor",
      });
    });

    await Promise.all(followerPromises);
    console.log("Followers have been notified.");
  } catch (error) {
    console.error("Error notifying followers:", error);
  }
};

export default notifyFollowers;
