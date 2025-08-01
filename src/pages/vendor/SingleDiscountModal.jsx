import React, { useState, useEffect } from "react";
import Modal from "react-modal";
import { MdOutlineClose } from "react-icons/md";
import { FaInfoCircle } from "react-icons/fa";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  addDoc,
} from "firebase/firestore";
import { db } from "../../firebase.config";
import toast from "react-hot-toast";
import { IoGift } from "react-icons/io5";
import { LuBadgeInfo } from "react-icons/lu";
import { RotatingLines } from "react-loader-spinner";

// Ensure you call Modal.setAppElement("#root") in your top-level file (e.g., index.js)
Modal.setAppElement("#root");

const SingleDiscountModal = ({ isOpen, onRequestClose, product }) => {
  // --- Discount-related state (all internal to the modal) ---
  const [inAppDiscounts, setInAppDiscounts] = useState([]);
  const [selectedDiscount, setSelectedDiscount] = useState(null);
  // For monetary discounts, the vendor enters:
  const [discountPrice, setDiscountPrice] = useState("");
  // Auto‑calculated values:
  const [subtractiveValue, setSubtractiveValue] = useState("");
  const [percentageCut, setPercentageCut] = useState("");
  // discountType will be determined based on the selection:
  const [discountType, setDiscountType] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // For personal discounts, choose between monetary and freebies
  const [personalDiscountSubtype, setPersonalDiscountSubtype] =
    useState("monetary");
  const [isPersonalSubtypeDropdownOpen, setIsPersonalSubtypeDropdownOpen] =
    useState(false);
  const [freebieText, setFreebieText] = useState("");

  // --- State for the Discount Info Modal ---
  const [isDiscountInfoModalOpen, setIsDiscountInfoModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const openDiscountInfoModal = () => setIsDiscountInfoModalOpen(true);
  const closeDiscountInfoModal = () => setIsDiscountInfoModalOpen(false);

  const [visible, setVisible] = useState(false);
    useEffect(() => {
      setTimeout(() => setVisible(true), 10);
    }, []);

  // --- 1. Fetch active in‑app discounts from Firestore ---
  useEffect(() => {
    const fetchDiscounts = async () => {
      try {
        const discountsQuery = query(
          collection(db, "inAppDiscounts"),
          where("isActive", "==", true)
        );
        const querySnapshot = await getDocs(discountsQuery);
        const discounts = [];
        querySnapshot.forEach((doc) => {
          discounts.push({ id: doc.id, ...doc.data() });
        });
        // Append an extra option for personal discounts
        discounts.push({ id: "personal", name: "Run Personal Discount" });
        setInAppDiscounts(discounts);
        // Set default selection to the first discount option
        if (discounts.length > 0) {
          setSelectedDiscount(discounts[0]);
          setDiscountType(`inApp-${discounts[0].id}`);
        }
      } catch (error) {
        console.error("Error fetching in‑app discounts:", error);
      }
    };
    fetchDiscounts();
  }, []);

  // --- 2. Auto-calculate subtractive value and percentage when prices change ---
  useEffect(() => {
    if (!product) return; // Ensure product is defined before proceeding
    let p = product.price || 0;
    const price = parseFloat(p);
    const discPrice = parseFloat(discountPrice);
    if (!isNaN(price) && !isNaN(discPrice) && price > 0 && discPrice < price) {
      const subVal = price - discPrice;
      const perc = Math.round((subVal / price) * 100); // whole number
      setSubtractiveValue(subVal.toFixed(2));
      setPercentageCut(perc);
    } else {
      setSubtractiveValue("");
      setPercentageCut("");
    }
  }, [product, discountPrice]);

  // --- 3. Format a value into a currency string ---
  const formatToCurrency = (value) => {
    let numericValue = value.replace(/\D/g, "");
    return (numericValue / 100).toFixed(2);
  };

  // --- 4. Form validation ---
  // For in‑app and personal‑monetary discounts, both prices must be entered, discountPrice >= 300,
  // and discountPrice must be less than initialPrice.
  // For personal freebies, freebieText must be filled.
  const isMonetary =
    discountType.startsWith("inApp") || discountType === "personal-monetary";
  const isFreebies = discountType === "personal-freebies";

  // Build an error message based on the criteria
  let errorMessage = "";
  if (isMonetary) {
    if (discountPrice.trim() === "") {
      errorMessage = "Discount price is required.";
    } else if (parseFloat(discountPrice) < 300) {
      errorMessage = "Discount price must be at least 300.";
    } else if (parseFloat(discountPrice) >= parseFloat(product.price)) {
      errorMessage = "Discount price must be less than the initial price.";
    }
  } else if (isFreebies) {
    if (freebieText.trim() === "") {
      errorMessage = "Freebie details are required.";
    }
  }

  const isFormValid = errorMessage === "";

  // --- 5. When "Save Discount" is clicked, prepare and send discount details ---
  //   const handleDiscountSaveClick = () => {
  //       const productRef = doc(db, "products", product.id);

  //             const vendorDocRef = doc(db, "vendors", product.vendorId);

  //             const discountsRef = collection(db, "discounts");
  //             let discountDetails;
  //             if (selectedDiscount && selectedDiscount.id !== "personal") {
  //               discountDetails = {
  //                 discountType: `inApp-${selectedDiscount.id}`,
  //                 selectedDiscount,
  //                 initialPrice: parseFloat(product.price),
  //                 discountPrice: parseFloat(discountPrice),
  //                 subtractiveValue: parseFloat(subtractiveValue),
  //                 percentageCut: parseFloat(percentageCut),
  //               };
  //             } else if (selectedDiscount && selectedDiscount.id === "personal") {
  //               if (personalDiscountSubtype === "monetary") {
  //                 discountDetails = {
  //                   discountType: "personal-monetary",
  //                   initialPrice: parseFloat(product.price),
  //                   discountPrice: parseFloat(discountPrice),
  //                   subtractiveValue: parseFloat(subtractiveValue),
  //                   percentageCut: parseFloat(percentageCut),
  //                 };
  //               } else if (personalDiscountSubtype === "freebies") {
  //                 discountDetails = {
  //                   discountType: "personal-freebies",
  //                   freebieText: freebieText,
  //                 };
  //               }
  //             }
  //             const discountDocRef = doc(discountsRef);
  //             const discountData = {
  //                       vendorId: product.vendorId,
  //                       type: discountDetails.discountType.startsWith("inApp")
  //                         ? "inApp"
  //                         : "personal",
  //                       // For personal discounts, include discountSubType
  //                       ...(discountDetails.discountType.startsWith("personal")
  //                         ? {
  //                             discountSubType:
  //                               discountDetails.discountType === "personal-monetary"
  //                                 ? "monetary"
  //                                 : "freebies",
  //                           }
  //                         : {}),
  //                       isActive: true,
  //                       createdAt: serverTimestamp(),
  //                       // Only include pricing fields if this is NOT a freebies discount
  //                       ...(discountDetails.discountType !== "personal-freebies" &&
  //                       discountDetails.initialPrice
  //                         ? {
  //                             initialPrice: discountDetails.initialPrice,
  //                             discountPrice: discountDetails.discountPrice,
  //                             percentageCut: discountDetails.percentageCut,
  //                             subtractiveValue: discountDetails.subtractiveValue,
  //                           }
  //                         : {}),
  //                       // For personal freebies, include freebieText
  //                       ...(discountDetails.discountType === "personal-freebies"
  //                         ? { freebieText: discountDetails.freebieText }
  //                         : {}),
  //                       ...(discountDetails.selectedDiscount
  //                         ? {
  //                             selectedDiscountId: discountDetails.selectedDiscount.id,
  //                             selectedDiscountName: discountDetails.selectedDiscount.name,
  //                           }
  //                         : {}),
  //                     };
  //                      setDoc(discountDocRef, discountData);
  //                     // Update the vendor's discountIds field
  //                updateDoc(vendorDocRef, {
  //                       discountIds: arrayUnion(discountDocRef.id),
  //                     });
  //                     // Optionally, update the product document with a reference to the discount document
  //                     if (personalDiscountSubtype !== "freebies") {
  //                     updateDoc(productRef, {
  //                         price: discountDetails.discountPrice,
  //                         discount: discountDetails,
  //                       discountId: discountDocRef.id,
  //                     });
  //                 } else {
  //                     updateDoc(productRef, {
  //                     discount: discountDetails,
  //                   discountId: discountDocRef.id,
  //                 });
  //                 }

  //     console.log("Passing discountDetails to parent:", discountDetails);
  //     onRequestClose();
  //   };
    const logActivity = async (title, note, type) => {
        const activityRef = collection(db, "vendors", product.vendorId, "activityNotes");
        const activityNote = {
          title,
          type,
          timestamp: new Date(),
          note: note,
        };
    
        try {
          await addDoc(activityRef, activityNote);
        } catch (error) {
          console.error("Error logging activity: ", error);
        }
      };

  const handleDiscountSaveClick = async () => {
    setIsLoading(true);
    try {
      const productRef = doc(db, "products", product.id);
      const vendorDocRef = doc(db, "vendors", product.vendorId);
      const discountsRef = collection(db, "discounts");

      // Prepare discount details
      let discountDetails = {};
      if (selectedDiscount && selectedDiscount.id !== "personal") {
        discountDetails = {
          discountType: `inApp-${selectedDiscount.id}`,
          selectedDiscount,
          initialPrice: parseFloat(product.price),
          discountPrice: parseFloat(discountPrice),
          subtractiveValue: parseFloat(subtractiveValue),
          percentageCut: parseFloat(percentageCut),
        };
      } else if (selectedDiscount?.id === "personal") {
        if (personalDiscountSubtype === "monetary") {
          discountDetails = {
            discountType: "personal-monetary",
            initialPrice: parseFloat(product.price),
            discountPrice: parseFloat(discountPrice),
            subtractiveValue: parseFloat(subtractiveValue),
            percentageCut: parseFloat(percentageCut),
          };
        } else if (personalDiscountSubtype === "freebies") {
          discountDetails = {
            discountType: "personal-freebies",
            freebieText,
          };
        }
      }

      const discountDocRef = doc(discountsRef); // Auto-ID
      const discountData = {
        vendorId: product.vendorId,
        type: discountDetails.discountType.startsWith("inApp")
          ? "inApp"
          : "personal",
        isActive: true,
        createdAt: serverTimestamp(),
        ...(discountDetails.discountType.startsWith("personal") && {
          discountSubType:
            discountDetails.discountType === "personal-monetary"
              ? "monetary"
              : "freebies",
        }),
        ...(discountDetails.discountType !== "personal-freebies" &&
          discountDetails.initialPrice && {
            initialPrice: discountDetails.initialPrice,
            discountPrice: discountDetails.discountPrice,
            percentageCut: discountDetails.percentageCut,
            subtractiveValue: discountDetails.subtractiveValue,
          }),
        ...(discountDetails.discountType === "personal-freebies" && {
          freebieText: discountDetails.freebieText,
        }),
        ...(discountDetails.selectedDiscount && {
          selectedDiscountId: discountDetails.selectedDiscount.id,
          selectedDiscountName: discountDetails.selectedDiscount.name,
        }),
      };

      // Save discount to Firestore
      await setDoc(discountDocRef, discountData);

      // Update vendor with this discount ID
      await updateDoc(vendorDocRef, {
        discountIds: arrayUnion(discountDocRef.id),
      });

      // Update product with discount and possibly the discounted price
      const productUpdate = {
        discount: discountDetails,
        discountId: discountDocRef.id,
      };

      if (
        personalDiscountSubtype !== "freebies" &&
        discountDetails.discountPrice
      ) {
        productUpdate.price = discountDetails.discountPrice;
      }

      await updateDoc(productRef, productUpdate);

      await logActivity(
        "Running a Discount 🏷",
        `You've applied a ${
          discountDetails.discountType.startsWith("inApp")
            ? "store-wide"
            : "personal"
        } discount on ${product.name}. Check your store for more details!`,
        "Discount Update");

      toast.success("Discount saved and applied successfully!");
      console.log("Passing discountDetails to parent:", discountDetails);
      setIsLoading(false);
      onRequestClose();
    } catch (error) {
      console.error("Error saving discount:", error);
      toast.error("Failed to save the discount. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onRequestClose={onRequestClose}
        className={`discount-modal`}
        overlayClassName={`fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center modal1 transition-all duration-100 ${visible ? 'backdrop-blur-sm' : ''}`}
      >
        <div className={`flex items-center justify-between border-b border-gray-200 px-2 py-2 `}>
          <span className="flex items-center">
            <h2 className="font-opensans text-lg text-customRichBrown font-semibold">
              {selectedDiscount && selectedDiscount.id !== "personal"
                ? "In‑App Discount"
                : "Personal Discount"}
            </h2>
            <IoGift className="text-customOrange text-xl ml-2" />
          </span>
          <MdOutlineClose
            className="text-black text-xl cursor-pointer"
            onClick={onRequestClose}
          />
        </div>

        <div className="py-4 px-2 overflow-y-auto max-h-[90vh]">
          {/* Main Dropdown for Discount Options */}
          <div className="relative">
            <label className="block text-sm font-medium font-opensans text-customRichBrown">
              Select a Discount Option
            </label>
            <button
              className="bg-white w-full text-left text-sm font-opensans border-gray-100 border-2 px-4 py-2 rounded-lg"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              {selectedDiscount ? selectedDiscount.name : "Select Discount"}
            </button>
            {isDropdownOpen && (
              <div className="absolute z-50 bg-white w-full rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 mt-2 p-3">
                {inAppDiscounts.map((discount) => (
                  <button
                    key={discount.id}
                    onClick={() => {
                      setSelectedDiscount(discount);
                      setIsDropdownOpen(false);
                      if (discount.id !== "personal") {
                        setDiscountType(`inApp-${discount.id}`);
                      } else {
                        setDiscountType("personal-monetary");
                      }
                    }}
                    className="block w-full text-left text-sm text-black font-opensans px-2 py-1 hover:bg-gray-100 rounded-md"
                  >
                    {discount.name}{" "}
                    {discount.startDate && discount.endDate
                      ? `(Valid from ${new Date(
                          discount.startDate.seconds * 1000
                        ).toDateString()} to ${new Date(
                          discount.endDate.seconds * 1000
                        ).toDateString()})`
                      : ""}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* If "Run Personal Discount" is selected, show a second dropdown for subtype with an info icon */}
          {selectedDiscount && selectedDiscount.id === "personal" && (
            <div className="relative mt-4 flex flex-col ">
              <div className="flex items-center">
                <label className="block text-sm font-medium font-opensans text-customRichBrown">
                  Select Personal Discount Type
                </label>
                <button className="ml-2" onClick={openDiscountInfoModal}>
                  <LuBadgeInfo className="w-5 h-5 text-customRichBrown" />
                </button>
              </div>
              <div className="w-full">
                <button
                  className="bg-white w-full text-left text-sm font-opensans border-gray-100 border-2 px-4 py-2 rounded-lg mt-2"
                  onClick={() =>
                    setIsPersonalSubtypeDropdownOpen(
                      !isPersonalSubtypeDropdownOpen
                    )
                  }
                >
                  {personalDiscountSubtype === "monetary"
                    ? "Monetary"
                    : "Freebies"}
                </button>
                {isPersonalSubtypeDropdownOpen && (
                  <div className="absolute z-50 bg-white w-full rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 mt-2 p-3">
                    <button
                      onClick={() => {
                        setPersonalDiscountSubtype("monetary");
                        setIsPersonalSubtypeDropdownOpen(false);
                        setDiscountType("personal-monetary");
                      }}
                      className="block w-full text-left text-sm text-black font-opensans px-2 py-1 hover:bg-gray-100 rounded-md"
                    >
                      Monetary
                    </button>
                    <button
                      onClick={() => {
                        setPersonalDiscountSubtype("freebies");
                        setIsPersonalSubtypeDropdownOpen(false);
                        setDiscountType("personal-freebies");
                      }}
                      className="block w-full text-left text-sm text-black font-opensans px-2 py-1 hover:bg-gray-100 rounded-md"
                    >
                      Freebies
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Price Inputs (for monetary discounts) */}
          {((selectedDiscount && selectedDiscount.id !== "personal") ||
            (selectedDiscount &&
              selectedDiscount.id === "personal" &&
              personalDiscountSubtype === "monetary")) && (
            <div className="mt-4">
              <label className="block text-sm font-medium font-opensans text-customRichBrown">
                Initial Price
              </label>
              <div className="w-full border-2 rounded-md px-2 py-2 bg-gray-50 font-opensans font-medium text-black text-sm border-gray-100 text-right">
                ₦{product?.price?.toFixed(2)}
              </div>
              <label className="block text-sm font-medium font-opensans text-customRichBrown mt-4">
                Discount Price
              </label>
              <input
                type="text"
                value={discountPrice}
                onChange={(e) =>
                  setDiscountPrice(formatToCurrency(e.target.value))
                }
                onBlur={() => {
                  if (parseFloat(discountPrice) < 300) {
                    toast.error("Discount price must be at least 300");
                    setDiscountPrice("");
                  }
                }}
                className="w-full text-right border-2 font-opensans text-gray-800 border-gray-100 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-customOrange"
                placeholder="0.00"
              />
              <div className="mt-4 flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium font-opensans text-customRichBrown">
                    Subtractive Value
                  </label>
                  <div className="w-full border-2 rounded-md px-2 py-2 bg-gray-50 font-opensans font-medium text-black text-sm border-gray-100 text-right">
                    ₦{subtractiveValue}
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium font-opensans text-customRichBrown">
                    Percentage Cut
                  </label>
                  <div className="w-full border-2 rounded-md px-2 py-2 bg-gray-50 font-opensans font-medium text-black text-sm border-gray-100 text-right">
                    {percentageCut}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* For personal freebies */}
          {selectedDiscount &&
            selectedDiscount.id === "personal" &&
            personalDiscountSubtype === "freebies" && (
              <div className="mt-4">
                <label className="block text-sm font-medium font-opensans text-customRichBrown">
                  Freebie Details
                </label>
                <input
                  type="text"
                  value={freebieText}
                  onChange={(e) => setFreebieText(e.target.value)}
                  className="w-full border-2 font-opensans text-gray-800 border-gray-100 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-customOrange"
                  placeholder="Enter details (e.g., Buy 1 Get 1 Free, Free Delivery)"
                />
              </div>
            )}

          {/* Display error message if form is invalid */}
          {!isFormValid && (
            <div className="mt-4">
              <p className="text-sm font-opensans text-red-600">
                {errorMessage}
              </p>
            </div>
          )}

          {/* Save Discount Button */}
          <div className="flex justify-center mt-6">
            <button
              onClick={handleDiscountSaveClick}
              disabled={!isFormValid}
              className={`w-full px-4 py-3 rounded-full font-opensans font-medium text-sm flex justify-center items-center ${
                !isFormValid
                  ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                  : "bg-customOrange text-white hover:bg-orange-700"
              }`}
            >
              {isLoading ? (
                <RotatingLines
                  strokeColor="white"
                  strokeWidth="5"
                  animationDuration="0.75"
                  width="20"
                  visible={true}
                />
              ) : (
                "Save Discount"
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Info Modal for Personal Discount Types */}
      <Modal
        isOpen={isDiscountInfoModalOpen}
        onRequestClose={closeDiscountInfoModal}
        className="modal-content-rider h-auto"
        overlayClassName="modal-overlay backdrop-blur-sm"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 bg-blue-100 flex justify-center items-center rounded-full">
              <FaInfoCircle className="text-customRichBrown" />
            </div>
            <h2 className="font-opensans text-base font-semibold">
              Personal Discount Details
            </h2>
          </div>
          <MdOutlineClose
            className="text-xl relative -top-2"
            onClick={closeDiscountInfoModal}
          />
        </div>
        <div className="space-y-3 mb-4">
          <p className="text-xs font-opensans text-black font-medium">
            Monetary Discount:
          </p>
          <p className="text-xs font-opensans text-black">
            With a Monetary Discount, you set an initial price and a discounted
            price. The system calculates the amount off and the percentage
            reduction (displayed as a whole number). Ensure that the discount
            price is at least 300 and less than the initial price.
          </p>
          <p className="text-xs font-opensans text-black font-medium mt-2">
            Freebies Discount:
          </p>
          <p className="text-xs font-opensans text-black">
            When choosing Freebies, no price reduction is applied. Instead, you
            provide details of the free offer (e.g., "Buy 1 Get 1 Free" or "Free
            Delivery"). This option is ideal if you wish to offer an incentive
            without changing the product price.
          </p>
        </div>
        <div className="flex justify-end mt-2">
          <button
            onClick={closeDiscountInfoModal}
            className="bg-customOrange text-white font-opensans py-2 px-12 rounded-full flex items-center"
          >
            Close
          </button>
        </div>
      </Modal>
    </>
  );
};

export default SingleDiscountModal;
