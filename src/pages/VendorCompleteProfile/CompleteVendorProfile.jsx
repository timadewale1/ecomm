import React, { useState } from "react";
import { getAuth } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../firebase.config";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Container, Row, Form, FormGroup, Button } from "reactstrap";
import { motion } from "framer-motion";
import { RotatingLines } from "react-loader-spinner";
import "react-step-progress-bar/styles.css";
import { FcAddImage } from "react-icons/fc";
import { ProgressBar } from "react-step-progress-bar";
import PlacesAutocomplete, {
  geocodeByAddress,
  getLatLng,
} from "react-places-autocomplete";
import Loading from "../../components/Loading/Loading";

const CompleteProfile = () => {
  const [step, setStep] = useState(1);
  const [showDropdown, setShowDropdown] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [vendorData, setVendorData] = useState({
    shopName: "",
    categories: [],
    description: "",
    marketPlaceType: "",
    marketPlace: "",
    complexName: "",
    shopNumber: "",
    phoneNumber: "",
    socialMediaHandle: "",
    personalAddress: "",
    coverImage: null,
    coverImageUrl: "",
  });
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const categories = [
    "Mens",
    "Womens",
    "Underwears",
    "Y2K",
    "Jewelry",
    "Kids",
    "Traditional Wears",
    "Dresses",
    "Gowns",
    "Shoes",
    "Accessories",
    "Bags",
    "Sportswear",
    "Formal",
    "Casual",
    "Vintage",
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setVendorData({ ...vendorData, [name]: value });
  };

  const handleCategoryChange = (e) => {
    const options = Array.from(e.target.options);
    const selectedCategories = options
      .filter((option) => option.selected)
      .map((option) => option.value);
    setVendorData({ ...vendorData, categories: selectedCategories });
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setUploadingImage(true);
      const file = e.target.files[0];
      const storageRef = ref(storage, `covers/${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          // Progress function ...
        },
        (error) => {
          // Error function ...
          toast.error("Error uploading image: " + error.message, {
            className: "custom-toast",
          });
          setUploadingImage(false);
        },
        async () => {
          // Complete function ...
          const coverImageUrl = await getDownloadURL(uploadTask.snapshot.ref);
          setVendorData({ ...vendorData, coverImage: file, coverImageUrl });
          setUploadingImage(false);
          toast.success("Image uploaded successfully.", {
            className: "custom-toast",
          });
        }
      );
    }
  };

  const handleNextStep = () => {
    setStep(step + 1);
  };

  const handlePreviousStep = () => {
    setStep(step - 1);
  };

  const handleProfileCompletion = async (e) => {
    e.preventDefault();
    setLoading(true);
    const auth = getAuth();
    const user = auth.currentUser;

    try {
      // Update Firestore document
      await setDoc(
        doc(db, "vendors", user.uid),
        {
          ...vendorData,
          profileComplete: true,
        },
        { merge: true }
      );

      toast.success("Profile completed successfully.", {
        className: "custom-toast",
      });
      navigate("/vendordashboard");
    } catch (error) {
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
          <div className="p-3 w-full">
            <div className="text-center mb-4">
              <h1 className="text-xl font-ubuntu text-black font-bold">
                Complete Your Profile
              </h1>
              <p className="font-ubuntu text-xs font-light text-customOrange">
                Please fill in all the required fields to complete your profile.
              </p>
            </div>
            <ProgressBar
              percent={step === 1 ? 50 : 100}
              filledBackground="#bbf7d0"
            ></ProgressBar>
            <Form
              className="relative translate-y-10"
              onSubmit={handleProfileCompletion}
            >
              {step === 1 && (
                <>
                  <FormGroup>
                    <label
                      className="block text-black font-ubuntu text-sm font-bold mb-2"
                      htmlFor="shopName"
                    >
                      Enter your brand/shop name
                    </label>
                    <input
                      type="text"
                      name="shopName"
                      placeholder="Shop Name"
                      value={vendorData.shopName}
                      className="w-full h-14 text-gray-800 pl-10 rounded-lg bg-gray-100"
                      onChange={handleInputChange}
                      required
                    />
                  </FormGroup>

                  <FormGroup className="relative mb-2">
                    <label
                      className="block text-black font-ubuntu text-sm font-bold mb-2"
                      htmlFor="categories"
                    >
                      Choose a category that suits your business
                      <p className="text-xs">
                        choose as many that suits your brand
                      </p>
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="w-full h-14 text-gray-800 pl-10 rounded-lg bg-green-100 text-left"
                      >
                        {vendorData.categories.length > 0
                          ? vendorData.categories.join(", ")
                          : "Select Categories"}
                      </button>
                      {showDropdown && (
                        <div className="absolute mt-2 w-full bg-green-100 border rounded-lg z-10">
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
                                      const index =
                                        newCategories.indexOf(category);
                                      if (index > -1) {
                                        newCategories.splice(index, 1);
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

                  <FormGroup className="relative mb-2">
                    <label
                      className="block text-black font-ubuntu text-sm font-bold mb-2"
                      htmlFor="description"
                    >
                      Enter a brief description of your business
                    </label>
                    <textarea
                      name="description"
                      placeholder="Add a quick description of your business"
                      value={vendorData.description}
                      className="w-full h-24 text-gray-800 rounded-lg bg-gray-100"
                      onChange={handleInputChange}
                      required
                    />
                  </FormGroup>

                  <FormGroup className="relative mb-2">
                    <label
                      className="block text-black font-ubuntu text-sm font-bold mb-2"
                      htmlFor="marketPlaceType"
                    >
                      What type of marketplace do you operate in?
                    </label>
                    <select
                      name="marketPlaceType"
                      value={vendorData.marketPlaceType}
                      className="w-full h-14 text-gray-800 pl-10 rounded-lg bg-gray-100"
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Marketplace</option>
                      <option value="virtual">Virtual/Online</option>
                      <option value="marketplace">Marketplace</option>
                    </select>
                  </FormGroup>

                  <motion.button
                    whileTap={{ scale: 1.2 }}
                    onClick={handleNextStep}
                    className="w-full h-12 bg-customOrange text-white font-semibold rounded-lg mt-4"
                    disabled={
                      !vendorData.shopName ||
                      !vendorData.categories.length ||
                      !vendorData.description ||
                      !vendorData.marketPlaceType
                    }
                  >
                    Next
                  </motion.button>
                </>
              )}
              {step === 2 && vendorData.marketPlaceType === "marketplace" && (
                <>
                  <FormGroup className="relative mb-2">
                    <label
                      className="block text-black font-ubuntu text-sm font-bold mb-2"
                      htmlFor="marketPlace"
                    >
                      What market do you sell in?
                    </label>
                    <select
                      name="marketPlace"
                      value={vendorData.marketPlace}
                      className="w-full h-14 text-gray-800 pl-10 rounded-lg bg-gray-100"
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Choose Marketplace</option>
                      <option value="yaba">Yaba</option>
                      <option value="balogun">Balogun</option>
                    </select>
                  </FormGroup>
                  <FormGroup className="relative mb-2">
                    <label
                      className="block text-black font-ubuntu text-sm font-bold mb-2"
                      htmlFor="complexName"
                    >
                      What is your shop number?
                      <p className="text-xs">
                        or complex name (add a notable landmark)
                      </p>
                    </label>
                    <input
                      type="text"
                      name="complexName"
                      placeholder="Complex Name/Shop Number"
                      value={vendorData.complexName}
                      className="w-full h-14 text-gray-800 pl-10 rounded-lg bg-gray-100"
                      onChange={handleInputChange}
                      required
                    />
                  </FormGroup>
                  <FormGroup className="relative mb-2">
                    <label
                      className="block text-black font-ubuntu text-sm font-bold mb-2"
                      htmlFor="phoneNumber"
                    >
                      Enter your phone number
                    </label>
                    <input
                      type="text"
                      name="phoneNumber"
                      placeholder="Phone Number"
                      value={vendorData.phoneNumber}
                      className="w-full h-14 text-gray-800 pl-10 rounded-lg bg-gray-100"
                      onChange={handleInputChange}
                      required
                    />
                  </FormGroup>
                  <div className="flex justify-between">
                    <Button
                      onClick={handlePreviousStep}
                      className="w-1/4 h-12 bg-gray-400 text-white font-semibold rounded-lg mt-4 mr-2"
                    >
                      Prev.
                    </Button>
                    <motion.button
                      whileTap={{ scale: 1.2 }}
                      type="submit"
                      className="w-1/2 h-12 bg-customOrange text-white font-semibold rounded-lg mt-4 ml-2"
                      disabled={
                        !vendorData.shopName ||
                        !vendorData.categories.length ||
                        !vendorData.description ||
                        !vendorData.marketPlaceType ||
                        !vendorData.marketPlace ||
                        !vendorData.complexName ||
                        !vendorData.phoneNumber
                      }
                    >
                      Complete Profile
                    </motion.button>
                  </div>
                </>
              )}
              {step === 2 && vendorData.marketPlaceType === "virtual" && (
                <>
                  <FormGroup className="relative mb-2">
                    <label
                      className="block text-black font-ubuntu text-sm font-bold mb-2"
                      htmlFor="socialMediaHandle"
                    >
                      Enter your social media handle
                      <p className="text-xs">
                        preferably Instagram, Twitter, or Facebook.
                      </p>
                    </label>
                    <input
                      type="text"
                      name="socialMediaHandle"
                      placeholder="Social Media Handle"
                      value={vendorData.socialMediaHandle}
                      className="w-full h-14 text-gray-800 pl-10 rounded-lg bg-gray-100"
                      onChange={handleInputChange}
                      required
                    />
                  </FormGroup>
                  <FormGroup className="relative mb-2">
                    <label
                      className="block text-black font-ubuntu text-sm font-bold mb-2"
                      htmlFor="personalAddress"
                    >
                      Enter your address
                    </label>
                    <PlacesAutocomplete
                      value={vendorData.personalAddress}
                      onChange={(address) =>
                        setVendorData({
                          ...vendorData,
                          personalAddress: address,
                        })
                      }
                      onSelect={(address) => {
                        geocodeByAddress(address)
                          .then((results) => getLatLng(results[0]))
                          .then((latLng) => console.log("Success", latLng))
                          .catch((error) => console.error("Error", error));
                        setVendorData({
                          ...vendorData,
                          personalAddress: address,
                        });
                      }}
                    >
                      {({
                        getInputProps,
                        suggestions,
                        getSuggestionItemProps,
                        loading,
                      }) => (
                        <div>
                          <input
                            {...getInputProps({
                              placeholder: "Type address",
                              className:
                                "w-full h-14 text-gray-800 pl-10 rounded-lg bg-gray-100",
                            })}
                          />
                          <div>
                            {loading && <div>Loading...</div>}
                            {suggestions.map((suggestion) => {
                              const className = suggestion.active
                                ? "suggestion-item--active"
                                : "suggestion-item";
                              const style = suggestion.active
                                ? {
                                    backgroundColor: "#fafafa",
                                    cursor: "pointer",
                                  }
                                : {
                                    backgroundColor: "#ffffff",
                                    cursor: "pointer",
                                  };
                              return (
                                <div
                                  {...getSuggestionItemProps(suggestion, {
                                    className,
                                    style,
                                  })}
                                >
                                  <span>{suggestion.description}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </PlacesAutocomplete>
                  </FormGroup>
                  <FormGroup className="relative mb-2">
                    <label
                      className="block text-black font-ubuntu text-sm font-bold mb-2"
                      htmlFor="phoneNumber"
                    >
                      Enter your phone number
                    </label>
                    <input
                      type="text"
                      name="phoneNumber"
                      placeholder="Phone Number"
                      value={vendorData.phoneNumber}
                      className="w-full h-14 text-gray-800 pl-10 rounded-lg bg-gray-100"
                      onChange={handleInputChange}
                      required
                    />
                  </FormGroup>
                  <label
                    className="block text-black font-ubuntu text-sm font-bold mb-2"
                    htmlFor="coverImage"
                  >
                    Upload cover image
                    <p className="text-xs">
                      (use high-quality images to attract customers)
                    </p>
                  </label>
                  <FormGroup className="relative mb-2">
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      required
                    />
                    <div className="w-full h-48 text-gray-800 rounded-lg bg-green-100 flex items-center justify-center">
                      {uploadingImage && (
                        <div className="fixed inset-0 translate-x-24 translate-y-28 rounded-lg flex items-center w-40 h-20 justify-center bg-black bg-opacity-40 z-50">
                          <RotatingLines
                            strokeColor="orange"
                            strokeWidth="5"
                            animationDuration="0.75"
                            width="50"
                            visible={true}
                          />
                        </div>
                      )}
                      {vendorData.coverImageUrl ? (
                        <img
                          src={vendorData.coverImageUrl}
                          alt="Cover"
                          className="h-full w-full object-cover rounded-lg"
                        />
                      ) : (
                        <>
                          <FcAddImage className="w-16 h-20" />{" "}
                          <span className="text-gray-600">Upload Image</span>
                        </>
                      )}
                    </div>
                  </FormGroup>

                  <div className="flex justify-between">
                    <Button
                      onClick={handlePreviousStep}
                      className="w-1/4 h-12 bg-gray-400 text-white font-semibold rounded-lg mt-4 mr-2"
                    >
                      Prev.
                    </Button>
                    <motion.button
                      whileTap={{ scale: 1.2 }}
                      type="submit"
                      className="w-1/2 h-12 bg-customOrange text-white font-semibold rounded-lg mt-4 ml-2"
                      disabled={
                        !vendorData.shopName ||
                        !vendorData.categories.length ||
                        !vendorData.description ||
                        !vendorData.marketPlaceType ||
                        !vendorData.socialMediaHandle ||
                        !vendorData.personalAddress ||
                        !vendorData.phoneNumber ||
                        !vendorData.coverImage
                      }
                    >
                      Complete Profile
                    </motion.button>
                  </div>
                </>
              )}
            </Form>
          </div>
        )}
      </Row>
    </Container>
  );
};

export default CompleteProfile;
