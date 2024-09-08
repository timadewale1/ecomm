import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  or,
  limit,
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

  useEffect(() => {
    const fetchRelatedProducts = async () => {
      try {
        let productsFromVendor = [];
        let productsFromOtherVendors = [];

        // Fetch products from the centralized 'products' collection
        const productsRef = collection(db, "products");

        // Query for products from the same vendor and matching category or productType
        const vendorProductsQuery = query(
          productsRef,
          where("vendorId", "==", product.vendorId),
          where("category", "==", product.category), // Combine these in separate queries
          limit(2)
        );

        const vendorSnapshot = await getDocs(vendorProductsQuery);
        productsFromVendor = vendorSnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((item) => item.id !== product.id); // Exclude the current product

        // Query for products from other vendors matching category or productType
        const otherVendorsQuery = query(
          productsRef,
          where("vendorId", "!=", product.vendorId),
          where("category", "==", product.category), // Combine these in separate queries
          limit(6)
        );

        const otherVendorsSnapshot = await getDocs(otherVendorsQuery);
        productsFromOtherVendors = otherVendorsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Update state with the fetched products
        setRelatedProductsFromVendor(productsFromVendor);
        setRelatedProductsFromOtherVendors(productsFromOtherVendors);
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
    navigate(`/category/${product.category}`); // Navigate to the category page
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

      {/* Grid container for related products */}
      <div className="grid grid-cols-2 mt-2 gap-4">
        {/* Render 2 products from the current vendor */}
        {relatedProductsFromVendor.map((relatedProduct) => (
          <ProductCard
            key={relatedProduct.id}
            product={relatedProduct}
            isLoading={false} // Indicate loading status
            vendorName={relatedProduct.vendorName}
            vendorId={relatedProduct.vendorId} // Pass vendorId for navigation
          />
        ))}

        {/* Render 6 products from other vendors */}
        {relatedProductsFromOtherVendors.map((relatedProduct) => (
          <ProductCard
            key={relatedProduct.id}
            product={relatedProduct}
            isLoading={false}
            vendorName={relatedProduct.vendorName}
            vendorId={relatedProduct.vendorId} // Pass vendorId for navigation
          />
        ))}
      </div>
    </div>
  );
};

export default RelatedProducts;
