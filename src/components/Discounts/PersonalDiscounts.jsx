import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchPersonalDiscounts } from "../../redux/reducers/personalDiscount";
import ProductCard from "../Products/ProductCard";
import { useNavigate } from "react-router-dom";
import { RiDiscountPercentFill } from "react-icons/ri";

const PersonalDiscountCarousel = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { discounts, loading, error } = useSelector(
    (state) => state.personalDiscounts
  );

  useEffect(() => {
    // If we haven't fetched personal discounts yet, do so
    if (discounts.length === 0 && !loading) {
      dispatch(fetchPersonalDiscounts());
    }
  }, [dispatch, discounts.length, loading]);

  const headerName = "Discounts";

  const handleSeeAll = () => {
    navigate("/discounts-today");
  };

  // 1) If we're still loading, hide the entire section (return null).
  if (loading) return null;

  // 2) If loading is finished but no products exist, hide it as well (return null).
  if (!loading && discounts.length === 0) return null;

  // 3) If we get here, we have some discounts => render the carousel
  return (
    <div className="mt-4">
      {/* Header */}
      <div className="flex items-center mb-3 justify-between px-2 py-2 w-full bg-white">
        <div className="flex items-center">
          <h2 className="font-opensans text-black text-xl font-semibold mr-1">
            {headerName}
          </h2>
          <div className="relative ">
            <div className="absolute -inset-1 animate-ping bg-gradient-to-r from-green-600 to-emerald-600 rounded-full opacity-20 blur-sm"></div>
            <RiDiscountPercentFill className="relative text-2xl text-green-600 drop-shadow-sm" />
          </div>{" "}
        </div>
        <div className="pr-4">
          <span
            className="text-xs text-customOrange font-light font-opensans cursor-pointer"
            onClick={handleSeeAll}
          >
            See All
          </span>
        </div>
      </div>

      {/* Personal Discounts Carousel */}
      <div className="flex overflow-x-auto space-x-3 scrollbar-hide px-2">
        {error ? (
          <div>Error: {error}</div>
        ) : (
          discounts.map((discount) => (
            <div key={discount.id} className="flex-shrink-0 w-[160px]">
              <ProductCard
                product={discount}
                isLoading={false}
                showName={false}
                showCondition={false}
              />
            </div>
          ))
        )}
      </div>
      
    </div>
    
  );
};

export default PersonalDiscountCarousel;
