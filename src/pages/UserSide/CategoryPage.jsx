import React, { useState, useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchProducts } from "../../redux/actions/productaction.js"; 
import { toggleFavorite } from "../../redux/actions/favouriteactions";
import { FaHeart, FaChevronLeft, FaSearch } from "react-icons/fa";
import { useParams, useNavigate } from "react-router-dom";
import useVendorsFetch from "../../components/VendorsData/UseVendorFetch.js"; // Import the hook to fetch vendors

const CategoryPage = () => {
  const { category } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const products = useSelector((state) => state.product.products);

  const [selectedCategory] = useState(category);
  const [productError, setProductError] = useState(null);  // Product error handling
  const [vendorError, setVendorError] = useState(null);  // Vendor error handling
  const [followedVendors, setFollowedVendors] = useState({});  // Track followed vendors

  const { vendors, vendorsLoading, error: vendorFetchError } = useVendorsFetch(); // Fetch vendors using the hook

  useEffect(() => {
    const fetchProductsData = async () => {
      try {
        await dispatch(fetchProducts());
      } catch (error) {
        setProductError("Failed to fetch products. Please try again later.");
      }
    };

    fetchProductsData();
  }, [dispatch]);

  useEffect(() => {
    if (vendorFetchError) {
      setVendorError("Failed to load vendors. Please try again.");
    }
  }, [vendorFetchError]);

  const handleToggleFavorite = (productId) => {
    dispatch(toggleFavorite(productId));
    console.log(`Toggled favorite for product ID: ${productId}`);
  };

  const handleProductClick = (productId) => {
    navigate(`/product/${productId}`);
  };

  const handleFollowToggle = (vendorId) => {
    setFollowedVendors((prevFollowed) => ({
      ...prevFollowed,
      [vendorId]: !prevFollowed[vendorId],
    }));
  };

  // Memoizing the filtered products to prevent unnecessary recalculation
  const filteredProducts = useMemo(() => {
    return selectedCategory === "All"
      ? products
      : products.filter((product) => product.category === selectedCategory);
  }, [selectedCategory, products]);

  return (
    <div className="flex flex-col">
      {/* Header with Back Button and Category Name */}
      <div className="relative bg-gray-200 flex items-center justify-between p-4">
        <button onClick={() => navigate(-1)} className="text-gray-500">
          <FaChevronLeft />
        </button>
        <h1 className="text-xl font-bold">{selectedCategory}'s Fashion</h1>
        <FaSearch className="text-gray-500" />
      </div>

      {/* Vendors Section */}
      <div className="p-4">
        <h2 className="text-lg font-bold mb-2">Top Vendors</h2>
        {vendorError ? (
          <p className="text-red-500">{vendorError}</p> // Display error message
        ) : vendorsLoading ? (
          <p>Loading vendors...</p>
        ) : vendors.length > 0 ? (
          <div className="flex overflow-x-scroll gap-4 mb-4">
            {vendors
              .sort((a, b) => b.rating - a.rating) // Sort vendors by rating
              .slice(0, 5) // Only display the top 5 vendors
              .map((vendor) => (
                <div
                  key={vendor.id}
                  className="min-w-[150px] rounded-lg  p-0 text-center"
                >
                  <img
                    src={vendor.image}
                    alt={vendor.name}
                    className="w-full h-20 object-cover rounded-md mb-2"
                  />
                  <h3 className="text-sm font-medium">{vendor.name}</h3>
                  <p className="text-xs text-gray-500 flex justify-evenly">
                    ⭐ {vendor.rating} ({vendor.reviewsCount} reviews)

                    <button
                    onClick={() => handleFollowToggle(vendor.id)}
                    className={`${
                      followedVendors[vendor.id] ? "bg-green-500" : "bg-transparent"
                    } text-black text-xs px-3 py-1 rounded-full mt-2`}
                  >
                    {followedVendors[vendor.id] ? "Following" : "+ Follow"}
                  </button>
                  </p>
                  
                </div>
              ))}
          </div>
        ) : (
          <p>No vendors available at the moment.</p>
        )}
      </div>

      {/* Products Section */}
      <div className="p-4">
        <h2 className="text-lg font-bold mb-2">For You</h2>
        {productError ? (
          <p className="text-red-500">{productError}</p> // Display error message for products
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-lg shadow-md p-2 relative cursor-pointer"
                onClick={() => handleProductClick(product.id)}
              >
                <img
                  src={product.coverImageUrl}
                  alt={product.name}
                  className="w-full h-40 object-cover rounded-md"
                  loading="lazy" // Lazy loading for images
                />
                <div className="flex justify-between items-center mt-2">
                  <h3 className="text-sm font-semibold">{product.name}</h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(product.id);
                    }}
                    className="bg-white p-1 rounded-full shadow"
                  >
                    <FaHeart className="text-red-500" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">{product.description}</p>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-black font-bold">₦{product.price}</p>
                  
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryPage;
