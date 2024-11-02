import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { IoChevronBackOutline, IoChevronForward } from "react-icons/io5";
import Loading from "../components/Loading/Loading";
import productTypes from "../pages/vendor/producttype"; // Adjust path to where producttype.js is located
import { db } from "../firebase.config"; 
import { collection, query, where, getDocs } from "firebase/firestore";

const Explore = () => {
  const loading = useSelector((state) => state.product.loading);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedProductType, setSelectedProductType] = useState(null);
  const [selectedSubType, setSelectedSubType] = useState(null);
  const [products, setProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

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

  // Show loading spinner if any loading state is true
  if (loading || isLoadingProducts) {
    return <Loading />;
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center space-x-2 mb-4">
        {(selectedProductType || selectedSubType) ? (
          <IoChevronBackOutline
            onClick={handleBackClick}
            className="text-lg text-gray-800 cursor-pointer"
          />
        ) : null}
        <h1 className="text-2xl font-bold">
          {selectedSubType ? selectedSubType.name || selectedSubType 
          : selectedProductType ? selectedProductType.type : "Explore Products"}
        </h1>
      </div>

      {selectedSubType ? (
        // Products View
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">
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
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">
            {selectedProductType.type}
          </h2>
          {selectedProductType.subTypes.map((subType) => (
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
          <div className="flex space-x-2 mb-4 overflow-x-auto">
            {/* Horizontal filter options */}
            {["All", "Men", "Women", "Kids"].map((filter) => (
              <button
                key={filter}
                onClick={() => handleCategoryClick(filter)}
                className={`px-4 py-2 rounded-full ${selectedCategory === filter ? "bg-customOrange text-white" : "bg-gray-100 text-gray-800"} font-semibold`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Main Product Types List */}
          <div className="space-y-4">
            {productTypes.map((productType) => (
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

          {/* Discount Cards */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-red-500 text-white p-4 rounded-lg flex flex-col justify-center items-center">
              <p className="text-sm">UP TO</p>
              <p className="text-2xl font-bold">50% OFF</p>
              <p className="text-sm">SUPER DISCOUNT</p>
            </div>
            <div className="bg-green-500 text-white p-4 rounded-lg flex flex-col justify-center items-center">
              <p className="text-sm">DEALS FROM</p>
              <p className="text-2xl font-bold">₦1,000</p>
              <p className="text-sm">5TH - 7TH</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Explore;
