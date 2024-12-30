import React, { useEffect, useState, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { clearCart } from "../redux/actions/action";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase.config";
import { useAuth } from "../custom-hooks/useAuth";
import { FaPen } from "react-icons/fa";
import serviceimage from "../Images/servicemodal.jpg";
import PaystackPop from "@paystack/inline-js";

import bookingimage from "../Images/bookingfee.jpg";
import Modal from "react-modal";
// import { createOrderAndReduceStock } from "../styles/services/Services";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../firebase.config";
import Loading from "../components/Loading/Loading";
import { GoChevronLeft, GoChevronRight } from "react-icons/go";
import { CiCircleInfo } from "react-icons/ci";
import { RiSecurePaymentFill } from "react-icons/ri";
import { MdOutlineLock, MdSupportAgent } from "react-icons/md";
import { LiaShippingFastSolid, LiaTimesSolid } from "react-icons/lia";
import { FaCheck } from "react-icons/fa6";
import Skeleton from "react-loading-skeleton";
import { RotatingLines } from "react-loader-spinner";
import { IoSettingsOutline } from "react-icons/io5";
import { calculateDeliveryFee } from "../services/states";
import { NigerianStates } from "../services/states";

const EditDeliveryModal = ({ isOpen, userInfo, setUserInfo, onClose }) => {
  const [selectedState, setSelectedState] = useState("");
  useEffect(() => {
    if (userInfo.address) {
      const stateInAddress = NigerianStates.find((state) =>
        userInfo.address.endsWith(state)
      );
      if (stateInAddress) {
        setSelectedState(stateInAddress);
      }
    }
  }, [userInfo.address]);
  const handleStateChange = (e) => {
    const state = e.target.value;
    setSelectedState(state);

    // Append or replace the state in the address
    const addressWithoutState = userInfo.address
      .replace(new RegExp(`, ${selectedState}$`), "")
      .trim();
    setUserInfo({ ...userInfo, address: `${addressWithoutState}, ${state}` });
  };

  useEffect(() => {
    // Disable background scrolling when modal is open
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      // Clean up when the modal is closed
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="bg-white w-full max-w-md h-[60vh] rounded-t-2xl shadow-lg px-3 py-3 relative overflow-y-scroll"
      overlayClassName="fixed inset-0 bg-gray-700 bg-opacity-50 flex justify-center items-end z-50"
      ariaHideApp={false}
    >
      <div className="flex justify-between mt-3 items-center">
        <h2 className="text-xl font-opensans font-semibold">
          Edit Delivery Information
        </h2>
        <LiaTimesSolid
          className="text-2xl text-black cursor-pointer"
          onClick={onClose}
        />
      </div>

      <form>
        <div className="flex flex-col mt-8 space-y-3">
          <div>
            <label className="font-opensans text-black">Name</label>
            <input
              type="text"
              className="border bg-gray-100 py-2.5 mt-2 rounded-lg w-full px-2 font-opensans text-gray-600"
              value={userInfo.displayName}
              onChange={(e) =>
                setUserInfo({ ...userInfo, displayName: e.target.value })
              }
            />
          </div>
          <div>
            <label className="font-opensans">Phone Number</label>
            <input
              type="text"
              className="border bg-gray-100 py-2.5 mt-2 rounded-lg w-full px-2 font-opensans text-gray-600"
              value={userInfo.phoneNumber}
              onChange={(e) =>
                setUserInfo({ ...userInfo, phoneNumber: e.target.value })
              }
            />
          </div>
          <div>
            <label className="font-opensans">Email</label>
            <input
              type="text"
              className="border bg-gray-100 py-2.5 mt-2 rounded-lg w-full px-2 font-opensans text-gray-600"
              value={userInfo.email}
              onChange={(e) =>
                setUserInfo({ ...userInfo, email: e.target.value })
              }
            />
          </div>
          <div>
            <label className="font-opensans">Address</label>
            <input
              type="text"
              className="border bg-gray-100 py-2.5 mt-2 rounded-lg w-full px-2 font-opensans text-gray-600"
              value={userInfo.address}
              onChange={(e) =>
                setUserInfo({ ...userInfo, address: e.target.value })
              }
            />
          </div>
        </div>
        <div>
          <label className="font-opensans mt-2">State</label>
          <select
            className="border bg-gray-100 py-2.5 mt-2 rounded-lg w-full px-2 font-opensans text-gray-600"
            value={selectedState}
            onChange={handleStateChange}
          >
            <option value="" disabled>
              Select a State
            </option>
            {NigerianStates.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>
        <div className="border-t mt-4 border-gray-300 my-2"></div>

        <div className="flex mt-2 flex-col">
          <button
            type="button"
            className="bg-customOrange text-white h-12 font-semibold rounded-full font-opensans"
            onClick={onClose}
          >
            Save Changes
          </button>
          <button
            type="button"
            onClick={onClose}
            className="bg-gray-100 text-black h-12 rounded-full font-semibold font-opensans mt-3"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
};

const ShopSafelyModal = ({ isOpen, onClose }) => {
  useEffect(() => {
    // Disable background scrolling when modal is open
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      // Clean up when the modal is closed
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="bg-white w-full max-w-md h-[85vh] rounded-t-2xl shadow-lg overflow-y-scroll px-4 py-4 relative"
      overlayClassName="fixed inset-0 bg-gray-700 bg-opacity-50 flex justify-center items-end z-50"
      ariaHideApp={false}
    >
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Shop Safely and Sustainably</h1>
        <LiaTimesSolid className="text-2xl cursor-pointer" onClick={onClose} />
      </div>

      {/* Secure Payment */}
      <div className="flex items-start mb-4">
        <div className="w-16 flex flex-col items-center">
          <RiSecurePaymentFill className="text-3xl text-green-700" />
          <FaCheck className="text-green-700 mt-2" />
        </div>
        <div className="ml-4">
          <h3 className="text-sm text-green-700 font-semibold font-opensans">
            Secure Your Payment
          </h3>
          <p className="text-sm font-opensans text-black mt-2">
            Encrypted Transactions: Your data is always protected.
          </p>
          <p className="text-sm font-opensans text-black">
            Fraud Prevention: Transactions are monitored in real-time.
          </p>
        </div>
      </div>

      <div className="border-t border-gray-300 my-1"></div>

      {/* Security & Privacy */}
      <div className="flex items-start mt-3 mb-4">
        <div className="w-16 flex flex-col items-center">
          <MdOutlineLock className="text-3xl text-green-700" />
          <FaCheck className="text-green-700 mt-2" />
        </div>
        <div className="ml-4">
          <h3 className="text-sm text-green-700 font-semibold font-opensans">
            Security & Privacy
          </h3>
          <p className="text-sm font-opensans text-black mt-2">
            No Data Sharing: We will never share your information with third
            parties.
          </p>
          <p className="text-sm font-opensans text-black">
            Your data is used solely to enhance your experience.
          </p>
        </div>
      </div>

      <div className="border-t border-gray-300 my-1"></div>

      {/* Secure Shipment */}
      <div className="flex items-start mt-3 mb-4">
        <div className="w-16 flex flex-col items-center">
          <LiaShippingFastSolid className="text-3xl text-green-700" />
          <FaCheck className="text-green-700 mt-2" />
        </div>
        <div className="ml-4">
          <h3 className="text-sm text-green-700 font-semibold font-opensans">
            Secure Shipment Guarantee
          </h3>
          <p className="text-sm font-opensans text-black mt-2">
            Escrow Payments: A percentage of your funds are held securely and released to the vendor only after 
             delivery is confirmed.
          </p>
        </div>
      </div>

      <div className="border-t border-gray-300 my-1"></div>

      {/* Customer Support */}
      <div className="flex items-start mt-3">
        <div className="w-16 flex flex-col items-center">
          <MdSupportAgent className="text-3xl text-green-700" />
          <FaCheck className="text-green-700 mt-2" />
        </div>
        <div className="ml-4">
          <h3 className="text-sm text-green-700 font-semibold font-opensans">
            Customer Support
          </h3>
          <p className="text-sm font-opensans text-black mt-2">
            Our dedicated support team is available to assist with any issues
            related to your order, payment, or delivery.
          </p>
        </div>
      </div>
    </Modal>
  );
};

const Checkout = () => {
  const { vendorId } = useParams();
  const [searchParams] = useSearchParams();
  const [showDeliveryInfoModal, setShowDeliveryInfoModal] = useState(false);
  const note = searchParams.get("note") || "";
  const [deliveryEstimate, setDeliveryEstimate] = useState("");
  const [selectedDeliveryMode, setSelectedDeliveryMode] = useState("");
  const cart = useSelector((state) => state.cart);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentUser, loading } = useAuth();
  const [vendorsInfo, setVendorsInfo] = useState({});
  const [userInfo, setUserInfo] = useState({
    displayName: "",
    email: "",
    phoneNumber: "",
    address: "",
  });
  const [displayText, setDisplayText] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showShopSafelyModal, setShowShopSafelyModal] = useState(false);
  const [previewedOrder, setPreviewedOrder] = useState({
    subtotal: null,
    bookingFee: null,
    serviceFee: "Calculating fees...",
    total: null,
  });
  const [showBookingFeeModal, setShowBookingFeeModal] = useState(false);
  const [showServiceFeeModal, setShowServiceFeeModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showServiceFee, setShowServiceFee] = useState(false);
  const [isFetchingOrderPreview, setIsFetchingOrderPreview] = useState(true);

  const prepareOrderData = (isPreview = false) => {
    const vendorCart = cart[vendorId]?.products;

    if (!vendorCart || Object.keys(vendorCart).length === 0) {
      toast.error("Cart is empty");
      toast.dismiss();
      return null;
    }

    const orderData = {
      cartItems: Object.values(vendorCart).map((product) => {
        const cartItem = {
          productId: product.id,
          quantity: product.quantity,
        };

        if (product.subProductId) {
          // Use subProductId for sub-products
          cartItem.subProductId = product.subProductId;
        } else if (product.selectedColor && product.selectedSize) {
          // Use color and size attributes for variants
          cartItem.variantAttributes = {
            color: product.selectedColor,
            size: product.selectedSize,
          };
        } else {
        }

        return cartItem;
      }),
      userInfo,
      preview: isPreview,
    };

    if (note) {
      orderData.note = note;
    }

    return orderData;
  };

  // Fetch the previewed fees and totals from the server
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (currentUser) {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setUserInfo({
            displayName: userDoc.data().displayName || "",
            email: userDoc.data().email || "",
            phoneNumber: userDoc.data().phoneNumber || "",
            address: userDoc.data().address || "",
          });
        } else {
          toast.error("User document does not exist.");
          toast.dismiss();
        }
      }
    };

    fetchUserInfo();
  }, [currentUser]);

  useEffect(() => {
    const fetchOrderPreview = async () => {
      if (!currentUser) {
        // toast.error("User not authenticated yet");
        toast.dismiss();
        return;
      }

      if (
        !userInfo.displayName ||
        !userInfo.email ||
        !userInfo.phoneNumber ||
        !userInfo.address
      ) {
        return;
      }

      const orderData = prepareOrderData(true); // Set preview mode to true
      if (!orderData) return;

      try {
        // Call the Cloud Function in preview mode
        const processOrder = httpsCallable(functions, "processOrder");
        const response = await processOrder(orderData);

        // Set previewed values in the state
        const { subtotal, bookingFee, serviceFee, total } = response.data;
        setPreviewedOrder({ subtotal, bookingFee, serviceFee, total });

        setIsFetchingOrderPreview(false);

        setTimeout(() => {
          setShowServiceFee(true);
        }, 50);
      } catch (error) {
        toast.error("Failed to load order preview. Please try again.");
      }
    };

    fetchOrderPreview();
  }, [vendorId, cart, currentUser, userInfo]);

  useEffect(() => {
    if (!vendorId) {
      toast.error("No vendor selected for checkout.");
      navigate("/latest-cart");
    }
  }, [vendorId, navigate]);

  useEffect(() => {
    const fetchVendorInfo = async () => {
      try {
        if (!vendorId) return;

        const vendorDoc = await getDoc(doc(db, "vendors", vendorId));
        if (vendorDoc.exists()) {
          setVendorsInfo({ [vendorId]: vendorDoc.data() });
        } else {
          toast.error(`Vendor with ID ${vendorId} does not exist.`);
        }
      } catch (error) {
        toast.error("Error fetching vendor info:", error);
      }
    };

    fetchVendorInfo();
  }, [vendorId]);

  useEffect(() => {
    if (vendorsInfo[vendorId]?.deliveryMode) {
      setSelectedDeliveryMode(vendorsInfo[vendorId].deliveryMode);
    }
  }, [vendorsInfo, vendorId]);

  const handleProceedToPayment = async () => {
    try {
      setIsLoading(true); // Start loader
      const orderData = prepareOrderData();
      if (!orderData) {
        setIsLoading(false); // Stop loader
        return;
      }

      const processOrder = httpsCallable(functions, "processOrder");
      const response = await processOrder(orderData);

      console.log("Backend Response:", response.data); // Debug backend response

      const { authorization_url } = response.data;

      if (!authorization_url) {
        throw new Error("Missing authorization URL from Paystack.");
      }

      console.log(
        "Redirecting to Paystack authorization URL:",
        authorization_url
      );

      // Redirect the user to the Paystack payment page
      window.location.href = authorization_url;

      // The user will be redirected to the callback_url after completing the payment
      setIsLoading(false); // Stop loader
    } catch (error) {
      console.error("Error in payment process:", error.message || error);
      toast.error("Failed to initialize payment. Please try again.");
      setIsLoading(false); // Stop loader
    }
  };

  useEffect(() => {
    const calculateFee = () => {
      if (!vendorsInfo[vendorId] || !userInfo.address) return;

      const vendorState = vendorsInfo[vendorId]?.state;
      const userState = userInfo.address.split(", ").pop();
      const subtotal = previewedOrder.subtotal || 0;
      const isWeekend = [0, 6].includes(new Date().getDay());

      try {
        const estimatedFee = calculateDeliveryFee(
          vendorState,
          userState,
          subtotal,
          isWeekend
        );
        setDeliveryEstimate(estimatedFee);
      } catch (error) {
        console.error("Error calculating delivery fee:", error.message);
      }
    };

    calculateFee();
  }, [vendorsInfo, userInfo, previewedOrder, vendorId]);

  const handleDeliveryModeSelection = (mode) => {
    if (mode === "Pickup" && vendorsInfo[vendorId]?.deliveryMode !== "Pickup") {
      toast.error("Vendor does not offer pick-up ☹️");
      return;
    }

    setSelectedDeliveryMode(mode);
  };

  const groupProductsById = (products) => {
    const groupedProducts = {};

    for (const productKey in products) {
      const product = products[productKey];
      const id = product.id;

      if (groupedProducts[id]) {
        groupedProducts[id].quantity += product.quantity;

        if (
          product.selectedSize &&
          !groupedProducts[id].sizes.includes(product.selectedSize)
        ) {
          groupedProducts[id].sizes.push(product.selectedSize);
        }

        if (
          product.selectedColor &&
          !groupedProducts[id].colors.includes(product.selectedColor)
        ) {
          groupedProducts[id].colors.push(product.selectedColor);
        }
      } else {
        groupedProducts[id] = {
          ...product,
          quantity: product.quantity,
          sizes: product.selectedSize ? [product.selectedSize] : [],
          colors: product.selectedColor ? [product.selectedColor] : [],
        };
      }
    }

    return Object.values(groupedProducts);
  };
  // const handleScroll = (event) => {
  //   event.stopPropagation();
  // };

  const BookingFeeModal = ({ isOpen, onClose }) => {
    useEffect(() => {
      // Disable background scrolling when modal is open
      if (isOpen) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "unset";
      }
      return () => {
        // Clean up when the modal is closed
        document.body.style.overflow = "unset";
      };
    }, [isOpen]);

    return (
      <Modal
        isOpen={isOpen}
        onRequestClose={onClose}
        className="bg-white w-full max-w-md h-[60vh] rounded-t-2xl shadow-lg overflow-y-scroll relative"
        overlayClassName="fixed inset-0 bg-gray-700 bg-opacity-50 flex justify-center items-end z-50"
        ariaHideApp={false}
      >
        <div className="relative h-full overflow-y-scroll">
          <LiaTimesSolid
            className="text-2xl cursor-pointer absolute top-4 right-4"
            onClick={onClose}
          />
          <img
            src={bookingimage}
            alt="Booking Fee Details"
            className="w-full h-40 object-cover"
          />
          <div className="px-4 mb-4">
            <p className="text-sm font-opensans text-black">
              A 40% booking fee applies to marketplace vendor purchases,
              securing your items and guaranteeing they'll be packaged and
              reserved for pickup. Once payment is confirmed, you'll receive an
              email with the vendor's store location and operational hours in
              the market. Your items will be securely held by the vendor for 5
              days after payment, ensuring they're ready for collection at your
              convenience.
            </p>
            <p className="text-xs mt-4 text-gray-500 italic">
              <span className="font-semibold">Note:</span> This fee is
              non-refundable.
            </p>
          </div>
        </div>
      </Modal>
    );
  };

  const ServiceFeeModal = ({ isOpen, onClose }) => {
    useEffect(() => {
      // Disable background scrolling when modal is open
      if (isOpen) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "unset";
      }
      return () => {
        // Clean up when the modal is closed
        document.body.style.overflow = "unset";
      };
    }, [isOpen]);

    return (
      <Modal
        isOpen={isOpen}
        onRequestClose={onClose}
        className="bg-white w-full max-w-md h-[30vh] rounded-t-2xl shadow-lg overflow-y-scroll relative flex flex-col"
        overlayClassName="fixed inset-0 bg-gray-900  backdrop-blur-sm bg-opacity-50 flex justify-center items-end z-50"
        ariaHideApp={false}
      >
        <div className="relative h-full ">
          {" "}
          <div className="mt-6 flex items-center px-4 font-semibold  justify-between">
            <h1 className="font-ubuntu text-2xl text-black">
              Why do we charge this?
            </h1>
            <LiaTimesSolid
              className="text-2xl cursor-pointer modals absolute top-4 right-4"
              onClick={onClose}
            />
          </div>
          <div className="px-4  flex items-center mb-4">
            <IoSettingsOutline className="text-9xl text-black" />
            <p className="text-xs ml-4 font-opensans font-light text-black z-10">
              Service fees are dynamic charges applied to transactions to
              support the app's operations and customer support teams. These
              fees are capped at a fixed amount, so no need to worry about
              excessive charges.
            </p>
          </div>
        </div>
      </Modal>
    );
  };

  const formatColorText = (color) => {
    if (!color) return "";
    return color.charAt(0).toUpperCase() + color.slice(1).toLowerCase();
  };

  // const handleFullDeliveryPayment = (e) => {
  //   e.preventDefault();
  //   handleVendorPayment("full");
  // };

  if (loading || isFetchingOrderPreview) {
    // Show skeleton placeholders instead of the Loading component
    return (
      <div className="bg-gray-100 pb-12">
        <div className="flex p-3 py-3 items-center sticky top-0 bg-white w-full h-20 shadow-md z-10 mb-3 pb-2">
          <Skeleton circle={true} width={30} height={30} />
          <Skeleton width={100} height={20} className="ml-5" />
        </div>
        <div className="px-3">
          {/* Order Summary Skeleton */}
          <div className="mt-4 px-4 w-full py-4 rounded-lg bg-white ">
            <Skeleton width={120} height={20} />
            <div className="border-t border-gray-300 my-2"></div>
            <div className="flex justify-between">
              <Skeleton width={80} height={20} />
              <Skeleton width={60} height={20} />
            </div>
            <div className="flex justify-between mt-2">
              <Skeleton width={80} height={20} />
              <Skeleton width={60} height={20} />
            </div>
            <div className="flex justify-between mt-2">
              <Skeleton width={80} height={20} />
              <Skeleton width={60} height={20} />
            </div>
            <div className="border-t mt-3 border-gray-300 my-2"></div>
            <div className="flex justify-between mt-2">
              <Skeleton width={40} height={20} />
              <Skeleton width={60} height={20} />
            </div>
          </div>

          {/* Delivery Information Skeleton */}
          <div className="mt-2">
            <div className="mt-3 px-3 w-full py-4 rounded-lg bg-white">
              <Skeleton width={150} height={20} />
              <div className="border-t border-gray-300 my-2"></div>
              <Skeleton height={20} />
              <Skeleton height={20} />
              <Skeleton height={20} />
              <Skeleton height={20} />
            </div>
          </div>

          {/* Shipment Skeleton */}
          <div className="bg-white mt-3 p-3 rounded-lg shadow-md">
            <Skeleton width={100} height={20} />
            <div className="mt-2 border-t ">
              {[...Array(2)].map((_, i) => (
                <div
                  className="flex items-center justify-between py-4 border-b"
                  key={i}
                >
                  <Skeleton width={64} height={64} className="mr-4" />
                  <div>
                    <Skeleton width={100} height={15} />
                    <Skeleton width={50} height={15} />
                    <div className="flex space-x-4 mt-2">
                      <Skeleton width={50} height={10} />
                      <Skeleton width={50} height={10} />
                      <Skeleton width={50} height={10} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Method Skeleton */}
          <div className="bg-white mt-3 p-3 rounded-lg shadow-md">
            <Skeleton width={120} height={20} />
            <div className="border-t border-gray-300 my-3"></div>
            <div className="p-3 mb-4 flex items-center space-x-2">
              <Skeleton circle={true} width={24} height={24} />
              <Skeleton width={60} height={15} />
            </div>
            <div className="border-t border-gray-300"></div>
            <div className="p-3 mb-4 flex items-center space-x-2">
              <Skeleton circle={true} width={24} height={24} />
              <Skeleton width={60} height={15} />
            </div>
            <div className="px-4 w-full py-2 rounded-lg bg-white">
              <Skeleton width={80} height={15} />
              <div className="border-t border-gray-700 my-2"></div>
              <Skeleton width={60} height={15} />
              <Skeleton width={"80%"} height={10} />
            </div>
          </div>

          {/* Shop Safely Skeleton */}
          <div className="mt-2">
            <div className="mt-3 px-3 w-full py-4 rounded-lg bg-white">
              <Skeleton width={150} height={20} />
              <div className="border-t border-gray-300 my-2"></div>
              <div className="flex mt-3 space-x-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex flex-col items-center space-y-1">
                    <Skeleton circle={true} width={24} height={24} />
                    <Skeleton width={60} height={10} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-white shadow-lg">
          <Skeleton width={"100%"} height={48} className="rounded-full" />
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <div>Please log in to view your cart.</div>;
  }

  return (
    <div className="bg-gray-100 pb-12">
      <div className="flex p-3 py-3 items-center sticky top-0 bg-white w-full h-20 shadow-md z-10 mb-3 pb-2">
        <GoChevronLeft
          className="text-3xl cursor-pointer"
          onClick={() => navigate(-1)}
        />
        <h1 className="text-xl font-opensans ml-5 font-semibold">Checkout</h1>
      </div>
      <div className="px-3">
        <div className="mt-4 px-4 w-full py-4 rounded-lg bg-white ">
          <h1 className="text-black font-semibold font-opensans text-lg ">
            Order Summary
          </h1>
          <div className="border-t border-gray-300 my-2"></div>
          <div className="flex justify-between">
            <label className="block mb-2 font-opensans ">Sub-Total</label>
            <p className="text-lg font-opensans text-black font-semibold">
              {isFetchingOrderPreview ? (
                <Skeleton width={80} />
              ) : (
                `₦${previewedOrder.subtotal.toLocaleString()}`
              )}
            </p>
          </div>

          {vendorsInfo[vendorId]?.marketPlaceType === "marketplace" && (
            <div className="flex justify-between">
              <label className="block mb-2 font-opensans">
                Booking Fee
                <CiCircleInfo
                  className="inline ml-2 text-customOrange cursor-pointer"
                  onClick={() => setShowBookingFeeModal(true)}
                />
              </label>
              <p className="text-lg font-opensans text-black font-semibold">
                {isFetchingOrderPreview ? (
                  <Skeleton width={80} />
                ) : (
                  `₦${previewedOrder.bookingFee.toLocaleString()}`
                )}
              </p>
            </div>
          )}

          <div className="flex justify-between">
            <label className="block mb-2 font-opensans">
              Service Fee
              <CiCircleInfo
                className="inline ml-2 text-customOrange cursor-pointer"
                onClick={() => setShowServiceFeeModal(true)}
              />
            </label>
            <p
              className={`font-opensans font-semibold ${
                !showServiceFee ? "loading-text text-xs" : "text-black text-lg"
              }`}
            >
              {isFetchingOrderPreview ? (
                <Skeleton width={80} />
              ) : showServiceFee ? (
                `₦${previewedOrder.serviceFee.toLocaleString()}`
              ) : (
                "Calculating fees..."
              )}
            </p>
          </div>
          <div className="border-t mt-3 border-gray-300 my-2"></div>
          <div className="flex justify-between mt-2">
            <label className="block mb-2 font-opensans text-lg font-semibold">
              Total
            </label>
            <p className="text-lg font-opensans text-black font-semibold">
              {isFetchingOrderPreview ? (
                <Skeleton width={80} />
              ) : (
                `₦${previewedOrder.total.toLocaleString()}`
              )}
            </p>
          </div>
        </div>
        <div className="mt-2">
          <div className="mt-3 px-3 w-full py-4 rounded-lg bg-white">
            <div className="flex justify-between items-center">
              <h1 className="text-black font-semibold font-opensans text-lg">
                Delivery Information
              </h1>
              <FaPen
                className="text-black cursor-pointer"
                onClick={() => setShowEditModal(true)}
              />
            </div>

            <div className="border-t border-gray-300 my-2"></div>

            <div className="flex">
              <label className="block mb-2 mr-1 font-semibold font-opensans">
                Name:
              </label>
              <p className="font-opensans text-black">{userInfo.displayName}</p>
            </div>
            <div className="flex">
              <label className="block mb-2 mr-1 font-semibold font-opensans">
                Phone Number:
              </label>
              <p className="font-opensans text-black ">
                {userInfo.phoneNumber}
              </p>
            </div>
            <div className="flex">
              <label className="block mb-2 font-semibold mr-1 font-opensans">
                Email:
              </label>
              <p className="font-opensans text-black">{userInfo.email}</p>
            </div>
            <div className="flex">
              <label className="block mb-2 mr-1 font-semibold font-opensans">
                Address:
              </label>
              <p className="font-opensans text-black ">{userInfo.address}</p>
            </div>
          </div>
        </div>

        <form className="bg-white mt-3 p-3 rounded-lg shadow-md">
          {vendorId && cart[vendorId] && (
            <>
              <div className="flex justify-between">
                <h1 className="text-black font-medium font-opensans text-lg">
                  Shipment
                </h1>
                <h3 className="text-sm">
                  <span className="text-gray-400 text-sm font-opensans">
                    From:
                  </span>
                  {vendorsInfo[vendorId]?.shopName?.length > 8
                    ? `${vendorsInfo[vendorId]?.shopName.slice(0, 8)}...`
                    : vendorsInfo[vendorId]?.shopName || `Vendor ${vendorId}`}
                </h3>
              </div>

              <div className="mt-2 border-t ">
                {Object.entries(cart[vendorId].products).map(
                  ([productKey, product]) => (
                    <div
                      key={productKey}
                      className="flex items-center justify-between py-4 border-b"
                    >
                      <div className="flex items-center">
                        <img
                          src={
                            product.selectedImageUrl ||
                            "https://via.placeholder.com/150"
                          }
                          alt={product.name}
                          className="w-16 h-16 object-cover rounded-lg mr-4"
                          onError={(e) => {
                            e.target.src = "https://via.placeholder.com/150";
                          }}
                        />
                        <div>
                          <h4 className="text-sm font-opensans">
                            {product.name}
                          </h4>
                          <p className="font-opensans text-md mt-2 text-black font-bold">
                            ₦{product.price.toLocaleString()}
                          </p>
                          <div className="flex items-center space-x-4 text-sm mt-2 ">
                            <p className="text-black font-semibold font-opensans">
                              <span className="font-normal text-gray-600">
                                Size:
                              </span>{" "}
                              {product.selectedSize || "N/A"}
                            </p>
                            <p className="text-black font-semibold font-opensans">
                              <span className="font-normal text-gray-600">
                                Color:
                              </span>{" "}
                              {formatColorText(product.selectedColor)}
                            </p>

                            <p className="text-black font-semibold font-opensans">
                              <span className="font-normal text-gray-600">
                                Qty:
                              </span>{" "}
                              {product.quantity}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </>
          )}
        </form>
        <div className="bg-white mt-3 p-3 rounded-lg shadow-md">
          {vendorId && vendorsInfo[vendorId] && (
            <>
              <div className="flex items-center">
                <h1 className="text-black font-medium font-opensans text-lg">
                  Delivery Method
                </h1>
                {/* <CiCircleInfo
                  className="text-customOrange ml-2 cursor-pointer text-xl"
                  onClick={() => setShowDeliveryInfoModal(true)}
                /> */}
              </div>

              <div className="border-t border-gray-300 my-3"></div>

              {/* Render the delivery option based on vendor's deliveryMode */}
              <div
                className={`p-3 mb-4 cursor-pointer flex items-center ${
                  vendorsInfo[vendorId]?.deliveryMode === "Pickup"
                    ? "border-customOrange"
                    : "border-gray-300"
                }`}
                onClick={() => handleDeliveryModeSelection("Pickup")}
              >
                <div
                  className={`w-6 h-6 rounded-full border-2 flex justify-center items-center ${
                    vendorsInfo[vendorId]?.deliveryMode === "Pickup"
                      ? "border-customOrange"
                      : "border-gray-300"
                  }`}
                >
                  {vendorsInfo[vendorId]?.deliveryMode === "Pickup" && (
                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                  )}
                </div>
                <span className="font-opensans font-semibold ml-3 text-black text-lg">
                  Pick-up
                </span>
              </div>
              <p className="ml-12 text-black font-light font-opensans text-xs -translate-y-9">
                1-3 working days
              </p>

              <div className="border-t border-gray-300 "></div>

              <div
                className={`p-3 mb-4 cursor-pointer flex items-center ${
                  vendorsInfo[vendorId]?.deliveryMode === "Delivery"
                    ? "border-customOrange"
                    : "border-gray-300"
                }`}
                onClick={() => handleDeliveryModeSelection("Delivery")}
              >
                <div
                  className={`w-6 h-6 rounded-full border-2 flex justify-center items-center ${
                    vendorsInfo[vendorId]?.deliveryMode === "Delivery"
                      ? "border-customOrange"
                      : "border-gray-300"
                  }`}
                >
                  {vendorsInfo[vendorId]?.deliveryMode === "Delivery" && (
                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                  )}
                </div>
                <span className="font-opensans font-semibold ml-3 text-black text-lg">
                  Delivery
                </span>
              </div>
              <p className="ml-12 text-black font-light font-opensans text-xs -translate-y-9">
                2-7 working days
              </p>
              <div className="px-4 w-full py-2 rounded-lg bg-customCream">
                <h1 className="text-black font-semibold font-opensans text-xs">
                  Estimated Delivery Fee
                </h1>
                <div className="border-t border-gray-700 my-2"></div>
                {deliveryEstimate ? (
                  <p className="text-sm font-opensans text-black font-semibold">
                    ₦{deliveryEstimate.toLocaleString()}
                  </p>
                ) : !vendorsInfo[vendorId]?.state ||
                  !userInfo.address.split(", ").pop() ? (
                  <p className="text-sm font-opensans text-red-500 font-bold">
                    No estimate available ☹️
                  </p>
                ) : (
                  <Skeleton width={80} />
                )}
                <p className="text-xs font-opensans text-gray-600 mt-2">
                  <span className="font-semibold">Note:</span> The delivery fee
                  displayed is an estimate based on your location and items in
                  the cart. This fee will not be charged at checkout. The vendor
                  will contact you with the exact delivery fee details before
                  your order is shipped.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="mt-2">
          <div className="mt-3 px-3 w-full py-4 rounded-lg bg-white">
            <div
              onClick={() => setShowShopSafelyModal(true)}
              className="flex justify-between items-center"
            >
              <h1 className="text-black font-semibold font-opensans text-lg">
                Shop safely and sustainably
              </h1>
              <GoChevronRight className="text-black text-2xl cursor-pointer" />
            </div>

            <div className="border-t border-gray-300 my-2"></div>

            <div className="flex mt-3 -mx-2 space-x-0.5">
              <div className="flex items-center flex-col">
                <RiSecurePaymentFill className="text-3xl text-green-700" />
                <p className="text-xs text-gray-600 text-center">
                  Secure your payment
                </p>
              </div>
              <div className="flex items-center flex-col">
                <MdOutlineLock className="text-3xl text-green-700" />
                <p className="text-xs text-gray-600 text-center">
                  Security & Privacy
                </p>
              </div>
              <div className="flex items-center flex-col">
                <LiaShippingFastSolid className="text-3xl text-green-700" />
                <p className="text-xs text-gray-600 text-center">
                  Secure Shipment Guarantee
                </p>
              </div>
              <div className="flex items-center flex-col">
                <MdSupportAgent className="text-3xl text-green-700" />
                <p className="text-xs text-gray-600 text-center">
                  Customer Support
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <EditDeliveryModal
        isOpen={showEditModal}
        userInfo={userInfo}
        setUserInfo={setUserInfo}
        onClose={() => setShowEditModal(false)}
      />

      <ShopSafelyModal
        isOpen={showShopSafelyModal}
        onClose={() => setShowShopSafelyModal(false)}
      />
      {/* <DeliveryInfoModal
        isOpen={showDeliveryInfoModal}
        onClose={() => setShowDeliveryInfoModal(false)}
      /> */}
      <ServiceFeeModal
        isOpen={showServiceFeeModal}
        onClose={() => setShowServiceFeeModal(false)}
      />
      <BookingFeeModal
        isOpen={showBookingFeeModal}
        onClose={() => setShowBookingFeeModal(false)}
      />

      <div className="fixed bottom-0 left-0 right-0 p-3  bg-white shadow-lg">
        <button
          onClick={handleProceedToPayment}
          className={`w-full h-12 text-white text-lg font-semibold font-opensans rounded-full flex items-center justify-center ${
            isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-customOrange"
          }`}
          disabled={isLoading} // Disable button while loading
        >
          {isLoading ? (
            <RotatingLines
              strokeColor="white"
              strokeWidth="5"
              animationDuration="0.75"
              width="24"
              visible={true}
            />
          ) : (
            "Proceed to Payment"
          )}
        </button>
      </div>
    </div>
  );
};

export default Checkout;
