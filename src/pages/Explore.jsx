import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import {
  fetchExploreProducts,
  resetExploreType,
} from "../redux/reducers/exploreSlice";
import { IoChevronBackOutline } from "react-icons/io5";
import { LuListFilter } from "react-icons/lu";
import { CiSearch } from "react-icons/ci";
import { RotatingLines } from "react-loader-spinner";
import { saveExploreUi } from "../redux/reducers/exploreUiSlice";
import Loading from "../components/Loading/Loading";
import Skeleton from "react-loading-skeleton";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode, Autoplay } from "swiper/modules";
import { ChevronRight } from "lucide-react";
import { Cloudinary } from "@cloudinary/url-gen";
import { auto } from "@cloudinary/url-gen/actions/resize";
import { autoGravity } from "@cloudinary/url-gen/qualifiers/gravity";
import { AdvancedImage } from "@cloudinary/react";
import productTypes from "../pages/vendor/producttype";
import everydayTypers from "./vendor/everydayTypers";
import { GoChevronLeft, GoChevronRight } from "react-icons/go";
import { MdTrendingUp } from "react-icons/md";
import { motion, AnimatePresence } from "framer-motion";
import ProductCard from "../components/Products/ProductCard";
import Lottie from "lottie-react";
import noProductAnimation from "../Animations/noproduct.json";
import { MdCancel } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setPromoImages, setPromoLoading } from "../redux/actions/promoaction";
import SEO from "../components/Helmet/SEO";

// ✅ Import PostHog
import posthog from "posthog-js";
import { useAuth } from "../custom-hooks/useAuth";

const Explore = () => {
  const { currentUserData } = useAuth(); // ✅ for user context
  const ALL_TYPES = [...productTypes, ...everydayTypers];
  const priceRanges = [
    { label: "Under ₦5 000", min: 0, max: 4_999 },
    { label: "₦5 000–₦10 000", min: 5_000, max: 10_000 },
    { label: "Over ₦10 000", min: 10_001, max: Infinity },
  ];
  const loading = useSelector((state) => state.product.loading);
  const cachedUi = useSelector((s) => s.exploreUi);
  const [selectedProductType, setSelectedProductType] = useState(
    cachedUi.selectedType
      ? ALL_TYPES.find((p) => p.type === cachedUi.selectedType)
      : null
  );
  const [selectedSubType, setSelectedSubType] = useState(
    cachedUi.selectedSubType
  );
  const [selectedPriceRange, setSelectedPriceRange] = useState(
    priceRanges.find((r) => r.label === cachedUi.selectedPrice) || null
  );

  const exploreState = useSelector((s) =>
    selectedProductType
      ? s.explore.byType[selectedProductType.type] || {
          products: [],
          lastVisible: null,
          status: "idle",
        }
      : { products: [], lastVisible: null, status: "idle" }
  );
  const { products, lastVisible, status } = exploreState;
  const isLoadingProducts = status === "loading";
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const { promoImages, promoLoading } = useSelector((state) => state.promo);
  const navigate = useNavigate();
  const [filteredProductTypes, setFilteredProductTypes] = useState(ALL_TYPES);
  const [filteredSubTypes, setFilteredSubTypes] = useState([]);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [sortOrder, setSortOrder] = useState(null);
  const [showHeader, setShowHeader] = useState(true);
  const lastScrollPosition = useRef(0);

  const restoredRef = useRef(false);
  const cld = new Cloudinary({
    cloud: { cloudName: "dtaqusjav" },
  });

  const dispatch = useDispatch();

  // ✅ Identify user in PostHog
  useEffect(() => {
    if (currentUserData?.uid) {
      posthog.identify(currentUserData.uid, {
        email: currentUserData.email || "unknown",
        name: currentUserData.displayName || "Anonymous",
        role: currentUserData.role || "user",
      });
    } else {
      posthog.identify("guest_" + Date.now(), { role: "guest" });
    }
    posthog.capture("explore_page_viewed");
  }, [currentUserData]);

  useEffect(() => {
    if (promoImages.length === 0) {
      const images = [
        "https://res.cloudinary.com/dtaqusjav/image/upload/v1751554023/Book_your_travels_with_posh_retreats_2_mkj6jg.png",
        "https://res.cloudinary.com/dtaqusjav/video/upload/v1751554144/Untitled_1000_x_490_px_1_nhy93v.mp4",
        "https://res.cloudinary.com/dtaqusjav/image/upload/v1751557578/Untitled_1000_x_490_px_5_i8ssvn.png",
      ];
      dispatch(setPromoLoading(true));
      setTimeout(() => {
        dispatch(setPromoImages(images));
        dispatch(setPromoLoading(false));
      }, 1000);
    }
  }, [dispatch, promoImages]);

  useEffect(() => {
    if (!selectedProductType) return;

    if (status === "idle" && products.length === 0) {
      dispatch(
        fetchExploreProducts({
          productType: selectedProductType.type,
          batchSize: 20,
        })
      );
    }
  }, [selectedProductType, status, products.length, dispatch]);

  useEffect(() => {
    const onScroll = () => {
      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 100
      ) {
        if (status !== "loading" && lastVisible) {
          dispatch(
            fetchExploreProducts({
              productType: selectedProductType.type,
              lastVisible,
              batchSize: 20,
            })
          );
        }
      }
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [lastVisible, status, selectedProductType, dispatch]);

  useEffect(() => {
    if (selectedProductType) {
      const subTypes = selectedProductType.subTypes.filter((subType) =>
        (typeof subType === "string" ? subType : subType.name)
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      );
      setFilteredSubTypes(subTypes);
    } else {
      const types = productTypes.filter((productType) =>
        productType.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProductTypes(types);
    }
  }, [searchTerm, selectedProductType]);

  useEffect(() => {
    return () => {
      dispatch(
        saveExploreUi({
          selectedType: selectedProductType ? selectedProductType.type : null,
          selectedSubType,
          selectedPrice: selectedPriceRange ? selectedPriceRange.label : null,
          scrollY: window.scrollY,
        })
      );
    };
  }, [dispatch, selectedProductType, selectedSubType, selectedPriceRange]);

  useEffect(() => {
    if (cachedUi.scrollY) {
      setTimeout(() => window.scrollTo(0, cachedUi.scrollY), 0);
    }
  }, []);
  useLayoutEffect(() => {
    if (restoredRef.current) return;
    if (cachedUi.scrollY == null) return;

    const doneLoading = status !== "loading" && !loading;

    if (doneLoading) {
      window.scrollTo(0, cachedUi.scrollY);
      restoredRef.current = true;
    }
  }, [status, loading, cachedUi.scrollY]);

  const handleProductTypeClick = (productType) => {
    setSelectedProductType(productType);
    setSelectedSubType(null);
    setSelectedPriceRange(null);
    setSearchTerm("");

    posthog.capture("explore_category_selected", {
      category: productType.type,
    });
  };

  const handleSubTypeClick = (subType) => {
    if (selectedSubType === subType) {
      setSelectedSubType(null);
    } else {
      setSelectedSubType(subType);
    }
    setSelectedPriceRange(null);

    posthog.capture("explore_subtype_selected", {
      subtype: subType?.name || subType,
    });
  };

  const handlePriceRangeClick = (range) => {
    if (selectedPriceRange?.label === range.label) {
      setSelectedPriceRange(null);
    } else {
      setSelectedPriceRange(range);
    }
    setSelectedSubType(null);

    posthog.capture("explore_price_filter_applied", {
      priceRange: range.label,
    });
  };

  const toggleFilterDropdown = () => {
    setShowFilterDropdown(!showFilterDropdown);
  };

  const sortProducts = (order) => {
    setSortOrder(order);
    setShowFilterDropdown(false);

    posthog.capture("explore_sort_applied", { sortOrder: order });
  };

  const handleBackClick = () => {
    if (selectedSubType) {
      setSelectedSubType(null);
      setSearchTerm("");
      setShowFilterDropdown(false);
    } else {
      setSelectedProductType(null);
      setSelectedSubType(null);
      setSelectedPriceRange(null);
      setSearchTerm("");
      setShowFilterDropdown(false);
    }
  };

  const handleCategoryClick = (category) => {
    navigate(`/category/${category}`);
  };

  const scrollRef = useRef(null);

  const topSearches = [
    "Okirks",
    "Shirt",
    "Jeans",
    "Tops",
    "Thrift",
    "Shorts",
    "Shoes",
    "Jacket",
    "Dress",
    "Skirt",
    "Sweater",
    "Scarves",
    "Accessories",
    "Bag",
    "Bikini",
    "Tote Bag",
    "Lee",
    "Pants",
    "Jewelry",
    "Cargos",
    "Corporate",
    "Perfumes",
  ];

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollPosition = window.scrollY;
      if (currentScrollPosition > lastScrollPosition.current) {
        setShowHeader(false);
      } else {
        setShowHeader(true);
      }
      lastScrollPosition.current = currentScrollPosition;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const iv = setInterval(() => {
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth) {
        el.scrollLeft = 0;
      } else {
        el.scrollLeft += 1;
      }
    }, 30);
    return () => clearInterval(iv);
  }, []);

  const handleClearSearch = () => {
    setSearchTerm("");
    setIsSearching(false);
    setFilteredProductTypes(productTypes);
  };

  const filteredProducts = React.useMemo(() => {
    let list = [...products];

    if (selectedPriceRange) {
      list = list.filter(
        (p) =>
          p.price >= selectedPriceRange.min && p.price <= selectedPriceRange.max
      );
    }

    if (selectedSubType && selectedSubType !== "All") {
      list = list.filter((p) => p.subType === selectedSubType);
    }

    if (sortOrder === "high-to-low") {
      list.sort((a, b) => b.price - a.price);
    } else if (sortOrder === "low-to-high") {
      list.sort((a, b) => a.price - b.price);
    }

    return list;
  }, [products, selectedPriceRange, selectedSubType, sortOrder]);

  if (loading || (status === "loading" && products.length === 0)) {
    return <Loading />;
  }

  return (
    <>
      <SEO
        title={`Explore - My Thrift`}
        description={`Explore the best thrifted items on My Thrift`}
        url={`https://www.shopmythrift.store/explore`}
      />
      <div className="pb-28">
        {/* Top Bar */}
        <div
          className={`sticky top-0 left-0 w-full bg-white z-10 px-2 pt-6 pb-1`}
        >
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center">
              {(selectedProductType || selectedSubType) && (
                <GoChevronLeft
                  className="text-3xl cursor-pointer mr-2"
                  onClick={handleBackClick}
                />
              )}
              <h1 className="text-lg text-black font-semibold font-opensans">
                {selectedSubType
                  ? selectedSubType.name || selectedSubType
                  : selectedProductType
                  ? selectedProductType.type
                  : "Explore"}
              </h1>
            </div>
            <CiSearch
              className="text-3xl cursor-pointer"
              onClick={() => {
                posthog.capture("explore_search_clicked");
                navigate("/search");
              }}
            />
          </div>

          {selectedProductType && (
            <>
              <div className="flex px-2 w-full py-2 overflow-x-auto space-x-2 scrollbar-hide">
                {[
                  "All",
                  ...priceRanges.map((r) => r.label),
                  ...filteredSubTypes.map((sub) =>
                    typeof sub === "string" ? sub : sub.name
                  ),
                ].map((subTypeName) => {
                  const isPrice = priceRanges.some(
                    (r) => r.label === subTypeName
                  );

                  const isAll = subTypeName === "All";
                  const isActive = isAll
                    ? selectedSubType === null && selectedPriceRange === null
                    : isPrice
                    ? selectedPriceRange?.label === subTypeName
                    : selectedSubType === subTypeName;

                  return (
                    <button
                      key={subTypeName}
                      onClick={() => {
                        if (isAll) {
                          setSelectedSubType(null);
                          setSelectedPriceRange(null);
                        } else if (isPrice) {
                          const range = priceRanges.find(
                            (r) => r.label === subTypeName
                          );
                          handlePriceRangeClick(range);
                        } else {
                          handleSubTypeClick(subTypeName);
                        }
                      }}
                      className={`flex-shrink-0 h-12 px-4 text-xs font-semibold font-opensans text-black rounded-full backdrop-blur-md flex items-center justify-center transition-all duration-100 border ${
                        isActive ? "bg-customOrange text-white" : "bg-white"
                      }`}
                    >
                      {subTypeName}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          <hr className="bg-customGrey" />
        </div>

        {/* Main Content */}
        <div className="">
          {selectedProductType ? (
            <>
              <div className="grid grid-cols-2 gap-2 p-4">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      vendorId={product.vendorId}
                      vendorName={product.vendorName}
                    />
                  ))
                ) : (
                  <div className="col-span-2 text-center mt-4 text-lg font-medium text-gray-500">
                    <Lottie
                      animationData={noProductAnimation}
                      loop={true}
                      style={{ height: 200, width: 200, margin: "0 auto" }}
                    />
                    <h2 className="text-xl font-semibold font-opensans text-black">
                      Oops! Nothing here yet.
                    </h2>
                    <p className="text-gray-600 font-opensans">
                      Please try searching for another product.
                    </p>
                  </div>
                )}
              </div>
              {selectedProductType &&
                products.length > 0 &&
                status === "loading" && (
                  <div className="flex justify-center my-4">
                    <RotatingLines
                      strokeColor="#f9531e"
                      strokeWidth="3"
                      animationDuration="0.75"
                      width="24"
                      visible={true}
                    />
                  </div>
                )}
            </>
          ) : (
            <>
              <div className="">
                <div className="flex justify- mt-3 px-2 gap-2">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={index}
                        className="relative w-32 h-28 rounded-lg bg-gray-200 overflow-hidden"
                      >
                        <Skeleton height="100%" width="100%" />
                      </div>
                    ))
                  ) : (
                    <>
                      {!selectedProductType && (
                        <div className="bg-white w-full border-gray-200">
                          <div className="flex items-center gap-2 mb-5 mt-1">
                            <MdTrendingUp
                              className="text-customOrange"
                              size={18}
                            />
                            <h3 className="text-sm font-semibold font-opensans text-gray-900">
                              Trending Searches
                            </h3>
                          </div>

                          <div
                            ref={scrollRef}
                            className="w-full overflow-x-auto whitespace-nowrap scrollbar-hide"
                          >
                            {topSearches.map((term) => (
                              <motion.button
                                key={term}
                                onClick={() => {
                                  posthog.capture(
                                    "explore_trending_search_clicked",
                                    { searchTerm: term }
                                  );
                                  navigate(
                                    `/search?query=${encodeURIComponent(term)}`
                                  );
                                }}
                                className="inline-block mr-4 py-2 px-3 font-medium rounded-full font-opensans text-xs bg-gray-100 hover:bg-customOrange hover:text-white transition"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                transition={{ duration: 0.3 }}
                              >
                                {term}
                              </motion.button>
                            ))}
                          </div>
                          <div className="border-b  mt-4 border-gray-50"></div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-4 p-4">
                {filteredProductTypes.length > 0 ? (
                  filteredProductTypes.map((productType) => (
                    <div
                      key={productType.type}
                      onClick={() => handleProductTypeClick(productType)}
                      className="flex justify-between items-center py-2 cursor-pointer"
                    >
                      <span className="text-base font-opensans font-medium text-neutral-800">
                        {productType.type}
                      </span>
                      <GoChevronRight className="text-neutral-400" />
                    </div>
                  ))
                ) : (
                  <div className="text-center mt-4 text-lg font-medium text-gray-500">
                    <h2 className="text-xl font-semibold font-opensans text-black">
                      No results found
                    </h2>
                    <p className="text-black text-sm font-opensans">
                      Please try searching for another product type.
                    </p>
                  </div>
                )}
              </div>
              <div className="px-1 mb-0">
                <Swiper
                  modules={[FreeMode, Autoplay]}
                  spaceBetween={5}
                  slidesPerView={1}
                  freeMode={true}
                  loop={true}
                  autoplay={{ delay: 2500, disableOnInteraction: false }}
                  breakpoints={{
                    640: { slidesPerView: 2, spaceBetween: 10 },
                    768: { slidesPerView: 3, spaceBetween: 30 },
                    1024: { slidesPerView: 4, spaceBetween: 40 },
                  }}
                >
                  {promoLoading
                    ? Array.from({ length: 5 }).map((_, index) => (
                        <SwiperSlide key={index}>
                          <div className="p-1 w-full h-44 shadow-md rounded-lg overflow-hidden">
                            <Skeleton height="100%" />
                          </div>
                        </SwiperSlide>
                      ))
                    : promoImages.map((url, index) => (
                        <SwiperSlide
                          key={index}
                          onClick={() => {
                            posthog.capture("explore_promo_clicked", {
                              promoIndex: index,
                              url: url,
                            });

                            if (index === 0) {
                              window.open(
                                "https://poshretreats.co.uk",
                                "_blank"
                              );
                            } else if (index === 2) {
                              navigate("/store/HiyUGWBqxEXWLcwPgOvxH5gq2uF2");
                            }
                          }}
                          className="transition-transform duration-500 ease-in-out rounded-lg transform hover:scale-105"
                        >
                          <div className=" w-auto h-44 shadow-md rounded-lg overflow-hidden">
                            {url.endsWith(".mp4") ? (
                              <video
                                src={url}
                                className="w-full h-full object-cover object-center rounded-lg"
                                autoPlay
                                muted
                                loop
                                playsInline
                                preload="auto"
                              />
                            ) : (
                              <img
                                src={url}
                                alt={`Promo ${index + 1}`}
                                className="w-full h-full object-cover object-center rounded-lg"
                                loading="lazy"
                              />
                            )}
                          </div>
                        </SwiperSlide>
                      ))}
                </Swiper>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default Explore;
