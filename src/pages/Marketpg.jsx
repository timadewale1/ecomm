import React, { useState, useEffect, useContext } from "react";
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
import { VendorContext } from "../components/Context/Vendorcontext";
import { MdCancel } from "react-icons/md";

const Marketpg = () => {
  const { vendors, setVendors } = useContext(VendorContext); // Use the context
  const [onlineVendors, setOnlineVendors] = useState([]);
  const [localVendors, setLocalVendors] = useState([]);
  const [selectedTab, setSelectedTab] = useState("online"); // Toggle between 'local' and 'online'
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredVendors, setFilteredVendors] = useState([]); // Add this to store the filtered vendors
  const [loading, setLoading] = useState(!vendors.isFetched); // Use the 'isFetched' flag to check if loading is needed
  const [isSearching, setIsSearching] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const localVendorQuery = query(
          collection(db, "vendors"),
          where("marketPlaceType", "==", "marketplace"),
          where("isDeactivated", "==", false),
          where("isApproved", "==", true)
        );
        const localVendorSnapshot = await getDocs(localVendorQuery);
        const localVendorsList = localVendorSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const onlineVendorQuery = query(
          collection(db, "vendors"),
          where("marketPlaceType", "==", "virtual"),
          where("isDeactivated", "==", false),
          where("isApproved", "==", true)
        );
        const onlineVendorSnapshot = await getDocs(onlineVendorQuery);
        const onlineVendorsList = onlineVendorSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setVendors({
          online: onlineVendorsList,
          local: localVendorsList,
          isFetched: true,
        });

        // Add console.log here to check if rating and ratingCount exist
        console.log("Local Vendors:", localVendorsList);
        console.log("Online Vendors:", onlineVendorsList);
      } catch (error) {
        toast.error("Error fetching vendors: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    if (!vendors.isFetched) {
      fetchVendors();
    } else {
      setFilteredVendors(vendors.online);
      setLoading(false);
    }
  }, [setVendors, vendors.isFetched]);

  const handleTabChange = (tab) => {
    setSelectedTab(tab);
    setFilteredVendors(tab === "local" ? vendors.local : vendors.online); // Change filtered vendors based on tab
  };

  const handleSearchChange = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    if (term.length > 0) {
      const filtered = (
        selectedTab === "local" ? vendors.local : vendors.online
      ).filter((vendor) => vendor.shopName.toLowerCase().includes(term));
      setFilteredVendors(filtered);
    } else {
      setFilteredVendors(
        selectedTab === "local" ? vendors.local : vendors.online
      ); // Reset to original list
    }
  };

  const handleStoreView = (vendor) => {
    if (selectedTab === "local") {
      navigate(`/marketstorepage/${vendor.id}`);
    } else {
      navigate(`/store/${vendor.id}`);
    }
  };
  const handleClearSearch = () => {
    setSearchTerm("");
    setFilteredVendors(
      selectedTab === "local" ? vendors.local : vendors.online
    );
  };

  const defaultImageUrl =
    "https://images.saatchiart.com/saatchi/1750204/art/9767271/8830343-WUMLQQKS-7.jpg";

  return (
    <div className="mb-1 ">
      <div className="sticky py-3 px-2 w-full top-0  bg-white z-10">
        <div className="flex flex-col   mb-3 pb-2 px-2.5">
          {!isSearching && (
            <>
            <div className="flex justify-between mb-4">

              <h1 className="text-xl font-opensans font-semibold">Stores</h1>
              <CiSearch
                className="text-3xl cursor-pointer"
                onClick={() => setIsSearching(true)}
              />
            </div>
            </>
          )}
          {isSearching && (
            <div className="flex items-center w-full mb-4 relative">
              <GoChevronLeft
                className="text-3xl cursor-pointer mr-2"
                onClick={() => {
                  setIsSearching(false);
                  handleClearSearch(); // Clear input when exiting search
                }}
              />
              <input
                type="text"
                className="flex-1 border font-opensans text-black text-sm border-gray-300 rounded-full px-3 py-2 font-medium focus:outline-none"
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
      <div className="flex  justify-between mb-1 w-full px-2 overflow-x-auto space-x-2 scrollbar-hide ">
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
        <div className="border-t border-gray-300 mt-6"></div>
      </div>
      <div className="vendor-list px-2 pb-24  translate-y-1">
        {loading ? (
          // Show skeleton loader when loading
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
          // Show vendors once they are fetched and filtered
          filteredVendors.map((vendor) => (
            <div key={vendor.id} className="vendor-item">
              <div
                className="flex justify-between p-3 mb-1 bg-white "
                onClick={() => handleStoreView(vendor)}
              >
                <div>
                  <h1 className="font-poppins text-black text-2xl font-medium">
                    {vendor.shopName.length > 16
                      ? `${vendor.shopName.substring(0, 16)}...`
                      : vendor.shopName}
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
            <h2 className="text-2xl font-opensans font-medium">
              ☹️No results found
            </h2>
            <p className="text-gray-600 text-sm font-opensans">
              Please try searching for another vendor.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Marketpg;
