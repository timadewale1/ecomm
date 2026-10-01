import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { FormGroup } from "reactstrap";
import { FaXTwitter } from "react-icons/fa6";
import { FaCheckCircle, FaInfoCircle, FaInstagram } from "react-icons/fa";
import { AiOutlineTikTok } from "react-icons/ai";
import { TiCameraOutline } from "react-icons/ti";
import { CiFacebook } from "react-icons/ci";
import { AiOutlineBank } from "react-icons/ai";
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
import NativePickerField from "../../components/Form/NativePickerField";
import AppBottomSheet from "../../components/layout/AppBottomSheet";
import {
  checkVendorShopName,
  getVendorOnboardingErrorMessage,
  resolveVendorBankAccount,
} from "../../services/vendorOnboarding";
import { appHaptics } from "../../services/haptics";

import { GoChevronLeft, GoTrash } from "react-icons/go";
import { FiX } from "react-icons/fi";
import NativeImageInput from "../../components/Inputs/NativeImageInput";
import { BsBasket, BsStack } from "react-icons/bs";
import { IoIosClock } from "react-icons/io";
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
  handleRemoveIdImage,
  handleProfileCompletion,
  handleImageUpload,
  handleRemoveCoverImage,
  handleSocialMediaChange,
  stockpile,

  stockpileStep,
  setStockpileStep,
  handleStockpileChoice,
  duration,
  setDuration,
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
  const [descriptionInfoOpen, setDescriptionInfoOpen] = useState(false);

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
        toast.error("Please choose your delivery address");
        return false;
      }
      if (vendorData.categories.length === 0) {
        toast.error("Please select at least one category");
        return false;
      }
      if (!vendorData.description?.trim()) {
        toast.error("Please add a brand description");
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
    if (step === 4 && deliveryMode === "Delivery & Pickup") {
      if (
        !vendorData.pickupLat ||
        !vendorData.pickupLng ||
        !vendorData.pickupAddress
      ) {
        toast.error("Please choose a pickup location before continuing.");
        return false;
      }
    }
    if (step === 5) {
      if (stockpile?.enabled === true && !duration) {
        toast.error("Please select a stockpile duration before continuing.");
        return false;
      }
    }
    // If everything is valid, proceed to the next step
    handleNextStep();
    return true;
  };

  const [shopNameLoading, setShopNameLoading] = useState(false); // Loader for shop name
  const [isShopNameTaken, setIsShopNameTaken] = useState(false);
  const [isShopNameAvailable, setIsShopNameAvailable] = useState(false);
  const [isResolving, setIsResolving] = useState(false); // Loader for account resolution
  const accountResolutionGenerationRef = useRef(0);
  const shopNameGenerationRef = useRef(0);
  useEffect(
    () => () => {
      accountResolutionGenerationRef.current += 1;
    },
    []
  );
  // Remember previous stockpile choice and weeks when user returns to Step 5
  useEffect(() => {
    if (step !== 5) return;

    const sp = stockpile ?? vendorData?.stockpile;

    if (sp?.enabled === true) {
      setStockpileStep(2); // jump straight to weeks view
      if (sp?.durationInWeeks) setDuration(sp.durationInWeeks); // preselect weeks
    } else if (sp?.enabled === false) {
      setStockpileStep(1); // show Yes/No question
      setDuration(null); // not needed when disabled
    }
  }, [step, stockpile, vendorData?.stockpile, setStockpileStep, setDuration]);

  const toTitleCase = (str) => {
    return str
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };
  const handleStateChange = (state) => {
    setVendorData((current) => ({ ...current, state }));
  };

  const runAccountResolution = async (accountNumber, bank) => {
    if (accountNumber.length !== 10 || !bank?.code) return;
    const generation = ++accountResolutionGenerationRef.current;
    setIsResolving(true);
    setBankDetails((current) => ({ ...current, accountName: "", error: "" }));

    try {
      const { accountName } = await resolveVendorBankAccount({
        accountNumber,
        bankCode: bank.code,
      });
      if (generation !== accountResolutionGenerationRef.current) return;
      setBankDetails((current) => ({
        ...current,
        accountName,
        error: "",
      }));
      void appHaptics.success();
      toast.success("Account resolved successfully");
    } catch (error) {
      if (generation !== accountResolutionGenerationRef.current) return;
      const message = getVendorOnboardingErrorMessage(
        error,
        "We couldn’t verify that account. Check the details and try again."
      );
      console.error("[VendorProfile] Account resolution failed", {
        code: error?.code || "unknown",
        status: error?.status || null,
      });
      setBankDetails((current) => ({
        ...current,
        accountName: "",
        error: message,
      }));
      toast.error(message);
    } finally {
      if (generation === accountResolutionGenerationRef.current) {
        setIsResolving(false);
      }
    }
  };

  const handleBankSelection = (bankCode) => {
    const bank = banks.find((candidate) => candidate.code === bankCode);
    if (!bank) return;

    accountResolutionGenerationRef.current += 1;
    setIsResolving(false);
    setSelectedBank(bank);
    setBankDetails((current) => ({
      ...current,
      bankName: bank.name,
      bankCode: bank.code,
      accountName: "",
      error: "",
    }));

    if (bankDetails.accountNumber?.length === 10) {
      void runAccountResolution(bankDetails.accountNumber, bank);
    }
  };

  const handleAccountNumberChange = (event) => {
    const accountNumber = event.target.value;
    if (!/^\d*$/.test(accountNumber) || accountNumber.length > 10) return;

    accountResolutionGenerationRef.current += 1;
    setIsResolving(false);
    setBankDetails((current) => ({
      ...current,
      accountNumber,
      accountName: "",
      error: "",
    }));

    if (accountNumber.length === 10 && selectedBank) {
      void runAccountResolution(accountNumber, selectedBank);
    }
  };
  useEffect(() => {
    const shopName = toTitleCase(vendorData.shopName.trim());
    const generation = ++shopNameGenerationRef.current;
    if (shopName.length < 2) {
      setShopNameLoading(false);
      setIsShopNameTaken(false);
      setIsShopNameAvailable(false);
      return undefined;
    }

    setShopNameLoading(true);
    setIsShopNameTaken(false);
    setIsShopNameAvailable(false);
    const timeout = window.setTimeout(() => {
      checkVendorShopName(shopName)
        .then(({ available }) => {
          if (generation !== shopNameGenerationRef.current) return;
          setIsShopNameTaken(!available);
          setIsShopNameAvailable(Boolean(available));
        })
        .catch((error) => {
          if (generation !== shopNameGenerationRef.current) return;
          setIsShopNameAvailable(false);
          console.error("[VendorOnboarding] Shop-name check failed", {
            code: error?.code || "unknown",
          });
        })
        .finally(() => {
          if (generation === shopNameGenerationRef.current) {
            setShopNameLoading(false);
          }
        });
    }, 450);

    return () => window.clearTimeout(timeout);
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
        vendorData.description?.trim() &&
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
      return (
        deliveryMode &&
        (deliveryMode !== "Delivery & Pickup" ||
          (vendorData.pickupLat &&
            vendorData.pickupLng &&
            vendorData.pickupAddress))
      );
    }

    if (step === 5) {
      const enabled = stockpile?.enabled ?? vendorData?.stockpile?.enabled;
      return enabled ? Boolean(duration) : true;
    }

    // Step 6 is ID verification
    if (step === 6) {
      return idVerification && (idImage || vendorData.idUploaded);
    }

    return false;
  };

  return (
    <div>
      {/* <div className="w-5 bg-red-600 h-5" onClick={handleNextStep}></div> */}
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
                  onChange={(event) =>
                    setVendorData((current) => ({
                      ...current,
                      shopName: toTitleCase(event.target.value),
                    }))
                  }
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

              <div className="mb-3">
                <label className="mb-1 block text-sm font-medium text-gray-800">
                  Delivery address
                </label>
                <p className="mb-2 text-xs leading-5 text-gray-600">
                  Add the address where our logistics partners should collect
                  customer orders from your store.
                </p>
                <LocationPicker
                  initialAddress={vendorData.Address}
                  initialCoords={vendorData.location}
                  onLocationSelect={({ address, lat, lng }) => {
                    setVendorData((current) => ({
                      ...current,
                      Address: address,
                      location: { lat, lng },
                    }));
                  }}
                />
              </div>

              <div className="mb-3">
                <NativePickerField
                  name="state"
                  title="Choose a State"
                  placeholder="Choose a State"
                  value={vendorData.state || ""}
                  options={NigerianStates}
                  onChange={handleStateChange}
                  className="min-h-12 rounded-lg border-2 px-3 font-opensans"
                />
              </div>

              <div className="mb-3">
                <NativePickerField
                  name="categories"
                  title="Choose one or more categories"
                  placeholder="Choose one or more categories"
                  value={vendorData.categories}
                  options={categories}
                  onChange={(nextCategories) =>
                    setVendorData((current) => ({
                      ...current,
                      categories: nextCategories,
                    }))
                  }
                  multiple
                  className="min-h-12 rounded-lg border-2 p-3 font-opensans"
                />
                <p className="mt-1.5 text-xs leading-5 text-gray-600">
                  You can select multiple categories. Tap Done when you have
                  selected everything your store sells.
                </p>
              </div>

              <div className="mb-1 flex items-center justify-between">
                <label
                  htmlFor="vendor-store-description"
                  className="text-sm font-medium text-gray-800"
                >
                  Store description
                </label>
                <button
                  type="button"
                  onClick={() => {
                    void appHaptics.selection();
                    setDescriptionInfoOpen(true);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-customOrange"
                  aria-label="Why your store description matters"
                >
                  <FaInfoCircle className="h-5 w-5" />
                </button>
              </div>
              <input
                id="vendor-store-description"
                type="text"
                name="description"
                placeholder="Describe your store"
                value={vendorData.description}
                onChange={handleInputChange}
                className="w-full h-12 mb-4 p-3 border-2 font-opensans text-black rounded-lg focus:outline-none focus:border-customOrange hover:border-customOrange"
              />

              <AppBottomSheet
                open={descriptionInfoOpen}
                onClose={() => setDescriptionInfoOpen(false)}
                height="42dvh"
                ariaLabel="Why your store description matters"
                compactTop
                zIndex={5300}
              >
                <div className="flex min-h-0 flex-1 flex-col pt-5 font-satoshi">
                  <header className="flex items-center justify-between border-b border-gray-100 px-4 pb-3">
                    <span className="h-9 w-9" aria-hidden="true" />
                    <h2 className="text-center text-base font-semibold text-gray-950">
                      Your store description
                    </h2>
                    <button
                      type="button"
                      onClick={() => setDescriptionInfoOpen(false)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-800"
                      aria-label="Close description information"
                    >
                      <FiX className="h-5 w-5" />
                    </button>
                  </header>
                  <div className="overflow-y-auto px-5 pb-6 pt-4 text-sm leading-6 text-gray-700">
                    <p>
                      This description appears on your public storefront. Use
                      it to tell customers what you sell, your style, and what
                      makes your store different.
                    </p>
                    <p className="mt-3">
                      A clear and specific description builds trust, helps
                      customers understand your catalogue, and can make your
                      store easier to discover. Avoid filler, unrelated text,
                      or claims that could mislead customers.
                    </p>
                  </div>
                </div>
              </AppBottomSheet>
              {/* Categories */}
              {/* Social Media */}
              <h3 className="text-md font-semibold mb-1 font-opensans flex items-center">
                <IoShareSocial className="w-5 h-5 mr-2 text-header" />
                Social Media
              </h3>
              <h4 className="font-opensans text-gray-700 mb-3 text-xs">
                Add at least one active social media link. We need it to review
                and verify your vendor application.
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
                  className="relative flex h-full w-full items-center justify-center"
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
                          void handleRemoveCoverImage();
                        }}
                      >
                        <GoTrash className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="flex h-full w-full flex-col items-center justify-center p-12 text-center"
                      onClick={() =>
                        document.getElementById("shopImageUpload")?.click()
                      }
                      disabled={isCoverImageUploading}
                    >
                      <BiSolidImageAdd
                        size={60}
                        className="mb-4 text-customOrange opacity-40"
                      />
                      <span className="text-xs font-light text-orange-500">
                        Upload shop image here. Image must be clear and not more
                        than 3MB.
                      </span>
                    </button>
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

                <NativeImageInput
                  id="shopImageUpload"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => handleImageUpload(e)}
                />
              </div>
              <motion.button
                type="button"
                className={`w-full h-12 text-white rounded-md ${
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
                <NativePickerField
                  id="bank-select"
                  name="bankName"
                  title="Select Bank"
                  placeholder="Select Bank"
                  value={bankDetails.bankCode || ""}
                  options={banks.map((bank) => ({
                    label: bank.name,
                    value: bank.code,
                  }))}
                  onChange={handleBankSelection}
                  disabled={isResolving}
                  className="h-12 rounded-lg border-2 px-3 font-opensans text-gray-800 hover:border-customOrange focus:border-customOrange"
                />
              </div>

              {/* Account Number Field */}
              <div className="relative w-full">
                <input
                  type="text"
                  name="accountNumber"
                  value={bankDetails.accountNumber || ""}
                  onChange={handleAccountNumberChange}
                  inputMode="numeric"
                  autoComplete="off"
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
                  className={`vendor-onboarding-action w-11/12 h-12 fixed left-0 right-0 mx-auto flex justify-center items-center text-white rounded-md ${
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
                <button
                  type="button"
                  onClick={() => handleDeliveryModeChange("Delivery")}
                  aria-pressed={deliveryMode === "Delivery"}
                  className={`mb-4 flex w-full items-center justify-between rounded-md border-0 p-2 text-left ${
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
                </button>

                {/* Delivery & Pickup Option */}
                <button
                  type="button"
                  onClick={() => handleDeliveryModeChange("Delivery & Pickup")}
                  aria-pressed={deliveryMode === "Delivery & Pickup"}
                  className={`flex w-full items-center justify-between rounded-md p-2 text-left ${
                    deliveryMode === "Delivery & Pickup"
                  }`}
                >
                  <span className="font-opensans text-black">
                    Delivery &amp; Pickup
                  </span>

                  <div
                    className={`w-6 h-6 rounded-full border-2 flex flex-col justify-center items-center ${
                      deliveryMode === "Delivery & Pickup"
                        ? "border-customOrange"
                        : "border-gray-300"
                    }`}
                  >
                    {deliveryMode === "Delivery & Pickup" && (
                      <div className="w-3 h-3 rounded-full bg-customOrange" />
                    )}
                  </div>
                </button>
                {deliveryMode === "Delivery & Pickup" && (
                  <div className="mt-2 px-2">
                    <p className="font-opensans text-xs text-gray-700 mb-2">
                      This pickup location is where you'll meet buyers who
                      choose to collect their order directly from you. It can be
                      somewhere outside your house like your gate, curb, or a
                      nearby public place just somewhere you’re comfortable
                      meeting people.
                      <br />
                      <br />
                      <strong className="text-black">
                        Note: This is <u>not</u> the same as your main delivery
                        address.
                      </strong>{" "}
                      We’ll still use the address you provided earlier to
                      arrange delivery with our logistics partners.
                      <br />
                      <br />
                      <span className="text-customOrange animate-pulse font-semibold">
                        We strongly advise against using your exact home address
                        as your pickup location to prevent doxxing or privacy
                        issues.
                      </span>
                    </p>

                    <LocationPicker
                      initialAddress={vendorData.pickupAddress}
                      initialCoords={{
                        lat: vendorData.pickupLat,
                        lng: vendorData.pickupLng,
                      }}
                      onLocationSelect={({ address, lat, lng }) =>
                        setVendorData({
                          ...vendorData,
                          pickupAddress: address,
                          pickupLat: lat,
                          pickupLng: lng,
                        })
                      }
                    />
                  </div>
                )}
              </div>

              <motion.button
                type="button"
                className={`vendor-onboarding-action w-11/12 h-12 fixed left-0 right-0 mx-auto flex justify-center items-center text-white font-opensans rounded-md ${
                  deliveryMode &&
                  (deliveryMode !== "Delivery & Pickup" ||
                    (vendorData.pickupAddress &&
                      vendorData.pickupLat &&
                      vendorData.pickupLng))
                    ? "bg-customOrange"
                    : "bg-customOrange opacity-20"
                }`}
                onClick={handleValidation}
                disabled={
                  !deliveryMode ||
                  (deliveryMode === "Delivery & Pickup" &&
                    (!vendorData.pickupAddress ||
                      !vendorData.pickupLat ||
                      !vendorData.pickupLng))
                }
              >
                Next
              </motion.button>
            </div>
          )}

          {/*Step 6: Vendor Stockpiling setup*/}
          {step === 5 && vendorData.marketPlaceType === "virtual" && (
            <div className="p-2 mt-3 ">
              <h2 className="text-xs text-customOrange font-light font-opensans mb-3">
                Step 4: Set up Stockpiling
              </h2>
              {/* Progress bar */}
              <ProgressBar step={4} />
              {stockpileStep === 1 ? (
                <>
                  <div className="mb-6 mt-4 w-full flex justify-center object-cover ">
                    <BsStack className="text-9xl text-customRichBrown" />
                  </div>
                  <h2 className="text-3xl font-bold font-ubuntu text-gray-800 mb-3">
                    Do you currently offer stockpiling?
                  </h2>
                  <p className="text-sm mt-10 font-ubuntu text-gray-600 mb-6">
                    Stockpiling allows customers to reserve items and keep
                    adding more to their order over a set period before it's
                    shipped. Let us know if you offer this option!
                  </p>
                  <div className="border-t border-gray-100"></div>
                  <p className="text-xs mt-4 ital  font-ubuntu text-customOrange mb-6 italic">
                    For stockpiled orders, you are paid 100% of the order value
                    upfront, and the order is ready to be shipped once the
                    stockpile duration expires.
                  </p>
                  {/* Let user switch Yes/No while on weeks screen */}
                  <div className="flex gap-3  flex-col justify-center mb-4">
                    <button
                      type="button"
                      onClick={() => handleStockpileChoice(true)} // enables & goes to weeks
                      className={`rounded-md border px-4 py-2 font-opensans font-medium ${
                        stockpile?.enabled ?? vendorData?.stockpile?.enabled
                          ? "bg-customOrange text-white border-customOrange"
                          : "bg-gray-100 text-gray-700 border-gray-200"
                      }`}
                    >
                      Yes, I do
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleStockpileChoice(false); // disables and goes next
                        setDuration(null);
                      }}
                      className={`rounded-md border px-4 py-2 font-opensans font-medium ${
                        stockpile?.enabled ?? vendorData?.stockpile?.enabled
                          ? "bg-gray-100 text-gray-700 border-gray-200"
                          : "bg-customOrange text-white border-customOrange"
                      }`}
                    >
                      No, not currently
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-6 mt-2 w-full flex justify-center object-cover ">
                    <IoIosClock className="text-9xl text-customRichBrown" />
                  </div>
                  <h2 className="text-3xl font-ubuntu  font-bold text-gray-800 mb-4">
                    How long can customers stockpile?
                  </h2>
                  <div className="grid grid-cols-2 gap-4 mt-10 mb-6">
                    {[2, 4, 6, 8].map((week) => (
                      <button
                        type="button"
                        key={week}
                        aria-pressed={duration === week}
                        className={`rounded-md border px-4 py-3 font-opensans text-sm font-medium ${
                          duration === week
                            ? "bg-customOrange text-white"
                            : "bg-gray-100 text-gray-700"
                        }`}
                        onClick={() => setDuration(week)}
                      >
                        {week} weeks
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      if (!duration) return;
                      handleStockpileChoice(true, duration); // persist to vendorData
                      handleValidation(); // then advance
                    }}
                    disabled={!duration}
                    className={`w-full py-3 relative text-sm font-opensans -bottom-28 rounded-md font-medium ${
                      duration
                        ? "bg-customOrange text-white"
                        : "bg-gray-300 text-gray-200 cursor-not-allowed"
                    }`}
                  >
                    Save and continue
                  </button>
                </>
              )}
            </div>
          )}

          {/* Step 5: ID Verification for Online Vendor */}
          {step === 6 && vendorData.marketPlaceType === "virtual" && (
            <div className="p-2 mt-3 ">
              <h2 className="text-xs text-customOrange font-light font-opensans mb-3">
                Step 5: ID verification
              </h2>
              {/* Progress bar */}
              <ProgressBar step={5} />

              {/* ID Verification */}
              <h3 className="text-md mt-3 font-semibold font-opensans flex items-center mb-3">
                <PiIdentificationCardThin className="w-5 h-5 mr-2 text-gray-600" />
                ID Verification
              </h3>
              <div className="relative mb-2 font-opensans">
                <NativePickerField
                  name="idVerification"
                  title="Select Verification Document"
                  placeholder="Select Verification Document"
                  value={idVerification}
                  onChange={handleIdVerificationChange}
                  options={[
                    "NIN",
                    "International Passport",
                    "CAC",
                    "School ID",
                    "Work ID",
                  ]}
                  className="h-11 rounded-lg border border-gray-300 px-4 font-opensans text-gray-700 focus:border-customOrange"
                />
              </div>

              {/* Upload ID */}
              <h3 className="text-md mt-3 font-semibold font-opensans mb-3 flex items-center">
                <TiCameraOutline className="w-5 h-5 mr-2 text-black" />
                Upload ID
              </h3>
              <div
                className="mb-4 rounded-md border border-orange-200 bg-orange-50 p-3 text-xs leading-5 text-gray-800"
                role="note"
              >
                Every ID is reviewed manually. Upload a valid ID that belongs to
                you. False, altered or incorrect documents may result in a
                permanent vendor ban and the application will not be reviewed
                again. NIN, passport, CAC, school ID and work ID are accepted.
              </div>
              <div className="border-2 border-customBrown border-dashed rounded-lg h-48 w-full text-center mb-6">
                {idImage ? (
                  <div className="relative w-full h-full">
                    <img
                      src={idImage}
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
                        onClick={() => void handleRemoveIdImage()}
                        aria-label="Remove uploaded ID"
                      >
                        <GoTrash className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ) : vendorData.idUploaded ? (
                  <div className="relative flex h-full w-full flex-col items-center justify-center rounded-lg bg-green-50 px-8">
                    <FaCheckCircle className="mb-3 text-4xl text-green-600" />
                    <p className="text-sm font-medium text-green-800">
                      ID uploaded securely and ready for review
                    </p>
                    <button
                      type="button"
                      className="absolute right-2 top-2 rounded-full bg-customBrown p-1 text-white"
                      onClick={() => void handleRemoveIdImage()}
                      aria-label="Remove uploaded ID"
                    >
                      <GoTrash className="h-4 w-4" />
                    </button>
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

                          <NativeImageInput
                            className="hidden"
                          onChange={handleIdImageUpload}
                          id="idImageUpload"
                          accept="image/jpeg,image/png,image/webp"
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
                className={`vendor-onboarding-action w-11/12 h-12 fixed left-0 right-0 mx-auto flex justify-center font-opensans items-center text-white rounded-md ${
                  idVerification && (idImage || vendorData.idUploaded)
                    ? "bg-customOrange"
                    : "bg-customOrange opacity-20"
                }`}
                onClick={handleProfileCompletion}
                disabled={
                  !idVerification ||
                  !(idImage || vendorData.idUploaded) ||
                  isLoading
                }
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
