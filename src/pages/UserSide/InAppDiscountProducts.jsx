import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchDiscountProducts } from "../../redux/reducers/discountProductsSlice";
import ProductCard from "../../components/Products/ProductCard";
import { useParams, useNavigate } from "react-router-dom";
import SEO from "../../components/Helmet/SEO";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { GoChevronLeft } from "react-icons/go";
import { LuListFilter } from "react-icons/lu";

const InAppDiscountProducts = () => {
  const { discountName } = useParams();
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

  // Filter products to only those that match the discountName in the URL.
  const filteredProducts = products.filter((product) => {
    if (
      product.discount &&
      product.discount.selectedDiscount &&
      product.discount.selectedDiscount.name
    ) {
      const nameNormalized = product.discount.selectedDiscount.name
        .replace(/\s+/g, "-")
        .toLowerCase();
      return nameNormalized === discountName;
    }
    return false;
  });

  // Additional filter state for sorting and condition
  const [priceOrder, setPriceOrder] = useState("high-to-low"); // "high-to-low" or "low-to-high"
  const [conditionFilter, setConditionFilter] = useState("all"); // "all", "brand new", "thrift", "defect"
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown if clicked outside (and not on the filter icon)
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        event.target.id !== "filterIcon"
      ) {
        setShowFilterDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  // When selecting a price sort, clear the condition filter.
  const sortProducts = (order) => {
    console.log("Sorting products by", order);
    setPriceOrder(order);
  };

  // When selecting a condition, clear the price filter (reset to default).
  const filterCondition = (condition) => {
    console.log("Filtering products by condition", condition);
    setConditionFilter(condition);
  };

  // Apply additional filters: condition and price order.
  let finalProducts = [...filteredProducts];
  if (conditionFilter !== "all") {
    finalProducts = finalProducts.filter(
      (product) =>
        product.condition && product.condition.toLowerCase() === conditionFilter
    );
  }
  finalProducts.sort((a, b) => {
    if (priceOrder === "high-to-low") {
      return b.price - a.price;
    } else {
      return a.price - b.price;
    }
  });

  return (
    <>
      <SEO
        title={`Shop ${discountName} | ShopMyThrift`}
        description={`Shop ${discountName} on ShopMyThrift`}
        url={`https://www.shopmythrift.store/inapp-discounts/${discountName}`}
      />
      <div className="relative  py-6">
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white z-50 border-b flex items-center justify-between mb-3 py-6 px-2">
          <GoChevronLeft
            className="text-2xl cursor-pointer"
            onClick={() => navigate(-1)}
          />
          <h1 className="text-xl font-opensans font-semibold">
            {discountName
              .replace(/-/g, " ")
              .split(" ")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ")}
          </h1>

          <LuListFilter
            id="filterIcon"
            className="text-xl cursor-pointer"
            onClick={() => setShowFilterDropdown(!showFilterDropdown
            )}
          />
          {showFilterDropdown && (
            <div
              ref={dropdownRef}
              className="absolute right-4 bg-white shadow-[0_0_10px_rgba(0,0,0,0.1)] top-14 p-3 w-40 h-auto rounded-2xl z-50 flex flex-col gap-2 font-opensans"
            >
              <p className="text-customOrange text-xs">Price:</p>
              <span
                className={`text-sm ml-2 cursor-pointer ${
                  priceOrder === "high-to-low" ? "text-customOrange" : ""}`
                }
                onClick={() => sortProducts("high-to-low")}
              >
                High to Low
              </span>
              <hr className="text-slate-300" />
              <span
                className={`text-sm ml-2 cursor-pointer ${
                  priceOrder === "low-to-high" ? "text-customOrange" : ""}`
                }
                onClick={() => sortProducts("low-to-high")}
              >
                Low to High
              </span>
              <p className="text-customOrange text-xs">Condition:</p>
              <span
                className={`text-sm ml-2 cursor-pointer ${
                  conditionFilter === "all" ? "text-customOrange" : ""}`}
                onClick={() => filterCondition("all")}
              > 
              All
              </span>
              <hr className="text-slate-300" />
              <span
                className={`text-sm ml-2 cursor-pointer ${
                  conditionFilter === "brand new" ? "text-customOrange" : ""}` 
                }
                onClick={() => filterCondition("brand new")}
              >
                Brand New
              </span>
              <hr className="text-slate-300" />
              <span
                className={`text-sm ml-2 cursor-pointer ${
                  conditionFilter === "thrift" ? "text-customOrange" : ""}`
                }
                onClick={() => filterCondition("thrift")}
              >
                Thrift
              </span>
              <hr className="text-slate-300" />
              <span
                className={`text-sm ml-2 cursor-pointer ${
                  conditionFilter === "defect" ? "text-customOrange" : ""}`
                }
                onClick={() => filterCondition("defect")}
              >
                Defect
              </span>
            </div>
          )}
        </div>
        <div className="px-2">
          {/* Products Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {loading ? (
              <Skeleton height={200} width={200} count={8} />
            ) : error ? (
              <div>Error: {error}</div>
            ) : finalProducts.length > 0 ? (
              finalProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            ) : (
              <div className="col-span-full text-center font-opensans text-sm">
                No products found for the selected filter.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default InAppDiscountProducts;
