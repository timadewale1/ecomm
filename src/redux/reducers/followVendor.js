import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  updateDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase.config";
import { handleUserActionLimit } from "../../services/userWriteHandler";

export const followVendor = async (userId, vendor) => {
  // Ensure vendor.id is defined
  if (!vendor?.id) {
    throw new Error("Vendor ID is undefined");
  }

  const followRef = doc(db, "follows", `${userId}_${vendor.id}`);
  const vendorRef = doc(db, "vendors", vendor.id);

  // Check user action limits (if applicable)
  await handleUserActionLimit(
    userId,
    "follow",
    {},
    {
      collectionName: "usage_metadata",
      writeLimit: 50,
      minuteLimit: 8,
      hourLimit: 40,
    }
  );

  // Check if the follow document exists
  const followSnapshot = await getDoc(followRef);
  if (!followSnapshot.exists()) {
    // Create the follow document with required fields
    await setDoc(followRef, {
      userId, // Must match request.auth.uid
      vendorId: vendor.id,
      createdAt: serverTimestamp(),
    });
    // Increment vendor followers count
    await updateDoc(vendorRef, { followersCount: increment(1) });
    return { followed: true };
  } else {
    // Unfollow vendor: delete the follow document
    await deleteDoc(followRef);
    return { followed: false };
  }
};
