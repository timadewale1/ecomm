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
import ProductCard from "../components/Products/ProductCard";

const OnlineVendors = () => {
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState({
    vendorResults: [],
    productResults: [],
  });
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

  useEffect(() => {
    const fetchVendorsAndProducts = async () => {
      try {
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
      } catch (error) {
        toast.error("Error fetching vendors and products: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVendorsAndProducts();
  }, []);

  const handleSearchChange = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);

    const vendorResults = vendors.filter((vendor) => {
      const matchesSearchTerm = vendor.shopName.toLowerCase().includes(term);
      const matchesCategory =
        !selectedCategory || vendor.categories.includes(selectedCategory);
      return matchesSearchTerm && matchesCategory;
    });
    setSearchResults(vendorResults);
  };

  const handleCategoryClick = (category) => {
    const updatedCategory = selectedCategory === category ? "" : category;
    setSelectedCategory(updatedCategory);

    const vendorResults = vendors.filter((vendor) => {
      const matchesSearchTerm = vendor.shopName
        .toLowerCase()
        .includes(searchTerm);
      const matchesCategory =
        !updatedCategory || vendor.categories.includes(updatedCategory);
      return matchesSearchTerm && matchesCategory;
    });
    setSearchResults(vendorResults);
  };

  const handleRefresh = () => {
    setSearchTerm("");
    setSelectedCategory("");
    setIsSearching(false);
    setSearchResults({ vendorResults: [], productResults: [] });
  };

  const handleStoreView = (vendor) => {
    navigate(`/store/${vendor.id}`);
  };

  const defaultImageUrl =
    "https://images.saatchiart.com/saatchi/1750204/art/9767271/8830343-WUMLQQKS-7.jpg";

  return (
    <div className="mb-1 p-2">
      <div className="sticky py-3 w-[calc(100%+1rem)] -ml-2 top-0 bg-white z-10">
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
        ) : searchTerm.length < 2 && selectedCategory.length === 0 ? (
          vendors.map((vendor) => (
            <div key={vendor.id} className="vendor-item">
              <div
                className="flex justify-between p-3 mb-1 bg-white"
                onClick={() => handleStoreView(vendor)}
              >
                <div>
                  <h1 className="font-poppins text-black text-2xl font-medium">
                    {vendor.shopName.length > 16
                      ? `${vendor.shopName.substring(0, 16)}...`
                      : vendor.shopName}
                  </h1>
                  <p className="font-sans text-gray-300 categories-text flex items-center -translate-y-1">
                    {vendor.categories.slice(0, 3).map((category, index) => (
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
                    <span className="text-black font-light ratings-text ml-2">
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
          ))
        ) : (
          <div className="text-center my-10">
            <h2 className="text-2xl font-ubuntu font-medium">
              No results found
            </h2>
            <p className="text-gray-600">
              Please try searching for another item or category.
            </p>
          </div>
        )}
        <hr className="bg-gray-100 pb-0.5 w-full" />
      </div>
    </div>
  );
};

export default OnlineVendors;
