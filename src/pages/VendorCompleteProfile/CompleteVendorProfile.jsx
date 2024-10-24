import React, { useState } from "react";
import { getAuth } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase.config";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Container, Row, Form } from "reactstrap";
import { motion } from "framer-motion";
import { FiChevronLeft } from "react-icons/fi"; // Back icon
import Loading from "../../components/Loading/Loading";
import MarketVendor from "./marketVendor";
import VirtualVendor from "./virtualVendor";
import { GoChevronLeft } from "react-icons/go";
const CompleteProfile = () => {
  const [isLoading, setIsLoading] = useState(false);
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
  const vendorType = 'market'; // or 'virtual', based on logic
  const activeStep = 2; 
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
    "Perfumes",
    "Watches",
    "Denim",
    "Hoodies",
    "Sweaters",
    "Scarves",
    "Sneakers",
    "Caps",
    "Athletic Wear",
    "Belts",
    "Earrings",
    "Bracelets",
    "Handcrafted Jewelry",
    "Coats",
    "Trench Coats",
    "Loungewear",
    "Leather Goods",
    "Sunglasses",
    "Necklaces",
    "Statement Pieces",
    "Oversized Clothing",
    "Graphic Tees",
    "Patchwork Denim",
    "Handbags",
    "Brogues",
    "Sandals",
    "Fragrances",
    "Essential Oils",
    "Luxury Jewelry",
    "Heels",
    "Crossbody Bags",
    "Rings",
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


  

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.size > 3 * 1024 * 1024) { // 3MB size limit
      toast.error("File size exceeds 3MB. Please upload a smaller image.");
      return; // Do not upload the image if it exceeds 3MB
    }
    setVendorData({ ...vendorData, coverImage: file });
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

    setIsLoading(true); // Set loading state to true at the start

    const missingFields = [];

    // Check for missing fields
    if (!vendorData.marketPlaceType) missingFields.push("Marketplace Type");

    // Check specific conditions for online vendors
    if (vendorData.marketPlaceType === "virtual") {
      if (!vendorData.shopName) missingFields.push("Shop Name");  
      if (!vendorData.categories.length) missingFields.push("Categories");
      if (!vendorData.description) missingFields.push("Description");
      if (
        !vendorData.socialMediaHandle.instagram &&
        !vendorData.socialMediaHandle.facebook &&
        !vendorData.socialMediaHandle.twitter
      ) {
        missingFields.push("Social Media Handles");
      }
      if (!vendorData.phoneNumber) missingFields.push("Phone Number");
      if (!vendorData.coverImage) missingFields.push("Cover Image");
    }

    // Check specific conditions for market vendors
    else if (vendorData.marketPlaceType === "marketplace") {
      if (!vendorData.brandName) missingFields.push("Brand Name");
      if (!vendorData.brandAddress) missingFields.push("Brand Address");
      if (!vendorData.categories) missingFields.push("Brand Category");
      if (!vendorData.brandDescription) missingFields.push("Brand Description");
      if (!vendorData.complexNumber) missingFields.push("Complex Number");
      if (!vendorData.phoneNumber) missingFields.push("Phone Number");
      if (!vendorData.daysAvailability) missingFields.push("Days of Availability");
      if (!vendorData.openTime) missingFields.push("Opening Time");
      if (!vendorData.closeTime) missingFields.push("Closing Time");
      if (!bankDetails.bankName) missingFields.push("Bank Name");
      if (!bankDetails.accountNumber || bankDetails.accountNumber.length !== 10) 
        missingFields.push("Account Number");
      if (!bankDetails.accountName) missingFields.push("Account Name");
    }

    // If any missing fields are found, show a toast and return early
    if (missingFields.length) {
      toast.error(`Please complete the following fields: ${missingFields.join(", ")}`, {
        className: "custom-toast",
      });
    } else {
      // Proceed if no missing fields
      try {
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
          throw new Error("User is not authenticated");
        }

        const { coverImage, ...dataToStore } = vendorData; // Exclude coverImage for Firestore

        // Update Firestore document
        await setDoc(
          doc(db, "vendors", user.uid),
          {
            ...dataToStore,
            profileComplete: true,
            bankDetails,
          },
          { merge: true }
        );

        // Show success toast after successful submission
        toast.success("Profile completed successfully!", {
          className: "custom-toast",
        });

        // Navigate to the vendor dashboard after successful completion
        navigate("/vendordashboard");

      } catch (error) {
        // Show error toast in case of any issues
        toast.error("Error completing profile: " + error.message, {
          className: "custom-toast",
        });
      }
    }

    // Always set loading to false at the end, even if there's an error
    setIsLoading(false);
};

  return (
    <Container>
      <Row>
        {loading ? (
          <Loading />
        ) : (
          
          <Form
            className=""
            onSubmit={handleProfileCompletion}
          >
            
            {/* Back Button */}
            {step > 1 && (
              <button
                type="button" // Prevent this button from submitting the form
                onClick={handlePreviousStep}
                className=" text-gray-800 mt-4"
              >
                <GoChevronLeft size={25} />
              </button>
            )}

            {/* Step 1: Vendor Type Selection */}
            {step === 1 && (
              <div className="p-2 mt-16">
             
                <h1 className="text-xl gap-16 font-opensans font-semibold text-header">
                  Choose your vendor type
                </h1>
                <p className="text-sm mt-3 font-opensans text-neutral-800">
                  Online Vendor or Market Vendor—we have tools tailored just for
                  you!
                </p>

                <div className="my-6 mb-72">
                  
                  <div
                    className={`border-0 p-3 mb-4 rounded-lg cursor-pointer flex justify-between items-center ${
                      vendorData.marketPlaceType === "virtual"
                        ? "border-customOrange"
                        : "border-none"
                    } bg-gray-50 px-10 text-gray-800 rounded-lg`}
                    onClick={() => handleVendorTypeSelection("virtual")}
                  >
                    <span className="font-opensans text-neutral-800 ">
                      Online Vendor
                    </span>
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex justify-center items-center ${
                        vendorData.marketPlaceType === "virtual"
                          ? "border-customOrange"
                          : "border-customOrange"
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
                        : "border-customOrange"
                    } bg-gray-50 px-10 text-gray-800 rounded-lg`}
                    onClick={() => handleVendorTypeSelection("marketplace")}
                  >
                    <span className="font-opensans text-neutral-800">
                      Market Vendor
                    </span>
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex justify-center items-center ${
                        vendorData.marketPlaceType === "marketplace"
                          ? "border-customOrange"
                          : "border-customOrange"
                      }`}
                    >
                      {vendorData.marketPlaceType === "marketplace" && (
                        <div className="w-3 h-3 rounded-full bg-orange-500" />
                      )}
                    </div>
                  </div>
                </div>
                <motion.button
                  type="button"
                  className={`w-full h-12 text-white font-opensans rounded-full  ${
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

            {/* Render the appropriate vendor component based on marketPlaceType */}
            {vendorData.marketPlaceType === "virtual" && (
              <VirtualVendor
                vendorData={vendorData}
                setVendorData={setVendorData}
                step={step}
                setStep={setStep}
             
                handleInputChange={handleInputChange}
                handleNextStep={handleNextStep}
                setShowDropdown={setShowDropdown}
                showDropdown={showDropdown}
                categories={categories}
                bankDetails={bankDetails}
                handleBankDetailsChange={handleBankDetailsChange}
                deliveryMode={deliveryMode}
                handleDeliveryModeChange={handleDeliveryModeChange}
                idVerification={idVerification}
                handleIdVerificationChange={handleIdVerificationChange}
                idImage={idImage}
                handleIdImageUpload={handleIdImageUpload}
                handleImageUpload={handleImageUpload}
                handleSocialMediaChange={handleSocialMediaChange}
                isLoading={isLoading}
                handleProfileCompletion={handleProfileCompletion}
                banks={banks}
              />
            )}

            {vendorData.marketPlaceType === "marketplace" && (
              <MarketVendor
                vendorData={vendorData}
                setVendorData={setVendorData}
                step={step}
                setStep={setStep}
                
                handleInputChange={handleInputChange}
                handleNextStep={handleNextStep}
                setShowDropdown={setShowDropdown}
                showDropdown={showDropdown}
                categories={categories}
                bankDetails={bankDetails}
                handleBankDetailsChange={handleBankDetailsChange}
                deliveryMode={deliveryMode}
                handleDeliveryModeChange={handleDeliveryModeChange}
                idVerification={idVerification}
                handleIdVerificationChange={handleIdVerificationChange}
                idImage={idImage}
                handleIdImageUpload={handleIdImageUpload}
                isLoading={isLoading}
                handleProfileCompletion={handleProfileCompletion}
                banks={banks}
              />
            )}
          </Form>
        )}
      </Row>
    </Container>
  );
};

export default CompleteProfile;
