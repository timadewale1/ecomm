import React, { useState, useEffect, useRef } from "react";

import { IoChevronBackOutline } from "react-icons/io5";
import { LuListFilter } from "react-icons/lu";
import { CiSearch } from "react-icons/ci";
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
import { db } from "../firebase.config";
import { collection, query, where, getDocs } from "firebase/firestore";
import ProductCard from "../components/Products/ProductCard";
import Lottie from "lottie-react";
import noProductAnimation from "../Animations/noproduct.json";
import { MdCancel } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setPromoImages, setPromoLoading } from "../redux/actions/promoaction";
import SEO from "../components/Helmet/SEO";
const Explore = () => {
  const loading = useSelector((state) => state.product.loading);

  const [selectedCategory] = useState("All");
  const [selectedProductType, setSelectedProductType] = useState(null);
  const [selectedSubType, setSelectedSubType] = useState(null);
  const [activeSubType, setActiveSubType] = useState(null);
  const [products, setProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const { promoImages, promoLoading } = useSelector((state) => state.promo);
  const navigate = useNavigate();
  const [filteredProductTypes, setFilteredProductTypes] =
    useState(productTypes);
  const [filteredSubTypes, setFilteredSubTypes] = useState([]);
  const [priceRange] = useState([1000, 10000]);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [sortOrder, setSortOrder] = useState(null);
  const dropdownRef = useRef(null);

  // 1) State for approved & active vendors
  const [approvedVendors, setApprovedVendors] = useState(new Set());

  // ======= FETCH ONLY APPROVED & ACTIVE VENDORS ONCE =======
  useEffect(() => {
    const fetchApprovedVendors = async () => {
      try {
        const vendorSnapshot = await getDocs(
          query(
            collection(db, "vendors"),
            where("isApproved", "==", true),
            where("isDeactivated", "==", false)
          )
        );
        const approvedSet = new Set();
        vendorSnapshot.forEach((doc) => approvedSet.add(doc.id));
        setApprovedVendors(approvedSet);
      } catch (error) {
        console.error("Error fetching approved vendors:", error);
      }
    };

    fetchApprovedVendors();
  }, []);
  // =========================================================

  const cld = new Cloudinary({
    cloud: {
      cloudName: "dtaqusjav",
    },
  });

  const dispatch = useDispatch();

  // Load promo images from Redux (simulate API delay)
  useEffect(() => {
    if (promoImages.length === 0) {
      const images = [
        "https://res.cloudinary.com/dtaqusjav/image/upload/v1736717421/Promo_Card_5_azm2n3.svg",
        "https://res.cloudinary.com/dtaqusjav/image/upload/v1739645822/Valentine_s_Promo_Card_fykrup.svg",
        "https://res.cloudinary.com/dtaqusjav/image/upload/v1737022557/Promo_Card_7_gxlmrs.svg",
      ];
      dispatch(setPromoLoading(true));
      setTimeout(() => {
        dispatch(setPromoImages(images));
        dispatch(setPromoLoading(false));
      }, 1000);
    }
  }, [dispatch, promoImages]);

  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setShowFilterDropdown(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

  // ======== FETCH PRODUCTS & FILTER BY APPROVED VENDORS ========
  const fetchProducts = async (productType, subType, category) => {
    setIsLoadingProducts(true);
    try {
      const productsRef = collection(db, "products");
      let q = query(
        productsRef,
        where("published", "==", true),
        where("isDeleted", "==", false),
        where("productType", "==", productType),
        where("subType", "==", subType)
      );

      if (category !== "All") {
        q = query(q, where("productCategory", "==", category));
      }

      const querySnapshot = await getDocs(q);
      const productsData = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Only push products where vendorId is in the approved set
        if (approvedVendors.has(data.vendorId)) {
          productsData.push({ id: doc.id, ...data });
        }
      });

      setProducts(productsData);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setIsLoadingProducts(false);
    }
  };
  // ============================================================

  const handleProductTypeClick = (productType) => {
    setSelectedProductType(productType);
    setSelectedSubType(null);
    setProducts([]);
    setSearchTerm("");
  };

  const handleSubTypeClick = (subType) => {
    setSelectedSubType(subType);
    setActiveSubType(subType);
    setSearchTerm("");
    fetchProducts(
      selectedProductType.type,
      subType.name || subType,
      selectedCategory
    );
  };

  const toggleFilterDropdown = () => {
    setShowFilterDropdown(!showFilterDropdown);
  };

  const sortProducts = (order) => {
    const sorted = [...products].sort((a, b) => {
      return order === "high-to-low" ? b.price - a.price : a.price - b.price;
    });
    setProducts(sorted);
    setSortOrder(order);
    setShowFilterDropdown(false);
  };

  const handleBackClick = () => {
    if (selectedSubType) {
      setSelectedSubType(null);
      setProducts([]);
      setSearchTerm("");
    } else {
      setSelectedProductType(null);
      setSearchTerm("");
    }
  };

  const handleCategoryClick = (category) => {
    navigate(`/category/${category}`);
  };
  const maleImg = cld
    .image("male_kfm4n5")
    .format("auto")
    .quality("auto")
    .resize(auto().gravity(autoGravity()).width(1000).height(1000));

  const kidImg = cld
    .image("kid_ec5vky")
    .format("auto")
    .quality("auto")
    .resize(auto().gravity(autoGravity()).width(1000).height(1000));

  const femaleImg = cld
    .image("female_s5qaln")
    .format("auto")
    .quality("auto")
    .resize(auto().gravity(autoGravity()).width(1000).height(1000));

  const handleClearSearch = () => {
    setSearchTerm("");
    setIsSearching(false);
    setFilteredProductTypes(productTypes);
  };

  const filteredProducts = products.filter(
    (product) =>
      product.price >= priceRange[0] && product.price <= priceRange[1]
  );

  if (loading || isLoadingProducts) {
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
        <div className="sticky py-4 px-2 w-full top-0 bg-white z-10">
          <div className="flex items-center justify-between mb-3 pb-2 px-2.5">
            <div className="flex items-center">
              {(selectedProductType || selectedSubType) && (
                <IoChevronBackOutline
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
            {/* Instead of local search, navigate to /search */}
            <CiSearch
              className="text-3xl cursor-pointer"
              onClick={() => navigate("/search")}
            />
          </div>

          {/* Filter dropdown */}
          {showFilterDropdown && (
            <div
              ref={dropdownRef}
              className="absolute right-4 bg-white shadow-[0_0_10px_rgba(0,0,0,0.1)] top-14 p-3 w-40 h-24 rounded-2.5xl z-50 flex flex-col justify-between font-opensans"
            >
              <span
                className="text-sm ml-2 font-opensans cursor-pointer"
                onClick={() => sortProducts("high-to-low")}
              >
                Price: High to Low
              </span>
              <hr className="text-slate-300" />
              <span
                className="text-sm ml-2 font-opensans cursor-pointer"
                onClick={() => sortProducts("low-to-high")}
              >
                Price: Low to High
              </span>
            </div>
          )}
          <div className="border-t border-gray-300 mt-6"></div>
        </div>

        {/* Main Content */}
        <div className="">
          {/* If we have selected a SubType, show products grid */}
          {selectedSubType ? (
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
          ) : selectedProductType ? (
            // If we have selected a ProductType but not a SubType, show subType list
            <div className="space-y-4 p-4">
              {filteredSubTypes.length > 0 ? (
                filteredSubTypes.map((subType) => (
                  <div
                    key={subType.name || subType}
                    onClick={() => handleSubTypeClick(subType)}
                    className="flex justify-between items-center py-2 cursor-pointer"
                  >
                    <span className="text-neutral-800 font-opensans">
                      {typeof subType === "string" ? subType : subType.name}
                    </span>
                    <ChevronRight className="text-neutral-400" />
                  </div>
                ))
              ) : (
                <div className="text-center mt-4 text-lg font-medium text-gray-500">
                  <h2 className="text-xl font-semibold text-black">
                    No results found
                  </h2>
                  <p className="text-gray-600">
                    Please try searching for another product.
                  </p>
                </div>
              )}
            </div>
          ) : (
            // If no ProductType selected, show list of productTypes + promo slides
            <>
              <div className="">
                <div className="flex justify-center mt-3 px-2 gap-2">
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
                      <div
                        className="relative w-32 h-28 rounded-lg bg-gray-200 overflow-hidden cursor-pointer"
                        onClick={() => handleCategoryClick("Mens")}
                      >
                        <AdvancedImage
                          cldImg={maleImg}
                          className="w-full h-full object-cover"
                        />
                        <h2 className="absolute bottom-0 w-full text-center text-white font-semibold text-sm bg-transparent">
                          MEN
                        </h2>
                      </div>
                      <div
                        className="relative w-32 h-28 rounded-lg bg-gray-200 overflow-hidden cursor-pointer"
                        onClick={() => handleCategoryClick("Womens")}
                      >
                        <AdvancedImage
                          cldImg={femaleImg}
                          className="w-full h-full object-cover"
                        />
                        <h2 className="absolute bottom-0 w-full text-center text-white font-semibold bg-transparent text-sm">
                          WOMEN
                        </h2>
                      </div>
                      <div
                        className="relative w-32 h-28 rounded-lg bg-gray-200 overflow-hidden cursor-pointer"
                        onClick={() => handleCategoryClick("Kids")}
                      >
                        <AdvancedImage
                          cldImg={kidImg}
                          className="w-full h-full object-cover"
                        />
                        <h2 className="absolute bottom-0 w-full text-center text-white font-semibold bg-transparent text-sm">
                          KIDS
                        </h2>
                      </div>
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
                      <ChevronRight className="text-neutral-400" />
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
                          className="transition-transform duration-500 ease-in-out rounded-lg transform hover:scale-105"
                        >
                          <div className="p-1 w-auto h-44 shadow-md rounded-lg overflow-hidden">
                            <img
                              src={url}
                              alt={`Promo ${index + 1}`}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          </div>
                        </SwiperSlide>
                      ))}
                </Swiper>
                {/* Dots navigation can remain unchanged if needed */}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default Explore;
