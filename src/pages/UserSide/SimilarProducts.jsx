import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  limit,
  doc,
  getDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase.config"; // Firestore instance
import ProductCard from "../../components/Products/ProductCard";
import LoadProducts from "../../components/Loading/LoadProducts";

const RelatedProducts = ({ product }) => {
  const [relatedProductsFromVendor, setRelatedProductsFromVendor] = useState(
    []
  );
  const [relatedProductsFromOtherVendors, setRelatedProductsFromOtherVendors] =
    useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Helper function to check vendor's status
  const isVendorActiveAndApproved = async (vendorId) => {
    const vendorRef = doc(db, "vendors", vendorId);
    const vendorSnap = await getDoc(vendorRef);
    if (vendorSnap.exists()) {
      const { isApproved, isDeactivated } = vendorSnap.data();
      return isApproved === true && isDeactivated === false;
    }
    // If vendor doc doesn't exist or missing fields, treat as inactive
    return false;
  };

  useEffect(() => {
    const fetchRelatedProducts = async () => {
      if (!product) return;
      try {
        let productsFromVendor = [];
        let productsFromOtherVendors = [];

        const productsRef = collection(db, "products");

        // Query for products from the same vendor and matching category
        const vendorProductsQuery = query(
          productsRef,
          where("vendorId", "==", product.vendorId),
          where("category", "==", product.category),
          where("published", "==", true),
          limit(2)
        );

        const vendorSnapshot = await getDocs(vendorProductsQuery);
        productsFromVendor = vendorSnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((item) => item.id !== product.id); // Exclude the current product

        // Query for products from other vendors matching category
        const otherVendorsQuery = query(
          productsRef,
          where("vendorId", "!=", product.vendorId),
          where("category", "==", product.category),
          where("published", "==", true),
          limit(10)
        );

        const otherVendorsSnapshot = await getDocs(otherVendorsQuery);
        productsFromOtherVendors = otherVendorsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Filter out products whose vendors are not approved or are deactivated
        const filteredVendorProducts = [];
        for (const p of productsFromVendor) {
          if (await isVendorActiveAndApproved(p.vendorId)) {
            filteredVendorProducts.push(p);
          }
        }

        const filteredOtherVendorProducts = [];
        for (const p of productsFromOtherVendors) {
          if (await isVendorActiveAndApproved(p.vendorId)) {
            filteredOtherVendorProducts.push(p);
          }
        }

        setRelatedProductsFromVendor(filteredVendorProducts);
        setRelatedProductsFromOtherVendors(filteredOtherVendorProducts);
      } catch (error) {
        console.error("Error fetching related products:", error);
      } finally {
        setLoading(false);
      }
    };

    if (product) {
      fetchRelatedProducts();
    }
  }, [product]);

  if (loading) {
    return (
      <div>
        <LoadProducts />
      </div>
    );
  }

  // Hide the section if no related products are found
  if (
    relatedProductsFromVendor.length === 0 &&
    relatedProductsFromOtherVendors.length === 0
  ) {
    return null;
  }

  const handleShowAll = () => {
    navigate(`/category/${product.category}`);
  };

  return (
    <div className="related-products p-3">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold font-opensans">
          You might also like
        </h2>
        <button
          onClick={handleShowAll}
          className="text-xs font-normal text-customOrange"
        >
          Show All
        </button>
      </div>

      <div className="grid grid-cols-2 mt-2 gap-4">
        {relatedProductsFromVendor.map((relatedProduct) => (
          <ProductCard
            key={relatedProduct.id}
            product={relatedProduct}
            isLoading={false}
            vendorName={relatedProduct.vendorName}
            vendorId={relatedProduct.vendorId}
          />
        ))}

        {relatedProductsFromOtherVendors.map((relatedProduct) => (
          <ProductCard
            key={relatedProduct.id}
            product={relatedProduct}
            isLoading={false}
            vendorName={relatedProduct.vendorName}
            vendorId={relatedProduct.vendorId}
          />
        ))}
      </div>
    </div>
  );
};

export default RelatedProducts;
