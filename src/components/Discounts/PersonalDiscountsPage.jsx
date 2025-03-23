// src/components/PersonalDiscountsPage.jsx

import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchPersonalDiscountsPage,
  resetPersonalDiscountsPage,
} from "../../redux/reducers/personalDiscountsPageSlice";
import { useNavigate } from "react-router-dom";
import ProductCard from "../Products/ProductCard";
import { GoChevronLeft } from "react-icons/go";
import { RotatingLines } from "react-loader-spinner";
import SEO from "../Helmet/SEO";
import { RiDiscountPercentFill } from "react-icons/ri";

const PersonalDiscountsPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Access the batch-loaded personal discount state
  const { products, noMoreProducts, loading, error } = useSelector(
    (state) => state.personalDiscountsPage
  );

  // For a sticky header that hides on scroll down, shows on scroll up
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollPosition, setLastScrollPosition] = useState(0);

  useEffect(() => {
    // Reset the slice and fetch initial batch of personal discounts
    // dispatch(resetPersonalDiscountsPage());
    dispatch(fetchPersonalDiscountsPage({ loadMore: false }));
  }, [dispatch]);

  // Infinite scroll logic + show/hide header
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollPosition = window.scrollY;
      // Hide header on scroll down, show on scroll up
      if (currentScrollPosition > lastScrollPosition) {
        setShowHeader(false);
      } else {
        setShowHeader(true);
      }
      setLastScrollPosition(currentScrollPosition);

      // If near bottom, load more (if available)
      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 100
      ) {
        if (!loading && !noMoreProducts) {
          dispatch(fetchPersonalDiscountsPage({ loadMore: true }));
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [dispatch, loading, noMoreProducts, lastScrollPosition]);

  return (
    <>
      {/* Optional SEO/Helmet setup */}
      <SEO
        title=" Discounts Today | Deals & Offers"
        description="Browse  discounts from and get crazy deals now!"
        url="https://www.shopmythrift.store/personal-discounts"
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
            <div className="flex items-center">
              <h2 className="text-lg font-opensans font-semibold">
                Discounts
              </h2>
              <RiDiscountPercentFill className="text-xl ml-1 text-green-700" />
            </div>
          </div>
        </div>

        {/* Grid of personal discount products */}
        <div className="pt-16 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {products.map((prod) => (
            <ProductCard key={prod.id} product={prod} />
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

        {/* Error Display */}
        {/* {error && (
          <p className="text-red-600 font-semibold mt-4 text-center">
            {error}
          </p>
        )} */}

        {/* If absolutely no products found */}
        {!loading && products.length === 0 && !error && (
          <p className="text-center mt-4 text-gray-600">
            No personal discounts found.
          </p>
        )}
      </div>
    </>
  );
};

export default PersonalDiscountsPage;
