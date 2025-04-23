import React, { useEffect, useState } from "react";
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
  const BATCH_SIZE = 10;

  // Optional: local search and sort states
  const [selectedType, setSelectedType] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState(null);

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

  const loadInitialProducts = async () => {
    setLoading(true);
    try {
      const response = await dispatch(
        fetchConditionProducts({
          condition,
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
      if (sortOption === "priceAsc") {
        return parseFloat(a.price) - parseFloat(b.price);
      } else if (sortOption === "priceDesc") {
        return parseFloat(b.price) - parseFloat(a.price);
      }
      return 0;
    });

  const productTypes = [
    "All",
    ...new Set(conditionProducts.map((p) => p.productType)),
  ];

  return (
    <>
      <SEO
        title={`${
          condition.charAt(0).toUpperCase() + condition.slice(1)
        } Items - My Thrift`}
        description={`Shop ${condition} items on My Thrift`}
        url={`https://www.shopmythrift.store/condition/${slug}`}
      />
      <div className="px-2 py-14">
        {/* Header Section */}
        <div className="w-full h-48 bg-gray-200">{getHeaderContent()}</div>

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
            <h2 className="text-sm font-opensans font-semibold">
              {condition.charAt(0).toUpperCase() + condition.slice(1)} Items
            </h2>
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
