import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchVendorsRanked } from "../redux/reducers/VendorsSlice";
import { GoDotFill, GoChevronLeft } from "react-icons/go";
import { CiSearch } from "react-icons/ci";
import Skeleton from "react-loading-skeleton";
import ReactStars from "react-rating-stars-component";
import RoundedStar from "../components/Roundedstar";
import { MdCancel } from "react-icons/md";
import SEO from "../components/Helmet/SEO";
import { IoLocationOutline } from "react-icons/io5";
import IkImage from "../services/IkImage";
import VendorMetaTicker from "../components/VendorsData/VendorTicker";

const Marketpg = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Redux state
  const { local, online, isFetched, status } = useSelector(
    (state) => state.vendors
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [hasStockpile, setHasStockpile] = useState(false); // Stockpile filter
  const [hasPickup, setHasPickup] = useState(false); // Pickup filter
  const [hasDelivery, setHasDelivery] = useState(false); // Delivery filter

  const categories = [
    "Thrifts",
    "Mens",
    "Womens",
    "Underwears",
    "Y2K",
    "Jewelry",
    "Kids",
    "Trads",
    "Dresses",
    "Gowns",
    "Shoes",
    "Accessories",
    "Bags",
    "Sportswear",
    "Formal",
  ];

  useEffect(() => {
    if (!isFetched) {
      dispatch(fetchVendorsRanked());
    }
  }, [dispatch, isFetched]);

  const vendors = online; // Only showing online vendors

  const filteredVendors = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return vendors.filter((v) => {
      const matchesSearch = !term || v.shopName.toLowerCase().includes(term);
      const matchesCategory =
        !selectedCategory || v.categories.includes(selectedCategory);
      const matchesStockpile =
        !hasStockpile || (v.stockpile && v.stockpile.enabled);
      const matchesPickup =
        !hasPickup ||
        (v.deliveryMode && v.deliveryMode.toLowerCase().includes("pickup")) ||
        !v.deliveryMode; // Assume pickup if deliveryMode is absent or includes "pickup"
      const matchesDelivery =
        !hasDelivery ||
        (v.deliveryMode && v.deliveryMode.toLowerCase().includes("delivery"));

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStockpile &&
        matchesPickup &&
        matchesDelivery
      );
    });
  }, [
    vendors,
    searchTerm,
    selectedCategory,
    hasStockpile,
    hasPickup,
    hasDelivery,
  ]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value.toLowerCase());
  };

  const handleClearSearch = () => {
    setSearchTerm("");
  };

  const handleStoreView = (vendor) => {
    navigate(`/store/${vendor.id}`);
  };

  const avgRating = (vendor) => {
    const { rating = 0, ratingCount = 0 } = vendor;
    return ratingCount > 0 ? rating / ratingCount : 0;
  };

  const defaultImageUrl =
    "https://images.saatchiart.com/saatchi/1750204/art/9767271/8830343-WUMLQQKS-7.jpg";

  return (
    <>
      <SEO
        title={`Browse Markets - My Thrift`}
        description={`Browse through our list of vendors on My Thrift`}
        url={`https://www.shopmythrift.store/browse-markets`}
      />
      <div className="mb-1">
        <div className="sticky pt-3 px-2 w-full top-0 bg-white z-10">
          <div className="flex flex-col mb-2 px-2.5">
            {!isSearching && (
              <div className="flex justify-between mb-4">
                <h1 className="text-xl font-opensans font-semibold">Stores</h1>
                <CiSearch
                  className="text-3xl cursor-pointer"
                  onClick={() => setIsSearching(true)}
                />
              </div>
            )}
            {isSearching && (
              <div className="flex items-center mb-6 w-full relative">
                <GoChevronLeft
                  className="text-3xl cursor-pointer "
                  onClick={() => {
                    setIsSearching(false);
                    handleClearSearch();
                    setSelectedCategory("");
                  }}
                />
                <input
                  type="text"
                  className="flex-1 border font-opensans text-black text-base border-gray-300 rounded-full px-3 py-2 font-medium focus:outline-none"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Search vendors..."
                />
                {searchTerm && (
                  <MdCancel
                    className="text-xl text-gray-500 cursor-pointer absolute right-3"
                    onClick={handleClearSearch}
                  />
                )}
              </div>
            )}
            {!isSearching && (
              <div className="flex  w-full py-3 overflow-x-auto space-x-2 scrollbar-hide">
                {/* Delivery Filter - Placed First as Requested */}
                <button
                  onClick={() => setHasDelivery(!hasDelivery)}
                  className={`flex-shrink-0 h-12 px-4 text-xs font-semibold font-opensans text-black rounded-full backdrop-blur-md flex items-center justify-center transition-all duration-100  border ${
                      hasDelivery
                        ? "bg-customOrange text-white"
                        : "bg-white"
                    }`}
                >
                  Delivery
                </button>

                {/* Stockpile Filter */}
                <button
                  onClick={() => setHasStockpile(!hasStockpile)}
                  className={`flex-shrink-0 h-12 px-4 text-xs font-semibold font-opensans text-black rounded-full backdrop-blur-md flex items-center justify-center transition-all duration-100  border ${
                      hasStockpile
                        ? "bg-customOrange text-white"
                        : "bg-white"
                    }`}
                >
                  Stockpile
                </button>

                {/* Pickup Filter */}
                <button
                  onClick={() => setHasPickup(!hasPickup)}
                  className={`flex-shrink-0 h-12 px-4 text-xs font-semibold font-opensans text-black rounded-full backdrop-blur-md flex items-center justify-center transition-all duration-100  border ${
                      hasPickup
                        ? "bg-customOrange text-white"
                        : "bg-white"
                    }`}
                >
                  Pickup
                </button>

                {/* Category Buttons */}
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() =>
                      setSelectedCategory(
                        category === selectedCategory ? "" : category
                      )
                    }
                    className={`flex-shrink-0 h-12 px-4 text-xs font-semibold font-opensans text-black rounded-full backdrop-blur-md flex items-center justify-center transition-all duration-100  border ${
                      selectedCategory === category
                        ? "bg-customOrange text-white"
                        : "bg-white"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}
            <hr className="bg-customGrey mb-1"/>
          </div>
          
        </div>
        <div className="vendor-list px-2 pb-24">
          {status === "loading" ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="vendor-item">
                <div className="flex justify-between p-3 mb-1 bg-white ">
                  <div>
                    <Skeleton width={150} height={24} />
                    <div className="flex items-center mt-1">
                      <Skeleton width={100} height={16} />
                    </div>
                    <div className="flex items-center mt-4">
                      <Skeleton width={30} height={16} className="mr-2" />
                      <Skeleton width={120} height={24} />
                      <Skeleton width={50} height={16} className="ml-2" />
                    </div>
                  </div>
                  <div>
                    <Skeleton height={96} width={96} />
                  </div>
                </div>
              </div>
            ))
          ) : filteredVendors.length > 0 ? (
            filteredVendors.map((vendor) => (
              <div
                key={vendor.id}
                className="vendor-item border-b border-gray-100 "
              >
                <div
                  className="flex justify-between p-3 mb-3 bg-white "
                  onClick={() => handleStoreView(vendor)}
                >
                  <div>
                    <h1 className="font-poppins text-black text-xl mb-1 font-medium flex items-center space-x-2">
                      <span>
                        {vendor.shopName.length > 18
                          ? `${vendor.shopName.substring(0, 18)}...`
                          : vendor.shopName}
                      </span>
                      {vendor.flashSale && (
                        <span
                          className="
                          inline-block    
                          bg-customOrange  
                          animate-pulse
                          text-white 
                          text-[8px] 
                          font-semibold 
                          rounded-md
                          py-1            
                          px-1              
                          leading-none      
                        "
                        >
                          Flash sales
                        </span>
                      )}
                    </h1>
                    <p className="font-sans text-gray-300 text-xs flex items-center -translate-y-1">
                      {(vendor.categories?.slice(0, 3) || []).map(
                        (category, index) => (
                          <React.Fragment key={index}>
                            {index > 0 && (
                              <GoDotFill className="mx-1 dot-size text-gray-300" />
                            )}
                            {category}
                          </React.Fragment>
                        )
                      )}
                    </p>
                    <div className="flex -ml-1 items-center text-gray-700 font-ubuntu font- text-xs translate-y-4 mb-0">
                      <IoLocationOutline className="mr-1 text-customOrange" />
                      <span>{vendor.state}</span>
                      <VendorMetaTicker vendor={vendor} />
                    </div>
                    <div className="flex items-center translate-y-4">
                      <span className="text-black font-light text-xs mr-2">
                        {avgRating(vendor).toFixed(1)}
                      </span>
                      <ReactStars
                        count={5}
                        value={vendor.rating / vendor.ratingCount || 0}
                        size={24}
                        activeColor="#ffd700"
                        emptyIcon={<RoundedStar filled={false} />}
                        filledIcon={<RoundedStar filled={true} />}
                        edit={false}
                      />
                      <span className="text-black ratings-text font-light ml-2">
                        ({vendor.ratingCount || 0})
                      </span>
                    </div>
                  </div>
                  <div className="relative w-24 h-24 overflow-hidden">
                    <IkImage
                      className="object-cover w-full h-full rounded-lg"
                      src={vendor.coverImageUrl || defaultImageUrl}
                      alt={vendor.shopName}
                    />
                    <div
                      className="absolute inset-0 bg-gradient-to-l from-transparent via-white/50 to-transparent"
                      style={{
                        backgroundSize: "200% 200%",
                        animation: "shimmer 4s infinite ease-in-out reverse",
                      }}
                    />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center my-10">
              <h2 className="text-2xl font-opensans font-medium">
                ☹️ No results found
              </h2>
              <p className="text-gray-600 text-sm font-opensans">
                Please try searching for another vendor.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Marketpg;
