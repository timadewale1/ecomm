import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchCategoryProducts } from "../../redux/reducers/categoryProductsSlice";
import { fetchCategoryMetadata } from "../../redux/reducers/categoryMetadataSlice";
import ProductCard from "../Products/ProductCard";
import { GoChevronLeft } from "react-icons/go";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import SEO from "../Helmet/SEO";
import { RotatingLines } from "react-loader-spinner";
import IkImage from "../../services/IkImage";

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

  // Retrieve cached products for this category from Redux
  const categoryData = useSelector(
    (state) => state.categoryProducts.data[category]
  ) || {
    products: [],
    lastVisible: null,
    noMoreProducts: false,
  };
  const { products, lastVisible, noMoreProducts } = categoryData;
  const productsLoading = useSelector(
    (state) => state.categoryProducts.loading
  );
  const productsError = useSelector((state) => state.categoryProducts.error);

  // Retrieve category metadata from Redux
  const categoryMetadata = useSelector(
    (state) => state.categoryMetadata.data[category]
  );
  const metadataLoading = useSelector(
    (state) => state.categoryMetadata.loading
  );
  const metadataError = useSelector((state) => state.categoryMetadata.error);

  // Handle scroll for infinite loading and back icon visibility
  const [lastScrollPosition, setLastScrollPosition] = useState(0);
  const [showBackIcon, setShowBackIcon] = useState(true);

  // Fetch products and metadata on mount
  useEffect(() => {
    // Fetch products if not cached
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

    // Fetch metadata if not cached
    if (!categoryMetadata) {
      console.log(
        "[CategoryProducts] No cached metadata, fetching category metadata"
      );
      dispatch(fetchCategoryMetadata());
    } else {
      console.log(
        "[CategoryProducts] Using cached metadata for category:",
        category
      );
    }
  }, [category, products, categoryMetadata, dispatch]);

  // Debounce function to limit scroll event frequency
  const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  // Infinite scroll and back icon visibility
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollPosition = window.scrollY;
      const isScrollingUp = currentScrollPosition < lastScrollPosition;

      // Log for debugging
      console.log(
        "[CategoryProducts] Scroll: current=",
        currentScrollPosition,
        "last=",
        lastScrollPosition,
        "isScrollingUp=",
        isScrollingUp,
        "showBackIcon=",
        currentScrollPosition <= 0 || isScrollingUp
      );

      // Show back icon when at top or scrolling up
      setShowBackIcon(currentScrollPosition <= 0 || isScrollingUp);
      setLastScrollPosition(currentScrollPosition);

      // Infinite scroll for products
      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 100
      ) {
        if (!productsLoading && !noMoreProducts) {
          console.log(
            "[CategoryProducts] Near bottom, fetching more products for category:",
            category
          );
          dispatch(fetchCategoryProducts({ category, loadMore: true }));
        }
      }
    };

    const debouncedHandleScroll = debounce(handleScroll, 50);
    window.addEventListener("scroll", debouncedHandleScroll);
    return () => window.removeEventListener("scroll", debouncedHandleScroll);
  }, [dispatch, productsLoading, noMoreProducts, lastScrollPosition, category]);

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

  // Fallback for missing metadata
  const defaultImageUrl =
    "https://res.cloudinary.com/dtaqusjav/image/upload/v1750544620/ChatGPT_Image_Jun_18_2025_10_20_31_PM_ckhzix.png";
  const defaultSubtitle = `Explore our collection of ${category.toLowerCase()}`;

  return (
    <>
      <SEO
        title={`Shop ${productType} | ShopMyThrift`}
        description={`Shop ${productType} on ShopMyThrift`}
        url={`https://www.shopmythrift.store/producttype/${productType}`}
      />
      <SkeletonTheme baseColor="#e5e7eb" highlightColor="#f3f4f6">
        <div className=" h-full">
          {/* Back Icon (visible at top or when scrolling up) */}
          <div className="bg-blue-50 py-4">
            <div
              className={`fixed top-4 left-4 z-50 bg-white/50 backdrop-blur-md p-2 rounded-full shadow-md border border-gray-200 transition-opacity duration-300 ${
                showBackIcon ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            >
              <GoChevronLeft
                className="text-2xl cursor-pointer text-gray-800"
                onClick={() => navigate(-1)}
              />
            </div>

            {/* Category Header Section */}
            <div className="pb-12">
              {metadataLoading ? (
                <div className="text-center flex justify-center items-center flex-col mt-4 pb-5">
                  <Skeleton
                    width={240}
                    height={240}
                    className="translate-y-5 rounded-xl shadow-xl mb-4"
                  />
                  <Skeleton width={120} height={24} className="mt-10 mb-2" />
                  <Skeleton width={200} height={16} />
                </div>
              ) : metadataError ? (
                <p className="text-red-600 text-center">
                  Failed to load category details.
                </p>
              ) : (
                <div className="text-center flex justify-center items-center flex-col mt-4 pb-5">
                  <h1 className="text-xl font-opensans mt-10 font-semibold">
                    {category}
                  </h1>
                  <IkImage
                    src={categoryMetadata?.headerImageUrl || defaultImageUrl}
                    alt={`${category} header`}
                    className="w-60 h-60 object-cover translate-y-5 rounded-xl shadow-xl mb-4"
                    onError={(e) => (e.target.src = defaultImageUrl)} // Fallback if image fails
                  />
                  <div className="text-center px-20 font-opensans mt-6">
                    <p className="text-gray-600 font-opensans text-xs">
                      {categoryMetadata?.subtitle || defaultSubtitle}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 px-4 bg-white rounded-t-3xl -translate-y-7 py-5 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {productsLoading && filteredProducts.length === 0
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex flex-col">
                    <Skeleton height={200} className="rounded-md" />
                    <Skeleton height={20} width="80%" className="mt-2" />
                    <Skeleton height={16} width="60%" />
                  </div>
                ))
              : filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
          </div>

          {/* Loading Spinner for Additional Products */}
          {productsLoading && filteredProducts.length > 0 && (
            <div className="flex justify-center items-center my-4">
              <RotatingLines
                strokeColor="#f9531e"
                strokeWidth="5"
                animationDuration="0.75"
                width="20"
                visible={true}
              />
            </div>
          )}

          {/* Error Display for Products */}
          {productsError && (
            <p className="text-red-600 font-opensans font-semibold mt-4 text-center">
              we are working to fix this
            </p>
          )}

          {/* Fallback: Show message if no products found */}
          {/* {!productsLoading &&
            categoryData &&
            (categoryData.noMoreProducts || products.length === 0) && (
              <p className="text-center mt-4 text-gray-600">
                No {productType} found. Check back for updates.
              </p>
            )} */}
        </div>
      </SkeletonTheme>
    </>
  );
};

export default CategoryProducts;
