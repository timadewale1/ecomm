import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { IoChevronBackOutline, IoSearchOutline, IoFilterOutline } from "react-icons/io5";
import Loading from "../components/Loading/Loading";
import Skeleton from "react-loading-skeleton";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode, Autoplay } from "swiper/modules";
import { ChevronRight } from "lucide-react";
import { Cloudinary } from "@cloudinary/url-gen";
import { auto } from "@cloudinary/url-gen/actions/resize";
import { autoGravity } from "@cloudinary/url-gen/qualifiers/gravity";
import { AdvancedImage } from "@cloudinary/react";
import productTypes from "../pages/vendor/producttype"; // Adjust path to where producttype.js is located
import { db } from "../firebase.config";
import { collection, query, where, getDocs } from "firebase/firestore";
import ProductCard from "../components/Products/ProductCard";
import ReactSlider from "react-slider";

const Explore = () => {
  const loading = useSelector(state => state.product.loading);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedProductType, setSelectedProductType] = useState(null);
  const [selectedSubType, setSelectedSubType] = useState(null);
  const [activeSubType, setActiveSubType] = useState(null);
  const [products, setProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [showPriceFilter, setShowPriceFilter] = useState(false); // State to show/hide price filter
  const [filteredProductTypes, setFilteredProductTypes] = useState(productTypes);
  const [filteredSubTypes, setFilteredSubTypes] = useState([]);
  const [priceRange, setPriceRange] = useState([1000, 10000]); // Dual price range filter
  const productCardsRef = useRef([]);

  const cld = new Cloudinary({
    cloud: {
      cloudName: "dtaqusjav",
    },
  });

  const promoImages = [
    "black-friday-composition-with-post-its_1_clwua4",
    "4929101_na7pyp",
    "4991116_bwrxkh",
    "4395311_hcqoss",
  ];

  useEffect(() => {
    if (selectedProductType) {
      // Filter subtypes when a product type is selected
      const subTypes = selectedProductType.subTypes.filter((subType) =>
        (typeof subType === "string" ? subType : subType.name)
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      );
      setFilteredSubTypes(subTypes);
    } else {
      // Filter product types when no product type is selected
      const types = productTypes.filter((productType) =>
        productType.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProductTypes(types);
    }
  }, [searchTerm, selectedProductType]);

  const fetchProducts = async (productType, subType, category) => {
    setIsLoadingProducts(true);
    try {
      const productsRef = collection(db, "products");
      let q = query(productsRef, where("productType", "==", productType), where("subType", "==", subType));
      if (category !== "All") {
        q = query(q, where("category", "==", category));
      }
      const querySnapshot = await getDocs(q);
      const productsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(productsData);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setSelectedProductType(null);
    setSelectedSubType(null);
    setProducts([]);
    setSearchTerm("");
  };

  const handleProductTypeClick = (productType) => {
    setSelectedProductType(productType);
    setSelectedSubType(null);
    setProducts([]);
    setSearchTerm("");
  };

  const handleSubTypeClick = (subType) => {
    setSelectedSubType(subType);
    setActiveSubType(subType);
    fetchProducts(selectedProductType.type, subType.name || subType, selectedCategory);
  };

  const handleBackClick = () => {
    if (selectedSubType) {
      setSelectedSubType(null);
      setProducts([]);
    } else {
      setSelectedProductType(null);
    }
  };

  const handlePriceRangeChange = (values) => {
    setPriceRange(values);
  };

  const handlePriceInputChange = (index, value) => {
    const newPriceRange = [...priceRange];
    newPriceRange[index] = value ? parseInt(value) : 0;
    setPriceRange(newPriceRange);
  };

  const clearFilters = () => {
    setPriceRange([1000, 10000]);
  };

  const filteredProducts = products.filter(
    (product) =>
      product.price >= priceRange[0] && product.price <= priceRange[1]
  );

  if (loading || isLoadingProducts) {
    return <Loading />;
  }

  return (
    <div className="">
      <div className="flex items-center justify-between mb-2 py-4 p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          {(selectedProductType || selectedSubType) && (
            <IoChevronBackOutline onClick={handleBackClick} className="text-lg text-gray-800 cursor-pointer" />
          )}
          <h1 className="text-lg font-semibold font-opensans">
            {selectedSubType ? selectedSubType.name || selectedSubType : selectedProductType ? selectedProductType.type : "Explore"}
          </h1>
        </div>

        <div className="flex items-center space-x-4">
          <IoSearchOutline
            onClick={() => setShowSearchInput(!showSearchInput)}
            className="text-xl text-gray-800 cursor-pointer"
          />
          {selectedSubType && (
            <IoFilterOutline
              onClick={() => setShowPriceFilter(!showPriceFilter)}
              className="text-xl text-gray-800 cursor-pointer"
            />
          )}
        </div>
      </div>

      {showSearchInput && (
        <div className="px-4 mb-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-customOrange"
          />
        </div>
      )}

      {showPriceFilter && selectedSubType && (
        <div className="px-4 mb-4 border-t border-b py-4">
          <label className="block mb-4 font-medium text-gray-700">Filter by Price</label>
          <ReactSlider
            className="horizontal-slider"
            thumbClassName="slider-thumb"
            trackClassName="slider-track"
            min={0}
            max={10000}
            step={500}
            value={priceRange}
            onChange={handlePriceRangeChange}
          />
          <div className="flex justify-between text-sm text-gray-600 mt-1">
            <span>₦{priceRange[0]}</span>
            <span>₦{priceRange[1]}</span>
          </div>
          <div className="flex space-x-4 mt-4">
            <input
              type="number"
              value={priceRange[0]}
              onChange={(e) => handlePriceInputChange(0, e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none"
              min={0}
              placeholder="Min Price"
            />
            <span className="font-medium">-</span>
            <input
              type="number"
              value={priceRange[1]}
              onChange={(e) => handlePriceInputChange(1, e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none"
              max={100000}
              placeholder="Max Price"
            />
          </div>
          <div className="flex justify-between items-center mt-4">
            <button
              onClick={clearFilters}
              className="text-red-600 font-medium hover:underline"
            >
              Clear
            </button>
            <button
              onClick={() => setShowPriceFilter(false)}
              className="bg-black text-white px-6 py-2 rounded-md font-semibold"
            >
              Save
            </button>
          </div>
        </div>
      )}

      <div className="">
        {selectedSubType ? (
          <>
            <div className="flex items-center space-x-2 overflow-x-auto px-4 mb-4">
              {filteredSubTypes.map((subType) => (
                <button
                  key={subType.name || subType}
                  onClick={() => handleSubTypeClick(subType)}
                  className={`whitespace-nowrap border border-gray-300 rounded-full px-4 py-2 text-sm font-medium cursor-pointer hover:bg-gray-100 ${
                    activeSubType === subType
                      ? "bg-customOrange text-white"
                      : "bg-white text-gray-800"
                  }`}
                >
                  {typeof subType === "string" ? subType : subType.name}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 p-4">
              {isLoadingProducts ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} height={200} width="100%" />
                ))
              ) : filteredProducts.length > 0 ? (
                filteredProducts.slice(0, 16).map((product, index) => (
                  <div
                    ref={(el) => (productCardsRef.current[index] = el)}
                    key={product.id}
                  >
                    <ProductCard
                      product={product}
                      vendorId={product.vendorId}
                      vendorName={product.vendorName}
                    />
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center mt-4 text-lg font-medium text-gray-500">
                  Sorry, we can't find that in our stores.
                </div>
              )}
            </div>
          </>
        ) : selectedProductType ? (
          <div className="space-y-4 p-4">
            {filteredSubTypes.map((subType) => (
              <div
                key={subType.name || subType}
                onClick={() => handleSubTypeClick(subType)}
                className="flex justify-between items-center py-2 cursor-pointer border-b border-gray-200"
              >
                <span className="text-gray-600 font-opensans">
                  {typeof subType === "string" ? subType : subType.name}
                </span>
                <ChevronRight className="text-gray-400" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="space-y-4 p-4">
              {filteredProductTypes.map((productType) => (
                <div
                  key={productType.type}
                  onClick={() => handleProductTypeClick(productType)}
                  className="flex justify-between items-center py-2 cursor-pointer "
                >
                  <span className="text-base font-opensans font-medium text-gray-800">
                    {productType.type}
                  </span>
                  <ChevronRight className="text-gray-400" />
                </div>
              ))}
            </div>
            <div className="px-1 mb-0">
              <Swiper
                modules={[FreeMode, Autoplay]}
                spaceBetween={5}
                slidesPerView={1}
                freeMode={true}
                loop={true}
                autoplay={{
                  delay: 2500,
                  disableOnInteraction: false,
                }}
                breakpoints={{
                  640: {
                    slidesPerView: 2,
                    spaceBetween: 10,
                  },
                  768: {
                    slidesPerView: 3,
                    spaceBetween: 30,
                  },
                  1024: {
                    slidesPerView: 4,
                    spaceBetween: 40,
                  },
                }}
              >
                {promoImages.map((publicId, index) => (
                  <SwiperSlide
                    key={index}
                    className="transition-transform duration-500 ease-in-out rounded-lg transform hover:scale-105"
                  >
                    <div className="p-1 w-auto h-44 shadow-md rounded-lg overflow-hidden">
                      <AdvancedImage
                        cldImg={cld
                          .image(publicId)
                          .format("auto")
                          .quality("auto")
                          .resize(
                            auto()
                              .gravity(autoGravity())
                              .width(5000)
                              .height(3000)
                          )}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          </>
        )}
      </div> 
    </div>
  );
};

export default Explore;
