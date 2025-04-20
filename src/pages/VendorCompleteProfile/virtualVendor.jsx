import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FormGroup } from "reactstrap";
import { FaXTwitter } from "react-icons/fa6";
import { FaCheckCircle, FaInfoCircle, FaInstagram } from "react-icons/fa";
import { AiOutlineTikTok } from "react-icons/ai";
import { TiCameraOutline } from "react-icons/ti";
import { CiFacebook } from "react-icons/ci";
import { AiOutlineBank } from "react-icons/ai";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase.config";
import { NigerianStates } from "../../services/states";
import { BiSolidImageAdd } from "react-icons/bi";
import { PiIdentificationCardThin } from "react-icons/pi";
import { FaIdCard, FaMinusCircle } from "react-icons/fa";
import { TbTruckDelivery } from "react-icons/tb";
// import { fetchBankList, resolveBankName } from "../../services/bankutils";
import banks from "../../services/banks";
import { IoShareSocial } from "react-icons/io5";
import ProgressBar from "./ProgressBar";
import toast from "react-hot-toast"; // Import from react-hot-toast
import { RotatingLines } from "react-loader-spinner";
import LocationPicker from "../../components/Location/LocationPicker";

import { GoTrash } from "react-icons/go";
const VirtualVendor = ({
  vendorData,
  setVendorData,
  step,
  getProgress,
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
  handleIdImageUpload,
  handleProfileCompletion,
  handleImageUpload,
  handleSocialMediaChange,

  setBankDetails,
  showBankDropdown,
  setShowBankDropdown,
  selectedBank,
  setSelectedBank,
  setIdImage,
  isCoverImageUploading,
  isIdImageUploading,
  isLoading,
}) => {
  const isValidURL = (string) => {
    try {
      // Automatically prepend 'https://' if missing
      if (
        string &&
        !string.startsWith("http://") &&
        !string.startsWith("https://")
      ) {
        string = `https://${string}`;
      }
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleValidation = () => {
    // Check required fields for Step 2
    if (step === 2) {
      if (!vendorData.shopName) {
        toast.error("Please fill in the shop name");
        return false;
      }
      if (!vendorData.Address) {
        toast.error("Please fill in Address");
        return false;
      }
      if (vendorData.categories.length === 0) {
        toast.error("Please select at least one category");
        return false;
      }
      if (!vendorData.coverImageUrl) {
        toast.error("Please upload a cover image");
        return false;
      }

      // Validate social media links
      const { instagram, facebook, twitter, tiktok } =
        vendorData.socialMediaHandle;
      if (
        (!instagram && !facebook && !twitter && !tiktok) || // At least one handle is required
        (instagram && !isValidURL(instagram)) ||
        (facebook && !isValidURL(facebook)) ||
        (tiktok && !isValidURL(tiktok)) ||
        (twitter && !isValidURL(twitter))
      ) {
        toast.error(
          "Please provide valid social media links. Include https://"
        );
        return false;
      }
    }

    // Validation for Step 3: Bank Details
    if (step === 3) {
      if (!bankDetails.bankName) {
        toast.error("Please select a bank");
        return false;
      }
      if (
        !bankDetails.accountNumber ||
        bankDetails.accountNumber.length !== 10
      ) {
        toast.error("Account number must be 10 digits");
        return false;
      }
      if (!bankDetails.accountName) {
        toast.error("Please fill in the account name");
        return false;
      }
    }

    // If everything is valid, proceed to the next step
    handleNextStep();
    return true;
  };

  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [shopNameLoading, setShopNameLoading] = useState(false); // Loader for shop name
  const [isShopNameTaken, setIsShopNameTaken] = useState(false);
  const [isShopNameAvailable, setIsShopNameAvailable] = useState(false);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [stateSearchTerm, setStateSearchTerm] = useState(""); // For state search input
  const [categorySearchTerm, setCategorySearchTerm] = useState(""); // For category search input

  const [selectedState, setSelectedState] = useState("");
  // const [banks, setBanks] = useState([]);
  const [isResolving, setIsResolving] = useState(false); // Loader for account resolution

  const [searchBankTerm, setSearchBankTerm] = useState(""); // For bank search input

  const filteredBanks = banks.filter((bank) =>
    bank.name.toLowerCase().includes(searchBankTerm.toLowerCase())
  );

  const toTitleCase = (str) => {
    return str
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };
  const handleStateChange = (state) => {
    setSelectedState(state);

    // Update vendorData with the new state
    setVendorData({
      ...vendorData,
      state: state,
    });

    // Close the state dropdown
    setShowStateDropdown(false);
  };
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

  const isFormComplete = () => {
    if (step === 2) {
      return (
        vendorData.shopName &&
        !isShopNameTaken &&
        vendorData.Address &&
        // vendorData.phoneNumber &&
        // vendorData.phoneNumber.length === 11 &&
        vendorData.categories.length > 0 &&
        vendorData.coverImageUrl &&
        (vendorData.socialMediaHandle.instagram ||
          vendorData.socialMediaHandle.facebook ||
          vendorData.socialMediaHandle.tiktok ||
          vendorData.socialMediaHandle.twitter)
      );
    }

    if (step === 3) {
      return (
        bankDetails.bankName &&
        bankDetails.accountNumber.length === 10 &&
        bankDetails.accountName
      );
    }

    if (step === 4) {
      return !!deliveryMode; // Ensures deliveryMode is selected
    }

    if (step === 5) {
      return idVerification && idImage;
    }

    return false;
  };

  // Filter categories based on the search input
  const filteredCategories = categories.filter((category) =>
    category.toLowerCase().includes(categorySearchTerm.toLowerCase())
  );
  // Remove the hardcoded accountNumber and use state

  // Debugging resolveBankName function
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!event.target.closest(".dropdown-container")) {
        setShowBankDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!event.target.closest(".category-dropdown")) {
        setShowCategoryDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  return (
    <div>
      {vendorData.marketPlaceType === "virtual" && (
        <>
          {/* Step 2: Create Shop Form for Online Vendor */}
          {step === 2 && (
            <div className="p-2 mt">
              <h2 className="text-xl font-opensans font-semibold text-customBrown">
                Create Shop
              </h2>
              <p className="text-black font-light mt-2 font-opensans mb-3">
                Set up your brand to get customers and sell products.
              </p>
              <p className="text-xs text-customOrange font-opensans mb-2">
                Step 1: Business Information
              </p>
              {/* Progress bar */}
              <ProgressBar step={1} />
              {/* Brand Info */}
              <h3 className="text-md mt-4 font-semibold mb-4 font-opensans flex items-center ">
                <FaIdCard className="w-5 h-5 mr-2 text-header" />
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

              <div className="mb-2">
                <LocationPicker
                  key={vendorData.Address || "new"}
                  // you can pass an initial value if you like:
                  initialAddress={vendorData.Address}
                  onLocationSelect={({ address, lat, lng }) => {
                    setVendorData({
                      ...vendorData,
                      Address: address, // human‑readable
                      location: { lat, lng }, // numeric coords
                    });
                  }}
                />
              </div>

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
                        value={stateSearchTerm}
                        onChange={(e) => setStateSearchTerm(e.target.value)}
                        placeholder="Search states..."
                        className="w-full p-2 border rounded-lg focus:outline-none focus:border-customOrange"
                      />
                    </div>

                    <div className="max-h-60 overflow-y-auto">
                      {NigerianStates.filter((state) =>
                        state
                          .toLowerCase()
                          .includes(stateSearchTerm.toLowerCase())
                      ).map((state, index) => (
                        <div
                          key={index}
                          className="p-2 h-12 cursor-pointer hover:bg-gray-100"
                          onClick={() => handleStateChange(state)} // Close dropdown when state is selected
                        >
                          <span className="text-neutral-800">{state}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative category-dropdown">
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryDropdown(!showCategoryDropdown);
                    setShowStateDropdown(false); // Close state dropdown
                  }}
                  className={`w-full p-3 border-2 mb-3  rounded-lg bg-white font-opensans text-left flex items-center justify-between`}
                  style={{
                    minHeight: "3rem", // Ensure the minimum height remains consistent
                    flexWrap: "wrap", // Allow wrapping of content
                    alignItems: "flex-start", // Align items to the top for proper wrapping
                  }}
                >
                  {vendorData.categories.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {vendorData.categories.map((category, index) => (
                        <span
                          key={index}
                          className="bg-customOrange text-white text-xs rounded-full px-2 py-1"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-neutral-400">
                      Select Brand Category
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

                {showCategoryDropdown && (
                  <div className="absolute w-full text-neutral-400 bg-white border rounded-lg category-dropdown z-10">
                    {/* Search Input */}
                    <div className="p-2">
                      <input
                        type="text"
                        value={categorySearchTerm}
                        onChange={(e) => setCategorySearchTerm(e.target.value)}
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
                                    const idx = newCategories.indexOf(category);
                                    if (idx > -1) {
                                      newCategories.splice(idx, 1);
                                    }
                                  }
                                  setVendorData({
                                    ...vendorData,
                                    categories: newCategories,
                                  });
                                }}
                                className="mr-2 appearance-none h-4 w-4 border border-gray-300 checked:bg-customOrange checked:border-customOrange focus:outline-none focus:ring-2 focus:ring-customOrange focus:ring-opacity-50 rounded-lg"
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

              <input
                type="text"
                name="description"
                placeholder="Brand Description"
                value={vendorData.description}
                onFocus={() => setShowCategoryDropdown(false)}
                onChange={handleInputChange}
                className="w-full h-12 mb-4 p-3 border-2 font-opensans text-black rounded-lg focus:outline-none focus:border-customOrange hover:border-customOrange"
              />
              {/* Categories */}
              {/* Social Media */}
              <h3 className="text-md font-semibold mb-1 font-opensans flex items-center">
                <IoShareSocial className="w-5 h-5 mr-2 text-header" />
                Social Media
              </h3>
              <h4 className="font-opensans text-gray-700 mb-3 text-xs">
                Your social media handles are collected for security reasons
                best known to us(minimum of one link must be attached).
              </h4>
              <div className="relative w-full mb-4">
                {/* Instagram Icon */}
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <FaInstagram className="text-gray-500 text-xl" />
                </div>

                <input
                  type="text"
                  name="instagram"
                  placeholder="Instagram Link"
                  value={vendorData.socialMediaHandle.instagram}
                  onChange={handleSocialMediaChange}
                  className={`w-full h-12 pl-12 pr-3 border-2 rounded-lg focus:outline-none focus:border-customOrange hover:border-customOrange ${
                    vendorData.socialMediaHandle.instagram &&
                    !isValidURL(vendorData.socialMediaHandle.instagram)
                      ? "border-red-500"
                      : ""
                  }`}
                />
              </div>
              <div className="relative w-full mb-4">
                {/* Facebook Icon */}
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <CiFacebook className="text-gray-500 text-xl" />
                </div>
                <input
                  type="text"
                  name="facebook"
                  placeholder="Facebook Link"
                  value={vendorData.socialMediaHandle.facebook}
                  onChange={handleSocialMediaChange}
                  className={`w-full h-12 pl-12 pr-3 border-2 rounded-lg focus:outline-none focus:border-customOrange hover:border-customOrange ${
                    vendorData.socialMediaHandle.facebook &&
                    !isValidURL(vendorData.socialMediaHandle.facebook)
                      ? "border-red-500"
                      : ""
                  }`}
                />
              </div>
              <div className="relative w-full mb-4">
                {/* Twitter Icon */}
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <AiOutlineTikTok className="text-gray-500 text-xl" />
                </div>
                <input
                  type="text"
                  name="tiktok"
                  placeholder="Tiktok Link"
                  value={vendorData.socialMediaHandle.tiktok}
                  onChange={handleSocialMediaChange}
                  className={`w-full h-12 pl-12 pr-3 border-2 rounded-lg focus:outline-none focus:border-customOrange hover:border-customOrange ${
                    vendorData.socialMediaHandle.tiktok &&
                    !isValidURL(vendorData.socialMediaHandle.tiktok)
                      ? "border-red-500"
                      : ""
                  }`}
                />
              </div>
              <div className="relative w-full mb-4">
                {/* Twitter (X) Icon */}
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <FaXTwitter className="text-gray-500 text-xl" />
                </div>
                <input
                  type="text"
                  name="twitter"
                  placeholder="Twitter(X) Link"
                  value={vendorData.socialMediaHandle.twitter}
                  onChange={handleSocialMediaChange}
                  className={`w-full h-12 pl-12 pr-3 border-2 rounded-lg focus:outline-none focus:border-customOrange hover:border-customOrange ${
                    vendorData.socialMediaHandle.twitter &&
                    !isValidURL(vendorData.socialMediaHandle.twitter)
                      ? "border-red-500"
                      : ""
                  }`}
                />
              </div>
              {/* Upload Image */}
              <h3 className="text-md font-semibold mb-4 font-opensans flex items-center">
                <TiCameraOutline className="w-5 h-5 mr-2 text-xl text-header" />
                Upload Image
              </h3>
              <div className="border-2 border-dashed border-customBrown rounded-lg h-48 w-full text-center mb-6">
                <div
                  className={`w-full h-full flex items-center justify-center cursor-pointer relative`}
                  onClick={() =>
                    document.getElementById("shopImageUpload").click()
                  }
                >
                  {vendorData.coverImageUrl ? (
                    <>
                      <img
                        src={vendorData.coverImageUrl}
                        alt="Uploaded Shop"
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        className="absolute top-2 right-2 bg-customBrown text-white rounded-full p-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setVendorData((prev) => ({
                            ...prev,
                            coverImageUrl: null,
                          })); // Clear the image URL
                          // Optionally, delete the image from Firebase Storage here
                        }}
                      >
                        <GoTrash className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <div className="p-12 flex flex-col justify-center items-center text-center">
                      <BiSolidImageAdd
                        size={60}
                        className="mb-4 text-customOrange opacity-40"
                      />
                      <label
                        htmlFor="shopImageUpload"
                        className="text-orange-500 font-light font-opensans text-xs cursor-pointer"
                      >
                        Upload shop image here. Image must be clear and not more
                        than 3MB.
                      </label>
                    </div>
                  )}
                  {/* Loader overlay when uploading */}
                  {isCoverImageUploading && (
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
                </div>

                <input
                  type="file"
                  id="shopImageUpload"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e)}
                />
              </div>
              <motion.button
                type="button"
                className={`w-full h-12 text-white rounded-full ${
                  isFormComplete()
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

          {/* Step 3: Bank Details for Online Vendor */}

          {step === 3 && vendorData.marketPlaceType === "virtual" && (
            <div className="p-2 mt-3">
              <h2 className="text-xs text-customOrange font-light font-opensans mb-3">
                Step 2: Bank Details
              </h2>
              <ProgressBar step={2} />

              <h3 className="text-md font-semibold font-opensans text-black mt-3 mb-3 flex items-center">
                <AiOutlineBank className="w-5 h-5 mr-3 font-opensans text-header" />
                Bank Details
              </h3>

              {/* Bank Dropdown */}
              <div className="relative w-full mb-4">
                <label
                  htmlFor="bank-select"
                  className="block text-sm font-opensans font-medium text-gray-700"
                >
                  Select Bank
                </label>
                <select
                  id="bank-select"
                  name="bankName"
                  value={bankDetails.bankCode || ""}
                  onChange={(e) => {
                    const selectedBankCode = e.target.value;
                    console.log("Selected Bank Code:", selectedBankCode); // Log the selected bank code

                    const selectedBank = banks.find(
                      (bank) => bank.code === selectedBankCode
                    );

                    if (selectedBank) {
                      console.log("Selected Bank Details:", selectedBank); // Log the selected bank object

                      // Update bank details state directly
                      setBankDetails({
                        ...bankDetails,
                        bankName: selectedBank.name,
                        bankCode: selectedBank.code, // Update bankCode as well
                      });

                      setSelectedBank(selectedBank); // Optional: Set selected bank for further use
                    }
                  }}
                  className="w-full h-12 px-3 border-2 rounded-lg font-opensans text-gray-800 hover:border-customOrange focus:outline-none focus:border-customOrange"
                >
                  <option value="" disabled>
                    Select Bank
                  </option>
                  {banks.map((bank) => (
                    <option key={bank.code} value={bank.code}>
                      {bank.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Number Field */}
              <div className="relative w-full">
                <input
                  type="text"
                  name="accountNumber"
                  value={bankDetails.accountNumber || ""}
                  onChange={async (e) => {
                    const value = e.target.value;

                    console.log(`Account Number Entered: ${value}`); // Log the entered value

                    if (/^\d*$/.test(value) && value.length <= 10) {
                      setBankDetails((prevDetails) => ({
                        ...prevDetails,
                        accountNumber: value,
                        ...(value.length < 10
                          ? {
                              accountName: "",
                              error: "",
                            }
                          : {}),
                      }));

                      if (value.length === 10 && selectedBank) {
                        console.log(
                          `Starting API call with account number: ${value}`
                        );
                        console.log(`Selected Bank Code: ${selectedBank.code}`);

                        const token = import.meta.env.VITE_RESOLVE_TOKEN;
                        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
                        const accountNumber = value;

                        try {
                          setIsResolving(true);

                          // Build URL using query parameters
                          const url = `${API_BASE_URL}/resolveAccount?accountNumber=${accountNumber}&bankCode=${selectedBank.code}`;
                          console.log(`API URL: ${url}`);

                          const res = await fetch(url, {
                            method: "GET",
                            headers: {
                              Authorization: `Bearer ${token}`,
                              Accept: "application/json",
                            },
                          });

                          const data = await res.json();
                          console.log(`API Response:`, data);

                          if (res.ok && data.status === true && data.data) {
                            console.log(
                              `Resolved Account Name: ${data.data.account_name}`
                            );
                            setBankDetails((prevDetails) => ({
                              ...prevDetails,
                              accountName: data.data.account_name,
                              error: "",
                            }));
                            toast.success("Account resolved successfully");
                          } else {
                            console.error(
                              `API Error: ${data.message || "Invalid response"}`
                            );
                            setBankDetails((prevDetails) => ({
                              ...prevDetails,
                              accountName: "",
                              error: data.message || "Invalid account number.",
                            }));
                            toast.error(
                              data.message || "Failed to resolve account number"
                            );
                          }
                        } catch (error) {
                          console.error(`Error during API call:`, error);
                          toast.error(
                            "Error resolving account number. Please try again."
                          );
                          setBankDetails((prevDetails) => ({
                            ...prevDetails,
                            accountName: "",
                            error: "Error resolving account number.",
                          }));
                        } finally {
                          setIsResolving(false);
                        }
                      }
                    }
                  }}
                  placeholder="Enter Account Number (10 digits)"
                  disabled={isResolving}
                  className="w-full h-12 px-3 pr-10 border-2 font-opensans text-neutral-800 rounded-lg hover:border-customOrange focus:outline-none focus:border-customOrange mb-1"
                />
                {isResolving && (
                  <div className="absolute inset-y-0 right-3 flex items-center">
                    <RotatingLines
                      strokeColor="orange"
                      strokeWidth="5"
                      animationDuration="0.75"
                      width="24"
                      visible={true}
                    />
                  </div>
                )}
              </div>

              {/* Display error message if any */}
              {bankDetails.error && (
                <p className="text-lg text-red-500 text-center mt-8 font-ubuntu">
                  ❌{bankDetails.error}
                </p>
              )}

              {/* Display resolved account details if successful */}
              {!bankDetails.error && bankDetails.accountName && (
                <div className="mt-6">
                  <div className="mb-4">
                    <label className="font-opensans text-sm text-neutral-800 font-bold block mb-1">
                      Account Name
                    </label>
                    <input
                      type="text"
                      value={bankDetails.accountName}
                      disabled
                      className="w-full h-12 px-3 border-2 font-opensans text-neutral-800 rounded-lg bg-gray-100"
                    />
                  </div>
                </div>
              )}

              {/* Next Button */}
              <div className="mt-4">
                <motion.button
                  type="button"
                  className={`w-11/12 h-12 fixed bottom-6 left-0 right-0 mx-auto flex justify-center items-center text-white rounded-full ${
                    bankDetails.accountName && selectedBank && !isResolving
                      ? "bg-customOrange"
                      : "bg-customOrange opacity-50 cursor-not-allowed"
                  }`}
                  disabled={
                    !(bankDetails.accountName && selectedBank) || isResolving
                  }
                  onClick={handleValidation}
                >
                  Next
                </motion.button>
              </div>
            </div>
          )}

          {/* Step 4: Delivery Mode for Online Vendor */}
          {step === 4 && vendorData.marketPlaceType === "virtual" && (
            <div className="p-2 mt-3 ">
              <h2 className="text-xs text-customOrange font-light font-opensans mb-3">
                Step 3: Delivery Mode
              </h2>
              <ProgressBar step={3} />

              <h3 className="text-md font-semibold font-opensans text-header mt-3 mb-3 flex items-center">
                <TbTruckDelivery className="w-5 h-5 mr-2 text-black font-opensans" />
                Delivery Mode
              </h3>

              <p className="text-black font-light text-sm mb-4 font-opensans">
                Choose a delivery mode for your brand
              </p>

              {/* Delivery Mode Options */}
              <div className="">
                {/* Delivery Option - Selectable */}
                <div
                  onClick={() => handleDeliveryModeChange("Delivery")}
                  className={`border-0 p-2 mb-4 rounded-lg cursor-pointer flex justify-between items-center ${
                    deliveryMode === "Delivery"
                      ? "border-customOrange"
                      : "border-gray-200"
                  }`}
                >
                  <span className="font-opensans">Delivery</span>
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex justify-center items-center ${
                      deliveryMode === "Delivery"
                        ? "border-customOrange"
                        : "border-gray-200"
                    }`}
                  >
                    {deliveryMode === "Delivery" && (
                      <div className="w-3 h-3 rounded-full bg-orange-500" />
                    )}
                  </div>
                </div>

                {/* Pickup Option - Grayed Out, Not Selectable */}
                <div className="border-0 p-2 mb-4 rounded-lg cursor-not-allowed flex justify-between items-center border-gray-200 opacity-50">
                  <span className="font-opensans text-gray-400">Pickup</span>
                  <div className="w-6 h-6 rounded-full border-2 flex justify-center items-center border-gray-200">
                    {/* No inner circle for non-selectable options */}
                  </div>
                </div>

                {/* Delivery & Pickup Option - Grayed Out, Not Selectable */}
                <div className="border-0 p-2 mb-60 rounded-lg cursor-not-allowed flex justify-between items-center border-gray-200 opacity-50">
                  <span className="font-opensans text-gray-400">
                    Delivery & Pickup
                  </span>
                  <div className="w-6 h-6 rounded-full border-2 flex justify-center items-center border-gray-200">
                    {/* No inner circle for non-selectable options */}
                  </div>
                </div>
              </div>

              <motion.button
                type="button" // Prevent form submission
                className={`w-11/12 h-12 fixed bottom-6 left-0 right-0 mx-auto flex justify-center items-center text-white font-opensans rounded-full ${
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

          {/* Step 5: ID Verification for Online Vendor */}
          {step === 5 && vendorData.marketPlaceType === "virtual" && (
            <div className="p-2 mt-3 ">
              <h2 className="text-xs text-customOrange font-light font-opensans mb-3">
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

              <motion.button
                type="submit"
                className={`w-11/12 h-12 fixed bottom-6 left-0 right-0 mx-auto flex justify-center font-opensans items-center text-white rounded-full ${
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

export default VirtualVendor;
