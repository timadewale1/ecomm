import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase.config";
import { setVendorFollowState } from "../../services/vendorFollow";

export const followVendor = async (userId, vendor) => {
  // Ensure vendor.id is defined
  if (!vendor?.id) {
    throw new Error("Vendor ID is undefined");
  }

  const followRef = doc(db, "follows", `${userId}_${vendor.id}`);
  const followSnapshot = await getDoc(followRef);
  return setVendorFollowState({
    userId,
    vendorId: vendor.id,
    shouldFollow: !followSnapshot.exists(),
  });
};
