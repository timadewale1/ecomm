import { createAsyncThunk } from "@reduxjs/toolkit";
import { collection, getDocs, query, where, limit, startAfter } from "firebase/firestore";
import { db } from "../../firebase.config";

// Fetch homepage data
export const fetchHomepageData = createAsyncThunk(
  "homepage/fetchHomepageData",
  async (_, { getState, rejectWithValue }) => {
    try {
      console.log("Fetching homepage data...");
      const { lastVisible } = getState().homepage;

      console.log("Last visible document:", lastVisible);

      // Fetch approved vendors
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

      console.log("Approved vendors:", Array.from(approvedVendors));

      // Fetch products
      const productsQuery = query(
        collection(db, "products"),
        where("published", "==", true),
        where("isDeleted", "==", false),
        where("isFeatured", "==", true),
        ...(lastVisible ? [startAfter(lastVisible)] : []),
        limit(20)
      );

      const productsSnapshot = await getDocs(productsQuery);

      const lastVisibleDoc =
        productsSnapshot.docs[productsSnapshot.docs.length - 1];

      console.log("Last visible doc after fetch:", lastVisibleDoc);

      const products = [];
      productsSnapshot.forEach((productDoc) => {
        const productData = productDoc.data();
        if (approvedVendors.has(productData.vendorId)) {
          products.push({ id: productDoc.id, ...productData });
        }
      });

      console.log("Fetched products:", products);

      return { products, lastVisible: lastVisibleDoc };
    } catch (error) {
      console.error("Error fetching homepage data:", error);
      return rejectWithValue(error.message);
    }
  }
);
