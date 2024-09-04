import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where, or, limit } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase.config"; // Firestore instance
import ProductCard from "../../components/Products/ProductCard";

const RelatedProducts = ({ product }) => {
  const [relatedProductsFromVendor, setRelatedProductsFromVendor] = useState([]);
  const [relatedProductsFromOtherVendors, setRelatedProductsFromOtherVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProductsAcrossVendors = async () => {
      try {
        let productsFromVendor = [];
        let productsFromOtherVendors = [];

        // Fetch products from the same vendor
        const vendorProductsRef = collection(db, "vendors", product.vendorId, "products");
        let vendorProductsQuery = query(
          vendorProductsRef,
          or(
            where("category", "==", product.category),
            where("productType", "==", product.productType)
          ),
          limit(2) // Fetch only 2 products from this vendor
        );

        const vendorSnapshot = await getDocs(vendorProductsQuery);
        productsFromVendor = vendorSnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
            vendorName: product.vendorName,
            vendorId: product.vendorId, // Pass the vendorId here for navigation
          }))
          .filter((item) => item.id !== product.id); // Exclude current product

        // Fetch products from other vendors
        const vendorsRef = collection(db, "vendors");
        const vendorsSnapshot = await getDocs(vendorsRef);

        // Loop through each vendor and query their products subcollection
        await Promise.all(
          vendorsSnapshot.docs.map(async (vendorDoc) => {
            const vendorId = vendorDoc.id;

            // Exclude the current vendor
            if (vendorId !== product.vendorId) {
              const productsRef = collection(db, "vendors", vendorId, "products");
              const productsQuery = query(
                productsRef,
                or(
                  where("category", "==", product.category),
                  where("productType", "==", product.productType)
                ),
                limit(6) // Fetch up to 6 products
              );

              const productsSnapshot = await getDocs(productsQuery);
              const products = productsSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                vendorName: vendorDoc.data().shopName, // Fetch vendor's shop name
                vendorId: vendorDoc.id, // Pass vendorId for navigation
              }));

              // Add the fetched products to the list of products from other vendors
              productsFromOtherVendors.push(...products);
            }
          })
        );

        // Update state with the fetched products
        setRelatedProductsFromVendor(productsFromVendor);
        setRelatedProductsFromOtherVendors(productsFromOtherVendors);
      } catch (error) {
        console.error("Error fetching products across vendors:", error);
      } finally {
        setLoading(false);
      }
    };

    if (product && product.vendorId) {
      fetchProductsAcrossVendors();
    }
  }, [product]);

  if (loading) {
    return <div>Loading related products...</div>;
  }

  // Hide the section if no related products are found
  if (relatedProductsFromVendor.length === 0 && relatedProductsFromOtherVendors.length === 0) {
    return null;
  }

  const handleShowAll = () => {
    navigate(`/category/${product.category}`); // Navigate to the category page
  };

  return (
    <div className="related-products p-3">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold font-opensans">You might also like</h2>
        <button onClick={handleShowAll} className="text-xs font-normal text-customOrange">
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
