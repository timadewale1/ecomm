import React, { useState } from "react";
import Downshift from "downshift";
import { useNavigate } from "react-router-dom";

const SearchDropdown = ({ products, vendors }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const handleChange = (selectedItem) => {
    if (selectedItem) {
      if (selectedItem.type === "product") {
        navigate(`/product/${selectedItem.id}`);
      } else if (selectedItem.type === "vendor") {
        navigate(`/store/${selectedItem.id}`);
      }
    }
  };

  const getFilteredItems = () => {
    const filteredProducts = products
      .filter((product) =>
        product?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .map((product) => ({
        ...product,
        type: "product", // Mark as product for navigation
      }));
  
    const filteredVendors = vendors
      .filter((vendor) =>
        vendor?.shopName?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .map((vendor) => ({
        ...vendor,
        type: "vendor", // Mark as vendor for navigation
      }));
  
    return [...filteredProducts, ...filteredVendors];
  };
  

  return (
    <Downshift
      onChange={handleChange}
      itemToString={(item) => (item ? item.name || item.shopName : "")}
    >
      {({
        getInputProps,
        getItemProps,
        getMenuProps,
        isOpen,
        highlightedIndex,
        selectedItem,
      }) => (
        <div className="relative w-full">
          <input
            {...getInputProps({
              placeholder: "Search for products or vendors...",
              onChange: (e) => setSearchTerm(e.target.value),
            })}
            className="w-full rounded-full bg-gray-200 p-3"
          />
          <ul
            {...getMenuProps()}
            className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1"
          >
            {isOpen &&
              getFilteredItems().map((item, index) => (
                <li
                  {...getItemProps({
                    key: item.id,
                    index,
                    item,
                    style: {
                      backgroundColor:
                        highlightedIndex === index ? "#bde4ff" : "white",
                      fontWeight:
                        selectedItem === item ? "bold" : "normal",
                      padding: "10px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                    },
                  })}
                >
                  <img
                    src={item.coverImageUrl} // Corrected field usage
                    alt={item.name || item.shopName}
                    style={{
                      width: "40px",
                      height: "40px",
                      objectFit: "cover",
                      borderRadius: "5px",
                      marginRight: "10px",
                    }}
                  />
                  {item.name || item.shopName} {/* Show product name or vendor name */}
                </li>
              ))}
          </ul>
        </div>
      )}
    </Downshift>
  );
};

export default SearchDropdown;
