  import React, { useState } from "react";
  import { getAuth } from "firebase/auth";
  import { doc, setDoc } from "firebase/firestore";
  import { db } from "../../firebase.config";
  import { useNavigate } from "react-router-dom";
  import { toast } from "react-toastify";
  import { Container, Row, FormGroup, Button } from "reactstrap";
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
    const [vendorType, setVendorType] = useState(null); // Vendor type state
    const [vendorData, setVendorData] = useState({
      shopName: "",
      categories: [],
      description: "",
      marketPlaceType: "",
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

    const handleCategoryChange = (category) => {
      const newCategories = [...vendorData.categories];
      if (newCategories.includes(category)) {
        const index = newCategories.indexOf(category);
        newCategories.splice(index, 1);
      } else {
        newCategories.push(category);
      }
      setVendorData({ ...vendorData, categories: newCategories });
    };

    const handleImageUpload = (e) => {
      if (e.target.files[0]) {
        setVendorData({ ...vendorData, coverImage: e.target.files[0] });
      }
    };

    const handleVendorTypeSelection = (type) => {
      setVendorType(type);
    };

    const handleNextStep = () => {
      setStep(step + 1);
    };

    const handlePreviousStep = () => {
      setStep(step - 1);
    };

    const handleProfileCompletion = async () => {
      setLoading(true);

      try {
        const auth = getAuth();
        const user = auth.currentUser;

        await setDoc(doc(db, "vendors", user.uid), {
          vendorType,
          vendorData,
          bankDetails,
          deliveryMode,
          idVerification,
          idImage, // Save the uploaded ID image
          profileComplete: true,
        });

        toast.success("Profile completed successfully.");
        navigate("/vendordashboard");
      } catch (error) {
        toast.error("Error completing profile: " + error.message);
      } finally {
        setLoading(false);
      }
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

    return (
      <Container>
        <Row>
  {loading ? (
    <Loading />
  ) : (
    <div className="p-3 w-full relative">
      {/* Back Button */}
      {step > 1 && (
        <button
          onClick={handlePreviousStep}
          className="absolute left-0 top-1  p-2 text-gray-500"
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
            Online Vendor or Market Vendor—we have tools tailored just for you!
          </p>
          <div className="my-6 mb-72">
            <div
              className={`border-0 p-3 mb-4 rounded-lg cursor-pointer flex justify-between items-center ${
                vendorType === "Online Vendor"
                  ? "border-customOrange"
                  : "border-none"
              } bg-gray-100 px-10  text-gray-800 rounded-lg`}
              onClick={() => handleVendorTypeSelection("Online Vendor")}
            >
              <span>Online Vendor</span>
              <div
                className={`w-6 h-6 rounded-full border-2 flex justify-center items-center ${
                  vendorType === "Online Vendor"
                    ? "border-customOrange"
                    : "border-gray-400"
                }`}
              >
                {vendorType === "Online Vendor" && (
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                )}
              </div>
            </div>
            <div
              className={`border-0 p-3 mb-4 rounded-lg cursor-pointer flex justify-between items-center ${
                vendorType === "Market Vendor"
                  ? "border-customOrange"
                  : "border-none"
              } bg-gray-100 px-10  text-gray-800 rounded-lg`}
              onClick={() => handleVendorTypeSelection("Market Vendor")}
            >
              <span>Market Vendor</span>
              <div
                className={`w-6 h-6 rounded-full border-2 flex justify-center items-center ${
                  vendorType === "Market Vendor"
                    ? "border-customOrange"
                    : "border-gray-400"
                }`}
              >
                {vendorType === "Market Vendor" && (
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                )}
              </div>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 1.05 }}
            className={`w-full h-12 text-white rounded-full mt-8 ${
              vendorType ? "bg-customOrange" : "bg-customOrange opacity-20"
            }`}
            onClick={handleNextStep}
            disabled={!vendorType}
          >
            Next
          </motion.button>
        </div>
      )}

      {/* Step 2: Create Shop Form for Online Vendor */}
      {vendorType === "Online Vendor" && (
        <>
          {step === 2 && (
            <div className="flex flex-col items-center justify-center h-screen">
              <ShopIcon className="mb-6 w-40 h-40 text-customOrange" />
              <p className="text-center text-gray-700 mb-6 text-sm">
                Build your brand effortlessly—just a few steps to showcase your
                brand. Let's begin!
              </p>
              <motion.button
                whileTap={{ scale: 1.05 }}
                className="w-1/2 h-12 bg-customOrange text-white rounded-full"
                onClick={handleNextStep}
              >
                Update Profile
              </motion.button>
            </div>
          )}

          {/* Step 3: Create Shop Form for online Vendor */}
          {step === 3 && (
            <div className="p-2 mt-10">
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

              {/* categories */}
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
                        className="mb-4  text-customOrange opacity-40"
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
                      Upload shop image here. Image must be clear and not less
                      than 3MB.
                    </label>
                  </>
                )}
              </div>

              <motion.button
                whileTap={{ scale: 1.05 }}
                className={`w-full h-12 text-white rounded-full ${
                  vendorData.shopName &&
                  vendorData.complexName &&
                  vendorData.phoneNumber &&
                  vendorData.categories &&
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

          {/* Step 4: Bank Details */}
          {step === 4 && (
            <div className="p-2 mt-14">
              <h2 className="text-sm text-orange-500 mb-3">
                Step 2: Account Details
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
              <h3 className="text-md font-semibold mt-3 mb-3 flex items-center">
                <AiOutlineBank className="w-5 h-5 mr-2 text-gray-600" />
                Bank Details
              </h3>

              <FormGroup className="relative mb-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="w-full h-16 mb-4 p-3 border-2 rounded-lg bg-white text-gray-700 text-left flex items-center justify-between"
                  >
                    {bankDetails.bankName
                      ? bankDetails.bankName
                      : "Select Bank Name"}
                    <svg
                      className="fill-current h-4 w-4 text-gray-700"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                    >
                      <path d="M5.516 7.548l4.486 4.486 4.485-4.486a.75.75 0 1 1 1.06 1.06l-5.015 5.015a.75.75 0 0 1-1.06 0l-5.015-5.015a.75.75 0 1 1 1.06-1.06z" />
                    </svg>
                  </button>

                  {showDropdown && (
                    <div className="absolute mt-2 w-full bg-white border rounded-lg z-10 max-h-60 overflow-y-scroll">
                      {banks.map((bank, index) => (
                        <div
                          key={index}
                          onClick={() => {
                            setBankDetails({
                              ...bankDetails,
                              bankName: bank,
                            });
                            setShowDropdown(false);
                          }}
                          className="p-2 cursor-pointer hover:bg-gray-100"
                        >
                          {bank}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </FormGroup>

              <input
                type="tel"
                name="accountNumber"
                placeholder="Account Number"
                value={bankDetails.accountNumber}
                pattern="[0-9]*"
                maxLength="11"
                onChange={handleBankDetailsChange}
                className="w-full h-12 mb-4 p-3 border-2 rounded-lg focus:border-orange-500"
              />
              <input
                type="text"
                name="accountName"
                placeholder="Account Name"
                value={bankDetails.accountName}
                onChange={handleBankDetailsChange}
                className="w-full h-12 mb-4 p-3 border-2 rounded-lg focus:border-orange-500"
              />

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
          {step === 5 && (
            <div className="p-2 mt-14">
              <h2 className="text-sm text-orange-500 mb-3">
                Step 3: Delivery mode
              </h2>

              {/* Progress bar */}
              <CustomProgressBar percent={getProgress()} />
              
              <h2 className="text-sm mt-3 font-semibold  mb-3 flex items-center">
                <FaTruck className="w-5 h-5 mr-2 text-gray-600" />
                Delivery Mode
              </h2>

              <p className="text-sm  mb-3">
                Choose a delivery mode for your brand
              </p>

              {/* Delivery Mode Options */}
              <div
                onClick={() => handleDeliveryModeChange("Delivery")}
                className={`border-0 p-2 mb-3 rounded-lg cursor-pointer flex justify-between items-center ${
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
                className={`border-0 p-2 mb-3 rounded-lg cursor-pointer flex justify-between items-center ${
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
                onClick={() => handleDeliveryModeChange("Delivery & Pickup")}
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
          {step === 6 && (
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
              <h3 className="text-md font-semibold mb-3">Upload ID</h3>
              <div className="border-2 border-dashed rounded-lg p-5 text-center mb-6 ">
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
                      className="cursor-pointer "
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
                      Upload ID image
                    </label>
                  </>
                )}
              </div>

              <motion.button
                whileTap={{ scale: 1.05 }}
                className={`w-full h-12 text-white rounded-full ${
                  idVerification && idImage
                    ? "bg-customOrange"
                    : "bg-customOrange opacity-20"
                }`}
                onClick={handleProfileCompletion}
                disabled={!idVerification || !idImage}
              >
                Complete Profile
              </motion.button>
            </div>
          )}
        </>
      )}

      {/* Step 1: Create Shop Form for Market Vendor */}
      {vendorType === "Market Vendor" && (
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
                  <option value="Lagos">Lagos</option>
                  <option value="Abuja">Abuja</option>
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
              <FormGroup className="relative mb-4">
                <select
                  name="brandCategory"
                  value={vendorData.brandCategory}
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
                  <option value="">Select Brand Category</option>
                  <option value="Fashion">Fashion</option>
                  <option value="Food">Food</option>
                </select>
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
                  vendorData.brandCategory &&
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
                  !vendorData.brandCategory ||
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
              <h2 className="text-sm text-orange-500 mb-3">Step 3: Delivery Mode</h2>

              {/* Progress bar */}
              <CustomProgressBar percent={getProgress()} />


              <h3 className="text-md font-semibold mt-3 mb-3 flex items-center">
                <FaTruck className="w-5 h-5 mr-2 text-gray-600" />
                Delivery Mode
              </h3>

              <p className="text-gray-700 mb-4">Choose a delivery mode for your brand</p>

              {/* Delivery Mode Options */}
              <div className="mb-72">
                <div
                  onClick={() => handleDeliveryModeChange("Pickup")}
                  className={`border p-4 mb-4 rounded-lg cursor-pointer flex justify-between items-center ${
                    deliveryMode === "Pickup" ? "border-customOrange" : "border-gray-300"
                  }`}
                >
                  <span>Pickup</span>
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex justify-center items-center ${
                      deliveryMode === "Pickup" ? "border-customOrange" : "border-gray-300"
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
                  deliveryMode ? "bg-customOrange" : "bg-customOrange opacity-20"
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
    <h2 className="text-sm text-orange-500 mb-3">Step 4: Verification</h2>

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
    <option value="International Passport">International Passport</option>
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
            <BiSolidImageAdd size={40} className="mb-4 text-customOrange opacity-40" />
          </label>

          <input
            type="file"
            className="hidden"
            onChange={handleIdImageUpload}
            id="idImageUpload"
          />

          <label htmlFor="idImageUpload" className="text-customOrange cursor-pointer">
            Upload ID image here
          </label>
        </>
      )}
    </div>

    {/* Next Button */}
    <motion.button
      whileTap={{ scale: 1.05 }}
      className={`w-full h-12 text-white mt-14 rounded-full ${
        idVerification && idImage ? "bg-customOrange" : "bg-customOrange opacity-20"
      }`}
      onClick={handleProfileCompletion}
      disabled={!idVerification || !idImage}
    >
      Complete Profile
    </motion.button>
  </div>
)}

        </>
      )}
    </div>
  )}
</Row>

      </Container>
    );
  };

  export default CompleteProfile;
