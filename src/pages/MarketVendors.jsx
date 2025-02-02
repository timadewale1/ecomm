import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GoDotFill, GoChevronLeft } from "react-icons/go";
import { CiSearch } from "react-icons/ci";
import ReactStars from "react-rating-stars-component";
import RoundedStar from "../components/Roundedstar";
import { db } from "../firebase.config";
import { collection, query, where, getDocs } from "firebase/firestore";
import { toast } from "react-toastify";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import SEO from "../components/Helmet/SEO";

const MarketVendors = () => {
  const [vendors, setVendors] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedMarketplace, setSelectedMarketplace] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState([]);
  const navigate = useNavigate();

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

  const marketplaces = ["Yaba", "Balogun"];

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const vendorQuery = query(
          collection(db, "vendors"),
          where("marketPlaceType", "==", "marketplace"),
          where("isDeactivated", "==", false),
          where("isApproved", "==", true)
        );
        const vendorSnapshot = await getDocs(vendorQuery);
        const vendorsList = vendorSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setVendors(vendorsList);
        setSearchResults(vendorsList);
      } catch (error) {
        toast.error("Error fetching vendors: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, []);

  const handleSearchChange = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);

    if (
      term.length < 2 &&
      selectedCategories.length === 0 &&
      !selectedMarketplace
    ) {
      setSearchResults(vendors);
    } else {
      const vendorResults = vendors.filter((vendor) => {
        const matchesSearchTerm = vendor.shopName.toLowerCase().includes(term);
        const matchesCategories =
          selectedCategories.length === 0 ||
          selectedCategories.some((category) =>
            vendor.categories.includes(category)
          );
        const matchesMarketplace =
          !selectedMarketplace ||
          vendor.marketPlace.toLowerCase() ===
            selectedMarketplace.toLowerCase();
        return matchesSearchTerm && matchesCategories && matchesMarketplace;
      });
      setSearchResults(vendorResults);
    }
  };

  const handleCategoryClick = (category) => {
    const updatedCategories = selectedCategories.includes(category)
      ? selectedCategories.filter((cat) => cat !== category)
      : [...selectedCategories, category];

    setSelectedCategories(updatedCategories);

    const vendorResults = vendors.filter((vendor) => {
      const matchesSearchTerm = vendor.shopName
        .toLowerCase()
        .includes(searchTerm);
      const matchesCategories =
        updatedCategories.length === 0 ||
        updatedCategories.some((cat) => vendor.categories.includes(cat));
      const matchesMarketplace =
        !selectedMarketplace ||
        vendor.marketPlace.toLowerCase() === selectedMarketplace.toLowerCase();
      return matchesSearchTerm && matchesCategories && matchesMarketplace;
    });
    setSearchResults(vendorResults);
  };

  const handleMarketplaceClick = (marketplace) => {
    const updatedMarketplace =
      selectedMarketplace === marketplace ? "" : marketplace;
    setSelectedMarketplace(updatedMarketplace);

    const vendorResults = vendors.filter((vendor) => {
      const matchesSearchTerm = vendor.shopName
        .toLowerCase()
        .includes(searchTerm);
      const matchesCategories =
        selectedCategories.length === 0 ||
        selectedCategories.some((cat) => vendor.categories.includes(cat));
      const matchesMarketplace =
        !updatedMarketplace ||
        vendor.marketPlace.toLowerCase() === updatedMarketplace.toLowerCase();
      return matchesSearchTerm && matchesCategories && matchesMarketplace;
    });
    setSearchResults(vendorResults);
  };

  const handleRefresh = () => {
    setSearchTerm("");
    setSelectedCategories([]);
    setSelectedMarketplace("");
    setIsSearching(false);
    setSearchResults(vendors);
  };

  const handleStoreView = (vendor) => {
    navigate(`/marketstorepage/${vendor.id}`);
  };

  const defaultImageUrl =
    "https://images.saatchiart.com/saatchi/1750204/art/9767271/8830343-WUMLQQKS-7.jpg";

  return (
    <div className="mb-1 p-2">
      <SEO 
        title={`Market Vendor - My Thrift`} 
        description={'Marketplace vendors on My Thrift'}
        url={`https://www.shopmythrift.store/market-vendors`} 
      />
      <div className="sticky py-3 w-[calc(100%+1rem)] -ml-2 top-0 bg-white z-10">
        <div className="flex items-center justify-between mb-3 pb-2 px-2">
          {!isSearching ? (
            <>
              <GoChevronLeft
                className="text-3xl cursor-pointer"
                onClick={() => navigate(-1)}
              />
              <h1 className="text-xl font-opensans font-semibold">
                Market Vendors
              </h1>
              <CiSearch
                className="text-3xl cursor-pointer"
                onClick={() => setIsSearching(true)}
              />
            </>
          ) : (
            <div className="flex items-center w-full">
              <GoChevronLeft
                className="text-3xl cursor-pointer mr-2"
                onClick={handleRefresh}
              />
              <input
                type="text"
                className="flex-1 border border-gray-300 rounded-full px-3 py-2 text-black focus:outline-none"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search vendors or products..."
              />
            </div>
          )}
        </div>

        {!isSearching && (
          <div className="flex justify-between mb-3 w-full overflow-x-auto space-x-2 px-2">
            {marketplaces.map((marketplace) => (
              <button
                key={marketplace}
                onClick={() => handleMarketplaceClick(marketplace)}
                className={`flex-shrink-0 h-12 px-3 py-2 text-xs font-bold font-opensans text-black border border-gray-400 rounded-full ${
                  selectedMarketplace === marketplace
                    ? "bg-customOrange text-white"
                    : "bg-transparent"
                }`}
              >
                {marketplace}
              </button>
            ))}
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryClick(category)}
                className={`flex-shrink-0 h-12 px-3 py-2 text-xs font-bold font-opensans text-black border border-gray-400 rounded-full ${
                  selectedCategories.includes(category)
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

      <div className="vendor-list -mx-2 translate-y-1">
        <hr className="bg-gray-200 pb-0.5 w-full" />
        {loading ? (
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
        ) : searchResults.length > 0 ? (
          searchResults.map((vendor) => {
            const averageRating = Math.min(
              vendor.ratingCount > 0 ? vendor.rating / vendor.ratingCount : 0,
              5.0
            );

            return (
              <div key={vendor.id} className="vendor-item">
                <div
                  className="flex justify-between p-3 mb-1 bg-white"
                  onClick={() => handleStoreView(vendor)}
                >
                  <div>
                    <h1 className="font-poppins text-black text-2xl font-medium">
                      {vendor.shopName}
                    </h1>
                    <p className="font-opensans text-gray-300 text-xs flex items-center -translate-y-1">
                      {vendor.categories.slice(0, 4).map((category, index) => (
                        <React.Fragment key={index}>
                          {index > 0 && (
                            <GoDotFill className="mx-1 dot-size text-gray-300" />
                          )}
                          {category}
                        </React.Fragment>
                      ))}
                    </p>
                    <p className="font-opensans   text-customOrange font-medium text-xs mt-1">
                      {vendor.marketPlace.toUpperCase()}
                    </p>
                    <div className="flex items-center text-xs translate-y-1">
                      <span className="text-black font-light text-xs mr-2">
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
                      <span className="text-black ratings-text font-light ml-2">
                        ({vendor.ratingCount || 0})
                      </span>
                    </div>
                  </div>
                  <img
                    className="object-cover h-24 w-24 rounded-lg"
                    src={vendor.coverImageUrl || defaultImageUrl}
                    alt={vendor.shopName}
                  />
                </div>
              </div>
            );
          })
        ) : (
          // <div className="text-center my-10">
          //   <h2 className="text-2xl font-ubuntu font-medium">
          //     No results found
          //   </h2>
          //   <p className="text-gray-600">
          //     Please try searching for another item or category.
          //   </p>
          // </div>
          <div className="text-center my-10 px-6">
            <h2 className="text-3xl font-opensans mb-2 font-medium bg-gradient-to-r from-green-400 via-yellow-400 to-orange-400 bg-clip-text text-transparent">
              Coming Soon: Market Place Vendors!
            </h2>

            <p className="text-gray-600 text-sm font-opensans">
              We're just getting started! Vendors from your local markets will
              be here soon, starting with Yaba. Stay tuned for something
              amazing! 🧡
            </p>
          </div>
        )}
        {/* <hr className="bg-gray-100 pb-0.5 w-full" /> */}
      </div>
    </div>
  );
};

export default MarketVendors;
