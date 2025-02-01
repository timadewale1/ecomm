import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GoDotFill, GoChevronLeft } from "react-icons/go";
import { CiSearch } from "react-icons/ci";
import { db } from "../firebase.config";
import { collection, query, where, getDocs } from "firebase/firestore";
import { toast } from "react-toastify";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import ReactStars from "react-rating-stars-component";
import RoundedStar from "../components/Roundedstar";
import SEO from "../components/Helmet/SEO";
// import ProductCard from "../components/Products/ProductCard"; // if needed

const OnlineVendors = () => {
  const navigate = useNavigate();

  // All vendors and all products from Firestore
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);

  // Search/filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // Filtered results (vendors only, for display)
  const [searchResults, setSearchResults] = useState([]);

  // UI states
  const [loading, setLoading] = useState(true);
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

  // -----------------------------
  // 1. Fetch Vendors & Products
  // -----------------------------
  useEffect(() => {
    const fetchVendorsAndProducts = async () => {
      try {
        // 1) Get all "online" vendors
        const vendorQuery = query(
          collection(db, "vendors"),
          where("marketPlaceType", "==", "virtual"),
          where("isDeactivated", "==", false),
          where("isApproved", "==", true)
        );
        const vendorSnapshot = await getDocs(vendorQuery);
        const vendorsList = vendorSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setVendors(vendorsList);

        // 2) Get all products from those vendors (if you need them)
        const productsList = [];
        for (const vendor of vendorsList) {
          const productsRef = collection(db, `vendors/${vendor.id}/products`);
          const productsSnapshot = await getDocs(productsRef);
          productsSnapshot.forEach((productDoc) => {
            productsList.push({
              id: productDoc.id,
              vendorId: vendor.id,
              ...productDoc.data(),
            });
          });
        }
        setProducts(productsList);

        // Initially, show all vendors in searchResults
        setSearchResults(vendorsList);
      } catch (error) {
        toast.error("Error fetching vendors and products: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVendorsAndProducts();
  }, []);

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
    const newTerm = e.target.value;
    setSearchTerm(newTerm);

    // Filter based on newTerm + selectedCategory
    const filtered = filterVendors(newTerm, selectedCategory);
    setSearchResults(filtered);
  };

  const handleCategoryClick = (category) => {
    // Toggle the category
    const newCategory = selectedCategory === category ? "" : category;
    setSelectedCategory(newCategory);

    // Re-filter with current searchTerm + newCategory
    const filtered = filterVendors(searchTerm, newCategory);
    setSearchResults(filtered);
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
                className="flex-1 border border-gray-300 rounded-full px-3 py-2 text-black focus:outline-none"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search vendors..."
              />
            </div>
          )}
        </div>

        {/* Category Pills (only if NOT searching) */}
        {!isSearching && (
          <div className="flex justify-between mb-3 w-full overflow-x-auto space-x-2 px-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryClick(category)}
                className={`flex-shrink-0 h-12 px-3 py-2 text-xs font-bold font-opensans text-black border border-gray-400 rounded-full ${
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

        {/* 4a) Loading Skeletons */}
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
        ) : // 4b) Render Filtered Vendors
        searchResults.length > 0 ? (
          searchResults.map((vendor) => {
            // For rating
            const ratingCount = vendor.ratingCount || 0;
            const averageRating =
              ratingCount > 0 ? vendor.rating / ratingCount : 0;

            return (
              <div key={vendor.id} className="vendor-item">
                <div
                  className="flex justify-between p-3 mb-1 bg-white"
                  onClick={() => handleStoreView(vendor)}
                >
                  <div>
                    <h1 className="font-poppins text-black text-xl font-medium">
                      {vendor.shopName.length > 18
                        ? `${vendor.shopName.substring(0, 18)}...`
                        : vendor.shopName}
                    </h1>
                    <p className="font-sans text-gray-300 categories-text flex items-center -translate-y-1">
                      {vendor.categories.slice(0, 3).map((cat, idx) => (
                        <React.Fragment key={idx}>
                          {idx > 0 && (
                            <GoDotFill className="mx-1 dot-size text-gray-300" />
                          )}
                          {cat}
                        </React.Fragment>
                      ))}
                    </p>
                    <div className="flex items-center translate-y-4">
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
                      <span className="text-black font-light ratings-text ml-2">
                        ({ratingCount})
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
