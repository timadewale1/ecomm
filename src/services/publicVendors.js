import { collection, doc, getDoc, query, where } from "firebase/firestore";
import { db } from "../firebase.config";
import { createPublicVendorReader } from "./vendorReadAccess.mjs";

export const PUBLIC_VENDOR_COLLECTION = "publicVendors";

export const publicVendorsQuery = (...constraints) => query(
  collection(db, PUBLIC_VENDOR_COLLECTION), where("isPublic", "==", true), ...constraints,
);

// Coalesce simultaneous cards from the same store, without retaining stale
// moderation state in an additional TTL cache. Redux still owns page snapshots.
// Permission/network failures remain errors, never an absent/deleted vendor.
export const getPublicVendor = createPublicVendorReader((vendorId) =>
  getDoc(doc(db, PUBLIC_VENDOR_COLLECTION, vendorId)),
);
