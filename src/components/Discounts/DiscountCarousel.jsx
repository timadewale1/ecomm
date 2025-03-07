import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchDiscountProducts } from "../../redux/reducers/discountProductsSlice";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import ProductCard from "../Products/ProductCard";
import { useNavigate } from "react-router-dom";

const DiscountCarousel = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { products, loading, error } = useSelector(
    (state) => state.discountProducts
  );

  useEffect(() => {
    if (products.length === 0) {
      dispatch(fetchDiscountProducts());
    }
  }, [dispatch, products.length]);

  // Conditionally hide the entire section if not loading and no in‑app discounts
  if (!loading && products.length === 0) {
    return null; // Hide the section completely
  }

  // Determine header discount name using the first product's discount info,
  // fallback to "In‑App Discounts" if not available.
  const headerDiscountName =
    products.length > 0 &&
    products[0].discount &&
    products[0].discount.selectedDiscount &&
    products[0].discount.selectedDiscount.name
      ? products[0].discount.selectedDiscount.name
      : "In‑App Discounts";

  const handleSeeAll = () => {
    // Normalize discount name (replace spaces with dashes and lowercase) for the route.
    const routeName = headerDiscountName.replace(/\s+/g, "-").toLowerCase();
    navigate(`/inapp-discounts/${routeName}`);
  };

  return (
    <div className="mt-4">
      {/* Header */}
      <div
        className="relative flex items-center justify-between px-2 py-4 w-full mb-4 bg-cover bg-center"
        style={{ backgroundImage: `url('/Val.svg')` }}
      >
        <h2 className="relative z-10 font-ubuntu text-white text-lg font-medium">
          {headerDiscountName}
        </h2>
        <div className="relative z-10 pr-4">
          <span
            className="text-sm text-white font-opensans cursor-pointer"
            onClick={handleSeeAll}
          >
            See All
          </span>
        </div>
      </div>

      {/* Products Carousel */}
      <div className="flex overflow-x-auto space-x-3 scrollbar-hide px-2">
        {loading ? (
          <div className="flex space-x-3">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="flex-shrink-0 w-[160px]">
                <Skeleton height={200} width={160} />
              </div>
            ))}
          </div>
        ) : error ? (
          <div>Error: {error}</div>
        ) : (
          products.map((product) => (
            <div key={product.id} className="flex-shrink-0 w-[160px]">
              <ProductCard product={product} isLoading={loading} />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DiscountCarousel;
