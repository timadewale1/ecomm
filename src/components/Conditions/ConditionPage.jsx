import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchConditionProducts,
  resetConditionProducts,
} from "../../redux/reducers/conditionSlice";
import DefectsHeader from "./icons/DefectsHeader";
import ThriftHeader from "./icons/ThriftHeader";
import BrandNewHeader from "./icons/BrandNewHeader";
import ProductCard from "../Products/ProductCard";
import { RotatingLines } from "react-loader-spinner";
import { GoChevronLeft } from "react-icons/go";
import SEO from "../Helmet/SEO";
import { fetchConditionCategories } from "../../redux/reducers/conditionCategoriesSlice";
import { BsFilterRight } from "react-icons/bs";
import { IoFilter } from "react-icons/io5";
function ConditionProducts() {
  const { condition: slug } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const condition = slug.replace("-", " ");
  console.log("ConditionProducts: current condition:", condition);

  // Read cached data per condition from Redux
  const { productsByCondition } = useSelector((state) => state.condition);
  const conditionData = productsByCondition[condition] || {
    conditionProducts: [],
    conditionLastVisible: null,
    conditionStatus: "idle",
    conditionError: null,
  };

  const {
    conditionProducts,
    conditionLastVisible,
    conditionStatus,
    conditionError,
  } = conditionData;
  console.log("ConditionProducts: conditionData:", conditionData);

  // Local state for additional UI controls
  const [loading, setLoading] = useState(false);
  const [noMoreProducts, setNoMoreProducts] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollPosition, setLastScrollPosition] = useState(0);
  const BATCH_SIZE = 50;

  // Optional: local search and sort states
  const [selectedType, setSelectedType] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowFilterDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load initial products if none cached for this condition
  useEffect(() => {
    if (conditionProducts.length === 0) {
      console.log(
        "ConditionProducts: Dispatching fetchConditionProducts for condition:",
        condition
      );
      loadInitialProducts();
    } else {
      console.log(
        "ConditionProducts: Using cached products for condition:",
        condition
      );
    }
  }, [condition, conditionProducts, dispatch]);

  const categories =
    useSelector((s) => s.conditionCategories.byCondition[condition]) || [];

  useEffect(() => {
    if (!categories.length) {
      dispatch(fetchConditionCategories(condition));
    }
  }, [condition, categories.length, dispatch]);
  const sortProducts = (direction) => {
    // direction: "high-to-low" or "low-to-high"
    setSortOption(direction);
    setShowFilterDropdown(false);
  };

  const loadInitialProducts = async () => {
    setLoading(true);
    try {
      const response = await dispatch(
        fetchConditionProducts({
          condition,
          productType: selectedType === "All" ? null : selectedType,
          lastVisible: null,
          batchSize: BATCH_SIZE,
        })
      ).unwrap();
      console.log("ConditionProducts: loadInitialProducts response:", response);
      if (response.products.length < BATCH_SIZE) {
        setNoMoreProducts(true);
      }
    } catch (error) {
      console.error(
        "ConditionProducts: Error loading initial products:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  // Infinite scroll: listen to window scroll events for pagination and header visibility
  useEffect(() => {
    const handleScroll = async () => {
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
        await loadMoreProducts();
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [
    lastScrollPosition,
    conditionLastVisible,
    conditionStatus,
    noMoreProducts,
  ]);

  const loadMoreProducts = async () => {
    if (conditionStatus === "loading" || noMoreProducts) return;
    if (!conditionLastVisible) {
      setNoMoreProducts(true);
      return;
    }
    setLoading(true);
    try {
      const response = await dispatch(
        fetchConditionProducts({
          condition,
          productType: selectedType === "All" ? null : selectedType,
          lastVisible: conditionLastVisible,
          batchSize: BATCH_SIZE,
        })
      ).unwrap();

      // if this batch came back smaller than requested, we’re done
      if (response.products.length < BATCH_SIZE) {
        setNoMoreProducts(true);
      }

      // (Optionally, you can also check the cursor:)
      if (!response.lastVisible) {
        setNoMoreProducts(true);
      }
    } catch (error) {
      console.error("ConditionProducts: Error loading more products:", error);
    } finally {
      setLoading(false);
    }
  };

  const getHeaderContent = () => {
    switch (slug) {
      case "brand-new":
        return (
          <div className="w-full h-full flex items-center justify-center bg-white text-white">
            <BrandNewHeader />
          </div>
        );
      case "thrift":
        return (
          <div className="w-full h-full flex items-center justify-center bg-white text-white">
            <ThriftHeader />
          </div>
        );
      case "defect":
        return (
          <div className="w-full h-full flex items-center justify-center bg-white text-white">
            <DefectsHeader />
          </div>
        );
      default:
        return (
          <img
            src="https://via.placeholder.com/1200x400?text=Condition+Items"
            alt="Default Header"
            className="w-full h-full object-cover"
          />
        );
    }
  };

  const handleClearSearch = () => {
    setSearchTerm("");
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const filteredProducts = conditionProducts
    .filter(
      (product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (selectedType === "All" || product.productType === selectedType)
    )
    .sort((a, b) => {
      if (sortOption === "high-to-low") {
        return parseFloat(b.price) - parseFloat(a.price);
      }
      if (sortOption === "low-to-high") {
        return parseFloat(a.price) - parseFloat(b.price);
      }
      return 0;
    });

  const productTypes = ["All", ...categories];
  const handleTypeSelect = (type) => {
    setSelectedType(type);

    // clear cache so Redux knows we want fresh data
    dispatch(resetConditionProducts({ condition }));

    // refetch first page, passing the productType if not "All"
    dispatch(
      fetchConditionProducts({
        condition,
        productType: type === "All" ? null : type,
        lastVisible: null,

        batchSize: BATCH_SIZE,
      })
    );
  };

  return (
    <>
      <SEO
        title={`${
          condition.charAt(0).toUpperCase() + condition.slice(1)
        } Items - My Thrift`}
        description={`Shop ${condition} items on My Thrift`}
        url={`https://www.shopmythrift.store/condition/${slug}`}
      />
      <div className="px-2 py-24">
        {/* Header Section */}
        <div className="w-full h-48 bg-gray-200">{getHeaderContent()}</div>

        <div
          className={`fixed top-0 left-0 w-full bg-white z-10 px-2 pt-6 transition-transform duration-300 shadow-sm`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <GoChevronLeft
                className="text-2xl cursor-pointer mr-2"
                onClick={() => navigate(-1)}
              />
              <h2 className="text-sm font-opensans font-semibold">
                {condition.charAt(0).toUpperCase() + condition.slice(1)} Items
              </h2>
            </div>
            <IoFilter
              onClick={() => setShowFilterDropdown((v) => !v)}
              className="text-xl text-gray-600 cursor-pointer"
              title="Sort by price"
            />
            {showFilterDropdown && (
              <div
                ref={dropdownRef}
                className="absolute right-0 top-12 bg-white shadow-lg rounded-2xl w-40 p-3 z-50 font-opensans"
              >
                <span
                  className={`flex items-center justify-between text-xs cursor-pointer py-1 
        hover:text-customOrange ${
          sortOption === "high-to-low"
            ? "text-customOrange font-semibold"
            : "text-gray-700"
        }`}
                  onClick={() => sortProducts("high-to-low")}
                >
                  Price: High → Low
                  {sortOption === "high-to-low" && (
                    <span className="ml-2 text-customOrange">✓</span>
                  )}
                </span>
                <hr className="my-1 text-gray-200" />
                <span
                  className={`flex items-center justify-between text-xs cursor-pointer py-1 
        hover:text-customOrange ${
          sortOption === "low-to-high"
            ? "text-customOrange font-semibold"
            : "text-gray-700"
        }`}
                  onClick={() => sortProducts("low-to-high")}
                >
                  Price: Low → High
                  {sortOption === "low-to-high" && (
                    <span className="ml-2 text-customOrange">✓</span>
                  )}
                </span>
              </div>
            )}
          </div>
          <div className="flex px-2 mb-2 w-full py-2 overflow-x-auto space-x-2 scrollbar-hide">
            {productTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => handleTypeSelect(type)}
                  className={`flex-shrink-0 h-12 px-4 text-xs font-semibold font-opensans text-black rounded-full backdrop-blur-md flex items-center justify-center transition-all duration-100 hover:bg-customOrange/50 border ${
                      selectedType === type
                        ? "bg-customOrange text-white"
                        : "bg-white"
                    }`}
                >
                  {type}
                </button>
              ))}
          </div>
        </div>

        <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {!loading &&
          (conditionStatus === "succeeded" || conditionStatus === "failed") &&
          filteredProducts.length === 0 && (
            <div className="text-center font-opensans text-xs text-gray-600 mt-4">
              No {condition} products here yet. Check back for updates.🧡
            </div>
          )}

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

        {/* You could optionally render errors if needed */}
        {/* {conditionError && (
          <div className="text-red-500 mt-4 text-center">
            Error: {conditionError}
          </div>
        )} */}
      </div>
    </>
  );
}

export default ConditionProducts;
