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
    bankName: "",
    accountNumber: "",
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
          toast.error("Error uploading image: ", {
            className: "custom-toast",
          });
          setUploadingImage(false);
        },
        async () => {
          // Complete function ...
          const coverImageUrl = await getDownloadURL(uploadTask.snapshot.ref);
          setVendorData((prevState) => ({
            ...prevState,
            coverImage: file,
            coverImageUrl,
          }));
          setUploadingImage(false);
          toast.success("Image uploaded successfully.", {
            className: "custom-toast",
          });
        }
      );
    }
  };

  const handlePhoneNumberChange = (e) => {
    const { value } = e.target;
    if (/^\d*$/.test(value)) {
      setVendorData({ ...vendorData, phoneNumber: value });
    } else {
      toast.error("Please enter a valid phone number.", {
        className: "custom-toast",
      });
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

    const { coverImage, ...dataToStore } = vendorData; // Exclude coverImage

    try {
      // Update Firestore document
      await setDoc(
        doc(db, "vendors", user.uid),
        {
          ...dataToStore,
          profileComplete: true,
        },
        { merge: true }
      );

      toast.success("Profile completed successfully.", {
        className: "custom-toast",
      });
      navigate("/vendordashboard");
    } catch (error) {
      console.log(error);
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
                                      const index = newCategories.indexOf(
                                        category
                                      );
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
                    className="w-full h-14 bg-green-300 text-gray-800 font-ubuntu text-lg rounded-lg"
                  >
                    Next
                  </motion.button>
                </>
              )}

              {step === 2 && (
                <>
                  <FormGroup className="relative mb-2">
                    <label
                      className="block text-black font-ubuntu text-sm font-bold mb-2"
                      htmlFor="marketPlace"
                    >
                      Where is your store located?
                    </label>
                    <input
                      type="text"
                      name="marketPlace"
                      placeholder="Enter marketplace name"
                      value={vendorData.marketPlace}
                      className="w-full h-14 text-gray-800 pl-10 rounded-lg bg-gray-100"
                      onChange={handleInputChange}
                      required
                    />
                  </FormGroup>

                  <FormGroup className="relative mb-2">
                    <label
                      className="block text-black font-ubuntu text-sm font-bold mb-2"
                      htmlFor="complexName"
                    >
                      Enter the name of the complex
                    </label>
                    <input
                      type="text"
                      name="complexName"
                      placeholder="Complex Name"
                      value={vendorData.complexName}
                      className="w-full h-14 text-gray-800 pl-10 rounded-lg bg-gray-100"
                      onChange={handleInputChange}
                      required
                    />
                  </FormGroup>

                  <FormGroup className="relative mb-2">
                    <label
                      className="block text-black font-ubuntu text-sm font-bold mb-2"
                      htmlFor="shopNumber"
                    >
                      Enter your shop number
                    </label>
                    <input
                      type="text"
                      name="shopNumber"
                      placeholder="Shop Number"
                      value={vendorData.shopNumber}
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
                      Enter your contact phone number
                    </label>
                    <input
                      type="text"
                      name="phoneNumber"
                      placeholder="Phone Number"
                      value={vendorData.phoneNumber}
                      className="w-full h-14 text-gray-800 pl-10 rounded-lg bg-gray-100"
                      onChange={handlePhoneNumberChange}
                      required
                    />
                  </FormGroup>

                  <FormGroup className="relative mb-2">
                    <label
                      className="block text-black font-ubuntu text-sm font-bold mb-2"
                      htmlFor="socialMediaHandle"
                    >
                      Enter your social media handle(s)
                    </label>
                    <input
                      type="text"
                      name="socialMediaHandle"
                      placeholder="Social Media Handle(s)"
                      value={vendorData.socialMediaHandle}
                      className="w-full h-14 text-gray-800 pl-10 rounded-lg bg-gray-100"
                      onChange={handleInputChange}
                    />
                  </FormGroup>

                  <FormGroup className="relative mb-2">
                    <label
                      className="block text-black font-ubuntu text-sm font-bold mb-2"
                      htmlFor="bankName"
                    >
                      Enter your bank name
                    </label>
                    <input
                      type="text"
                      name="bankName"
                      placeholder="Bank Name"
                      value={vendorData.bankName}
                      className="w-full h-14 text-gray-800 pl-10 rounded-lg bg-gray-100"
                      onChange={handleInputChange}
                      required
                    />
                  </FormGroup>

                  <FormGroup className="relative mb-2">
                    <label
                      className="block text-black font-ubuntu text-sm font-bold mb-2"
                      htmlFor="accountNumber"
                    >
                      Enter your account number
                    </label>
                    <input
                      type="text"
                      name="accountNumber"
                      placeholder="Account Number"
                      value={vendorData.accountNumber}
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
                      Enter your personal address
                    </label>
                    <PlacesAutocomplete
                      value={vendorData.personalAddress}
                      onChange={(address) =>
                        setVendorData({
                          ...vendorData,
                          personalAddress: address,
                        })
                      }
                      onSelect={async (address) => {
                        const results = await geocodeByAddress(address);
                        const latLng = await getLatLng(results[0]);
                        setVendorData({
                          ...vendorData,
                          personalAddress: address,
                          coordinates: latLng,
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
                              placeholder: "Search Places ...",
                              className:
                                "w-full h-14 text-gray-800 pl-10 rounded-lg bg-gray-100",
                            })}
                          />
                          <div className="autocomplete-dropdown-container">
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
                      htmlFor="coverImage"
                    >
                      Upload your store cover image
                    </label>
                    <div className="w-full h-14 text-gray-800 pl-10 rounded-lg bg-gray-100 flex items-center">
                      <FcAddImage className="mr-2" />
                      <input
                        type="file"
                        name="coverImage"
                        className="hidden"
                        onChange={handleFileChange}
                        accept="image/*"
                      />
                      <span className="text-sm">
                        {uploadingImage
                          ? "Uploading..."
                          : vendorData.coverImage
                          ? vendorData.coverImage.name
                          : "Choose File"}
                      </span>
                    </div>
                  </FormGroup>

                  <motion.button
                    whileTap={{ scale: 1.2 }}
                    onClick={handlePreviousStep}
                    className="w-full h-14 bg-gray-200 text-gray-800 font-ubuntu text-lg rounded-lg"
                  >
                    Previous
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 1.2 }}
                    type="submit"
                    className="w-full h-14 bg-green-300 text-gray-800 font-ubuntu text-lg rounded-lg"
                  >
                    Submit
                  </motion.button>
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
