import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Downshift from "downshift";
import { IoChevronBackOutline } from "react-icons/io5";
import { FaTimes } from "react-icons/fa";
import { CiSearch } from "react-icons/ci";
import { MdCancel, MdMyLocation } from "react-icons/md";
import { GoDotFill } from "react-icons/go";
import { PiGenderMaleBold, PiGenderFemaleBold } from "react-icons/pi";
import { FaGenderless, FaChildren } from "react-icons/fa6";
import { AiFillProduct } from "react-icons/ai";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { query, where } from "firebase/firestore";

const SearchPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchHistory, setSearchHistory] = useState([]);
  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const navigate = useNavigate();

  const defaultImageUrl =
    "https://images.saatchiart.com/saatchi/1750204/art/9767271/8830343-WUMLQQKS-7.jpg";

  const db = getFirestore();

  useEffect(() => {
    const history = JSON.parse(localStorage.getItem("searchHistory")) || [];
    setSearchHistory(history);

    const fetchData = async () => {
      try {
        // Fetch only approved and active vendors
        const vendorsSnapshot = await getDocs(
          query(
            collection(db, "vendors"),
            where("isApproved", "==", true),
            where("isDeactivated", "==", false)
          )
        );
        const vendorsData = vendorsSnapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));
        setVendors(vendorsData);

        const productsSnapshot = await getDocs(
          query(
            collection(db, "products"),
            where("published", "==", true),
            where("isDeleted", "==", false) // Exclude deleted products
          )
        );
        let productsData = productsSnapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));

        // Filter products to only those whose vendors are approved & active
        const approvedActiveVendorIds = new Set(vendorsData.map((v) => v.id));
        productsData = productsData.filter((p) =>
          approvedActiveVendorIds.has(p.vendorId)
        );

        setProducts(productsData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [db]);

  const getFilteredItems = () => {
    const searchTermLower = searchTerm.toLowerCase();

    // Function to calculate product score based on name, tags, productType
    const calculateProductScore = (product) => {
      let score = 0;
      if (product.name.toLowerCase().includes(searchTermLower)) score += 3;
      if (
        product.tags &&
        product.tags.some((tag) => tag.toLowerCase().includes(searchTermLower))
      )
        score += 2;
      if (product.productType.toLowerCase().includes(searchTermLower))
        score += 1;
      return score;
    };

    // Filter products
    const scoredProducts = products
      .map((product) => ({ ...product, score: calculateProductScore(product) }))
      .filter((product) => product.score > 0)
      .map((product) => ({
        ...product,
        name: product.name,
        type: "product",
      }));

    // Sort products by score descending, then by name
    scoredProducts.sort(
      (a, b) => b.score - a.score || a.name.localeCompare(b.name)
    );

    // Filter vendors by shopName or description
    const filteredVendors = vendors
      .filter((vendor) => {
        const vendorNameMatch = vendor.shopName
          ? vendor.shopName.toLowerCase().includes(searchTermLower)
          : false;
        const descMatch = vendor.description
          ? vendor.description.toLowerCase().includes(searchTermLower)
          : false;
        return vendorNameMatch || descMatch;
      })
      .map((vendor) => ({
        ...vendor,
        name: vendor.shopName,
        type: "vendor",
      }));

    // Combine vendors and products into one array
    const combinedResults = [...filteredVendors, ...scoredProducts];

    return combinedResults;
  };

  const handleChange = (selectedItem) => {
    if (selectedItem) {
      // Check if the item already exists in local storage
      const updatedHistory = [
        ...searchHistory.filter((item) => item.id !== selectedItem.id),
        selectedItem,
      ].slice(0, 8);

      setSearchHistory(updatedHistory);
      localStorage.setItem("searchHistory", JSON.stringify(updatedHistory));

      // Navigate based on whether it's a product or a vendor
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
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className="w-full h-screen p-2 mt-3 bg-white"
    >
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
            <div className="flex items-center mb-4">
              <IoChevronBackOutline
                className="text-2xl text-black cursor-pointer mr-2"
                onClick={() => {
                  clearSearch();
                  closeMenu();
                  navigate(-1);
                }}
              />
              <div className="relative flex-1">
                <input
                  {...getInputProps({
                    placeholder: "Search my thrift",
                    onChange: (e) => {
                      setSearchTerm(e.target.value);
                      openMenu();
                    },
                    onFocus: () => {
                      if (!searchTerm) openMenu();
                    },
                  })}
                  value={searchTerm}
                  className="w-full border font-opensans text-black text-sm border-gray-300 rounded-full px-3 py-2 font-medium focus:outline-customOrange"
                />
                <CiSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-2xl text-gray-400" />

                {/* Add the cancel (X) button */}
                {searchTerm && (
                  <MdCancel
                    className="absolute right-10 top-1/2 transform -translate-y-1/2 text-xl text-gray-400 cursor-pointer"
                    onClick={() => setSearchTerm("")}
                  />
                )}
              </div>
            </div>
            <ul
              {...getMenuProps()}
              className="absolute z-50 w-full bg-white rounded-lg mt-1"
            >
              {isOpen && searchTerm ? (
                getFilteredItems().length > 0 ? (
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
                          <span className="font-opensans text-gray-800 mb-1 font-medium">
                            {item.name || item.shopName}
                          </span>
                          {item.type === "product" && (
                            <span className="text-gray-800 font-opensans text-xs flex items-center">
                              {getCategoryIcon(item.category)}
                              {item.category}
                              <GoDotFill className="mx-1 dot-size" />
                              <AiFillProduct className="mr-1" />
                              {item.productType}
                            </span>
                          )}
                          {item.type === "vendor" && (
                            <span className="text-gray-800 font-opensans text-xs flex items-center">
                              <MdMyLocation className="mr-1 ratings-text" />
                              {item.marketPlaceType || "Online"}
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="text-center text-gray-600 text-sm py-4 font-opensans">
                    ☹️ No results found, try searching for another vendor or
                    product.
                  </li>
                )
              ) : (
                isOpen &&
                !searchTerm &&
                searchHistory.length > 0 && (
                  <>
                    <li className="text-black font-opensans font-medium text-sm px-3 py-2">
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
                            fontWeight:
                              selectedItem === item ? "bold" : "normal",
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
                            <span className="font-opensans text-gray-800 mb-1 font-medium">
                              {item.name || item.shopName}
                            </span>
                            {item.type === "product" && (
                              <span className="text-gray-800 text-xs flex items-center">
                                {getCategoryIcon(item.category)}
                                {item.category}
                                <GoDotFill className="mx-1 dot-size" />
                                <AiFillProduct className="mr-1" />
                                {item.productType}
                              </span>
                            )}
                            {item.type === "vendor" && (
                              <span className="text-gray-800 font-opensans text-xs flex items-center">
                                <MdMyLocation className="mr-1 ratings-text" />
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
                )
              )}
            </ul>
          </div>
        )}
      </Downshift>
    </motion.div>
  );
};

export default SearchPage;
