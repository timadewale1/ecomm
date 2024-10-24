import React from "react";
import { motion } from "framer-motion";
import { FormGroup } from "reactstrap";
import {
  AiOutlineIdcard,
  AiOutlineCamera,
  AiOutlineBank,
  AiOutlineFileProtect,
} from "react-icons/ai";
import { useState } from "react";
import { BiSolidImageAdd } from "react-icons/bi";
import { FaTruck } from "react-icons/fa";
import ProgressBar from "./ProgressBar";
import { FaMinusCircle } from "react-icons/fa";
import toast from "react-hot-toast";
import { RotatingLines } from "react-loader-spinner";
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
  handleIdImageUpload,
  handleProfileCompletion,
  banks,
  isLoading,
}) => {
  const [searchTerm, setSearchTerm] = useState(""); // State to handle search input

  // Handle validation for vendor form (Step 1)
  const handleValidation = () => {
    if (!vendorData.brandName) {
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
    if (!vendorData.brandAddress) {
      toast.error("Please fill in the brand address", {
        position: toast.POSITION.TOP_RIGHT,
      });
      return false;
    }
    if (!vendorData.location) {
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

  // You can define the "isFormComplete" logic to check the entire form completion:
  const isFormComplete =
    vendorData.brandName &&
    vendorData.phoneNumber.length === 11 &&
    vendorData.brandAddress &&
    vendorData.location &&
    vendorData.complexNumber &&
    vendorData.categories.length > 0 &&
    vendorData.daysAvailability &&
    vendorData.openTime &&
    vendorData.closeTime;

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
            <div className="p-3 mt-2">
              <h2 className="text-xl font-semibold text-customBrown">
                Create Shop
              </h2>
              <p className="text-neutral-400 mb-4">
                Set up your brand to get customers and sell products.
              </p>
              <p className="text-sm text-customOrange mb-3">
                Step 1: Business Information
              </p>

              {/* Progress bar */}
              <ProgressBar step={1} />

              {/* Brand Info for Market Vendor */}
              <h3 className="text-md font-semibold mb-3 flex items-center mt-3">
                <AiOutlineIdcard className="w-5 h-5 mr-2 text-header" />
                Brand Info
              </h3>

              <input
                type="text"
                name="brandName"
                placeholder="Brand Name"
                value={vendorData.brandName}
                onChange={handleInputChange}
                className="w-full h-12 mb-4 p-3 border-2 rounded-lg hover:border-customOrange 
            focus:outline-none focus:border-customOrange"
              />
              <input
                type="tel"
                name="phoneNumber"
                placeholder="Brand Phone Number"
                maxLength="11" // Limits input to 11 digits
                value={vendorData.phoneNumber}
                onChange={(e) => {
                  const re = /^[0-9\b]+$/; // Regular expression to allow only numbers and backspace
                  if (e.target.value === "" || re.test(e.target.value)) {
                    handleInputChange(e); // Only update state if input is valid (only numbers)
                  }
                }}
                className="w-full h-12 mb-4 p-3 border-2 rounded-lg focus:outline-none focus:border-customOrange hover:border-customOrange"
              />

              <input
                type="text"
                name="brandAddress"
                placeholder="Brand Address"
                value={vendorData.brandAddress}
                onChange={handleInputChange}
                className="w-full h-12 mb-4 p-3 border-2 rounded-lg hover:border-customOrange 
            focus:outline-none focus:border-customOrange"
              />

              {/* Location and Complex */}
              <FormGroup className="relative mb-4">
                <select
                  name="location"
                  value={vendorData.location}
                  onChange={handleInputChange}
                  className={`w-full h-14 p-3 pr-10 border border-gray-300 rounded-lg bg-white text-left appearance-none focus:outline-none focus:ring-2 focus:ring-customOrange ${
                    vendorData.location === ""
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
                  {/* Placeholder Option */}
                  <option value="" className="text-neutral-400">
                    Choose Location
                  </option>

                  {/* Location Options */}
                  <option value="Ikeja">Ikeja</option>
                  <option value="Surulere">Surulere</option>
                  <option value="Yaba">Yaba</option>
                  <option value="Victoria Island">Victoria Island</option>
                  <option value="Ikoyi">Ikoyi</option>
                  <option value="Lekki">Lekki</option>
                  <option value="Ajah">Ajah</option>
                  <option value="Epe">Epe</option>
                  <option value="Badagry">Badagry</option>
                  <option value="Ikorodu">Ikorodu</option>
                  <option value="Oshodi">Oshodi</option>
                  <option value="Mushin">Mushin</option>
                  <option value="Agege">Agege</option>
                  <option value="Alimosho">Alimosho</option>
                  <option value="Ifako-Ijaiye">Ifako-Ijaiye</option>
                  <option value="Isolo">Isolo</option>
                  <option value="Ojo">Ojo</option>
                  <option value="Festac">Festac</option>
                  <option value="Somolu">Somolu</option>
                  <option value="Amuwo Odofin">Amuwo Odofin</option>
                  <option value="Eti-Osa">Eti-Osa</option>
                  <option value="Ibeju-Lekki">Ibeju-Lekki</option>
                </select>
              </FormGroup>

              <input
                type="text"
                name="complexNumber"
                placeholder="Complex & Number"
                value={vendorData.complexNumber}
                onChange={handleInputChange}
                className="w-full h-12 mb-4 p-3 border-2 rounded-lg hover:border-customOrange 
            focus:outline-none focus:border-customOrange"
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

              {/* Days of Availability */}
              <FormGroup className="relative mb-4">
                <select
                  name="daysAvailability"
                  value={vendorData.daysAvailability}
                  onChange={handleInputChange}
                  className={`w-full h-12 px-4 pr-10 border border-gray-300 rounded-lg bg-white text-left appearance-none focus:outline-none focus:ring-2 focus:ring-customOrange ${
                    vendorData.daysAvailability === ""
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
                  {/* Placeholder Option */}
                  <option value="" className="text-neutral-400">
                    Days of Availability
                  </option>

                  {/* Available Days Options */}
                  <option value="Monday to Friday">Monday to Friday</option>
                  <option value="Weekends">Weekends</option>
                </select>
              </FormGroup>

              {/* brand description */}

              <input
                type="text"
                name="brandDescription"
                placeholder="Brand Description"
                value={vendorData.brandDescription}
                onChange={handleInputChange}
                className="w-full h-12 mb-3 p-3 border-2 font-opensans text-black rounded-lg focus:outline-none focus:border-customOrange hover:border-customOrange"
              />

              {/* Open and Close time */}
              <div className="flex justify-between mb-4">
                {/* Open Time */}
                <FormGroup className="w-1/2 mr-2">
                  <select
                    name="openTime"
                    value={vendorData.openTime}
                    onChange={handleInputChange}
                    className={`w-full h-16 px-4 pr-10 border border-gray-300 rounded-lg bg-white text-left appearance-none focus:outline-none focus:ring-2 focus:ring-customOrange ${
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
                    className={`w-full h-16 px-4 pr-10 border border-gray-300 rounded-lg bg-white text-left appearance-none focus:outline-none focus:ring-2 focus:ring-customOrange ${
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
                whileTap={{ scale: 1.05 }}
                className={`w-full h-12 text-white rounded-full ${
                  isFormComplete
                    ? "bg-customOrange"
                    : "bg-customOrange opacity-50"
                }`}
                onClick={handleValidation} // Enable the button and handle validation on click
              >
                Next
              </motion.button>
            </div>
          )}

          {/* Step 3: Bank Details */}
          {step === 3 && (
            <div className="p-2 mt-3">
              <h2 className="text-sm text-customOrange mb-3">
                Step 2: Bank Details
              </h2>
              {/* Progress bar */}
              <ProgressBar step={2} />

              <h3 className="text-md font-semibold mt-3 mb-3 flex items-center">
                <AiOutlineBank className="w-5 h-5 mr-2 text-header" />
                Bank Details
              </h3>

              {/* Bank Name Dropdown */}
              <FormGroup className="relative mb-4">
                <select
                  name="bankName"
                  value={bankDetails.bankName}
                  onChange={handleBankDetailsChange}
                  className={`w-full h-16 px-4 pr-10 border border-gray-300 rounded-lg bg-white text-left appearance-none focus:outline-none focus:ring-2 focus:ring-customOrange ${
                    bankDetails.bankName === ""
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
                  {/* Placeholder Option */}
                  <option value="" className="text-neutral-400">
                    Bank Name
                  </option>

                  {/* Bank Name Options */}
                  {banks.map((bank, index) => (
                    <option key={index} value={bank}>
                      {bank}
                    </option>
                  ))}
                </select>
              </FormGroup>

              {/* Account Number Field */}
              <input
                type="tel"
                name="accountNumber"
                placeholder="Account Number"
                value={bankDetails.accountNumber}
                maxLength="10" // Ensures a maximum of 11 digits
                onChange={(e) => {
                  const re = /^[0-9\b]+$/; // Regular expression to allow only numbers and backspace
                  if (e.target.value === "" || re.test(e.target.value)) {
                    handleBankDetailsChange(e); // Update state only if valid input
                  }
                }}
                className="w-full h-16 mb-4 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-customOrange"
              />

              {/* Account Name Field */}
              <input
                type="text"
                name="accountName"
                placeholder="Account Name"
                value={bankDetails.accountName}
                onChange={handleBankDetailsChange}
                className="w-full h-16 mb-48 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-customOrange"
              />

              {/* Next Button */}
              <motion.button
                whileTap={{ scale: 1.05 }}
                className={`w-full h-12 text-white rounded-full ${
                  isFormBankComplete
                    ? "bg-customOrange"
                    : "bg-customOrange opacity-50"
                }`}
                onClick={handleBankValidation} // Enable the button and handle validation on click
              >
                Next
              </motion.button>
            </div>
          )}

          {/* Step 5: Delivery Mode */}
          {step === 4 && (
            <div className="p-2 mt-3">
              <h2 className="text-sm text-customOrange mb-3">
                Step 3: Delivery Mode
              </h2>

              {/* Progress bar */}
              <ProgressBar step={3} />

              <h3 className="text-md font-semibold mt-3 mb-3 flex items-center">
                <FaTruck className="w-5 h-5 mr-2 text-header" />
                Delivery Mode
              </h3>

              <p className="text-neutral-400 mb-4">
                Choose a delivery mode for your brand
              </p>

              {/* Delivery Mode Options */}
              <div className="mb-72">
                <div
                  onClick={() => handleDeliveryModeChange("Pickup")}
                  className={`border p-4 mb-4 rounded-lg cursor-pointer flex justify-between items-center ${
                    deliveryMode === "Pickup"
                      ? "border-customOrange"
                      : "border-customOrange"
                  }`}
                >
                  <span>Pickup</span>
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
                whileTap={{ scale: 1.05 }}
                className={`w-full h-12 text-white rounded-full ${
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
            <div className="p-2 mt-3">
              <h2 className="text-sm text-customOrange mb-3">
                Step 4: Verification
              </h2>

              {/* Progress bar */}
              <ProgressBar step={4} />

              <h3 className="text-md font-semibold mt-3 mb-3 flex items-center">
                <AiOutlineFileProtect className="w-5 h-5 mr-2 text-header" />
                ID Verification
              </h3>

              {/* ID Verification Type Dropdown */}
              <FormGroup className="relative mb-4">
                <select
                  name="idVerification"
                  value={idVerification}
                  onChange={handleIdVerificationChange}
                  className="w-full h-16 p-3 border-2 rounded-lg bg-white text-gray-700 text-left appearance-none focus:outline-none focus:border-customOrange"
                  style={{
                    backgroundImage:
                      "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22%23666666%22 viewBox=%220 0 20 20%22><path d=%22M5.516 7.548l4.486 4.486 4.485-4.486a.75.75 0 111.06 1.06l-5.015 5.015a.75.75 0 01-1.06 0L5.516 8.608a.75.75 0 111.06-1.06z%22 /></svg>')",
                    backgroundPosition: "right 1rem center",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "1rem",
                  }}
                >
                  <option value="">Select verification type</option>
                  <option value="NIN">NIN</option>
                  <option value="International Passport">
                    International Passport
                  </option>
                  <option value="CAC">CAC</option>
                </select>
              </FormGroup>

              {/* Upload ID Image */}
              <h3 className="text-md font-semibold mb-3 flex items-center">
                <AiOutlineCamera className="w-5 h-5 mr-2 text-header" />
                Upload ID
              </h3>
              <div className="border-2 border-customBrown border-dashed rounded-lg h-48 w-full text-center mb-6">
                {idImage ? (
                  <div className="relative w-full h-full">
                    <img
                      src={URL.createObjectURL(idImage)}
                      alt="Uploaded ID"
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      className="absolute top-2 right-2 bg-customOrange text-white rounded-full p-1"
                      onClick={() =>
                        handleIdImageUpload({ target: { files: [] } })
                      } // Clear the image by triggering the file input
                    >
                      <FaMinusCircle className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="border-dashed rounded-lg h-48 w-full text-center mb-6 flex flex-col justify-center items-center">
                      {idImage ? (
                        <label
                          htmlFor="idImageUpload"
                          className="cursor-pointer w-full h-full"
                        >
                          <img
                            src={URL.createObjectURL(idImage)}
                            alt="Uploaded ID"
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </label>
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
                          />

                          <label
                            htmlFor="idImageUpload"
                            className="text-customOrange font-opensans cursor-pointer text-sm"
                          >
                            Upload ID image
                          </label>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Next Button */}
              <motion.button
  type="submit"
  className={`w-full h-12 text-white mt-28 rounded-full ${
    idVerification && idImage
      ? "bg-customOrange"
      : "bg-customOrange opacity-20"
  } flex justify-center items-center`}
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
