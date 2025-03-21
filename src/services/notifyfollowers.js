import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase.config";

const notifyFollowers = async (vendorId, productDetails) => {
  try {
    console.log(
      `Starting notifyFollowers for vendorId: ${vendorId}, productDetails:`,
      productDetails
    );

    // Fetch the vendor details using the vendorId
    const vendorRef = doc(db, "vendors", vendorId);
    const vendorDoc = await getDoc(vendorRef);

    if (!vendorDoc.exists()) {
      console.error("Vendor not found for ID:", vendorId);
      return;
    }

    const vendorData = vendorDoc.data();
    const vendorCoverImage = vendorData.coverImageUrl || "";
    console.log("Vendor data retrieved:", vendorData);
    console.log("Vendor Cover Image:", vendorCoverImage);

    // Query followers of the vendor
    const followRef = collection(db, "follows");
    const q = query(followRef, where("vendorId", "==", vendorId));
    const followersSnapshot = await getDocs(q);
    console.log(`Found ${followersSnapshot.size} follower(s) for vendor ${vendorId}.`);

    // Notify all followers
    const followerPromises = followersSnapshot.docs.map(async (docSnap) => {
      const userId = docSnap.data().userId;
      console.log(`Processing follower with userId: ${userId}`);

      // Create an in-app notification for the user
      await addDoc(collection(db, "notifications"), {
        userId,
        message: `New product added by ${vendorData.shopName}: ${productDetails.name}`,
        productLink: `/product/${productDetails.id}`,
        productId: productDetails.id,
        productImage: productDetails.coverImageUrl || "",
        vendorName: vendorData.shopName,
        vendorCoverImage: vendorCoverImage,
        createdAt: new Date(),
        seen: false,
        type: "vendor",
      });
      console.log(`In-app notification created for userId: ${userId}`);

      // Batch Email Notification Logic
      // Fetch the user's email and display name
      const userDoc = await getDoc(doc(db, "users", userId));
      const userData = userDoc.exists() ? userDoc.data() : null;
      if (!userData || !userData.email) {
        console.log(`Skipping email batch for userId: ${userId} as no email found.`);
        return;
      }
      const userEmail = userData.email;
      const userName = userData.displayName || "there";
      console.log(
        `User data for userId: ${userId} - email: ${userEmail}, displayName: ${userName}`
      );

      // Prepare a new product entry for the email batch
      const newProductEntry = {
        id: productDetails.id,
        name: productDetails.name,
        image: productDetails.coverImageUrl || "",
        link: `https://www.shopmythrift.store/product/${productDetails.id}`,
        createdAt: new Date(),
      };
      console.log("New product entry for email batch:", newProductEntry);

      // Check if a pending batch already exists for this user/vendor combination
      const batchQuery = query(
        collection(db, "pendingProductEmails"),
        where("userId", "==", userId),
        where("vendorId", "==", vendorId)
      );
      const batchSnap = await getDocs(batchQuery);

      if (!batchSnap.empty) {
        // Append to the existing batch
        const batchDocRef = batchSnap.docs[0].ref;
        const batchData = batchSnap.docs[0].data();
        const updatedProducts = batchData.products
          ? [...batchData.products, newProductEntry]
          : [newProductEntry];
        await updateDoc(batchDocRef, {
          products: updatedProducts,
        });
        console.log(`Appended new product to existing batch for userId: ${userId}`);
      } else {
        // Create a new batch document
        await addDoc(collection(db, "pendingProductEmails"), {
          userId,
          userEmail,
          userName,
          vendorId,
          vendorName: vendorData.shopName,
          vendorCoverImage: vendorCoverImage,
          products: [newProductEntry],
          createdAt: serverTimestamp(),
        });
        console.log(`Created new email batch for userId: ${userId}`);
      }
    });

    await Promise.all(followerPromises);
    console.log("Followers have been notified and email batches updated.");
  } catch (error) {
    console.error("Error notifying followers:", error);
  }
};

export default notifyFollowers;
