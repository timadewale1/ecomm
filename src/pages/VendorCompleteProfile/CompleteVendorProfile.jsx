import React, { useState } from "react";
import { getAuth } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase.config";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Container, Row, Form, FormGroup } from "reactstrap";
import { motion } from "framer-motion";
import { FiChevronLeft } from "react-icons/fi"; // Back icon
import { ProgressBar, Step } from "react-step-progress-bar";
import CustomProgressBar from "./CustomProgressBar";
import { ReactComponent as ShopIcon } from "../../assets/shop-icon.svg"; // Assuming you have an SVG icon for the shop
import {
  AiOutlineIdcard,
  AiOutlineCamera,
  AiOutlineBank,
  AiOutlineFileProtect,
} from "react-icons/ai";
import { BiSolidImageAdd } from "react-icons/bi";
import { FaTruck } from "react-icons/fa";
import Loading from "../../components/Loading/Loading";

const CompleteProfile = () => {
  const [step, setStep] = useState(1);
  const [showDropdown, setShowDropdown] = useState(false);
  const [vendorData, setVendorData] = useState({
    shopName: "",
    categories: [],
    description: "",
    marketPlaceType: "", // This will store the type of vendor (online or market)
    marketPlace: "",
    complexName: "",
    shopNumber: "",
    phoneNumber: "",
    socialMediaHandle: {
      instagram: "",
      twitter: "",
      facebook: "",
    },
    personalAddress: "",
    coverImage: null,
    coverImageUrl: "",
    // Market vendor specific fields
    brandName: "",
    brandAddress: "",
    location: "",
    complexNumber: "",
    brandCategory: "",
    daysAvailability: "",
    openTime: "",
    closeTime: "",
    brandDescription: "", // Added to match validation
  });
  const [bankDetails, setBankDetails] = useState({
    bankName: "",
    accountNumber: "",
    accountName: "",
  });
  const [deliveryMode, setDeliveryMode] = useState(""); // Delivery Mode state
  const [idVerification, setIdVerification] = useState(""); // ID Verification type
  const [idImage, setIdImage] = useState(null); // ID Image
  const [loading, setLoading] = useState(false); // Updated loading state
  const navigate = useNavigate();

  const categories = [
    "Mens",
    "Womens",
    "Underwears",
    "Y2K",
    "Jewelry",
    "Kids",
    "Trads",
    "Dresses",
    "Gowns",
    "Shoes",
    "Accessories",
    "Bags",
    "Sportswear",
    "Formal",
    "Casual",
    "Vintage",
    "Brands",
  ];

  const banks = [
    "Access Bank",
    "Citibank",
    "Diamond Bank",
    "Ecobank Nigeria",
    "Fidelity Bank",
    "First Bank of Nigeria",
    "First City Monument Bank (FCMB)",
    "Globus Bank",
    "Guaranty Trust Bank (GTBank)",
    "Heritage Bank",
    "Keystone Bank",
    "Kuda Bank",
    "Providus Bank",
    "Polaris Bank",
    "Stanbic IBTC Bank",
    "Standard Chartered Bank",
    "Sterling Bank",
    "Suntrust Bank",
    "Union Bank of Nigeria",
    "United Bank for Africa (UBA)",
    "Unity Bank",
    "Wema Bank",
    "Zenith Bank",
  ];

  const getProgress = () => {
    const adjustedStep = step - 2; // Starts the progress bar from step 3
    const totalVisibleSteps = 4; // 4 steps (Create Shop, Bank Details, Delivery Mode, and Verification)
    return (adjustedStep / totalVisibleSteps) * 100;
  };

  const handleImageUpload = (e) => {
    if (e.target.files[0]) {
      setVendorData({ ...vendorData, coverImage: e.target.files[0] });
    }
  };

  const handleVendorTypeSelection = (type) => {
    setVendorData({ ...vendorData, marketPlaceType: type });
  };

  const handleNextStep = () => {
    setStep(step + 1);
  };

  const handlePreviousStep = () => {
    setStep(step - 1);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setVendorData({ ...vendorData, [name]: value });
  };

  const handleSocialMediaChange = (e) => {
    const { name, value } = e.target;
    setVendorData({
      ...vendorData,
      socialMediaHandle: {
        ...vendorData.socialMediaHandle,
        [name]: value,
      },
    });
  };

  const handleBankDetailsChange = (e) => {
    const { name, value } = e.target;
    setBankDetails({ ...bankDetails, [name]: value });
  };

  const handleDeliveryModeChange = (mode) => {
    setDeliveryMode(mode);
  };

  const handleIdVerificationChange = (e) => {
    setIdVerification(e.target.value);
  };

  const handleIdImageUpload = (e) => {
    if (e.target.files[0]) {
      setIdImage(e.target.files[0]);
    }
  };

  const handleProfileCompletion = async (e) => {
    e.preventDefault();

    console.log("handleProfileCompletion called");

    const missingFields = [];

    // Check for missing fields
    if (!vendorData.shopName) missingFields.push("Shop Name");
    if (!vendorData.categories.length) missingFields.push("Categories");
    if (!vendorData.description) missingFields.push("Description");
    if (!vendorData.marketPlaceType) missingFields.push("Marketplace Type");

    // Check specific conditions for online vendors
    if (vendorData.marketPlaceType === "virtual") {
      if (
        !vendorData.socialMediaHandle.instagram ||
        !vendorData.socialMediaHandle.facebook ||
        !vendorData.socialMediaHandle.twitter
      ) {
        missingFields.push("Social Media Handles");
      }
      if (!vendorData.personalAddress) missingFields.push("Personal Address");
      if (!vendorData.phoneNumber) missingFields.push("Phone Number");
      if (!vendorData.coverImage) missingFields.push("Cover Image");
    }

    // Check specific conditions for market vendors
    else if (vendorData.marketPlaceType === "marketplace") {
      if (!vendorData.marketPlace) missingFields.push("Market Place");
      if (!vendorData.complexName) missingFields.push("Complex Name");
      if (!vendorData.phoneNumber) missingFields.push("Phone Number");
      if (!vendorData.shopNumber) missingFields.push("Shop Number");
      if (!vendorData.daysAvailability)
        missingFields.push("Days of Availability");
      if (!vendorData.openTime) missingFields.push("Opening Time");
      if (!vendorData.closeTime) missingFields.push("Closing Time");
      if (!bankDetails.bankName) missingFields.push("Bank Name");
      if (!bankDetails.accountNumber) missingFields.push("Account Number");
      if (!bankDetails.accountName) missingFields.push("Account Name");
      if (!vendorData.brandName) missingFields.push("Brand Name");
      if (!vendorData.brandAddress) missingFields.push("Brand Address");
      if (!vendorData.location) missingFields.push("Location");
      if (!vendorData.complexNumber) missingFields.push("Complex Number");
      if (!vendorData.brandCategory) missingFields.push("Brand Category");
      if (!vendorData.brandDescription) missingFields.push("Brand Description");
    }

    // If any missing fields are found, show a toast and return early
    if (missingFields.length) {
      toast.error(
        `Please complete the following fields: ${missingFields.join(", ")}`,
        {
          className: "custom-toast",
        }
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      toast.error("User is not authenticated", {
        className: "custom-toast",
      });
      setLoading(false);
      return;
    }

    const { coverImage, ...dataToStore } = vendorData; // Exclude coverImage for Firestore

    try {
      console.log("Attempting to set document in Firestore...");

      // Update Firestore document
      await setDoc(
        doc(db, "vendors", user.uid),
        {
          ...dataToStore,
          profileComplete: true,
          bankDetails, // Include bankDetails if needed
        },
        { merge: true }
      );

      console.log("Firestore document updated successfully.");

      toast.success("Profile completed successfully.", {
        className: "custom-toast",
      });

      console.log("Navigating to dashboard...");
      navigate("/vendordashboard");
    } catch (error) {
      console.log("Error during profile completion:", error);
      toast.error("Error completing profile: " + error.message, {
        className: "custom-toast",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Row>
        {loading ? (
          <Loading />
        ) : (
          <Form
            className="relative translate-y-10"
            onSubmit={handleProfileCompletion}
          >
            {/* Back Button */}
            {step > 1 && (
              <button
                type="button" // Prevent this button from submitting the form
                onClick={handlePreviousStep}
                className="absolute left-0 top-1 p-2 text-gray-500"
              >
                <FiChevronLeft size={35} />
              </button>
            )}

            {/* Step 1: Vendor Type Selection */}
            {step === 1 && (
              <div className="mt-10">
                <h1 className="text-xl gap-16 font-bold text-black">
                  Choose your vendor type
                </h1>
                <p className="text-sm text-gray-600">
                  Online Vendor or Market Vendor—we have tools tailored just for
                  you!
                </p>
                <div className="my-6 mb-72">
                  <div
                    className={`border-0 p-3 mb-4 rounded-lg cursor-pointer flex justify-between items-center ${
                      vendorData.marketPlaceType === "Online Vendor"
                        ? "border-customOrange"
                        : "border-none"
                    } bg-gray-100 px-10 text-gray-800 rounded-lg`}
                    onClick={() => handleVendorTypeSelection("virtual")}
                  >
                    <span>Online Vendor</span>
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex justify-center items-center ${
                        vendorData.marketPlaceType === "virtual"
                          ? "border-customOrange"
                          : "border-gray-400"
                      }`}
                    >
                      {vendorData.marketPlaceType === "virtual" && (
                        <div className="w-3 h-3 rounded-full bg-orange-500" />
                      )}
                    </div>
                  </div>
                  <div
                    className={`border-0 p-3 mb-4 rounded-lg cursor-pointer flex justify-between items-center ${
                      vendorData.marketPlaceType === "marketplace"
                        ? "border-customOrange"
                        : "border-none"
                    } bg-gray-100 px-10 text-gray-800 rounded-lg`}
                    onClick={() => handleVendorTypeSelection("marketplace")}
                  >
                    <span>Market Vendor</span>
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex justify-center items-center ${
                        vendorData.marketPlaceType === "marketplace"
                          ? "border-customOrange"
                          : "border-gray-400"
                      }`}
                    >
                      {vendorData.marketPlaceType === "marketplace" && (
                        <div className="w-3 h-3 rounded-full bg-orange-500" />
                      )}
                    </div>
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 1.05 }}
                  type="button" // Change to "button" to prevent form submission
                  className={`w-full h-12 text-white rounded-full mt-8 ${
                    vendorData.marketPlaceType
                      ? "bg-customOrange"
                      : "bg-customOrange opacity-20"
                  }`}
                  onClick={handleNextStep}
                  disabled={!vendorData.marketPlaceType}
                >
                  Next
                </motion.button>
              </div>
            )}

            {/* Steps for Online Vendor */}
            {vendorData.marketPlaceType === "virtual" && (
              <>
                {/* Step 2: Create Shop Form for Online Vendor */}
                {step === 2 && (
                  <div className="p-2 mt-10">
                    <h2 className="text-xl font-semibold text-customBrown">
                      Create Shop
                    </h2>
                    <p className="text-gray-600 mb-4">
                      Set up your brand to get customers and sell products.
                    </p>
                    <p className="text-sm text-customOrange mb-3">
                      Step 1: Business Information
                    </p>

                    {/* Progress bar */}
                    <ProgressBar
                      percent={getProgress()}
                      filledBackground="#f9531e"
                    >
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
                    <h3 className="text-md font-semibold mb-3 flex items-center mt-3">
                      <AiOutlineIdcard className="w-5 h-5 mr-2 text-gray-600" />
                      Brand Info
                    </h3>

                    <input
                      type="text"
                      name="shopName"
                      placeholder="Brand Name"
                      value={vendorData.shopName}
                      onChange={handleInputChange}
                      className="w-full h-12 mb-4 p-3 border-2 rounded-lg hover:border-customOrange 
                      focus:outline-none focus:border-customOrange"
                    />
                    <input
                      type="text"
                      name="complexName"
                      placeholder="Brand Address"
                      value={vendorData.complexName}
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

                    <h3 className="text-md font-semibold mb-3 flex items-center">
                      <AiOutlineIdcard className="w-5 h-5 mr-2 text-gray-600" />
                      Description
                    </h3>
                    <input
                      type="text"
                      name="description"
                      placeholder="Brand Description"
                      value={vendorData.description}
                      onChange={handleInputChange}
                      className="w-full h-12 mb-4 p-3 border-2 rounded-lg focus:outline-none focus:border-customOrange hover:border-customOrange"
                    />

                    <h3 className="text-md font-semibold mb-3 flex items-center">
                      <AiOutlineIdcard className="w-5 h-5 mr-2 text-gray-600" />
                      Personal Address
                    </h3>
                    <input
                      type="text"
                      name="personalAddress"
                      placeholder="Personal Address"
                      value={vendorData.personalAddress}
                      onChange={handleInputChange}
                      className="w-full h-12 mb-4 p-3 border-2 rounded-lg focus:outline-none focus:border-customOrange hover:border-customOrange"
                    />

                    {/* Categories */}
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

                    {/* Social Media */}
                    <h3 className="text-md font-semibold mb-3 flex items-center">
                      <AiOutlineIdcard className="w-5 h-5 mr-2 text-gray-600" />
                      Social Media
                    </h3>
                    <input
                      type="text"
                      name="instagram"
                      placeholder="Instagram Link"
                      value={vendorData.socialMediaHandle.instagram}
                      onChange={handleSocialMediaChange}
                      className="w-full h-12 mb-4 p-3 border-2 rounded-lg  focus:outline-none focus:border-customOrange hover:border-customOrange"
                    />
                    <input
                      type="text"
                      name="facebook"
                      placeholder="Facebook Link"
                      value={vendorData.socialMediaHandle.facebook}
                      onChange={handleSocialMediaChange}
                      className="w-full h-12 mb-4 p-3 border-2 rounded-lg  focus:ring-customOrange hover:border-customOrange"
                    />
                    <input
                      type="text"
                      name="twitter"
                      placeholder="X (Twitter) Link"
                      value={vendorData.socialMediaHandle.twitter}
                      onChange={handleSocialMediaChange}
                      className="w-full h-12 mb-4 p-3 border-2 rounded-lg  focus:ring-customOrange hover:border-customOrange"
                    />

                    {/* Upload Image */}
                    <h3 className="text-md font-semibold mb-3 flex items-center">
                      <AiOutlineCamera className="w-5 h-5 mr-2 text-gray-600" />
                      Upload Image
                    </h3>

                    <div className="border-2 border-dashed rounded-lg p-6 text-center mb-6">
                      {vendorData.coverImage ? (
                        <img
                          src={URL.createObjectURL(vendorData.coverImage)}
                          alt="Uploaded Shop"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <>
                          <label
                            htmlFor="shopImageUpload"
                            className="cursor-pointer"
                          >
                            <BiSolidImageAdd
                              size={40}
                              className="mb-4 text-customOrange opacity-40"
                            />
                          </label>

                          <input
                            type="file"
                            className="hidden"
                            onChange={handleImageUpload}
                            id="shopImageUpload"
                          />

                          <label
                            htmlFor="shopImageUpload"
                            className="text-orange-500 cursor-pointer"
                          >
                            Upload shop image here. Image must be clear and not
                            less than 3MB.
                          </label>
                        </>
                      )}
                    </div>

                    <motion.button
                      whileTap={{ scale: 1.05 }}
                      type="button" // Change to "button" to prevent form submission
                      className={`w-full h-12 text-white rounded-full ${
                        vendorData.shopName &&
                        vendorData.complexName &&
                        vendorData.phoneNumber &&
                        vendorData.categories.length > 0 &&
                        vendorData.socialMediaHandle.instagram &&
                        vendorData.socialMediaHandle.facebook &&
                        vendorData.socialMediaHandle.twitter &&
                        vendorData.coverImage
                          ? "bg-customOrange"
                          : "bg-customOrange opacity-20"
                      }`}
                      onClick={handleNextStep}
                      disabled={
                        !vendorData.shopName ||
                        !vendorData.complexName ||
                        !vendorData.phoneNumber ||
                        vendorData.categories.length === 0 ||
                        !vendorData.socialMediaHandle.instagram ||
                        !vendorData.socialMediaHandle.facebook ||
                        !vendorData.socialMediaHandle.twitter ||
                        !vendorData.coverImage
                      }
                    >
                      Next
                    </motion.button>
                  </div>
                )}

                {/* Step 3: Bank Details for Online Vendor */}
                {step === 3 && vendorData.marketPlaceType === "virtual" && (
                  <div className="p-2 mt-14">
                    <h2 className="text-sm text-customOrange mb-3">
                      Step 2: Bank Details
                    </h2>
                    {/* Progress bar */}
                    <ProgressBar
                      percent={getProgress()}
                      filledBackground="#F97316"
                    >
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
                    <h3 className="text-md font-semibold mt-3 mb-3 flex items-center">
                      <AiOutlineBank className="w-5 h-5 mr-2 text-gray-600" />
                      Bank Details
                    </h3>

                    {/* Bank Name Dropdown */}
                    <FormGroup className="relative mb-2">
                      <div className="relative">
                        <select
                          name="bankName"
                          value={bankDetails.bankName}
                          onChange={handleBankDetailsChange}
                          className="w-full h-16 px-4 pr-10 border border-gray-300 rounded-lg bg-white text-gray-700 text-left appearance-none focus:outline-none focus:ring-2 focus:ring-customOrange"
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
                      maxLength="11"
                      onChange={handleBankDetailsChange}
                      className="w-full h-16 mb-4 p-4 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-customOrange"
                    />

                    {/* Account Name Field */}
                    <input
                      type="text"
                      name="accountName"
                      placeholder="Account Name"
                      value={bankDetails.accountName}
                      onChange={handleBankDetailsChange}
                      className="w-full h-16 mb-48 p-4 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-customOrange"
                    />

                    {/* Next Button */}
                    <motion.button
                      whileTap={{ scale: 1.05 }}
                      type="button" // Prevent form submission
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

                {/* Step 4: Delivery Mode for Online Vendor */}
                {step === 4 && vendorData.marketPlaceType === "virtual" && (
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
                        onClick={() => handleDeliveryModeChange("Delivery")}
                        className={`border-0 p-2 mb-4 rounded-lg cursor-pointer flex justify-between items-center ${
                          deliveryMode === "Delivery"
                            ? "border-customOrange"
                            : "border-gray-200"
                        }`}
                      >
                        <span>Delivery</span>
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex justify-center items-center ${
                            deliveryMode === "Delivery"
                              ? "border-customOrange"
                              : "border-gray-400"
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
                            : "border-gray-200"
                        }`}
                      >
                        <span>Pickup</span>
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex justify-center items-center ${
                            deliveryMode === "Pickup"
                              ? "border-customOrange"
                              : "border-gray-400"
                          }`}
                        >
                          {deliveryMode === "Pickup" && (
                            <div className="w-3 h-3 rounded-full bg-customOrange" />
                          )}
                        </div>
                      </div>
                      <div
                        onClick={() =>
                          handleDeliveryModeChange("Delivery & Pickup")
                        }
                        className={`border-0 p-2 mb-60 rounded-lg cursor-pointer flex justify-between items-center ${
                          deliveryMode === "Delivery & Pickup"
                            ? "border-customOrange"
                            : "border-gray-200"
                        }`}
                      >
                        <span>Delivery & Pickup</span>
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex justify-center items-center ${
                            deliveryMode === "Delivery & Pickup"
                              ? "border-customOrange"
                              : "border-gray-400"
                          }`}
                        >
                          {deliveryMode === "Delivery & Pickup" && (
                            <div className="w-3 h-3 rounded-full bg-orange-500" />
                          )}
                        </div>
                      </div>
                    </div>

                    <motion.button
                      whileTap={{ scale: 1.05 }}
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
                  <div className="p-2 mt-14">
                    <h2 className="text-md font-semibold mb-3 flex items-center">
                      <AiOutlineFileProtect className="w-5 h-5 mr-2 text-gray-600" />
                      ID Verification
                    </h2>

                    {/* Progress bar */}
                    <CustomProgressBar percent={getProgress()} />

                    {/* ID Verification */}
                    <h3 className="text-md mt-3 font-semibold mb-3">
                      ID Verification
                    </h3>
                    <FormGroup className="relative mb-2">
                      <div className="relative">
                        <select
                          name="idVerification"
                          value={idVerification}
                          onChange={handleIdVerificationChange}
                          className="w-full h-16 p-3 border-2 rounded-lg bg-white text-gray-700 text-left appearance-none focus:outline-none focus:border-customOrange"
                          style={{
                            backgroundImage:
                              "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22%23666666%22 viewBox=%220 0 20 20%22><path d=%22M5.516 7.548l4.486 4.486 4.485-4.486a.75.75 0 1 1 1.06 1.06l-5.015 5.015a.75.75 0 0 1-1.06 0l-5.015-5.015a.75.75 0 1 1 1.06-1.06z%22 /></svg>')",
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

                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-700">
                          <svg
                            className="fill-current h-4 w-4"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                          >
                            <path d="M5.516 7.548l4.486 4.486 4.485-4.486a.75.75 0 1 1 1.06 1.06l-5.015 5.015a.75.75 0 0 1-1.06 0l-5.015-5.015a.75.75 0 1 1 1.06-1.06z" />
                          </svg>
                        </div>
                      </div>
                    </FormGroup>

                    {/* Upload ID */}
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
                          <label
                            htmlFor="idImageUpload"
                            className="cursor-pointer"
                          >
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

                    {/* Submit Button */}
                    <motion.button
                      whileTap={{ scale: 1.2 }}
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
            {/* Step 1: Create Shop Form for Market Vendor */}
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
                        <option value="Monday to Friday">
                          Monday to Friday
                        </option>
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
                          <label
                            htmlFor="idImageUpload"
                            className="cursor-pointer"
                          >
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
          </Form>
        )}
      </Row>
    </Container>
  );
};

export default CompleteProfile;
