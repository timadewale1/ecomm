import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase.config";
import { toast } from "react-toastify";
import { GoDotFill, GoChevronLeft } from "react-icons/go";
import { BsHeart } from "react-icons/bs";
import { CiSearch } from "react-icons/ci";
import Skeleton from "react-loading-skeleton";
import ReactStars from "react-rating-stars-component";
import RoundedStar from "../components/Roundedstar";

const Marketpg = () => {
  const [vendors, setVendors] = useState([]);
  const [onlineVendors, setOnlineVendors] = useState([]);
  const [localVendors, setLocalVendors] = useState([]);
  const [selectedTab, setSelectedTab] = useState("online"); // Toggle between 'local' and 'online'
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Categories to filter
  const categories = [
    "Thrifts",
    "Bags",
    "Mens",
    "Womens",
    "Jewelry",
    "Kids",
    "Shoes",
    "Accessories",
    "Sportswear",
  ];

  useEffect(() => {
    // Fetch both local and online vendors
    const fetchVendors = async () => {
      setLoading(true);
      try {
        // Fetch local vendors
        const localVendorQuery = query(
          collection(db, "vendors"),
          where("marketPlaceType", "==", "marketplace")
        );
        const localVendorSnapshot = await getDocs(localVendorQuery);
        const localVendorsList = localVendorSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Fetch online vendors
        const onlineVendorQuery = query(
          collection(db, "vendors"),
          where("marketPlaceType", "==", "virtual")
        );
        const onlineVendorSnapshot = await getDocs(onlineVendorQuery);
        const onlineVendorsList = onlineVendorSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Set both local and online vendors
        setLocalVendors(localVendorsList);
        setOnlineVendors(onlineVendorsList);
        setVendors(onlineVendorsList); // Default to online vendors
      } catch (error) {
        toast.error("Error fetching vendors: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, []);

  const handleTabChange = (tab) => {
    setSelectedTab(tab);
    setVendors(tab === "local" ? localVendors : onlineVendors);
  };

  const handleSearchChange = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    if (term.length > 0) {
      const filteredVendors = vendors.filter((vendor) =>
        vendor.shopName.toLowerCase().includes(term)
      );
      setVendors(filteredVendors);
    } else {
      setVendors(selectedTab === "local" ? localVendors : onlineVendors); // Reset to original list
    }
  };

  const handleStoreView = (vendor) => {
    if (selectedTab === "local") {
      navigate(`/marketstorepage/${vendor.id}`);
    } else {
      navigate(`/store/${vendor.id}`);
    }
  };

  const defaultImageUrl =
    "https://images.saatchiart.com/saatchi/1750204/art/9767271/8830343-WUMLQQKS-7.jpg";

  return (
    <div className="mb-1 p-2">
      <div className="sticky py-3 w-[calc(100%+1rem)] -ml-2 top-0 shadow-md bg-white z-10">
        <div className="flex items-center justify-between mb-3 pb-2 px-2.5">
          {!isSearching && (
            <>
              <BsHeart
                className="text-2xl cursor-pointer"
                onClick={() => navigate("/favorites")}
              />
              <h1 className="text-xl font-opensans font-semibold">MARKET</h1>
              <CiSearch
                className="text-3xl cursor-pointer"
                onClick={() => setIsSearching(true)}
              />
            </>
          )}
          {isSearching && (
            <div className="flex items-center w-full">
              <GoChevronLeft
                className="text-3xl cursor-pointer mr-2"
                onClick={() => setIsSearching(false)}
              />
              <input
                type="text"
                className="flex-1 border border-gray-300 rounded-full px-3 py-2 text-black focus:outline-none"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search vendors..."
              />
            </div>
          )}
        </div>

        {/* Tab Buttons for Local and Online Vendors */}
        <div className="flex justify-between mb-3 w-full overflow-x-auto space-x-2 scrollbar-hide px-3">
          <button
            onClick={() => handleTabChange("online")}
            className={`flex-1 h-12 text-center text-sm font-medium font-opensans  rounded-full ${
              selectedTab === "online"
                ? "bg-customOrange text-white"
                : "bg-transparent border-gray-200 font-medium  border-2 text-black"
            }`}
          >
            Online Vendors
          </button>
          <button
            onClick={() => handleTabChange("local")}
            className={`flex-1 h-12 text-center text-sm font-opensans font-medium  rounded-full ${
              selectedTab === "local"
                ? "bg-customOrange text-white"
                : "bg-transparent border-gray-200 font-medium border-2 text-black"
            }`}
          >
            Local Vendors
          </button>
        </div>
      </div>

      <div className="vendor-list -mx-2 translate-y-1">
        {loading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="vendor-item">
              <div className="flex justify-between p-3 mb-1 bg-white shadow">
                <div>
                
                  <Skeleton width={150} height={24} />

                  {/* Categories Skeleton */}
                  <div className="flex items-center mt-1">
                    <Skeleton width={100} height={16} />
                  </div>

                  {/* Ratings Skeleton */}
                  <div className="flex items-center mt-4">
                    {/* Rating Number */}
                    <Skeleton width={30} height={16} className="mr-2" />
                    {/* Stars */}
                    <Skeleton width={120} height={24} />
                    {/* Rating Count */}
                    <Skeleton width={50} height={16} className="ml-2" />
                  </div>
                </div>

                {/* Vendor Image Skeleton */}
                <div>
                  <Skeleton height={96} width={96} />
                </div>
              </div>
            </div>
          ))
        ) : vendors.length > 0 ? (
          vendors.map((vendor) => (
            <div key={vendor.id} className="vendor-item ">
              <div
                className="flex justify-between p-3 mb-1 bg-white shadow"
                onClick={() => handleStoreView(vendor)}
              >
                <div>
                  <h1 className="font-poppins text-black text-2xl font-medium">
                    {vendor.shopName}
                  </h1>
                  <p className="font-sans text-gray-300 text-xs flex items-center -translate-y-1">
                    {vendor.categories.slice(0, 4).map((category, index) => (
                      <React.Fragment key={index}>
                        {index > 0 && (
                          <GoDotFill className="mx-1 dot-size text-gray-300" />
                        )}
                        {category}
                      </React.Fragment>
                    ))}
                  </p>
                  <div className="flex items-center translate-y-4">
                    <span className="text-black font-light text-xs mr-2">
                      {(vendor.rating / vendor.ratingCount || 0).toFixed(1)}
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
                <div>
                  <img
                    className="object-cover h-24 w-24 rounded-lg"
                    src={vendor.coverImageUrl || defaultImageUrl}
                    alt={vendor.shopName}
                  />
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center my-10">
            <h2 className="text-2xl font-ubuntu font-medium">
              No results found
            </h2>
            <p className="text-gray-600">
              Please try searching for another vendor.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Marketpg;
