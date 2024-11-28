import React, { useState } from "react";
import { getAuth } from "firebase/auth";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase.config";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Container, Row, Form } from "reactstrap";
import { motion } from "framer-motion";
import { FiChevronLeft } from "react-icons/fi"; // Back icon
import Loading from "../../components/Loading/Loading";
import MarketVendor from "./marketVendor";
import VirtualVendor from "./virtualVendor";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { GoChevronLeft } from "react-icons/go";
import { RotatingLines } from "react-loader-spinner";

const CompleteProfile = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [showDropdown, setShowDropdown] = useState(false);

  const [vendorData, setVendorData] = useState({
    shopName: "",
    categories: [],
    description: "",
    marketPlaceType: "",
    // Virtual vendor specific fields
    coverImage: null,
    coverImageUrl: "",
    socialMediaHandle: {
      instagram: "", // Instagram link
      twitter: "", // Twitter link
      facebook: "", // Facebook link
    },
    phoneNumber: "", // Vendor's phone number
    Address: "", // Vendor's address (could be for personal or business)

    // Market vendor specific fields
    marketPlace: "", // Marketplace name (e.g., Yaba)
    complexNumber: "", // Store number in the marketplace
    daysAvailability: [], // Days of the week when the shop is open
    openTime: "", // Opening time for the shop
    closeTime: "", // Closing time for the shop

    // Fields common for ID verification (for both market and virtual vendors)
    idVerification: "", // Type of verification document (NIN, Passport, CAC)
    idImage: null, // File for the ID image
    idImageUrl: "", // URL for the ID image (if applicable)

    // Bank details (for both market and virtual vendors)
    bankDetails: {
      bankName: "", // Name of the bank
      accountNumber: "", // Vendor's bank account number
      accountName: "", // Vendor's bank account name
    },
  });

  const [bankDetails, setBankDetails] = useState({
    bankName: "",
    accountNumber: "",
    accountName: "",
  });
  const vendorType = "market"; // or 'virtual', based on logic
  const activeStep = 2;
  const [deliveryMode, setDeliveryMode] = useState(""); // Delivery Mode state
  const [idVerification, setIdVerification] = useState(""); // ID Verification type
  const [idImage, setIdImage] = useState(null); // ID Image
  const [isIdImageUploading, setIsIdImageUploading] = useState(false);
  const [isCoverImageUploading, setIsCoverImageUploading] = useState(false);

  const [loading, setLoading] = useState(false); // Updated loading state
  const navigate = useNavigate();

  const categories = [
    "Thrifts",
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

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];

    if (!file) {
      toast.error("No file selected. Please choose an image.");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      toast.error("File size exceeds 3MB. Please upload a smaller image.");
      return;
    }

    try {
      setIsCoverImageUploading(true); // Start loading

      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        throw new Error("User is not authenticated");
      }

      const vendorId = user.uid; // Assuming vendorId is the same as user ID

      console.log("Starting image upload for vendor:", vendorId);

      const storage = getStorage();
      const storageRef = ref(storage, `vendorImages/${vendorId}/coverImage`);

      // Upload file
      await uploadBytes(storageRef, file);
      console.log("File uploaded to Firebase Storage.");

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      console.log("File available at:", downloadURL);

      // Update local state with the new image URL
      setVendorData((prevData) => ({
        ...prevData,
        coverImageUrl: downloadURL,
      }));

      // Update Firestore document with the new image URL
      const vendorDocRef = doc(db, "vendors", vendorId); // Reference to vendor document
      await updateDoc(vendorDocRef, {
        coverImageUrl: downloadURL,
      });

      console.log("Firestore document updated with image URL:", downloadURL);
      toast.success("Image uploaded successfully!");
    } catch (error) {
      console.error("Error during image upload ", error);
      toast.error(`Error uploading image: ${error.message}`);
    } finally {
      setIsCoverImageUploading(false); // End loading
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
  
    
    let formattedValue = value;
    if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
      formattedValue = 'https://' + value;
    }
  
    setVendorData({
      ...vendorData,
      socialMediaHandle: {
        ...vendorData.socialMediaHandle,
        [name]: formattedValue,
      },
    });
  };

  const handleBankDetailsChange = (e) => {
    const { name, value } = e.target;
    setBankDetails({ ...bankDetails, [name]: value });
  };

  const handleDeliveryModeChange = (mode) => {
    setDeliveryMode(mode);
    setVendorData({ ...vendorData, deliveryMode: mode });
  };

  const handleIdVerificationChange = (e) => {
    const value = e.target.value;
    setIdVerification(value);
    setVendorData({ ...vendorData, idVerification: value });
  };

  const handleIdImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file && file.size > 3 * 1024 * 1024) {
      // 3MB size limit
      toast.error("File size exceeds 3MB. Please upload a smaller image.");
      return;
    }
    try {
      setIsIdImageUploading(true); // Start loading
      console.log("Selected ID image file:", file);

      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        throw new Error("User is not authenticated");
      }

      const storage = getStorage();
      const storageRef = ref(storage, `vendorImages/${user.uid}/idImage`);

      // Upload the file
      await uploadBytes(storageRef, file);
      console.log("ID image file uploaded to storage.");

      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);
      console.log("ID image uploaded successfully. URL:", downloadURL);

      // Update the idImage state with the download URL
      setIdImage(downloadURL);

      // Update vendorData with the ID image URL
      setVendorData({ ...vendorData, idImage: downloadURL });
    } catch (error) {
      console.error("Error uploading ID image:", error);
      toast.error("Error uploading ID image: " + error.message);
    } finally {
      setIsIdImageUploading(false); // End loading
    }
  };

  const toTitleCase = (str) => {
    return str
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const handleProfileCompletion = async (e) => {
    e.preventDefault();
    setIsLoading(true); // Set loading state to true at the start

    const missingFields = [];

    // Check for missing fields
    if (!vendorData.marketPlaceType) missingFields.push("Marketplace Type");

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
      // if (!vendorData.phoneNumber) missingFields.push("Phone Number");
      if (!vendorData.coverImageUrl) missingFields.push("Cover Image");
      if (!vendorData.deliveryMode) missingFields.push("Delivery Mode");
      if (!vendorData.idVerification) missingFields.push("ID Verification");
      if (!vendorData.idImage) missingFields.push("ID Image");
    }

    // If any missing fields are found, show a toast and return early
    if (missingFields.length) {
      toast.error(
        `Please complete the following fields: ${missingFields.join(", ")}`,
        {
          className: "custom-toast",
        }
      );
      setIsLoading(false);
      return; // Exit the function early
    }

    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        throw new Error("User is not authenticated");
      }

      // Format the shopName to title case before saving
      const formattedShopName = toTitleCase(vendorData.shopName);

      // Prepare the data to store
      const dataToStore = {
        ...vendorData,
        shopName: formattedShopName, // Save the formatted shop name
        profileComplete: true,
        bankDetails,
      };

      console.log("Data to store in Firestore:", dataToStore);

      // Save the vendor data to Firestore
      await setDoc(doc(db, "vendors", user.uid), dataToStore, { merge: true });

      console.log("Vendor data saved to Firestore.");

      toast.success("Profile completed successfully!", {
        className: "custom-toast",
      });

      navigate("/vendordashboard");
    } catch (error) {
      toast.error("Error completing profile: " + error.message, {
        className: "custom-toast",
      });
      console.error("Error completing profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container>
      <Row>
        {loading ? (
          <Loading />
        ) : (
          <Form className="" onSubmit={handleProfileCompletion}>
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
                    className={`border-0 p-3 mb-4 rounded-lg cursor-not-allowed flex justify-between items-center bg-gray-50 px-10 text-gray-800  opacity-50`}
                  >
                    <span className="font-opensans text-neutral-800">
                      Market Vendor
                    </span>
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex justify-center items-center`}
                    >
                      {vendorData.marketPlaceType === "marketplace" && (
                        <div className="w-3 h-3 rounded-full bg-orange-500" />
                      )}
                    </div>
                  </div>
                </div>
                <motion.button
                  type="button"
                  className={`w-11/12 h-12 fixed bottom-6 left-0 right-0 mx-auto flex justify-center items-center text-white font-opensans rounded-full ${
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
                setIdImage={setIdImage}
                isIdImageUploading={isIdImageUploading}
                isCoverImageUploading={isCoverImageUploading}
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
                setIdImage={setIdImage}
                isIdImageUploading={isIdImageUploading}
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
