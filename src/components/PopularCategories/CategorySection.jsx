import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCategoryProducts,
  resetCategoryProducts,
} from "../../redux/reducers/categoryProductsSlice";
import ProductCard from "../Products/ProductCard";
import { GoChevronLeft } from "react-icons/go";
import { RotatingLines } from "react-loader-spinner";
import SEO from "../Helmet/SEO";

const CategoryProducts = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Get initial products from PopularCats (used to determine category)
  const { products: initialProducts } = location.state || {};
  const productType = initialProducts?.[0]?.productType || "Products";
  // Use productType as category
  const category = productType;
  console.log("[Component] Using category:", category);

  // Get cached data for this category
  const categoryData = useSelector(
    (state) => state.categoryProducts.data[category]
  ) || {
    products: [],
    lastVisible: null,
    noMoreProducts: false,
  };
  const { products, lastVisible, noMoreProducts } = categoryData;
  const loading = useSelector((state) => state.categoryProducts.loading);

  // Handle sticky header
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollPosition, setLastScrollPosition] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollPosition = window.scrollY;
      if (currentScrollPosition > lastScrollPosition) {
        setShowHeader(false);
      } else {
        setShowHeader(true);
      }
      setLastScrollPosition(currentScrollPosition);

      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 100
      ) {
        console.log(
          "[Component] Near bottom of page, fetching more products..."
        );
        fetchMoreProducts();
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollPosition]);

  useEffect(() => {
    console.log("[Component] Initial fetch for category:", category);
    fetchInitialProducts();
    // eslint-disable-next-line
  }, [category]);

  const fetchInitialProducts = () => {
    try {
      dispatch(resetCategoryProducts(category));
      dispatch(fetchCategoryProducts({ category, loadMore: false }));
    } catch (error) {
      console.error("[Component] Error fetching initial products:", error);
    }
  };

  const fetchMoreProducts = () => {
    if (loading || noMoreProducts) return;
    try {
      dispatch(fetchCategoryProducts({ category, loadMore: true }));
    } catch (error) {
      console.error("[Component] Error fetching more products:", error);
    }
  };

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
          {products.map((product) => (
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
      </div>
    </>
  );
};

export default CategoryProducts;
