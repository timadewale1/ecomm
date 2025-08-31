// src/pages/InAppDiscountProducts.jsx
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
import posthog from "posthog-js";
import { useAuth } from "../../custom-hooks/useAuth";

const InAppDiscountProducts = () => {
  const { discountName } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { products, loading, error } = useSelector(
    (state) => state.discountProducts
  );
  const { currentUser } = useAuth();

  const [priceOrder, setPriceOrder] = useState("high-to-low");
  const [conditionFilter, setConditionFilter] = useState("all");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // ✅ Identify user once on mount
  useEffect(() => {
    if (currentUser) {
      posthog?.identify(currentUser.uid, {
        email: currentUser.email,
        name: currentUser.displayName || "Anonymous User",
      });
    } else {
      posthog?.identify("guest_" + Math.random().toString(36).substring(2, 10), {
        guest: true,
      });
    }
  }, [currentUser]);

  // ✅ Track page view
  useEffect(() => {
    posthog?.capture("discount_page_viewed", {
      discountName,
      userId: currentUser?.uid || "guest",
    });
  }, [discountName, currentUser]);

  useEffect(() => {
    if (products.length === 0) {
      dispatch(fetchDiscountProducts());
    }
  }, [dispatch, products.length]);

  // Filter products to only those that match discountName
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

  // Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        event.target.id !== "filterIcon"
      ) {
        setShowFilterDropdown(false);
        posthog?.capture("discount_filter_closed", {
          discountName,
          userId: currentUser?.uid || "guest",
        });
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef, discountName, currentUser]);

  // ✅ Sorting + Filtering
  const sortProducts = (order) => {
    setPriceOrder(order);
    posthog?.capture("discount_sort_applied", {
      discountName,
      order,
      userId: currentUser?.uid || "guest",
    });
  };

  const filterCondition = (condition) => {
    setConditionFilter(condition);
    posthog?.capture("discount_condition_filter_applied", {
      discountName,
      condition,
      userId: currentUser?.uid || "guest",
    });
  };

  // Apply filters
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

  // ✅ Track products loaded, empty state, or error
  useEffect(() => {
    if (!loading && !error) {
      if (finalProducts.length > 0) {
        posthog?.capture("discount_products_loaded", {
          discountName,
          count: finalProducts.length,
          userId: currentUser?.uid || "guest",
        });
      } else {
        posthog?.capture("discount_products_empty_state", {
          discountName,
          userId: currentUser?.uid || "guest",
        });
      }
    }
    if (error) {
      posthog?.capture("discount_products_load_failed", {
        discountName,
        error,
        userId: currentUser?.uid || "guest",
      });
    }
  }, [loading, error, finalProducts, discountName, currentUser]);

  return (
    <>
      <SEO
        title={`Shop ${discountName} | ShopMyThrift`}
        description={`Shop ${discountName} on ShopMyThrift`}
        url={`https://www.shopmythrift.store/inapp-discounts/${discountName}`}
      />
      <div className="relative py-6">
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
            onClick={() => {
              setShowFilterDropdown(!showFilterDropdown);
              posthog?.capture("discount_filter_opened", {
                discountName,
                userId: currentUser?.uid || "guest",
              });
            }}
          />
          {showFilterDropdown && (
            <div
              ref={dropdownRef}
              className="absolute right-4 bg-white shadow-[0_0_10px_rgba(0,0,0,0.1)] top-14 p-3 w-40 h-auto rounded-2xl z-50 flex flex-col gap-2 font-opensans"
            >
              <p className="text-customOrange text-xs">Price:</p>
              <span
                className={`text-sm ml-2 cursor-pointer ${
                  priceOrder === "high-to-low" ? "text-customOrange" : ""
                }`}
                onClick={() => sortProducts("high-to-low")}
              >
                High to Low
              </span>
              <hr className="text-slate-300" />
              <span
                className={`text-sm ml-2 cursor-pointer ${
                  priceOrder === "low-to-high" ? "text-customOrange" : ""
                }`}
                onClick={() => sortProducts("low-to-high")}
              >
                Low to High
              </span>
              <p className="text-customOrange text-xs">Condition:</p>
              <span
                className={`text-sm ml-2 cursor-pointer ${
                  conditionFilter === "all" ? "text-customOrange" : ""
                }`}
                onClick={() => filterCondition("all")}
              >
                All
              </span>
              <hr className="text-slate-300" />
              <span
                className={`text-sm ml-2 cursor-pointer ${
                  conditionFilter === "brand new" ? "text-customOrange" : ""
                }`}
                onClick={() => filterCondition("brand new")}
              >
                Brand New
              </span>
              <hr className="text-slate-300" />
              <span
                className={`text-sm ml-2 cursor-pointer ${
                  conditionFilter === "thrift" ? "text-customOrange" : ""
                }`}
                onClick={() => filterCondition("thrift")}
              >
                Thrift
              </span>
              <hr className="text-slate-300" />
              <span
                className={`text-sm ml-2 cursor-pointer ${
                  conditionFilter === "defect" ? "text-customOrange" : ""
                }`}
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
                <div
                  key={product.id}
                  onClick={() =>
                    posthog?.capture("discount_product_clicked", {
                      productId: product.id,
                      discountName,
                      userId: currentUser?.uid || "guest",
                    })
                  }
                >
                  <ProductCard product={product} />
                </div>
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
