import React from "react";
import { motion } from "framer-motion";
import { FormGroup } from "reactstrap";
import {
  AiOutlineIdcard,
  AiOutlineCamera,
  AiOutlineBank,
  AiOutlineFileProtect,
} from "react-icons/ai";
import { BiSolidImageAdd } from "react-icons/bi";
import { FaTruck } from "react-icons/fa";
import CustomProgressBar from "./CustomProgressBar";

const MarketVendor = ({
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
  banks,
}) => {
  return (
    <div>
      {" "}
      {vendorData.marketPlaceType === "marketplace" && (
        <>
          {/* Step 2: Create Shop */}
          {step === 2 && (
            <div className="p-3 mt-10">
              <h2 className="text-xl font-semibold text-customBrown">
                Create Shop
              </h2>
              <p className="text-gray-600 mb-4">
                Set up your brand to get customers and sell products.
              </p>
              <p className="text-sm text-orange-500 mb-3">
                Step 1: Business Information
              </p>

              {/* Progress bar */}
              <CustomProgressBar percent={getProgress()} />

              {/* Brand Info for Market Vendor */}
              <h3 className="text-md font-semibold mb-3 flex items-center mt-3">
                <AiOutlineIdcard className="w-5 h-5 mr-2 text-gray-600" />
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
                pattern="[0-9]*"
                maxLength="11"
                value={vendorData.phoneNumber}
                onChange={handleInputChange}
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
                  className="w-full h-16 px-4 pr-10 border border-gray-300 rounded-lg bg-white text-gray-700 text-left appearance-none focus:outline-none focus:ring-2 focus:ring-customOrange"
                  style={{
                    backgroundImage:
                      "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22%23666666%22 viewBox=%220 0 20 20%22><path d=%22M5.516 7.548l4.486 4.486 4.485-4.486a.75.75 0 111.06 1.06l-5.015 5.015a.75.75 0 01-1.06 0L5.516 8.608a.75.75 0 111.06-1.06z%22 /></svg>')",
                    backgroundPosition: "right 1rem center",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "1rem",
                  }}
                >
                  <option value="">Choose Location</option>
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
                    className="w-full h-16 mb-4 p-3 border-2 rounded-lg bg-white text-gray-700 text-left flex items-center justify-between"
                  >
                    {vendorData.categories.length > 0
                      ? vendorData.categories.join(", ")
                      : "Select Brand Category"}
                    <svg
                      className="fill-current h-4 w-4 text-gray-700"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                    >
                      <path d="M5.516 7.548l4.486 4.486 4.485-4.486a.75.75 0 1 1 1.06 1.06l-5.015 5.015a.75.75 0 0 1-1.06 0l-5.015-5.015a.75.75 0 1 1 1.06-1.06z" />
                    </svg>
                  </button>

                  {showDropdown && (
                    <div className="absolute w-full bg-white border rounded-lg z-10">
                      {categories.map((category, index) => (
                        <div key={index} className="p-2">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              value={category}
                              checked={vendorData.categories.includes(category)}
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
                              className="mr-2"
                            />
                            {category}
                          </label>
                        </div>
                      ))}
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
                  className="w-full h-16 px-4 pr-10 border border-gray-300 rounded-lg bg-white text-gray-700 text-left appearance-none focus:outline-none focus:ring-2 focus:ring-customOrange"
                  style={{
                    backgroundImage:
                      "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22%23666666%22 viewBox=%220 0 20 20%22><path d=%22M5.516 7.548l4.486 4.486 4.485-4.486a.75.75 0 111.06 1.06l-5.015 5.015a.75.75 0 01-1.06 0L5.516 8.608a.75.75 0 111.06-1.06z%22 /></svg>')",
                    backgroundPosition: "right 1rem center",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "1rem",
                  }}
                >
                  <option value="">Days of Availability</option>
                  <option value="Monday to Friday">Monday to Friday</option>
                  <option value="Weekends">Weekends</option>
                </select>
              </FormGroup>

              {/* Open and Close time */}
              <div className="flex justify-between mb-4">
                <FormGroup className="w-1/2 mr-2">
                  <select
                    name="openTime"
                    value={vendorData.openTime}
                    onChange={handleInputChange}
                    className="w-full h-16 px-4 pr-10 border border-gray-300 rounded-lg bg-white text-gray-700 text-left appearance-none focus:outline-none focus:ring-2 focus:ring-customOrange"
                    style={{
                      backgroundImage:
                        "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22%23666666%22 viewBox=%220 0 20 20%22><path d=%22M5.516 7.548l4.486 4.486 4.485-4.486a.75.75 0 111.06 1.06l-5.015 5.015a.75.75 0 01-1.06 0L5.516 8.608a.75.75 0 111.06-1.06z%22 /></svg>')",
                      backgroundPosition: "right 1rem center",
                      backgroundRepeat: "no-repeat",
                      backgroundSize: "1rem",
                    }}
                  >
                    <option value="">Open time</option>
                    <option value="7:00 AM">7:00 AM</option>
                    <option value="8:00 AM">8:00 AM</option>
                    <option value="9:00 AM">9:00 AM</option>
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="11:00 AM">11:00 AM</option>
                    <option value="12:00 PM">12:00 PM</option>
                  </select>
                </FormGroup>

                <FormGroup className="w-1/2">
                  <select
                    name="closeTime"
                    value={vendorData.closeTime}
                    onChange={handleInputChange}
                    className="w-full h-16 px-4 pr-10 border border-gray-300 rounded-lg bg-white text-gray-700 text-left appearance-none focus:outline-none focus:ring-2 focus:ring-customOrange"
                    style={{
                      backgroundImage:
                        "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22%23666666%22 viewBox=%220 0 20 20%22><path d=%22M5.516 7.548l4.486 4.486 4.485-4.486a.75.75 0 111.06 1.06l-5.015 5.015a.75.75 0 01-1.06 0L5.516 8.608a.75.75 0 111.06-1.06z%22 /></svg>')",
                      backgroundPosition: "right 1rem center",
                      backgroundRepeat: "no-repeat",
                      backgroundSize: "1rem",
                    }}
                  >
                    <option value="">Closing time</option>
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
                  vendorData.brandName &&
                  vendorData.phoneNumber &&
                  vendorData.brandAddress &&
                  vendorData.location &&
                  vendorData.complexNumber &&
                  vendorData.categories &&
                  vendorData.daysAvailability &&
                  vendorData.openTime &&
                  vendorData.closeTime
                    ? "bg-customOrange"
                    : "bg-customOrange opacity-20"
                }`}
                onClick={handleNextStep}
                disabled={
                  !vendorData.brandName ||
                  !vendorData.phoneNumber ||
                  !vendorData.brandAddress ||
                  !vendorData.location ||
                  !vendorData.complexNumber ||
                  !vendorData.categories ||
                  !vendorData.daysAvailability ||
                  !vendorData.openTime ||
                  !vendorData.closeTime
                }
              >
                Next
              </motion.button>
            </div>
          )}

          {/* Step 3: Bank Details */}
          {step === 3 && (
            <div className="p-2 mt-14">
              <h2 className="text-sm text-orange-500 mb-3">
                Step 2: Bank Details
              </h2>
              {/* Progress bar */}
              <CustomProgressBar percent={getProgress()} />

              <h3 className="text-md font-semibold mt-3 mb-3 flex items-center">
                <AiOutlineBank className="w-5 h-5 mr-2 text-gray-600" />
                Bank Details
              </h3>

              {/* Bank Name Dropdown */}
              <FormGroup className="relative mb-4">
                <select
                  name="bankName"
                  value={bankDetails.bankName}
                  onChange={handleBankDetailsChange}
                  className="w-full h-16 px-4 pr-10 border border-gray-300 rounded-lg bg-white text-gray-700 text-left appearance-none focus:outline-none focus:ring-2 focus:ring-customOrange"
                  style={{
                    backgroundImage:
                      "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22%23666666%22 viewBox=%220 0 20 20%22><path d=%22M5.516 7.548l4.486 4.486 4.485-4.486a.75.75 0 111.06 1.06l-5.015 5.015a.75.75 0 01-1.06 0L5.516 8.608a.75.75 0 111.06-1.06z%22 /></svg>')",
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
              </FormGroup>

              {/* Account Number Field */}
              <input
                type="tel"
                name="accountNumber"
                placeholder="Account Number"
                value={bankDetails.accountNumber}
                pattern="[0-9]*"
                maxLength="11"
                onChange={handleBankDetailsChange}
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
                  bankDetails.bankName &&
                  bankDetails.accountNumber &&
                  bankDetails.accountName
                    ? "bg-customOrange"
                    : "bg-customOrange opacity-20"
                }`}
                onClick={handleNextStep}
                disabled={
                  !bankDetails.bankName ||
                  !bankDetails.accountNumber ||
                  !bankDetails.accountName
                }
              >
                Next
              </motion.button>
            </div>
          )}

          {/* Step 5: Delivery Mode */}
          {step === 4 && (
            <div className="p-2 mt-14">
              <h2 className="text-sm text-orange-500 mb-3">
                Step 3: Delivery Mode
              </h2>

              {/* Progress bar */}
              <CustomProgressBar percent={getProgress()} />

              <h3 className="text-md font-semibold mt-3 mb-3 flex items-center">
                <FaTruck className="w-5 h-5 mr-2 text-gray-600" />
                Delivery Mode
              </h3>

              <p className="text-gray-700 mb-4">
                Choose a delivery mode for your brand
              </p>

              {/* Delivery Mode Options */}
              <div className="mb-72">
                <div
                  onClick={() => handleDeliveryModeChange("Pickup")}
                  className={`border p-4 mb-4 rounded-lg cursor-pointer flex justify-between items-center ${
                    deliveryMode === "Pickup"
                      ? "border-customOrange"
                      : "border-gray-300"
                  }`}
                >
                  <span>Pickup</span>
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex justify-center items-center ${
                      deliveryMode === "Pickup"
                        ? "border-customOrange"
                        : "border-gray-300"
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
            <div className="p-2 mt-14">
              <h2 className="text-sm text-orange-500 mb-3">
                Step 4: Verification
              </h2>

              {/* Progress bar */}
              <CustomProgressBar percent={getProgress()} />

              <h3 className="text-md font-semibold mt-3 mb-3 flex items-center">
                <AiOutlineFileProtect className="w-5 h-5 mr-2 text-gray-600" />
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
                <AiOutlineCamera className="w-5 h-5 mr-2 text-gray-600" />
                Upload ID
              </h3>
              <div className="border-2 border-dashed rounded-lg p-16 text-center mb-6">
                {idImage ? (
                  <img
                    src={URL.createObjectURL(idImage)}
                    alt="Uploaded ID"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <>
                    <label htmlFor="idImageUpload" className="cursor-pointer">
                      <BiSolidImageAdd
                        size={40}
                        className="mb-4 text-customOrange opacity-40"
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
                      className="text-customOrange cursor-pointer"
                    >
                      Upload ID image here
                    </label>
                  </>
                )}
              </div>

              {/* Next Button */}
              <motion.button
                whileTap={{ scale: 1.2 }}
                type="submit"
                className={`w-full h-12 text-white mt-14 rounded-full ${
                  idVerification && idImage
                    ? "bg-customOrange"
                    : "bg-customOrange opacity-20"
                }`}
                disabled={!idVerification || !idImage}
              >
                Complete Profile
              </motion.button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MarketVendor;
