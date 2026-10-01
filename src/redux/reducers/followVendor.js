import { setVendorFollowState, getVendorFollowState } from "../../services/vendorFollow";

export const followVendor = async (userId, vendor) => {
  // Ensure vendor.id is defined
  if (!vendor?.id) {
    throw new Error("Vendor ID is undefined");
  }

  const followed = await getVendorFollowState(userId, vendor.id);
  return setVendorFollowState({
    userId,
    vendorId: vendor.id,
    shouldFollow: !followed,
  });
};
