import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { IoChevronBackOutline, IoChevronForward, IoSearchOutline } from "react-icons/io5";
import Loading from "../components/Loading/Loading";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/free-mode";
import "swiper/css/autoplay";
import productTypes from "../pages/vendor/producttype"; // Adjust path to where producttype.js is located
import { db } from "../firebase.config"; 
import { collection, query, where, getDocs } from "firebase/firestore";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { AdvancedImage } from "@cloudinary/react";
import { FreeMode, Autoplay } from "swiper/modules";
import { Cloudinary } from "@cloudinary/url-gen";
import { auto } from "@cloudinary/url-gen/actions/resize";
import { autoGravity } from "@cloudinary/url-gen/qualifiers/gravity";


const Explore = () => {
  const loading = useSelector((state) => state.product.loading);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedProductType, setSelectedProductType] = useState(null);
  const [selectedSubType, setSelectedSubType] = useState(null);
  const [products, setProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [subTypeSearchTerm, setSubTypeSearchTerm] = useState(""); // Add subType search term state
  const [showSearchInput, setShowSearchInput] = useState(false); // Toggle for main search input visibility
  const [showSubTypeSearchInput, setShowSubTypeSearchInput] = useState(false); // Toggle for subType search input visibility

  // Function to fetch products based on selected productType, subType, and category
  const fetchProducts = async (productType, subType, category) => {
    setIsLoadingProducts(true);
    try {
      const productsRef = collection(db, "products");
      let q = query(
        productsRef,
        where("productType", "==", productType),
        where("subType", "==", subType)
      );

      // Apply category filter if not "All"
      if (category !== "All") {
        q = query(q, where("category", "==", category));
      }

      const querySnapshot = await getDocs(q);
      const productsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(productsData);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const promoImages = [
    "black-friday-composition-with-post-its_1_clwua4",
    "4929101_na7pyp",
    "4991116_bwrxkh",
    "4395311_hcqoss",
  ];

  const cld = new Cloudinary({
    cloud: {
      cloudName: "dtaqusjav",
    },
  });

  // Handler for category selection
  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setSelectedProductType(null); // Reset selection on category change
    setSelectedSubType(null);
    setProducts([]);
  };

  // Handler for when a product type is selected
  const handleProductTypeClick = (productType) => {
    setSelectedProductType(productType);
    setSelectedSubType(null); // Reset subType selection
    setProducts([]); // Clear products list
  };

  // Handler for when a subType is selected
  const handleSubTypeClick = (subType) => {
    setSelectedSubType(subType);
    fetchProducts(selectedProductType.type, subType.name || subType, selectedCategory); // Fetch products for selected subType and category
  };

  const handleBackClick = () => {
    if (selectedSubType) {
      setSelectedSubType(null); // Go back to subTypes list
      setProducts([]);
    } else {
      setSelectedProductType(null); // Go back to main product types list
    }
  };

  // Filter product types based on the search term
  const filteredProductTypes = productTypes.filter((productType) =>
    productType.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter subtypes based on the subType search term
  const filteredSubTypes = selectedProductType
    ? selectedProductType.subTypes.filter((subType) =>
        (typeof subType === "string" ? subType : subType.name)
          .toLowerCase()
          .includes(subTypeSearchTerm.toLowerCase())
      )
    : [];

  // Show loading spinner if any loading state is true
  if (loading || isLoadingProducts) {
    return <Loading />;
  }

  return (
    <div className="py-2">

      
    <div className="px-4">

{/* Header */}
      <div className="flex items-center space-x-2 mb-4 py-8">
        {(selectedProductType || selectedSubType) ? (
          <IoChevronBackOutline
            onClick={handleBackClick}
            className="text-lg text-gray-800 cursor-pointer"
          />
        ) : null}
        <h1 className="text-lg font-semibold font-opensans">
          {selectedSubType ? selectedSubType.name || selectedSubType 
          : selectedProductType ? selectedProductType.type : "Explore"}
        </h1>

        {/* Search Icon for main product types */}
        <div className="ml-20 relative">
          {!showSearchInput ? (
            <IoSearchOutline
              onClick={() => setShowSearchInput(true)}
              className="text-xl text-gray-800 cursor-pointer"
            />
          ) : (
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search product types"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-customOrange"
              onBlur={() => setShowSearchInput(false)} // Hide input on blur
              autoFocus
            />
          )}
        </div>
      </div>

      {selectedSubType ? (
        // Products View
        <div className="space-y-4 font-opensans">
          <h2 className="text-lg font-semibold text-gray-800 font-opensans">
            Products in {selectedSubType.name || selectedSubType}
          </h2>
          {products.length > 0 ? (
            products.map((product) => (
              <div key={product.id} className="border-b border-gray-200 py-2 flex items-start">
                <img src={product.image} alt={product.name} className="w-16 h-16 rounded-md" />
                <div className="ml-4">
                  <h3 className="text-md font-medium">{product.name}</h3>
                  <p className="text-sm text-gray-600">{product.size ? `Size: ${product.size}` : ''}</p>
                  <p className="text-lg font-semibold text-gray-800">₦{product.price}</p>
                </div>
              </div>
            ))
          ) : (
            <p>No products available for this subcategory.</p>
          )}
        </div>

        
      ) : selectedProductType ? (
        // Subtypes View
        <div className="space-y-4 font-opensans">
          <div className="flex items-center space-x-2 mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              {selectedProductType.type}
            </h2>

            {/* Search Icon for subtypes */}
            <div className="ml-auto relative">
              {!showSubTypeSearchInput ? (
                <IoSearchOutline
                  onClick={() => setShowSubTypeSearchInput(true)}
                  className="text-xl text-gray-800 cursor-pointer"
                />
              ) : (
                <input
                  type="text"
                  value={subTypeSearchTerm}
                  onChange={(e) => setSubTypeSearchTerm(e.target.value)}
                  placeholder="Search subtypes"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-customOrange"
                  onBlur={() => setShowSubTypeSearchInput(false)} // Hide input on blur
                  autoFocus
                />
              )}
            </div>
          </div>

          {filteredSubTypes.map((subType) => (
            <div
              key={subType.name || subType}
              onClick={() => handleSubTypeClick(subType)}
              className="flex justify-between items-center py-2 border-b border-gray-200 cursor-pointer"
            >
              <span className="text-gray-600">
                {typeof subType === "string" ? subType : subType.name}
              </span>
              <IoChevronForward className="text-gray-400" />
            </div>
          ))}
        </div>
      ) : (
        // Main Product Types View
        <>
          {/* Main Product Types List */}
          <div className="space-y-4">
            {filteredProductTypes.map((productType) => (
              <div
                key={productType.type}
                onClick={() => handleProductTypeClick(productType)}
                className="flex justify-between items-center py-2 cursor-pointer border-b border-gray-200"
              >
                <span className="text-lg font-medium text-gray-800">
                  {productType.type}
                </span>
                <IoChevronForward className="text-gray-400" />
              </div>
            ))}
          </div>

        </>
      )}


         
    </div>
     {/* Discount Cards */}
     <div className="px-0 mt-2">
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
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <SwiperSlide key={index}>
                    <div className="p-2 w-auto h-44 shadow-md rounded-lg">
                      <Skeleton height="100%" />
                    </div>
                  </SwiperSlide>
                ))
              ) : (
                <>
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
                </>
              )}
            </Swiper>
          </div>
    </div>
  );
};

export default Explore;
