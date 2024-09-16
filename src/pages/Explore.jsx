import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchProducts } from "../redux/actions/productaction";
import Loading from "../components/Loading/Explorer";
import { addToCart } from "../redux/actions/action";
import { toggleFavorite } from "../redux/actions/favouriteactions";
import {
  FaHeart,
  FaCartPlus,
  FaChevronLeft,
  FaSearch,
} from "react-icons/fa"; // Import required icons
import { useNavigate } from "react-router-dom"; // Import useNavigate from react-router-dom

const Explore = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate(); // Hook to handle navigation
  const products = useSelector((state) => state.product.products);
  const loading = useSelector((state) => state.product.loading);
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  const handleAddToCart = (product) => {
    dispatch(addToCart(product));
    console.log(`Added ${product.name} to cart`);
  };

  const handleToggleFavorite = (productId) => {
    dispatch(toggleFavorite(productId));
    console.log(`Toggled favorite for product ID: ${productId}`);
  };

  const handleProductClick = (productId) => {
    // Navigate to product details page
    navigate(`/product/${productId}`);
  };

  const categories = ["Men", "Women", "Kids"]; // Categories for selection
 

  const filteredProducts =
    selectedCategory === "All"
      ? products
      : products.filter((product) => product.category === selectedCategory);

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="flex flex-col">
      {/* Header with Back Button and Category Name */}
      <div className="relative bg-gray-200 flex items-center justify-between p-4">
        <button
          onClick={() => setSelectedCategory("All")}
          className="text-gray-500"
        >
          <FaChevronLeft />
        </button>
        <h1 className="text-xl font-bold">{selectedCategory}'s Fashion</h1>
        <FaSearch className="text-gray-500" />
      </div>

      {/* Category Buttons */}
      <div className="flex flex-wrap gap-2 mb-6 justify-center mt-6">
        {["All", ...categories].map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1 rounded-full border ${
              selectedCategory === category
                ? "bg-customOrange text-white"
                : "bg-white text-black"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Content Section */}
      <div className="p-4">
        {/* Top Vendors Section */}
        {/* <h2 className="text-lg font-bold mb-2">Top Vendors</h2>
        <div className="flex overflow-x-scroll gap-4 mb-4">
          {dummyVendors.map((vendor) => (
            <div
              key={vendor.id}
              className="min-w-[150px] rounded-lg border p-2 text-center"
            >
              <img
                src={vendor.image}
                alt={vendor.name}
                className="w-full h-20 object-cover rounded-md mb-2"
              />
              <h3 className="text-sm font-medium">{vendor.name}</h3>
              <p className="text-xs text-gray-500">{vendor.rating}</p>
              <button className="bg-blue-500 text-white text-xs px-3 py-1 rounded-full mt-2">
                + Follow
              </button>
            </div>
          ))}
        </div> */}

        {/* For You Section */}
        <h2 className="text-lg font-bold mb-2">For You</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-lg shadow-md p-2 relative cursor-pointer"
              onClick={() => handleProductClick(product.id)} // Make the product clickable
            >
              <img
                src={product.coverImageUrl}
                alt={product.name}
                className="w-full h-40 object-cover rounded-md"
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
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToCart(product);
                  }}
                  className="bg-white p-1 rounded-full shadow"
                >
                  <FaCartPlus className="text-customOrange" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Explore;