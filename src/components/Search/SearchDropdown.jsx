import React, { useState, useEffect } from "react";
import Downshift from "downshift";
import { useNavigate } from "react-router-dom";
import { IoChevronBackOutline } from "react-icons/io5";
import { FaTimes } from "react-icons/fa";
import { CiSearch } from "react-icons/ci";
import { MdMyLocation } from "react-icons/md";
import { GoDotFill } from "react-icons/go";
import { PiGenderMaleBold, PiGenderFemaleBold } from "react-icons/pi";
import { FaGenderless, FaChildren } from "react-icons/fa6";
import { AiFillProduct } from "react-icons/ai";

const SearchDropdown = ({ products, vendors }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchHistory, setSearchHistory] = useState([]);
  const navigate = useNavigate();

  const defaultImageUrl =
    "https://images.saatchiart.com/saatchi/1750204/art/9767271/8830343-WUMLQQKS-7.jpg";

  useEffect(() => {
    // Load search history from localStorage
    const history = JSON.parse(localStorage.getItem("searchHistory")) || [];
    setSearchHistory(history);
  }, []);

  const handleChange = (selectedItem) => {
    if (selectedItem) {
      // Store in history
      const updatedHistory = [
        selectedItem,
        ...searchHistory.filter((item) => item.id !== selectedItem.id),
      ].slice(0, 8);

      setSearchHistory(updatedHistory);
      localStorage.setItem("searchHistory", JSON.stringify(updatedHistory));

      // Conditionally navigate based on vendor type
      if (selectedItem.type === "product") {
        navigate(`/product/${selectedItem.id}`);
      } else if (selectedItem.type === "vendor") {
        if (selectedItem.marketPlaceType === "Online") {
          navigate(`/store/${selectedItem.id}`);
        } else {
          navigate(`/marketstorepage/${selectedItem.id}`);
        }
      }
    }
  };

  const getFilteredItems = () => {
    const capitalizeText = (text) =>
      text.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());

    const filteredProducts = products
      .filter((product) =>
        product?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .map((product) => ({
        ...product,
        name: capitalizeText(product.name),
        type: "product",
      }));

    const filteredVendors = vendors
      .filter((vendor) =>
        vendor?.shopName?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .map((vendor) => ({
        ...vendor,
        shopName: capitalizeText(vendor.shopName),
        type: "vendor",
      }));

    return [...filteredProducts, ...filteredVendors];
  };

  const getCategoryIcon = (category) => {
    switch (category?.toLowerCase()) {
      case "men":
        return <PiGenderMaleBold className="mr-1" />;
      case "women":
        return <PiGenderFemaleBold className="mr-1" />;
      case "kids":
        return <FaChildren className="mr-1" />;
      case "all":
        return <FaGenderless className="mr-1" />;
      default:
        return null;
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  const removeHistoryItem = (itemId) => {
    const updatedHistory = searchHistory.filter((item) => item.id !== itemId);
    setSearchHistory(updatedHistory);
    localStorage.setItem("searchHistory", JSON.stringify(updatedHistory));
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
        openMenu,
        closeMenu,
      }) => (
        <div className="relative w-full">
          <div className="flex items-center">
            {isOpen && (
              <IoChevronBackOutline
                className="text-2xl text-gray-500 cursor-pointer mr-2"
                onClick={() => {
                  clearSearch();
                  closeMenu();
                }}
              />
            )}
            <div className="relative flex-1">
              <input
                {...getInputProps({
                  placeholder: "Search My Thrift",
                  onChange: (e) => setSearchTerm(e.target.value),
                  onFocus: () => {
                    if (!searchTerm) openMenu();
                  },
                })}
                value={searchTerm}
                className="w-full rounded-full bg-gray-200  p-3"
              />
              <CiSearch className="absolute right-3 top-1/2 transform  -translate-y-1/2 text-2xl text-gray-400" />
            </div>
          </div>
          <ul
            {...getMenuProps()}
            className="absolute z-10 w-full bg-white  rounded-lg mt-1"
          >
            {isOpen &&
              searchTerm &&
              getFilteredItems().length > 0 &&
              getFilteredItems().map((item, index) => (
                <li
                  {...getItemProps({
                    key: item.id,
                    index,
                    item,
                    style: {
                      backgroundColor:
                        highlightedIndex === index
                          ? "var(--custom-orange)"
                          : "white",
                      fontWeight: selectedItem === item ? "bold" : "normal",
                      padding: "10px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    },
                  })}
                >
                  <div className="flex items-center">
                    <img
                      src={item.coverImageUrl || defaultImageUrl}
                      alt={item.name || item.shopName}
                      style={{
                        width: "40px",
                        height: "40px",
                        objectFit: "cover",
                        borderRadius: "5px",
                        marginRight: "10px",
                      }}
                    /> 
                    <div className="flex flex-col">
                      <span className="font-opensans mb-1 font-medium">
                        {item.name || item.shopName}
                      </span>
                      {item.type === "product" && (
                        <span className="text-gray-600 text-xs flex items-center">
                          {getCategoryIcon(item.category)}
                          {item.category}
                          <GoDotFill className="mx-1 dot-size" />
                          <AiFillProduct className="mr-1" />
                          {item.productType}
                        </span>
                      )}
                      {item.type === "vendor" && (
                        <span className="text-black text-xs flex items-center">
                          <MdMyLocation className="mr-1 ratings-text" />
                          {item.marketPlaceType || "Online"}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}

            {isOpen && !searchTerm && searchHistory.length > 0 && (
              <>
                <li className="text-black font-medium text-sm px-3 py-2">
                  Recent
                </li>
                {searchHistory.map((item, index) => (
                  <li
                    {...getItemProps({
                      key: item.id,
                      index,
                      item,
                      style: {
                        backgroundColor:
                          highlightedIndex === index
                            ? "var(--customOrange)"
                            : "white",
                        fontWeight: selectedItem === item ? "bold" : "normal",
                        padding: "10px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      },
                    })}
                  >
                    <div className="flex items-center">
                      <img
                        src={item.coverImageUrl || defaultImageUrl}
                        alt={item.name || item.shopName}
                        style={{
                          width: "40px",
                          height: "40px",
                          objectFit: "cover",
                          borderRadius: "5px",
                          marginRight: "10px",
                        }}
                      />
                      <div className="flex flex-col">
                        <span className="font-opensans mb-1 font-medium">
                          {item.name || item.shopName}
                        </span>
                        {item.type === "product" && (
                          <span className="text-gray-600 text-xs flex items-center">
                            {getCategoryIcon(item.category)}
                            {item.category}
                            <GoDotFill className="mx-1 dot-size" />
                            <AiFillProduct className="mr-1" />
                            {item.productType}
                          </span>
                        )}
                        {item.type === "vendor" && (
                          <span className="text-black text-xs flex items-center">
                            <MdMyLocation className="mr-1  ratings-text" />
                            {item.marketPlaceType || "Online"}
                          </span>
                        )}
                      </div>
                    </div>
                    <FaTimes
                      className="text-gray-400 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeHistoryItem(item.id);
                      }}
                    />
                  </li>
                ))}
              </>
            )}
          </ul>
        </div>
      )}
    </Downshift>
  );
};

export default SearchDropdown;
