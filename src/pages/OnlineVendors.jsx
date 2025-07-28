import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { GoDotFill, GoChevronLeft } from "react-icons/go";
import { CiSearch } from "react-icons/ci";
import { useDispatch, useSelector } from "react-redux";
import { fetchVendorsRanked } from "../redux/reducers/VendorsSlice";
import { toast } from "react-toastify";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import ReactStars from "react-rating-stars-component";
import RoundedStar from "../components/Roundedstar";
import IkImage from "../services/IkImage";
import SEO from "../components/Helmet/SEO";
import { IoLocationOutline } from "react-icons/io5";
// import ProductCard from "../components/Products/ProductCard"; // if needed

const OnlineVendors = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const {
    online: vendors = [],
    status,
    isFetched,
  } = useSelector((state) => state.vendors);

  // Search/filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const [isSearching, setIsSearching] = useState(false);

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

  const filteredVendors = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return vendors.filter((v) => {
      const matchesSearch = !term || v.shopName.toLowerCase().includes(term);
      const matchesCategory =
        !selectedCategory || v.categories.includes(selectedCategory);
      return matchesSearch && matchesCategory;
    });
  }, [vendors, searchTerm, selectedCategory]);
  // ---------------------------------
  // 2. Universal Filter Function
  // ---------------------------------
  const filterVendors = (term, category) => {
    const lowerTerm = term.toLowerCase();

    // 1) If no search and no category, show all vendors
    if (!lowerTerm && !category) {
      return vendors;
    }

    // 2) Otherwise, filter
    return vendors.filter((vendor) => {
      // a) matches search term?
      const matchesSearch = vendor.shopName.toLowerCase().includes(lowerTerm);

      // b) matches category (if any)
      const matchesCategory = !category || vendor.categories.includes(category);

      return matchesSearch && matchesCategory;
    });
  };

  // ---------------------------------
  // 3. Handlers
  // ---------------------------------
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };
  const handleCategoryClick = (category) => {
    setSelectedCategory((prev) => (prev === category ? "" : category));
  };

  const handleRefresh = () => {
    setSearchTerm("");
    setSelectedCategory("");
    setIsSearching(false);
    // Reset to full vendor list
    setSearchResults(vendors);
  };

  const handleStoreView = (vendor) => {
    navigate(`/store/${vendor.id}`);
  };

  const defaultImageUrl =
    "https://images.saatchiart.com/saatchi/1750204/art/9767271/8830343-WUMLQQKS-7.jpg";

  return (
    <>
      <SEO
        title={`Online Vendors - My Thrift`}
        description={`Shop from our online vendors on My Thrift`}
        url={`https://www.shopmythrift.store/online-vendors`}
      />
      <div className="mb-1 p-2">
        {/* Top Bar */}
        <div className="sticky py-3 w-[calc(100%+1rem)] -ml-2 top-0 bg-white z-10">
          {/* Header + Search Icon */}
          <div className="flex items-center justify-between mb-3 pb-2 px-2">
            {!isSearching && (
              <>
                <GoChevronLeft
                  className="text-3xl cursor-pointer"
                  onClick={() => navigate(-1)}
                />
                <h1 className="text-xl font-opensans font-semibold">
                  Online Vendors
                </h1>
                <CiSearch
                  className="text-3xl cursor-pointer"
                  onClick={() => setIsSearching(true)}
                />
              </>
            )}

            {/* Search Bar */}
            {isSearching && (
              <div className="flex items-center w-full">
                <GoChevronLeft
                  className="text-3xl cursor-pointer mr-2"
                  onClick={handleRefresh}
                />
                <input
                  type="text"
                  className="flex-1 border text-base font-opensans  border-gray-300 rounded-full px-3 py-2 text-black focus:outline-none"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Search vendors..."
                />
              </div>
            )}
          </div>

          {/* Category Pills (only if NOT searching) */}
          {!isSearching && (
            <div className="flex scrollbar-hide justify-between mb-3 w-full overflow-x-auto space-x-2 px-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => handleCategoryClick(category)}
                  className={`flex-shrink-0 h-12 px-3 py-2 text-xs font-semibold font-opensans text-black border border-gray-200 rounded-full ${
                    selectedCategory === category
                      ? "bg-customOrange text-white"
                      : "bg-transparent"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Vendor List */}
        <div className="vendor-list -mx-2 translate-y-1">
          <hr className="bg-gray-200 pb-0.5 w-full" />

          {status === "loading" ? (
            // 4a) Loading Skeletons
            Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="vendor-item">
                <div className="flex justify-between p-3 mb-1 bg-white">
                  <div>
                    <Skeleton width={150} height={24} />
                    <Skeleton width={100} height={16} />
                    <Skeleton width={120} height={24} />
                  </div>
                  <Skeleton height={96} width={96} />
                </div>
              </div>
            ))
          ) : filteredVendors.length > 0 ? (
            // 4b) Render Filtered Vendors
            filteredVendors.map((vendor) => {
              const ratingCount = vendor.ratingCount || 0;
              const averageRating =
                ratingCount > 0 ? vendor.rating / ratingCount : 0;

              return (
                <div
                  key={vendor.id}
                  className="vendor-item border-b border-gray-100"
                >
                  <div
                    className="flex justify-between p-3 mb-1 bg-white"
                    onClick={() => handleStoreView(vendor)}
                  >
                    <div>
                      <h1 className="font-poppins text-black text-xl mb-1 font-medium">
                        {vendor.shopName.length > 18
                          ? `${vendor.shopName.substring(0, 18)}...`
                          : vendor.shopName}
                      </h1>
                      <p className="font-opensans text-xs text-gray-300 flex items-center -translate-y-1">
                        {vendor.categories.slice(0, 3).map((cat, idx) => (
                          <React.Fragment key={idx}>
                            {idx > 0 && (
                              <GoDotFill className="mx-1 dot-size text-gray-300" />
                            )}
                            {cat}
                          </React.Fragment>
                        ))}
                      </p>
                      <div className="flex -ml-1 items-center text-gray-700 text-xs translate-y-4 mb-0">
                        <IoLocationOutline className="mr-1 text-customOrange" />
                        <span>{vendor.state}</span>
                      </div>
                      <div className="flex items-center translate-y-4">
                        <span className="text-black font-light text-[10px] mr-2">
                          {averageRating.toFixed(1)}
                        </span>
                        <ReactStars
                          count={5}
                          value={averageRating}
                          size={24}
                          activeColor="#ffd700"
                          emptyIcon={<RoundedStar filled={false} />}
                          filledIcon={<RoundedStar filled={true} />}
                          edit={false}
                        />
                        <span className="text-black text-[10px] font-light ml-2">
                          ({ratingCount})
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
                        className="absolute inset-0"
                        style={{
                          background:
                            "linear-gradient(45deg, transparent 20%, rgba(255,255,255,0.3) 50%, transparent 80%)",
                          backgroundSize: "200% 200%",
                          animation: "shimmer 6s infinite ease-in-out",
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            // 4c) No Results
            <div className="text-center my-10 px-6">
              <h2 className="text-2xl font-ubuntu font-medium">
                No results found
              </h2>
              <p className="text-gray-600">
                Please try searching for another item or category.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default OnlineVendors;
