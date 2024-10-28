import React, { useState } from "react";
import { motion } from "framer-motion";
import { FormGroup } from "reactstrap";
import { FaXTwitter } from "react-icons/fa6";
import { FaInstagram } from "react-icons/fa";
import { TiCameraOutline } from "react-icons/ti";
import { CiFacebook } from "react-icons/ci";
import { AiOutlineBank } from "react-icons/ai";
import { BiSolidImageAdd } from "react-icons/bi";
import { PiIdentificationCardThin } from "react-icons/pi";
import { FaIdCard, FaMinusCircle } from "react-icons/fa";
import { TbTruckDelivery } from "react-icons/tb";
import { IoShareSocial } from "react-icons/io5";
import ProgressBar from "./ProgressBar";
import toast from "react-hot-toast"; // Import from react-hot-toast
import { RotatingLines } from "react-loader-spinner"; // Import the RotatingLines spinner
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
  banks,
  setIdImage,
  isCoverImageUploading,
  isIdImageUploading,
  isLoading,
}) => {
  const handleValidation = () => {
    // Check each required field and show a specific toast error if not filled (for Step 2)
    if (step === 2) {
      if (!vendorData.shopName) {
        toast.error("Please fill in the shop name");
        return false;
      }
      if (!vendorData.Address) {
        toast.error("Please fill in Address");
        return false;
      }
      if (!vendorData.phoneNumber || vendorData.phoneNumber.length !== 11) {
        toast.error("Phone number must be 11 digits");
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
      if (
        !vendorData.socialMediaHandle.instagram &&
        !vendorData.socialMediaHandle.facebook &&
        !vendorData.socialMediaHandle.twitter
      ) {
        toast.error("Please provide at least one social media handle");
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

    // If everything is valid, call handleNextStep
    handleNextStep();
    return true;
  };

  const [searchTerm, setSearchTerm] = useState(""); // State to handle search input

  const isFormComplete = () => {
    if (step === 2) {
      return (
        vendorData.shopName &&
        vendorData.Address &&
        vendorData.phoneNumber &&
        vendorData.phoneNumber.length === 11 &&
        vendorData.categories.length > 0 &&
        vendorData.coverImageUrl &&
        (vendorData.socialMediaHandle.instagram ||
          vendorData.socialMediaHandle.facebook ||
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
    category.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              <input
                type="text"
                name="shopName"
                placeholder="Brand Name"
                value={vendorData.shopName}
                onChange={handleInputChange}
                className="w-full h-12 mb-3 p-3 border-2 font-opensans text-neutral-800 rounded-lg hover:border-customOrange 
                      focus:outline-none focus:border-customOrange"
              />
              <input
                type="text"
                name="Address"
                placeholder="Brand/Personal Address"
                value={vendorData.Address}
                onChange={handleInputChange}
                className="w-full h-12 mb-3 p-3 font-opensans text-neutral-800 border-2 rounded-lg hover:border-customOrange 
            focus:outline-none focus:border-customOrange"
              />

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
                className="w-full h-12 mb-3 p-3 border-2 rounded-lg font-opensans text-neutral-800 focus:outline-none focus:border-customOrange hover:border-customOrange"
              />

              {/* Category Dropdown with Search */}
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

              <input
                type="text"
                name="description"
                placeholder="Brand Description"
                value={vendorData.description}
                onChange={handleInputChange}
                className="w-full h-12 mb-4 p-3 border-2 font-opensans text-black rounded-lg focus:outline-none focus:border-customOrange hover:border-customOrange"
              />

              {/* Categories */}
              {/* Social Media */}
              <h3 className="text-md font-semibold mb-4 font-opensans flex items-center">
                <IoShareSocial className="w-5 h-5 mr-2 text-header" />
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
                onClick={handleValidation} // Enable the button and handle validation on click
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
                    className="w-full h-10 px-4 pr-10 border border-gray-300 rounded-lg bg-white text-neutral-800 text-left appearance-none focus:outline-none focus:ring-2 focus:ring-customOrange focus:border-customOrange"
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
              <div className="">
                <motion.button
                  type="button"
                  className={`w-11/12 h-12 fixed bottom-6 left-0 right-0 mx-auto flex justify-center items-center text-white rounded-full ${
                    isFormComplete()
                      ? "bg-customOrange"
                      : "bg-customOrange opacity-50"
                  }`}
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
