import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase.config";
import { useNavigate } from "react-router-dom";
import Skeleton from "react-loading-skeleton";

const PopularCats = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCategoriesAndProducts = async () => {
      try {
        const vendorsQuery = query(
          collection(db, "vendors"),
          where("isApproved", "==", true),
          where("isDeactivated", "==", false)
        );

        const vendorSnapshot = await getDocs(vendorsQuery);
        const approvedVendors = vendorSnapshot.docs.map((doc) => doc.id);

        console.log("Approved Vendor IDs:", approvedVendors);

        const productsQuery = query(
          collection(db, "products"),
          where("vendorId", "in", approvedVendors), // Ensure products belong to approved vendors
          where("isDeleted", "==", false),
          where("published", "==", true)
        );

        const productsSnapshot = await getDocs(productsQuery);
        const products = productsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        console.log("Fetched Products:", products);

        // Group products by type and calculate counts
        const categoryCounts = {};
        products.forEach((product) => {
          const type = product.productType || "Other";
          if (!categoryCounts[type]) {
            categoryCounts[type] = { count: 0, products: [] };
          }
          categoryCounts[type].count += 1;
          categoryCounts[type].products.push(product);
        });

        // Convert to array and sort by count descending
        const sortedCategories = Object.entries(categoryCounts)
          .map(([type, data]) => ({
            type,
            count: data.count,
            products: data.products,
            coverImageUrl: data.products[0]?.coverImageUrl || "", // Use the first product's coverImageUrl as the default
          }))
          .sort((a, b) => b.count - a.count);

        console.log("Fetched Categories:", sortedCategories);
        setCategories(sortedCategories);
      } catch (error) {
        console.error("Error fetching categories and products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoriesAndProducts();
  }, []);

  const handleCategoryClick = (category) => {
    console.log("Navigating to category:", category.type);
    navigate(`/producttype/${category.type}`, {
      state: { products: category.products },
    });
  };

  return (
    <div className="px-2 py-3">
      <h2 className="text-xl font-medium mb-3 font-ubuntu">Popular Categories</h2>
      <div className="flex overflow-x-auto space-x-3  scrollbar-hide">
        {loading
          ? Array(4)
              .fill(0)
              .map((_, index) => (
                <div key={index} className="flex flex-col ">
                  <Skeleton width={150} height={150} />
                  <Skeleton width={100} height={20} className="mt-2" />
                  <Skeleton width={80} height={15} className="mt-1" />
                </div>
              ))
          : categories.map((category) => (
              <div
                key={category.type}
                className="flex-shrink-0 w-28 cursor-pointer"
                onClick={() => handleCategoryClick(category)}
              >
                <img
                  src={
                    category.coverImageUrl || "https://via.placeholder.com/150"
                  }
                  alt={category.type}
                  className="w-28 h-28 object-cover rounded-lg"
                />
                <h3 className="text-sm font-opensans font-semibold mt-2 text-left">
                  {category.type}
                </h3>
                <p className="text-xs text-gray-500  font-opensans font-medium text-left">
                  {category.count} posts
                </p>
              </div>
            ))}
      </div>
    </div>
  );
};

export default PopularCats;
