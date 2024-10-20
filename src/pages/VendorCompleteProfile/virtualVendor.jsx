import React from "react";
import { motion } from "framer-motion";
import { FormGroup } from "reactstrap";
import { FaXTwitter } from "react-icons/fa6";
import { FaInstagram } from "react-icons/fa";
import { TiCameraOutline } from "react-icons/ti";
import { CiFacebook } from "react-icons/ci";
import {
  AiOutlineCamera,
  AiOutlineBank,
  AiOutlineFileProtect,
} from "react-icons/ai";
import { useState } from "react";
import { BiSolidImageAdd } from "react-icons/bi";
import { PiIdentificationCardThin } from "react-icons/pi";
import { FaIdCard } from "react-icons/fa";
import { TbTruckDelivery } from "react-icons/tb";
import CustomProgressBar from "./CustomProgressBar";
import { ProgressBar, Step } from "react-step-progress-bar";
import { IoShareSocial } from "react-icons/io5";
import { FaImage } from "react-icons/fa";
import { FaMinusCircle } from "react-icons/fa";
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
  banks,
}) => {
  const [searchTerm, setSearchTerm] = useState(""); // State to handle search input

  // Filter categories based on the search input
  const filteredCategories = categories.filter((category) =>
    category.toLowerCase().includes(searchTerm.toLowerCase())
  );
  return (
    <div>
      {vendorData.marketPlaceType === "virtual" && (
        <>
          {/* Step 2: Create Shop Form for Online Vendor */}
          {step === 2 && (
            <div className="p-2 mt">
              <h2 className="text-xl font-opensans  font-semibold text-customBrown">
                Create Shop
              </h2>
              <p className="text-gray-600 mt-2 font-opensans mb-4">
                Set up your brand to get customers and sell products.
              </p>
              <p className="text-sm text-customOrange mb-3">
                Step 1: Business Information
              </p>
              {/* Progress bar */}
              <ProgressBar percent={getProgress()} filledBackground="#f9531e">
                <Step transition="scale">
                  {({ accomplished }) => (
                    <div
                      className={`transitionAll ${
                        accomplished ? "completed" : ""
                      }`}
                    />
                  )}
                </Step>
              </ProgressBar>
              {/* Brand Info */}
              <h3 className="text-md font-semibold mb-3 font-opensans  flex items-center mt-3">
                <FaIdCard className="w-5 h-5 mr-2 text-black" />
                Brand Info
              </h3>
              <input
                type="text"
                name="shopName"
                placeholder="Brand Name"
                value={vendorData.shopName}
                onChange={handleInputChange}
                className="w-full h-12 mb-3 p-3 border-2 font-opensans text-black rounded-lg hover:border-customOrange 
                      focus:outline-none focus:border-customOrange"
              />
              <input
                type="text"
                name="complexName"
                placeholder="Brand Address"
                value={vendorData.complexName}
                onChange={handleInputChange}
                className="w-full h-12 mb-3 p-3 font-opensans text-black border-2 rounded-lg hover:border-customOrange 
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
                className="w-full h-12 mb-3 p-3 border-2 rounded-lg font-opensans text-black focus:outline-none focus:border-customOrange hover:border-customOrange"
              />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="w-full h-12 mb-3 p-3 border-2 rounded-lg bg-white text-black font-opensans text-left flex items-center justify-between"
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
                  <div className="absolute w-full bg-white border  rounded-lg z-10">
                    {/* Search Input */}
                    <div className="p-2">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search categories..."
                        className="w-full p-2 border rounded-lg"
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
                                className="mr-2"
                              />
                              {category}
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
                onChange={handleInputChange}
                className="w-full h-12 mb-3 p-3 border-2 font-opensans text-black rounded-lg focus:outline-none focus:border-customOrange hover:border-customOrange"
              />

              {/* Categories */}
              {/* Social Media */}
              <h3 className="text-md font-semibold mb-3 font-opensans flex items-center">
                <IoShareSocial className="w-5 h-5 mr-2 text-black" />
                Social Media
              </h3>
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
                  className="w-full h-12 pl-12 pr-3 border-2 rounded-lg focus:outline-none focus:border-customOrange hover:border-customOrange"
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
                  className="w-full h-12 pl-12 pr-3 border-2 rounded-lg focus:outline-none focus:border-customOrange hover:border-customOrange "
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
                  placeholder="X (Twitter) Link"
                  value={vendorData.socialMediaHandle.twitter}
                  onChange={handleSocialMediaChange}
                  className="w-full h-12 pl-12 pr-3 border-2 rounded-lg focus:outline-none focus:border-customOrange hover:border-customOrange "
                />
              </div>

              {/* Upload Image */}
              <h3 className="text-md font-semibold mb-3 font-opensans flex items-center">
                <TiCameraOutline className="w-5 h-5 mr-2 text-xl text-black" />
                Upload Image
              </h3>
              <div className="border-2 border-dashed border-customOrange rounded-lg h-48 w-full text-center mb-6">
                <div
                  className={`w-full h-full flex items-center justify-center cursor-pointer relative`}
                  onClick={() =>
                    document.getElementById("shopImageUpload").click()
                  }
                >
                  {vendorData.coverImage ? (
                    <>
                      <img
                        src={URL.createObjectURL(vendorData.coverImage)}
                        alt="Uploaded Shop"
                        className="w-full h-full object-cover rounded-lg" // Ensure image fills the container
                      />
                      <button
                        type="button"
                        className="absolute top-2 right-2 bg-customOrange text-white rounded-full p-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setVendorData((prev) => ({
                            ...prev,
                            coverImage: null,
                          })); // Clear the image
                        }}
                      >
                        <FaMinusCircle className="h-4 w-4" />
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
                  vendorData.shopName &&
                  vendorData.complexName &&
                  vendorData.phoneNumber &&
                  vendorData.categories.length > 0 &&
                  vendorData.coverImage && // Ensures coverImage is uploaded
                  (vendorData.socialMediaHandle.instagram || // Ensures at least one social media link is filled
                    vendorData.socialMediaHandle.facebook ||
                    vendorData.socialMediaHandle.twitter)
                    ? "bg-customOrange"
                    : "bg-customOrange opacity-20"
                }`}
                onClick={handleNextStep}
                disabled={
                  !vendorData.shopName ||
                  !vendorData.complexName ||
                  !vendorData.phoneNumber ||
                  vendorData.categories.length === 0 ||
                  !vendorData.coverImage || // Requires coverImage
                  !(
                    vendorData.socialMediaHandle.instagram || // Requires at least one social media link
                    vendorData.socialMediaHandle.facebook ||
                    vendorData.socialMediaHandle.twitter
                  )
                }
              >
                Next
              </motion.button>
            </div>
          )}

          {/* Step 3: Bank Details for Online Vendor */}
          {step === 3 && vendorData.marketPlaceType === "virtual" && (
            <div className="p-2 mt-3">
              <h2 className="text-sm text-customOrange font-opensans mb-3">
                Step 2: Bank Details
              </h2>
              {/* Progress bar */}
              <ProgressBar percent={getProgress()} filledBackground="#F97316">
                <Step transition="scale">
                  {({ accomplished }) => (
                    <div
                      className={`transitionAll ${
                        accomplished ? "completed" : ""
                      }`}
                    />
                  )}
                </Step>
              </ProgressBar>

              {/* Bank Details */}
              <h3 className="text-md font-semibold font-opensans text-black mt-3 mb-3 flex items-center">
                <AiOutlineBank className="w-5 h-5 mr-3 font-opensans text-black" />
                Bank Details
              </h3>

              {/* Bank Name Dropdown */}
              <FormGroup className="relative mb-2">
                <div className="relative font-opensans">
                  <select
                    name="bankName"
                    value={bankDetails.bankName}
                    onChange={handleBankDetailsChange}
                    className="w-full h-10 px-4 pr-10 border border-gray-300 rounded-lg bg-white text-gray-700 text-left appearance-none focus:outline-none focus:ring-2 focus:ring-customOrange"
                    style={{
                      backgroundImage:
                        "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22%23666666%22 viewBox=%220 0 20 20%22><path d=%22M5.516 7.548l4.486 4.486 4.485-4.486a.75.75 0 01 1.06 1.06l-5.015 5.015a.75.75 0 01-1.06 0l-5.015-5.015a.75.75 0 011.06-1.06z%22 /></svg>')",
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
                pattern="[0-9]*"
                maxLength="10"
                onChange={handleBankDetailsChange}
                className="w-full h-10 mb-4 p-4 border-2 font-opensans text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-customOrange"
              />

              {/* Account Name Field */}
              <input
                type="text"
                name="accountName"
                placeholder="Account Name"
                value={bankDetails.accountName}
                onChange={handleBankDetailsChange}
                className="w-full h-10 mb-48 p-4 border-2 font-opensans text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-customOrange"
              />

              {/* Next Button */}
              <div className="mt-16">
                {/* Other content of your component */}

                <motion.button
                  type="button" // Prevent form submission
                  className={`  w-full  h-12 text-white rounded-full p-2 font-opensans ${
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
            </div>
          )}

          {/* Step 4: Delivery Mode for Online Vendor */}
          {step === 4 && vendorData.marketPlaceType === "virtual" && (
            <div className="p-2 ">
              <h2 className="text-sm text-orange-500 mb-3">
                Step 3: Delivery Mode
              </h2>

              {/* Progress bar */}
              <div className="w-full overflow-hidden">
                <CustomProgressBar percent={getProgress()} />
              </div>

              <h3 className="text-md font-semibold font-opensans text-black mt-3 mb-3 flex items-center">
                <TbTruckDelivery className="w-5 h-5 mr-2 text-black" />
                Delivery Mode
              </h3>

              <p className="text-black font-light text-sm mb-4">
                Choose a delivery mode for your brand
              </p>

              {/* Delivery Mode Options */}
              <div className="">
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
                        : "border-customOrange"
                    }`}
                  >
                    {deliveryMode === "Delivery" && (
                      <div className="w-3 h-3 rounded-full bg-orange-500" />
                    )}
                  </div>
                </div>
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
                <div
                  onClick={() => handleDeliveryModeChange("Delivery & Pickup")}
                  className={`border-0 p-2 mb-60 rounded-lg cursor-pointer flex justify-between items-center ${
                    deliveryMode === "Delivery & Pickup"
                      ? "border-customOrange"
                      : "border-customOrange"
                  }`}
                >
                  <span className="font-opensans">Delivery & Pickup</span>
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex justify-center items-center ${
                      deliveryMode === "Delivery & Pickup"
                        ? "border-customOrange"
                        : "border-customOrange"
                    }`}
                  >
                    {deliveryMode === "Delivery & Pickup" && (
                      <div className="w-3 h-3 rounded-full bg-orange-500" />
                    )}
                  </div>
                </div>
              </div>

              <motion.button
                type="button" // Prevent form submission
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

          {/* Step 5: ID Verification for Online Vendor */}
          {step === 5 && vendorData.marketPlaceType === "virtual" && (
            <div className="p-2 mt-4">
              {/* Progress bar */}
              <CustomProgressBar percent={getProgress()} />

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
                      "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22%23666666%22 viewBox=%220 0 20 20%22><path d=%22M5.516 7.548l4.486 4.486 4.485-4.486a.75.75 0 01 1.06 1.06l-5.015 5.015a.75.75 0 01-1.06 0l-5.015-5.015a.75.75 0 011.06-1.06z%22 /></svg>')",
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
              <div className="border-2 border-customOrange border-dashed rounded-lg h-48 w-full text-center mb-6">
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

              {/* Submit Button */}
              <motion.button
                type="submit" // Correct type
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

export default VirtualVendor;
