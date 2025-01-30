import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  collection,
  getDocs,
  query,
  where,
  limit,
  startAfter,
} from "firebase/firestore";
import { db } from "../../firebase.config";
export const fetchHomepageData = createAsyncThunk(
  "homepage/fetchHomepageData",
  async (_, { getState }) => {
    const { lastVisible } = getState().homepage; // Access the last fetched document

    const approvedVendorsSnapshot = await getDocs(
      query(
        collection(db, "vendors"),
        where("isApproved", "==", true),
        where("isDeactivated", "==", false)
      )
    );

    const approvedVendors = new Set();
    approvedVendorsSnapshot.forEach((vendorDoc) => {
      approvedVendors.add(vendorDoc.id);
    });

    const productsQuery = query(
      collection(db, "products"),
      where("published", "==", true),
      where("isDeleted", "==", false),
      where("isFeatured", "==", true),
      ...(lastVisible ? [startAfter(lastVisible)] : []), // Properly apply pagination
      limit(20)
    );

    const productsSnapshot = await getDocs(productsQuery);

    const lastVisibleDoc =
      productsSnapshot.docs[productsSnapshot.docs.length - 1];

    const products = [];
    productsSnapshot.forEach((productDoc) => {
      const productData = productDoc.data();
      if (approvedVendors.has(productData.vendorId)) {
        products.push({ id: productDoc.id, ...productData });
      }
    });

    return { products, lastVisible: lastVisibleDoc };
  }
);
