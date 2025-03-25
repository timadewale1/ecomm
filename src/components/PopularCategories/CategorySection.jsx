// src/components/CategoryProducts.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchCategoryProducts } from "../../redux/reducers/categoryProductsSlice";
import ProductCard from "../Products/ProductCard";
import { GoChevronLeft } from "react-icons/go";
import { RotatingLines } from "react-loader-spinner";
import SEO from "../Helmet/SEO";

const CategoryProducts = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Get initial products from PopularCats passed via location.state
  const { products: initialProducts } = location.state || {};
  const productType = initialProducts?.[0]?.productType || "Products";
  // Use productType as category
  const category = productType;
  console.log("[CategoryProducts] Using category:", category);

  // Retrieve cached data for this category from Redux
  const categoryData = useSelector(
    (state) => state.categoryProducts.data[category]
  ) || {
    products: [],
    lastVisible: null,
    noMoreProducts: false,
  };
  const { products, lastVisible, noMoreProducts } = categoryData;
  const loading = useSelector((state) => state.categoryProducts.loading);
  const error = useSelector((state) => state.categoryProducts.error);

  // Handle sticky header
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollPosition, setLastScrollPosition] = useState(0);

  // On mount, fetch initial products only if not already cached
  useEffect(() => {
    if (products.length === 0) {
      console.log(
        "[CategoryProducts] No cached products, fetching for category:",
        category
      );
      dispatch(fetchCategoryProducts({ category, loadMore: false }));
    } else {
      console.log(
        "[CategoryProducts] Using cached products for category:",
        category
      );
    }
  }, [category, products, dispatch]);

  // Infinite scroll and header visibility
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollPosition = window.scrollY;
      setShowHeader(currentScrollPosition <= lastScrollPosition);
      setLastScrollPosition(currentScrollPosition);

      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 100
      ) {
        if (!loading && !noMoreProducts) {
          console.log(
            "[CategoryProducts] Near bottom, fetching more products for category:",
            category
          );
          dispatch(fetchCategoryProducts({ category, loadMore: true }));
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [dispatch, loading, noMoreProducts, lastScrollPosition, category]);

  const handleClearSearch = () => {
    // Implement search clear logic if needed
  };

  const handleSearchChange = (event) => {
    // Implement search logic if needed
  };

  // Optional: If you want to support filtering and sorting locally
  const filteredProducts = products
    .filter(
      (product) => product.name.toLowerCase().includes("") // Replace with searchTerm if needed
    )
    .sort((a, b) => 0); // Replace with sort logic if needed

  return (
    <>
      <SEO
        title={`Shop ${productType} | ShopMyThrift`}
        description={`Shop ${productType} on ShopMyThrift`}
        url={`https://www.shopmythrift.store/producttype/${productType}`}
      />
      <div className="px-4 py-6">
        {/* Sticky Header */}
        <div
          className={`fixed top-0 left-0 w-full bg-white z-10 px-2 py-6 shadow-md transition-transform duration-300 ${
            showHeader ? "translate-y-0" : "-translate-y-full"
          }`}
        >
          <div className="flex items-center">
            <GoChevronLeft
              className="text-2xl cursor-pointer mr-2"
              onClick={() => navigate(-1)}
            />
            <h2 className="text-lg font-opensans font-semibold">
              {productType}
            </h2>
          </div>
        </div>

        {/* Product Grid */}
        <div className="pt-16 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="flex justify-center my-4">
            <RotatingLines
              strokeColor="#f9531e"
              strokeWidth="5"
              animationDuration="0.75"
              width="20"
              visible={true}
            />
          </div>
        )}

        {/* Error Display (Optional)
        {error && (
          <p className="text-red-600 font-semibold mt-4 text-center">{error}</p>
        )} */}

        {/* Fallback: Show message if no products found */}
        {/* {!loading &&
          categoryData &&
          (categoryData.noMoreProducts || products.length === 0) && (
            <p className="text-center mt-4 text-gray-600">
              No {productType} found. Check back for updates.
            </p>
          )} */}
      </div>
    </>
  );
};

export default CategoryProducts;
