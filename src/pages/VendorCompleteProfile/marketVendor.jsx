import React from "react";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { NigerianStates } from "../../services/states";
import { FormGroup } from "reactstrap";
import {
  AiOutlineIdcard,
  AiOutlineCamera,
  AiOutlineBank,
  AiOutlineFileProtect,
} from "react-icons/ai";

import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase.config";
import { useState } from "react";
import { BiSolidImageAdd } from "react-icons/bi";
import { FaCheckCircle, FaInfoCircle, FaTruck } from "react-icons/fa";
import ProgressBar from "./ProgressBar";
import { FaMinusCircle } from "react-icons/fa";
import toast from "react-hot-toast";
import { RotatingLines } from "react-loader-spinner";
import { TbTruckDelivery } from "react-icons/tb";
import { HiBuildingStorefront } from "react-icons/hi2";
import { TiCameraOutline } from "react-icons/ti";
import { PiIdentificationCardThin } from "react-icons/pi";
import { GoTrash } from "react-icons/go";
const MarketVendor = ({
  vendorData,
  setVendorData,
  step,
  handleInputChange,
  handleNextStep,
  setShowDropdown,
  showDropdown,
  categories,
  bankDetails,
  handleBankDetailsChange,
  deliveryMode,
  handleDeliveryModeChange,
  idVerification,
  handleIdVerificationChange,
  idImage,
  isIdImageUploading,
  handleIdImageUpload,
  handleProfileCompletion,
  banks,
  setIdImage,
  isLoading,
}) => {
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState(""); // Common for both dropdowns
  const [selectedState, setSelectedState] = useState(""); // State for selected state
  const [shopNameLoading, setShopNameLoading] = useState(false); // Loader for shop name
  const [isShopNameTaken, setIsShopNameTaken] = useState(false);
  const [isShopNameAvailable, setIsShopNameAvailable] = useState(false);
  const toTitleCase = (str) => {
    return str
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };
  const handleStateChange = (e) => {
    const state = e.target.value; // Get the selected state
    setSelectedState(state);

    // Handle Address field update
    const currentAddress = vendorData.Address || ""; // Default to an empty string if undefined
    const updatedAddress = currentAddress.includes(",")
      ? `${currentAddress.split(",")[0]}, ${state}` // Replace the last part after the comma
      : `${currentAddress} ${state}`.trim(); // Append state if no comma is present

    setVendorData({
      ...vendorData,
      Address: updatedAddress, // Update Address with the new state
    });
  };
  const [showDaysDropdown, setShowDaysDropdown] = useState(false);
  useEffect(() => {
    const checkShopNameAvailability = async () => {
      const shopName = toTitleCase(vendorData.shopName.trim()); // Convert to title case

      if (shopName.length >= 2) {
        setShopNameLoading(true);
        setIsShopNameTaken(false);
        setIsShopNameAvailable(false);

        try {
          const q = query(
            collection(db, "vendors"),
            where("shopName", "==", shopName) // Query in title case
          );
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            setIsShopNameTaken(true);
          } else {
            setIsShopNameAvailable(true);
          }
        } catch (error) {
          console.error("Error checking shop name availability:", error);
        } finally {
          setShopNameLoading(false);
        }
      } else {
        setIsShopNameTaken(false);
        setIsShopNameAvailable(false);
      }
    };

    checkShopNameAvailability();
  }, [vendorData.shopName]);
  // Handle validation for vendor form (Step 1)
  const handleValidation = () => {
    if (!vendorData.shopName) {
      toast.error("Please fill in the brand name", {
        position: toast.POSITION.TOP_RIGHT,
      });
      return false;
    }
    if (!vendorData.phoneNumber || vendorData.phoneNumber.length !== 11) {
      toast.error("Phone number must be 11 digits", {
        position: toast.POSITION.TOP_RIGHT,
      });
      return false;
    }
    if (!vendorData.Address) {
      toast.error("Please fill in the brand address", {
        position: toast.POSITION.TOP_RIGHT,
      });
      return false;
    }
    if (!vendorData.marketPlace) {
      toast.error("Please select a location", {
        position: toast.POSITION.TOP_RIGHT,
      });
      return false;
    }
    if (!vendorData.complexNumber) {
      toast.error("Please fill in the complex number", {
        position: toast.POSITION.TOP_RIGHT,
      });
      return false;
    }
    if (vendorData.categories.length === 0) {
      toast.error("Please select at least one category", {
        position: toast.POSITION.TOP_RIGHT,
      });
      return false;
    }
    if (!vendorData.daysAvailability) {
      toast.error("Please select days of availability", {
        position: toast.POSITION.TOP_RIGHT,
      });
      return false;
    }
    if (!vendorData.openTime) {
      toast.error("Please select an opening time", {
        position: toast.POSITION.TOP_RIGHT,
      });
      return false;
    }
    if (!vendorData.closeTime) {
      toast.error("Please select a closing time", {
        position: toast.POSITION.TOP_RIGHT,
      });
      return false;
    }

    handleNextStep();
    return true; // If all validations pass
  };
  const daysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  const daysDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        daysDropdownRef.current &&
        !daysDropdownRef.current.contains(event.target)
      ) {
        setShowDaysDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle validation for bank details (Step 2)
  const handleBankValidation = () => {
    if (!bankDetails.bankName) {
      toast.error("Please select a bank name", {
        position: toast.POSITION.TOP_RIGHT,
      });
      return false;
    }
    if (!bankDetails.accountNumber || bankDetails.accountNumber.length !== 10) {
      toast.error("Account number must be 10 digits", {
        position: toast.POSITION.TOP_RIGHT,
      });
      return false;
    }
    if (!bankDetails.accountName) {
      toast.error("Please fill in the account name", {
        position: toast.POSITION.TOP_RIGHT,
      });
      return false;
    }

    handleNextStep();
    return true;
  };

  const checkFormCompletion = () => {
    return (
      vendorData.shopName &&
      !isShopNameTaken &&
      vendorData.phoneNumber.length === 11 &&
      vendorData.Address &&
      vendorData.marketPlace &&
      vendorData.complexNumber &&
      vendorData.categories.length > 0 &&
      vendorData.daysAvailability &&
      vendorData.openTime &&
      vendorData.closeTime
    );
  };

  // Usage
  const isFormComplete = () => checkFormCompletion();

  const isFormBankComplete =
    bankDetails.bankName &&
    bankDetails.accountNumber.length === 10 &&
    bankDetails.accountName;

  // Filter categories based on the search input
  const filteredCategories = categories.filter((category) =>
    category.toLowerCase().includes(searchTerm.toLowerCase())
  );
  return (
    <div>
      {vendorData.marketPlaceType === "marketplace" && (
        <>
          {/* Step 2: Create Shop */}
          {step === 2 && (
            <div className="p-2 mt-2">
              <h2 className="text-xl font-opensans font-semibold text-customBrown">
                Create Shop
              </h2>
              <p className="text-black font-light mt-2 font-opensans mb-3">
                Set up your brand to get customers and sell products.
              </p>
              <p className="text-xs font-opensans font-light text-customOrange mb-3">
                Step 1: Business Information
              </p>

              {/* Progress bar */}
              <ProgressBar step={1} />

              {/* Brand Info for Market Vendor */}
              <h3 className="text-md font-semibold mb-4 mt-4 flex items-center ">
                <AiOutlineIdcard className="w-5 h-5 mr-2 text-header" />
                Brand Info
              </h3>

              <FormGroup className="relative mb-4">
                <input
                  type="text"
                  name="shopName"
                  placeholder="Brand Name"
                  value={vendorData.shopName}
                  onChange={async (e) => {
                    const toTitleCase = (str) =>
                      str
                        .toLowerCase()
                        .split(" ")
                        .map(
                          (word) => word.charAt(0).toUpperCase() + word.slice(1)
                        )
                        .join(" ");

                    // Format the input value to title case
                    const formattedShopName = toTitleCase(e.target.value);

                    // Update the state with the formatted shop name
                    setVendorData({
                      ...vendorData,
                      shopName: formattedShopName,
                    });

                    // Validate shop name availability
                    if (formattedShopName.length >= 2) {
                      try {
                        setShopNameLoading(true);

                        // Query Firestore for the formatted shop name
                        const q = query(
                          collection(db, "vendors"),
                          where("shopName", "==", formattedShopName)
                        );
                        const querySnapshot = await getDocs(q);

                        if (!querySnapshot.empty) {
                          setIsShopNameTaken(true);
                          setIsShopNameAvailable(false);
                        } else {
                          setIsShopNameTaken(false);
                          setIsShopNameAvailable(true);
                        }
                      } catch (error) {
                        console.error(
                          "Error checking shop name availability:",
                          error
                        );
                      } finally {
                        setShopNameLoading(false);
                      }
                    } else {
                      setIsShopNameTaken(false);
                      setIsShopNameAvailable(false);
                    }
                  }}
                  className={`w-full h-12 p-3 border-2 font-opensans text-neutral-800 rounded-lg hover:border-customOrange focus:outline-none focus:border-customOrange ${
                    isShopNameTaken
                      ? "border-red-500"
                      : isShopNameAvailable
                      ? "border-green-500"
                      : ""
                  }`}
                />
                {shopNameLoading && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <RotatingLines
                      strokeColor="orange"
                      strokeWidth="5"
                      animationDuration="0.75"
                      width="24"
                      visible={true}
                    />
                  </div>
                )}
                {!shopNameLoading &&
                  isShopNameAvailable &&
                  !isShopNameTaken && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <FaCheckCircle
                        className="text-green-500 rounded-full p-1"
                        size={24}
                      />
                    </div>
                  )}
                {isShopNameTaken && (
                  <div className="text-red-500 text-xs flex items-center">
                    <FaInfoCircle className="mr-1" />
                    Shop name is already taken. Please choose another one.
                  </div>
                )}
              </FormGroup>

              <input
                type="tel"
                name="phoneNumber"
                placeholder=" Phone Number"
                pattern="[0-9]*"
                maxLength="11"
                value={vendorData.phoneNumber}
                onChange={(e) => {
                  const re = /^[0-9\b]+$/;
                  if (e.target.value === "" || re.test(e.target.value)) {
                    handleInputChange(e);
                  }
                }}
                className="w-full h-12 mb-3 p-3 border-2 rounded-lg font-opensans text-black focus:outline-none focus:border-customOrange hover:border-customOrange"
              />

              <input
                type="text"
                name="Address"
                placeholder=" Address"
                value={vendorData.Address}
                onChange={handleInputChange}
                className="w-full h-12 mb-3 p-3 border-2 rounded-lg font-opensans text-black focus:outline-none focus:border-customOrange hover:border-customOrange"
              />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowStateDropdown(!showStateDropdown);
                    setShowCategoryDropdown(false); // Close category dropdown
                  }}
                  className="w-full h-12 mb-3 p-3 border-2 rounded-lg bg-white font-opensans text-left flex items-center justify-between"
                >
                  {selectedState ? (
                    <span className="text-neutral-800">{selectedState}</span>
                  ) : (
                    <span className="text-neutral-400">Choose a State</span>
                  )}
                  <svg
                    className="fill-current h-4 w-4 text-neutral-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                  >
                    <path d="M5.516 7.548l4.486 4.486 4.485-4.486a.75.75 0 1 1 1.06 1.06l-5.015 5.015a.75.75 0 0 1-1.06 0l-5.015-5.015a.75.75 0 1 1 1.06-1.06z" />
                  </svg>
                </button>

                {showStateDropdown && (
                  <div className="absolute w-full text-neutral-400 bg-white border rounded-lg z-10">
                    <div className="p-2">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search states..."
                        className="w-full p-2 border rounded-lg focus:outline-none focus:border-customOrange"
                      />
                    </div>

                    <div className="max-h-60 overflow-y-auto">
                      {NigerianStates.filter((state) =>
                        state.toLowerCase().includes(searchTerm.toLowerCase())
                      ).map((state, index) => (
                        <div key={index} className="p-2 h-12">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="state"
                              value={state}
                              checked={selectedState === state}
                              onChange={handleStateChange} // Call the corrected function
                              className="mr-2 appearance-none h-4 w-4 border border-gray-300 checked:bg-customOrange checked:border-customOrange focus:outline-none focus:ring-2 focus:ring-customOrange focus:ring-opacity-50 rounded-lg"
                            />
                            <span className="text-neutral-800">{state}</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Location and Complex */}
              <FormGroup className="relative mb-4">
                <select
                  name="marketPlace"
                  value={vendorData.marketPlace}
                  onChange={handleInputChange}
                  className={`w-full h-12 px-4 pr-10 border border-gray-300 rounded-lg bg-white text-left appearance-none focus:outline-none focus:ring-2 focus:ring-customOrange ${
                    vendorData.marketPlace === ""
                      ? "text-neutral-400"
                      : "text-neutral-800"
                  }`}
                  style={{
                    backgroundImage:
                      "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22%23666666%22 viewBox=%220 0 20 20%22><path d=%22M5.516 7.548l4.486 4.486 4.485-4.486a.75.75 0 0 1 1.06 1.06l-5.015 5.015a.75.75 0 0 1-1.06 0L5.516 8.608a.75.75 0 0 1 1.06-1.06z%22 /></svg>')",
                    backgroundPosition: "right 1rem center",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "1rem",
                  }}
                >
                  {/* Placeholder Option */}
                  <option value="" className="text-neutral-400">
                    Choose MarketPlace
                  </option>

                  {/* Location Options */}
                  <option value="Yaba">Yaba</option>
                  {/* Add more options as needed */}
                </select>
              </FormGroup>

              <input
                type="text"
                name="complexNumber"
                placeholder="Complex & Number"
                value={vendorData.complexNumber}
                onChange={handleInputChange}
                className="w-full h-12 mb-3 p-3 border-2 rounded-lg font-opensans text-black focus:outline-none focus:border-customOrange hover:border-customOrange"
              />

              {/* Brand Category */}
              <FormGroup className="relative mb-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="w-full h-12 mb-3 p-3 border-2 rounded-lg bg-white font-opensans text-left flex items-center justify-between"
                  >
                    {vendorData.categories.length > 0 ? (
                      <span className="text-neutral-800">
                        {vendorData.categories.join(", ")}
                      </span>
                    ) : (
                      <span className="text-neutral-400">Select Category</span>
                    )}
                    <svg
                      className="fill-current h-4 w-4 text-neutral-400"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                    >
                      <path d="M5.516 7.548l4.486 4.486 4.485-4.486a.75.75 0 1 1 1.06 1.06l-5.015 5.015a.75.75 0 0 1-1.06 0l-5.015-5.015a.75.75 0 1 1 1.06-1.06z" />
                    </svg>
                  </button>

                  {showDropdown && (
                    <div className="absolute w-full text-neutral-400 bg-white border rounded-lg z-10">
                      {/* Search Input */}
                      <div className="p-2">
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Search categories..."
                          className="w-full p-2 border rounded-lg focus:outline-none focus:border-customOrange"
                        />
                      </div>

                      {/* Categories List */}
                      <div className="max-h-60 overflow-y-auto">
                        {filteredCategories.length > 0 ? (
                          filteredCategories.map((category, index) => (
                            <div key={index} className="p-2 h-12">
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  value={category}
                                  checked={vendorData.categories.includes(
                                    category
                                  )}
                                  onChange={(e) => {
                                    const newCategories = [
                                      ...vendorData.categories,
                                    ];
                                    if (e.target.checked) {
                                      newCategories.push(category);
                                    } else {
                                      const idx =
                                        newCategories.indexOf(category);
                                      if (idx > -1) {
                                        newCategories.splice(idx, 1);
                                      }
                                    }
                                    setVendorData({
                                      ...vendorData,
                                      categories: newCategories,
                                    });
                                  }}
                                  className="mr-2 appearance-none h-4 w-4 border border-gray-300  checked:bg-customOrange checked:border-customOrange focus:outline-none focus:ring-2 focus:ring-customOrange focus:ring-opacity-50 rounded-lg"
                                />
                                <span className="text-neutral-800">
                                  {category}
                                </span>
                              </label>
                            </div>
                          ))
                        ) : (
                          <div className="p-2 text-sm text-gray-500">
                            No categories found
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </FormGroup>
              <input
                type="text"
                name="description"
                placeholder=" Description"
                value={vendorData.description}
                onChange={handleInputChange}
                className="w-full h-12 mb-3 p-3 border-2 font-opensans text-black rounded-lg focus:outline-none focus:border-customOrange hover:border-customOrange"
              />
              <h3 className="text-md font-semibold mb-4 mt-1 flex items-center ">
                <HiBuildingStorefront className="w-5 h-5 mr-2 text-header" />
                Operations
              </h3>
              {/* Days of Availability */}
              <div className="relative mb-4" ref={daysDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowDaysDropdown(!showDaysDropdown)}
                  className="w-full h-12 mb-3 p-3 border-2 rounded-lg bg-white font-opensans text-left flex items-center justify-between"
                >
                  {vendorData.daysAvailability.length > 0 ? (
                    <span className="text-neutral-800">
                      {vendorData.daysAvailability.join(", ")}
                    </span>
                  ) : (
                    <span className="text-neutral-400">
                      Days of Availability
                    </span>
                  )}
                  <svg
                    className="fill-current h-4 w-4 text-neutral-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                  >
                    <path d="M5.516 7.548l4.486 4.486 4.485-4.486a.75.75 0 1 1 1.06 1.06l-5.015 5.015a.75.75 0 0 1-1.06 0l-5.015-5.015a.75.75 0 1 1 1.06-1.06z" />
                  </svg>
                </button>

                {showDaysDropdown && (
                  <div className="absolute w-full text-neutral-400 bg-white border rounded-lg z-10">
                    {/* Days of the Week List */}
                    <div className="max-h-60 overflow-y-auto">
                      {daysOfWeek.map((day, index) => (
                        <div key={index} className="p-2 h-12">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              value={day}
                              checked={vendorData.daysAvailability.includes(
                                day
                              )}
                              onChange={(e) => {
                                let newDays = [...vendorData.daysAvailability];
                                if (e.target.checked) {
                                  newDays.push(day);
                                } else {
                                  newDays = newDays.filter((d) => d !== day);
                                }
                                setVendorData({
                                  ...vendorData,
                                  daysAvailability: newDays,
                                });
                              }}
                              className="mr-2 appearance-none h-4 w-4 border border-gray-300 checked:bg-customOrange checked:border-customOrange focus:outline-none focus:ring-2 focus:ring-customOrange focus:ring-opacity-50 rounded-lg"
                            />
                            <span className="text-neutral-800">{day}</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* brand description */}

              {/* Open and Close time */}
              <div className="flex justify-between mb-4">
                {/* Open Time */}
                <FormGroup className="w-1/2 mr-2">
                  <select
                    name="openTime"
                    value={vendorData.openTime}
                    onChange={handleInputChange}
                    className={`w-full h-12 px-4 pr-10 font-opensans text-black border border-gray-300 rounded-lg bg-white text-left appearance-none focus:outline-none focus:ring-2 focus:ring-customOrange ${
                      vendorData.openTime === ""
                        ? "text-neutral-400"
                        : "text-neutral-800"
                    }`}
                    style={{
                      backgroundImage:
                        "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22%23666666%22 viewBox=%220 0 20 20%22><path d=%22M5.516 7.548l4.486 4.486 4.485-4.486a.75.75 0 111.06 1.06l-5.015 5.015a.75.75 0 01-1.06 0L5.516 8.608a.75.75 0 111.06-1.06z%22 /></svg>')",
                      backgroundPosition: "right 1rem center",
                      backgroundRepeat: "no-repeat",
                      backgroundSize: "1rem",
                    }}
                  >
                    <option value="" className="text-neutral-400">
                      Open time
                    </option>
                    <option value="7:00 AM">7:00 AM</option>
                    <option value="8:00 AM">8:00 AM</option>
                    <option value="9:00 AM">9:00 AM</option>
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="11:00 AM">11:00 AM</option>
                    <option value="12:00 PM">12:00 PM</option>
                  </select>
                </FormGroup>

                {/* Close Time */}
                <FormGroup className="w-1/2">
                  <select
                    name="closeTime"
                    value={vendorData.closeTime}
                    onChange={handleInputChange}
                    className={`w-full h-12 px-4 pr-10 border font-opensans text-black border-gray-300 rounded-lg bg-white text-left appearance-none focus:outline-none focus:ring-2 focus:ring-customOrange ${
                      vendorData.closeTime === ""
                        ? "text-neutral-400"
                        : "text-neutral-800"
                    }`}
                    style={{
                      backgroundImage:
                        "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22%23666666%22 viewBox=%220 0 20 20%22><path d=%22M5.516 7.548l4.486 4.486 4.485-4.486a.75.75 0 111.06 1.06l-5.015 5.015a.75.75 0 01-1.06 0L5.516 8.608a.75.75 0 111.06-1.06z%22 /></svg>')",
                      backgroundPosition: "right 1rem center",
                      backgroundRepeat: "no-repeat",
                      backgroundSize: "1rem",
                    }}
                  >
                    <option value="" className="text-neutral-400">
                      Closing time
                    </option>
                    <option value="4:00 PM">4:00 PM</option>
                    <option value="5:00 PM">5:00 PM</option>
                    <option value="6:00 PM">6:00 PM</option>
                    <option value="7:00 PM">7:00 PM</option>
                    <option value="8:00 PM">8:00 PM</option>
                    <option value="9:00 PM">9:00 PM</option>
                  </select>
                </FormGroup>
              </div>

              <motion.button
                className={`w-full h-12 text-white rounded-full ${
                  isFormComplete
                    ? "bg-customOrange"
                    : "bg-customOrange opacity-50"
                }`}
                onClick={handleValidation}
                disabled={!isFormComplete()} // Enable the button and handle validation on click
              >
                Next
              </motion.button>
            </div>
          )}

          {/* Step 3: Bank Details */}
          {step === 3 && (
            <div className="p-2 mt-3">
              <h2 className="text-xs text-customOrange font-light font-opensans mb-3">
                Step 2: Bank Details
              </h2>
              <ProgressBar step={2} />
              {/* Bank Details */}
              <h3 className="text-md font-semibold font-opensans text-black mt-3 mb-3 flex items-center">
                <AiOutlineBank className="w-5 h-5 mr-3 font-opensans text-header" />
                Bank Details
              </h3>
              {/* Bank Name Dropdown */}
              <FormGroup className="relative mb-2">
                <div className="relative font-opensans">
                  <select
                    name="bankName"
                    value={bankDetails.bankName}
                    onChange={handleBankDetailsChange}
                    className="w-full h-12 px-4 pr-10 border border-gray-300 rounded-lg bg-white text-neutral-800 text-left appearance-none focus:outline-none focus:ring-2 focus:ring-customOrange focus:border-customOrange"
                    style={{
                      backgroundImage:
                        "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22%23f97316%22 viewBox=%220 0 20 20%22><path d=%22M5.516 7.548l4.486 4.486 4.485-4.486a.75.75 0 011.06 1.06l-5.015 5.015a.75.75 0 01-1.06 0l-5.015-5.015a.75.75 0 011.06-1.06z%22 /></svg>')",
                      backgroundPosition: "right 1rem center",
                      backgroundRepeat: "no-repeat",
                      backgroundSize: "1rem",
                    }}
                  >
                    <option value="">Bank Name</option>
                    {banks.map((bank, index) => (
                      <option key={index} value={bank}>
                        {bank}
                      </option>
                    ))}
                  </select>
                </div>
              </FormGroup>

              {/* Account Number Field */}
              <input
                type="tel"
                name="accountNumber"
                placeholder="Account Number"
                value={bankDetails.accountNumber}
                maxLength="10" // Limits the input to 10 digits
                onChange={(e) => {
                  const re = /^[0-9\b]+$/; // Regular expression to allow only numbers
                  if (e.target.value === "" || re.test(e.target.value)) {
                    handleBankDetailsChange(e); // Only update state if the input is valid
                  }
                }}
                className="w-full h-10 mb-4 p-4 border-2 font-opensans text-neutral-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-customOrange"
              />

              {/* Account Name Field */}
              <input
                type="text"
                name="accountName"
                placeholder="Account Name"
                value={bankDetails.accountName}
                onChange={handleBankDetailsChange}
                className="w-full h-10 mb-4 p-4 border-2 font-opensans text-neutral-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-customOrange"
              />

              {/* Next Button */}
              <motion.button
                className={`w-11/12 h-12 fixed bottom-6 font-opensans  left-0 right-0 mx-auto flex justify-center items-center text-white rounded-full ${
                  isFormBankComplete
                    ? "bg-customOrange"
                    : "bg-customOrange opacity-50"
                }`}
                onClick={handleBankValidation}
              >
                Next
              </motion.button>
            </div>
          )}

          {/* Step 5: Delivery Mode */}
          {step === 4 && (
            <div className="p-2 mt-3">
              <h2 className="text-xs text-customOrange font-light font-opensans mb-3">
                Step 3: Delivery Mode
              </h2>

              {/* Progress bar */}
              <ProgressBar step={3} />

              <h3 className="text-md font-semibold font-opensans text-header mt-3 mb-3 flex items-center">
                <TbTruckDelivery className="w-5 h-5 mr-2 text-black font-opensans" />
                Delivery Mode
              </h3>

              <p className="text-black font-light text-sm mb-4 font-opensans">
                Choose a delivery mode for your store
              </p>

              {/* Delivery Mode Options */}
              <div className="">
                <div
                  onClick={() => handleDeliveryModeChange("Pickup")}
                  className={`border-0 p-2 mb-4 rounded-lg cursor-pointer flex justify-between items-center ${
                    deliveryMode === "Pickup"
                      ? "border-customOrange"
                      : "border-customOrange"
                  }`}
                >
                  <span className="font-opensans">Pickup</span>
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex justify-center items-center ${
                      deliveryMode === "Pickup"
                        ? "border-customOrange"
                        : "border-customOrange"
                    }`}
                  >
                    {deliveryMode === "Pickup" && (
                      <div className="w-3 h-3 rounded-full bg-customOrange" />
                    )}
                  </div>
                </div>
              </div>

              <motion.button
                className={`w-11/12 h-12 fixed bottom-6 font-opensans left-0 right-0 mx-auto flex justify-center items-center text-white rounded-full ${
                  deliveryMode
                    ? "bg-customOrange"
                    : "bg-customOrange opacity-20"
                }`}
                onClick={handleNextStep}
                disabled={!deliveryMode}
              >
                Next
              </motion.button>
            </div>
          )}

          {/* Step 6: ID Verification */}
          {step === 5 && (
            <div className="p-2 mt-4 font-opensans">
              <h2 className="text-sm text-customOrange mb-3 font-opensans">
                Step 4: ID verification
              </h2>
              {/* Progress bar */}
              <ProgressBar step={4} />

              {/* ID Verification */}
              <h3 className="text-md mt-3 font-semibold font-opensans flex items-center mb-3">
                <PiIdentificationCardThin className="w-5 h-5 mr-2 text-gray-600" />
                ID Verification
              </h3>
              <div className="relative mb-2 font-opensans">
                <select
                  name="idVerification"
                  value={idVerification}
                  onChange={handleIdVerificationChange}
                  className="w-full h-10 px-4 pr-10 border border-gray-300 rounded-lg bg-white text-gray-700 text-left appearance-none focus:outline-none focus:ring-2 focus:ring-customOrange"
                  style={{
                    backgroundImage:
                      "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22%23666666%22 viewBox=%220 0 20 20%22><path d=%22M5.516 7.548l4.486 4.486 4.485-4.486a.75.75 0 01 1.06 1.06l-5.015 5.015a.75.75 0 01-1.06 0l-5.015-5.015a.75.75 0 01-1.06-1.06z%22 /></svg>')",
                    backgroundPosition: "right 1rem center",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "1rem",
                  }}
                >
                  <option value="">Select Verification Document</option>
                  <option value="NIN">NIN</option>
                  <option value="International Passport">
                    International Passport
                  </option>
                  <option value="CAC">CAC</option>
                </select>
              </div>

              {/* Upload ID */}
              <h3 className="text-md mt-3 font-semibold font-opensans mb-3 flex items-center">
                <TiCameraOutline className="w-5 h-5 mr-2 text-black" />
                Upload ID
              </h3>
              <div className="border-2 border-customBrown border-dashed rounded-lg h-48 w-full text-center mb-6">
                {idImage ? (
                  <div className="relative w-full h-full">
                    <img
                      src={
                        typeof idImage === "string"
                          ? idImage // Use the URL string directly
                          : URL.createObjectURL(idImage) // Create a URL for the File object
                      }
                      alt="Uploaded ID"
                      className="w-full h-full object-cover rounded-lg"
                    />
                    {/* Show loader if image is uploading */}
                    {isIdImageUploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
                        <RotatingLines
                          strokeColor="orange"
                          strokeWidth="5"
                          animationDuration="0.75"
                          width="50"
                          visible={true}
                        />
                      </div>
                    )}
                    {!isIdImageUploading && (
                      <button
                        type="button"
                        className="absolute top-2 right-2 bg-customBrown text-white rounded-full p-1"
                        onClick={() => {
                          setIdImage(null); // Clear the image state
                          setVendorData({ ...vendorData, idImage: null }); // Also clear it from vendorData
                        }}
                      >
                        <GoTrash className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="border-dashed rounded-lg h-48 w-full text-center border-opacity-20 mb-6 flex flex-col justify-center items-center">
                    {/* Show loader if image is uploading */}
                    {isIdImageUploading ? (
                      <RotatingLines
                        strokeColor="orange"
                        strokeWidth="5"
                        animationDuration="0.75"
                        width="50"
                        visible={true}
                      />
                    ) : (
                      <>
                        <label
                          htmlFor="idImageUpload"
                          className="cursor-pointer"
                        >
                          <BiSolidImageAdd
                            size={54}
                            className="text-customOrange opacity-40"
                          />
                        </label>

                        <input
                          type="file"
                          className="hidden"
                          onChange={handleIdImageUpload}
                          id="idImageUpload"
                          disabled={isIdImageUploading} // Disable input during upload
                        />

                        <label
                          htmlFor="idImageUpload"
                          className="text-customOrange opacity-40 font-opensans cursor-pointer text-sm"
                        >
                          Upload ID image
                        </label>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                className={`w-11/12 h-12 fixed bottom-6 left-0 right-0 mx-auto flex justify-center items-center text-white rounded-full ${
                  idVerification && idImage
                    ? "bg-customOrange"
                    : "bg-customOrange opacity-20"
                }`}
                onClick={handleProfileCompletion}
                disabled={!idVerification || !idImage || isLoading} // Disable the button during loading
              >
                {isLoading ? (
                  <RotatingLines
                    strokeColor="white"
                    strokeWidth="5"
                    animationDuration="0.75"
                    width="30"
                    visible={true}
                  />
                ) : (
                  "Complete Profile"
                )}
              </motion.button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MarketVendor;
