import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { IoChevronBackOutline, IoChevronForward } from "react-icons/io5";
import Loading from "../components/Loading/Loading";
import productTypes from "../pages/vendor/producttype"; // Adjust path to where producttype.js is located

const Explore = () => {
  const loading = useSelector((state) => state.product.loading);
  const [selectedProductType, setSelectedProductType] = useState(null);

  // Toggle to switch between main product types view and subtypes view
  const handleProductTypeClick = (productType) => {
    setSelectedProductType(productType); // Show subtypes for the selected product type
  };

  const handleBackClick = () => {
    setSelectedProductType(null); // Return to main product types list
  };

  // Show loading spinner if the product loading or product types loading is true
  if (loading) {
    return <Loading />;
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center space-x-2 mb-4">
        {selectedProductType ? (
          <IoChevronBackOutline
            onClick={handleBackClick}
            className="text-lg text-gray-800 cursor-pointer"
          />
        ) : null}
        <h1 className="text-2xl font-bold">
          {selectedProductType ? selectedProductType.type : "Explore Products"}
        </h1>
      </div>

      {selectedProductType ? (
        // Subtypes View
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">
            {selectedProductType.type}
          </h2>
          {selectedProductType.subTypes.map((subType) => (
            <div
              key={subType.name || subType}
              className="flex flex-col border-b border-gray-200 py-2"
            >
              {/* Subtype Name */}
              <span className="text-gray-600">
                {typeof subType === "string" ? subType : subType.name}
              </span>
              {/* Sizes if available */}
              {subType.sizes && subType.sizes.length > 0 && (
                <div className="flex flex-wrap mt-1">
                  {subType.sizes.map((size, index) => (
                    <span
                      key={index}
                      className="text-xs font-medium bg-gray-200 px-2 py-1 mr-2 mb-2 rounded"
                    >
                      {size}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        // Main Product Types View
        <>
          <div className="flex space-x-2 mb-4 overflow-x-auto">
            {/* Horizontal filter options (example only) */}
            {["All", "Men", "Women", "Kids", "Accessories"].map((filter) => (
              <button
                key={filter}
                className="px-4 py-2 rounded-full bg-gray-100 text-gray-800 font-semibold"
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
