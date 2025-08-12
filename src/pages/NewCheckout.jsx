import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { clearCart } from "../redux/actions/action";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase.config";
import { PiStackPlusFill, PiStackSimpleFill } from "react-icons/pi";
import { getTripAdvice } from "../services/estimateTrips";
import { useAuth } from "../custom-hooks/useAuth";
import { RiShareForwardBoxLine } from "react-icons/ri";
import { SiAdguard } from "react-icons/si";
import {
  enterStockpileMode,
  exitStockpileMode,
} from "../redux/reducers/stockpileSlice";
import { CiWarning } from "react-icons/ci";
import { GiBookPile } from "react-icons/gi";
import { FaPen, FaUserFriends } from "react-icons/fa";
import serviceimage from "../Images/servicemodal.jpg";
import PaystackPop from "@paystack/inline-js";
import { IoIosInformationCircle } from "react-icons/io";
import bookingimage from "../Images/bookingfee.jpg";
import Modal from "react-modal";
import { IoCopyOutline } from "react-icons/io5";
import { AiOutlineSafety } from "react-icons/ai";
// import { createOrderAndReduceStock } from "../styles/services/Services";
import {
  getDoc,
  doc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase.config";
import Loading from "../components/Loading/Loading";
import { GoChevronLeft, GoChevronRight } from "react-icons/go";
import { CiCircleInfo } from "react-icons/ci";
import { RiSecurePaymentFill } from "react-icons/ri";
import { MdOutlineClose, MdOutlineLock, MdSupportAgent } from "react-icons/md";
import { LiaShippingFastSolid, LiaTimesSolid } from "react-icons/lia";
import { FaCheck } from "react-icons/fa6";
import Skeleton from "react-loading-skeleton";
import { RotatingLines } from "react-loader-spinner";
import { IoSettingsOutline } from "react-icons/io5";
import { calculateDeliveryFee } from "../services/states";
import { NigerianStates } from "../services/states";
import LocationPicker from "../components/Location/LocationPicker";

import SEO from "../components/Helmet/SEO";
import ReactSelect from "react-select";
import { BsInfoCircle } from "react-icons/bs";
import { RiUser3Line } from "react-icons/ri";
import { LuCreditCard } from "react-icons/lu";

import Link from "../components/Loading/Link";
import { TfiWallet } from "react-icons/tfi";
import { generateCartHash } from "../services/cartHash";
import IframeModal from "../components/PwaModals/PushNotifsModal";
import TriviaGame from "../components/Games/TriviaGame";
import { calculateCartTotalForVendor } from "../services/carthelper";
const EditDeliveryModal = ({ isOpen, userInfo, setUserInfo, onClose }) => {
  const [locationSet, setLocationSet] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

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

  const handleLocationSelect = ({ lat, lng, address }) => {
    setUserInfo({
      ...userInfo,
      address,
      latitude: lat, // <-- overwrite these
      longitude: lng,
    });
    setShowLocationPicker(false); // Hide the picker
    setLocationSet(true); // Mark location as selected
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
      className="bg-white w-full max-w-full h-[60vh] rounded-t-2xl shadow-lg px-3 py-3 relative overflow-y-scroll scrollbar-hide"
      overlayClassName="fixed inset-0 bg-white bg-opacity-20 backdrop-blur flex justify-center items-end z-50"
      ariaHideApp={false}
    >
      <div className="flex justify-between mt-3 items-center">
        <h2 className="text-xl font-opensans font-semibold">
          Edit Delivery Information
        </h2>
        <div className="w-8 h-8 bg-gray-200 rounded-full flex justify-center items-center">
          <LiaTimesSolid
            className="text-xl text-black cursor-pointer"
            onClick={onClose}
          />
        </div>
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
            <label className="font-opensans">Delivery Address</label>
            {!showLocationPicker ? (
              <input
                type="text"
                className="border bg-gray-100 py-2.5 mt-2 rounded-lg w-full px-2 font-opensans text-gray-600"
                value={userInfo.address}
                readOnly
                onClick={() => setShowLocationPicker(true)}
                placeholder="Click to select your location"
              />
            ) : (
              <LocationPicker onLocationSelect={handleLocationSelect} />
            )}
          </div>
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
      className="bg-white w-full max-w-full h-[85vh] rounded-t-2xl shadow-lg overflow-y-scroll px-4 py-4 relative scrollbar-hide"
      overlayClassName="fixed inset-0 bg-gray-700 bg-opacity-50 flex justify-center items-end z-50"
      ariaHideApp={false}
    >
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-opensans font-semibold">
          Shop Safely and Sustainably
        </h1>
        <div className="h-8 w-8 rounded-full p-2 bg-gray-200">
          <LiaTimesSolid className=" cursor-pointer" onClick={onClose} />
        </div>
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
            Escrow Payments: A percentage of your funds are held securely and
            released to the vendor only after delivery is confirmed.
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
    deliveryCharge: null,
    total: null,
    discount: 0,
    freeShipping: false,
    freeServiceFee: false,
  });
  const [showBookingFeeModal, setShowBookingFeeModal] = useState(false);
  const [showServiceFeeModal, setShowServiceFeeModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLink, setIsLoadingLink] = useState(false);
  const [showServiceFee, setShowServiceFee] = useState(false);
  const [showBuyersFee, setShowBuyersFee] = useState(false);
  const [isFetchingOrderPreview, setIsFetchingOrderPreview] = useState(true);
  const [checkoutMode, setCheckoutMode] = useState("deliver");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [userState, setUserState] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [pickupDistance, setPickupDistance] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [countdown, setCountdown] = useState("");
  const [shareUrl, setShareUrl] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [walletId, setWalletId] = useState("");
  const [walletBal, setWalletBal] = useState(0);
  const [isLoadingServiceFee, setIsLoadingServiceFee] = useState(false);
  const [isLoadingDeliveryFee, setIsLoadingDeliveryFee] = useState(false);
  const [isLoadingTotal, setIsLoadingTotal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [walletSetup, setWalletSetup] = useState(false);
  const [isPickup, setIsPickup] = useState(false);
  const [isLoadingDiscount, setIsLoadingDiscount] = useState(false);
  const [tripAdvice, setTripAdvice] = useState(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showAlreadyStockpiledModal, setShowAlreadyStockpiledModal] =
    useState(false);

  const [showNoStockpileModal, setShowNoStockpileModal] = useState(false);

  const [selectedWeeks, setSelectedWeeks] = useState(null);
  const { isActive, vendorId: stockpileVendorId } = useSelector(
    (state) => state.stockpile
  );
  const isRepiling = isActive && stockpileVendorId === vendorId;

  const prepareOrderData = (isPreview = false) => {
    const vendorCart = cart[vendorId]?.products;

    if (!vendorCart || Object.keys(vendorCart).length === 0) {
      toast.error("Cart is empty");
      toast.dismiss();
      return null;
    }

    // Build the items array
    const cartItems = Object.values(vendorCart).map((product) => {
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
      }

      return cartItem;
    });

    // Hash those items
    const cartHash = generateCartHash(cartItems);

    // Compose full order payload
    const orderData = {
      cartItems,
      cartHash,
      userInfo: { ...userInfo, isPickup },
      preview: isPreview,
      isRepiling,
      deliveryNote: userInfo.deliveryNote,
      isStockpile: checkoutMode === "stockpile" || isRepiling,
      stockpileDuration:
        checkoutMode === "stockpile" && selectedWeeks
          ? selectedWeeks
          : undefined,
    };

    if (note) {
      orderData.note = note;
    }
    if (selectedPayment === "wallet") {
      orderData.walletId = walletId;
    }

    return orderData;
  };
  const AlreadyStockpiledModal = ({
    isOpen,
    onClose,
    vendorId,
    dispatch,
    navigate,
  }) => {
    return (
      <Modal
        isOpen={isOpen}
        onRequestClose={onClose}
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
        className="bg-white w-[90%] max-w-md mx-auto p-6 rounded-lg"
        ariaHideApp={false}
      >
        <h2 className="text-lg font-semibold font-opensans mb-3 text-center">
          Active Stockpile Found!
        </h2>
        <p className="text-gray-700 text-sm text-center font-opensans mb-6">
          You already have an active stockpile with{" "}
          <span className="font-semibold text-customOrange">
            {vendorsInfo[vendorId]?.shopName || "this vendor"}
          </span>
          . Would you like to add more items to your pile?
        </p>

        <div className="flex font-opensans px-8 flex-col gap-3">
          <button
            onClick={() => {
              dispatch(enterStockpileMode({ vendorId }));
              navigate(`/latest-cart`);
            }}
            className="bg-customOrange text-white py-2 rounded-lg font-semibold"
          >
            Repile Now
          </button>

          <button
            onClick={onClose}
            className="bg-transparent text-customRichBrown border-customRichBrown border   py-2 rounded-lg font-semibold"
          >
            Cancel
          </button>
        </div>
      </Modal>
    );
  };

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

            latitude: userDoc.data().location?.lat || null,
            longitude: userDoc.data().location?.lng || null,
            deliveryNote: "",
          });
          setWalletId(userDoc.data().walletId || "");
          setWalletBal(userDoc.data().balance || 0);
          setWalletSetup(Boolean(userDoc.data().walletSetup));
        } else {
          toast.error("User document does not exist.");
          toast.dismiss();
        }
      }
    };

    fetchUserInfo();
  }, [currentUser]);

  const fetchPreview = async () => {
    if (!currentUser) return;

    // Kick off loaders
    setIsLoadingServiceFee(true);
    setIsLoadingDeliveryFee(true);
    setIsLoadingTotal(true);

    // Ensure user info is complete
    if (
      !userInfo.displayName ||
      !userInfo.email ||
      !userInfo.phoneNumber ||
      !userInfo.address
    ) {
      setIsLoadingServiceFee(false);
      setIsLoadingDeliveryFee(false);
      setIsLoadingTotal(false);
      return;
    }

    try {
      const processOrder = httpsCallable(functions, "processOrder");
      const { data } = await processOrder(prepareOrderData(true));

      setPreviewedOrder((prev) => {
        // build new sticky flags
        const newFreeService =
          prev.freeServiceFee || Boolean(data.freeServiceFee);
        const newFreeShipping = prev.freeShipping || Boolean(data.freeShipping);

        if (isPickup) {
          // Only update deliveryCharge & total in pickup mode
          return {
            ...prev,
            deliveryCharge: newFreeShipping
              ? prev.deliveryCharge
              : data.deliveryCharge != null
              ? Number(data.deliveryCharge)
              : prev.deliveryCharge,
            total: data.total != null ? Number(data.total) : prev.total,
            freeShipping: newFreeShipping,
          };
        } else {
          // Full update for delivery/stockpile
          return {
            ...prev,
            subtotal:
              data.subtotal != null ? Number(data.subtotal) : prev.subtotal,
            bookingFee:
              data.bookingFee != null
                ? Number(data.bookingFee)
                : prev.bookingFee,
            serviceFee: newFreeService
              ? prev.serviceFee
              : data.serviceFee != null
              ? Number(data.serviceFee)
              : prev.serviceFee,
            deliveryCharge: newFreeShipping
              ? prev.deliveryCharge
              : data.deliveryCharge != null
              ? Number(data.deliveryCharge)
              : prev.deliveryCharge,
            total: data.total != null ? Number(data.total) : prev.total,

            // once discount > 0 it sticks
            discount:
              prev.discount > 0
                ? prev.discount
                : data.discount != null
                ? Number(data.discount)
                : 0,

            freeServiceFee: newFreeService,
            freeShipping: newFreeShipping,
          };
        }
      });
    } catch (err) {
      console.error("Preview error:", err);
    } finally {
      setIsLoadingServiceFee(false);
      setIsLoadingDeliveryFee(false);
      setIsLoadingTotal(false);
      setShowServiceFee(true);
    }
  };

  // 3) Call it in an effect whenever inputs change
  useEffect(() => {
    fetchPreview();
  }, [
    vendorId,
    cart,
    currentUser,
    checkoutMode,
    isPickup,
    userInfo.address,
    userInfo.latitude,
    userInfo.longitude,
    selectedWeeks,
  ]);
  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const diff = expiresAt - Date.now();
      if (diff <= 0) {
        clearInterval(interval);
        setCountdown("Expired");
      } else {
        const mins = String(Math.floor(diff / 60000)).padStart(2, "0");
        const secs = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
        setCountdown(`${mins}:${secs}`);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [expiresAt]);

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
    const mode = vendorsInfo[vendorId]?.deliveryMode;
    if (!mode) return;

    if (mode === "Delivery") {
      setSelectedDeliveryMode("Delivery");
      setIsPickup(false);
    } else if (mode === "Pickup") {
      setSelectedDeliveryMode("Pickup");
      setIsPickup(true);
    } else {
      // "Delivery & Pickup" ⇒ user must choose
      setSelectedDeliveryMode(""); // clear any previous value
      setIsPickup(false);
    }
  }, [vendorsInfo, vendorId]);

  const NoStockpileModal = ({ isOpen, onClose }) => {
    return (
      <Modal
        isOpen={isOpen}
        onRequestClose={onClose}
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
        className="bg-white w-[90%] max-w-md mx-auto p-6 rounded-lg"
        ariaHideApp={false}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 bg-rose-100 flex justify-center items-center rounded-full">
              <GiBookPile className="text-customRichBrown" />
            </div>
            <h2 className="font-opensans text-base font-semibold">
              Ooops, Stockpiling Not Available
            </h2>
          </div>
          <MdOutlineClose
            className="text-black text-xl cursor-pointer"
            onClick={onClose}
          />
        </div>

        <p className="mb-6 text-gray-800 font-opensans text-sm">
          Sorry, but this vendor does not offer stockpiling at the moment.
        </p>
      </Modal>
    );
  };
  const supportsPickup =
    vendorsInfo[vendorId]?.deliveryMode === "Delivery & Pickup" ||
    vendorsInfo[vendorId]?.deliveryMode === "Pickup";

  const handleProceedToPayment = async () => {
    if (checkoutMode === "stockpile" && !selectedWeeks) {
      toast.error("Please select how many weeks you want to stockpile.");
      return;
    }
    if (!selectedPayment) {
      toast.error("Please select a payment method.");
      return;
    }
    if (
      !isRepiling &&
      checkoutMode === "deliver" &&
      vendorsInfo[vendorId]?.deliveryMode === "Delivery & Pickup" &&
      !selectedDeliveryMode
    ) {
      toast.error("Please choose Pick-up or Door delivery.");
      return;
    }
    const orderData = prepareOrderData();
    if (!orderData) return;

    try {
      setIsLoading(true);
      const processOrder = httpsCallable(functions, "processOrder");
      const { data } = await processOrder(orderData);
      if (selectedPayment === "wallet") {
        if (data?.success) {
          await refreshWalletInfo();
          dispatch(clearCart(vendorId));
          dispatch(exitStockpileMode());
          toast.success("Paid with wallet balance! 🎉");
          navigate("/user-orders", { replace: true });
        } else {
          toast.error(data?.message || "Wallet payment failed.");
        }
        return; // stop here – no Paystack
      }

      /* Paystack flow (default) */
      const { authorization_url } = data;
      if (!authorization_url) {
        throw new Error("Missing authorization URL from Paystack.");
      }
      window.location.href = authorization_url; // ⏩  redirect to Paystack
    } catch (err) {
      console.error("Error in payment process:", err);

      if (err?.details?.code === "INSUFFICIENT_FUNDS") {
        toast.error("Your wallet balance is not enough to place this order.");
      } else {
        const friendly =
          err?.message ||
          err?.details?.message ||
          err?.data?.message ||
          "Failed to initialise payment. Please try again later.";
        toast.error(friendly);
      }
    } finally {
      setIsLoading(false);
    }
  };
  const handleDeliveryModeSelection = (mode) => {
    // if they tapped “Pick-up” but vendor only does Delivery:
    if (
      mode === "Pickup" &&
      vendorsInfo[vendorId]?.deliveryMode !== "Delivery & Pickup"
    ) {
      toast.error("Sorry, this vendor doesn’t offer pick-up.");
      return;
    }
    setIsPickup(mode === "Pickup");
    setSelectedDeliveryMode(mode);
  };
  const isSelfManagedDelivery =
    vendorsInfo[vendorId]?.deliveryPreference === "self";

  const handleShareLink = async () => {
    if (checkoutMode === "stockpile" && !selectedWeeks) {
      toast.error("Please select how many weeks you want to stockpile.");
      return;
    }

    setIsLoadingLink(true);
    try {
      const orderData = prepareOrderData();
      if (!orderData) return;

      const payload = { ...orderData, shareOnly: true };
      const processOrder = httpsCallable(functions, "processOrder");
      const { data } = await processOrder(payload);
      dispatch(clearCart(vendorId));
      dispatch(exitStockpileMode());
      navigate("/user-orders", {
        state: {
          draftShareUrl: data.shareUrl, // so the centre can pop a toast/modal if you want
          draftExpires: data.expiresAt,
        },
        replace: true,
      });
    } catch (err) {
      toast.error(err.message || "Could not generate share link.");
    } finally {
      setIsLoadingLink(false);
    }
  };
  const mustChooseDelivery =
    checkoutMode === "deliver" && // we’re not stockpiling
    !isRepiling && // repiling skips delivery selection
    vendorsInfo[vendorId]?.deliveryMode === "Delivery & Pickup" &&
    !selectedDeliveryMode; // user hasn’t decided

  const refreshWalletInfo = async () => {
    if (!currentUser) return;
    const snap = await getDoc(doc(db, "users", currentUser.uid));
    if (snap.exists()) {
      setWalletSetup(Boolean(snap.data().walletSetup));
      setWalletId(snap.data().walletId || "");
      setWalletBal(snap.data().balance || 0);
    }
  };

  useEffect(() => {
    console.log("selectedWeeks state updated to:", selectedWeeks);
  }, [selectedWeeks]);

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
        className="bg-white w-full max-w-full h-[60vh] rounded-t-2xl shadow-lg overflow-y-scroll relative"
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
  const handleShowMapToast = () => {
    toast(
      " ⚠️ We will allow you to calculate an estimate for pickup and distance after the order has been placed."
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
        className="bg-white w-full max-w-full h-[30vh] rounded-t-2xl shadow-lg overflow-y-scroll scrollbar-hide relative flex flex-col"
        overlayClassName="fixed inset-0 bg-gray-900  backdrop-blur-sm bg-opacity-50 flex justify-center items-end z-50"
        ariaHideApp={false}
      >
        <div className="relative h-full ">
          {" "}
          <div className="mt-6 flex items-center px-4 font-semibold  justify-between">
            <h1 className="font-opensans text-2xl text-black">
              Why do we charge this?
            </h1>
            <div className="absolute top-4 right-4 bg-gray-200 w-8 h-8 rounded-full px-1.5 py-1.5">
              <LiaTimesSolid
                className="text-xl cursor-pointer modals "
                onClick={onClose}
              />
            </div>
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
  const handleStockpileClick = async () => {
    if (!vendorsInfo[vendorId]?.stockpile?.enabled) {
      console.log("Vendor does not offer stockpile");
      setShowNoStockpileModal(true);
      return;
    }

    const stockpilesRef = collection(db, "stockpiles");
    const q = query(
      stockpilesRef,
      where("userId", "==", currentUser.uid),
      where("vendorId", "==", vendorId),
      where("isActive", "==", true)
    );

    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      console.log("Stockpile found for user and vendor!");
      setShowAlreadyStockpiledModal(true);
    } else {
      console.log("No stockpile found. Entering stockpile mode...");
      setCheckoutMode("stockpile");

      const maxWeeks = vendorsInfo[vendorId]?.stockpile?.durationInWeeks || 2;
      setSelectedWeeks(2);
    }
  };

  const BuyersFeeModal = ({ isOpen, onClose }) => {
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
        className="bg-white w-full max-w-full h-[30vh] rounded-t-2xl shadow-lg overflow-y-scroll relative flex flex-col"
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
            <SiAdguard className="text-9xl text-green-600" />
            <p className="text-xs ml-4 font-opensans font-light text-black z-10">
              The Buyer’s Protection Fee ensures a safe and secure stockpiling
              experience. It helps protect your items while they’re reserved
              with the vendor and offers peace of mind in case your order is
              missing, damaged, or not as described. It’s our way of making sure
              you’re covered — even while your order is still being piled up.
            </p>
          </div>
        </div>
      </Modal>
    );
  };
  const fetchPreviewWithDiscount = async () => {
    setIsLoadingDiscount(true);
    await fetchPreview();
    setIsLoadingDiscount(false);
  };
  const formatColorText = (color) => {
    if (!color) return "";
    return color.charAt(0).toUpperCase() + color.slice(1).toLowerCase();
  };

  if (loading) {
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
    <div className="bg-gray-100 h-full ">
      <SEO
        title={`Checkout - My Thrift`}
        description={`Checkout your order on My Thrift`}
        url={`https://www.shopmythrift.store/newcheckout/`}
      />
      {isLoadingLink && <Link />}

      <div className="flex p-3 py-3 items-center sticky top-0 bg-white w-full h-20 shadow-md z-10 mb-3 pb-2">
        <GoChevronLeft
          className="text-3xl cursor-pointer"
          onClick={() => navigate(-1)}
        />
        <h1 className="text-xl font-opensans ml-5 font-semibold">Checkout</h1>
      </div>
      <div className="px-4">
        {!isRepiling && (
          <div className="w-full max-w-md mx-auto flex justify-between items-center rounded-full bg-gray-200 px-1 py-1 mb-3 relative">
            <button
              onClick={() => setCheckoutMode("deliver")}
              className={`w-1/2 py-2 rounded-full text-sm font-opensans font-semibold transition-all duration-200 ${
                checkoutMode === "deliver"
                  ? "bg-white text-customOrange"
                  : "text-gray-800"
              }`}
            >
              Deliver now
            </button>

            <div className="relative w-1/2">
              <button
                onClick={handleStockpileClick}
                className={`w-full py-2 rounded-full text-sm font-opensans font-medium transition-all duration-200 ${
                  checkoutMode === "stockpile"
                    ? "bg-white text-customOrange"
                    : "text-gray-800"
                }`}
              >
                Stockpile
              </button>

              {/* Beta Badge */}
              <span className="absolute -top-1 -right-1 bg-customOrange text-white text-[10px] px-2 py-[2px] rounded-full font-bold uppercase">
                Beta
              </span>
            </div>
          </div>
        )}
      </div>
      {checkoutMode === "deliver" ? (
        <div className="px-3">
          <div className="mt-4 px-4 w-full py-4 rounded-lg bg-white ">
            <h1 className="text-black font-semibold font-opensans text-base ">
              {isRepiling || checkoutMode === "stockpile"
                ? "Pile Summary"
                : "Order Summary"}
            </h1>

            <div className="border-t border-gray-300 my-2"></div>
            <div className="flex justify-between">
              <label className="block mb-2 text-sm font-opensans ">
                Sub-Total
              </label>
              <p className="text-base font-opensans text-black font-semibold">
                {isLoadingTotal
                  ? `₦${(
                      previewedOrder.subtotal ??
                      calculateCartTotalForVendor(cart, vendorId)
                    ).toLocaleString()}`
                  : `₦${(
                      previewedOrder.subtotal ??
                      calculateCartTotalForVendor(cart, vendorId)
                    ).toLocaleString()}`}
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
                <p className="text-base font-opensans text-black font-semibold">
                  {isFetchingOrderPreview ? (
                    <Skeleton width={80} />
                  ) : (
                    `₦${previewedOrder.bookingFee.toLocaleString()}`
                  )}
                </p>
              </div>
            )}

            {!isRepiling && (
              <div className="flex justify-between">
                <label className="block mb-2 text-sm font-opensans">
                  Service Fee
                  <CiCircleInfo
                    className="inline ml-2 text-customOrange cursor-pointer"
                    onClick={() => setShowServiceFeeModal(true)}
                  />
                </label>
                <p
                  className={`font-opensans font-semibold ${
                    !showServiceFee
                      ? "loading-text text-xs"
                      : "text-black text-base"
                  }`}
                >
                  {isLoadingServiceFee ? (
                    <div className="flex justify-center items-center h-5">
                      <RotatingLines
                        strokeColor="#f97316"
                        strokeWidth="3"
                        animationDuration="0.75"
                        width="20"
                        visible={true}
                      />
                    </div>
                  ) : showServiceFee ? (
                    previewedOrder.freeServiceFee ? (
                      <s className="text-black text-base font-opensans font-semibold">
                        ₦{previewedOrder.serviceFee.toLocaleString()}
                      </s>
                    ) : (
                      `₦${previewedOrder.serviceFee.toLocaleString()}`
                    )
                  ) : (
                    <RotatingLines
                      strokeColor="#f97316"
                      strokeWidth="3"
                      animationDuration="0.75"
                      width="20"
                      visible={true}
                    />
                  )}
                </p>
              </div>
            )}
            {!isSelfManagedDelivery && (
              <div className="flex justify-between">
                <span className="font-opensans text-sm">Delivery Fee</span>

                {isLoadingDeliveryFee ? (
                  <RotatingLines
                    strokeColor="#f97316"
                    strokeWidth="3"
                    animationDuration="0.75"
                    width="20"
                    visible={true}
                  />
                ) : isRepiling ? (
                  <span className="text-xs font-opensans text-orange-700 font-semibold">
                    Will be charged when it’s time to ship
                  </span>
                ) : previewedOrder.deliveryCharge == null ? (
                  <RotatingLines
                    strokeColor="#f97316"
                    strokeWidth="3"
                    animationDuration="0.75"
                    width="20"
                    visible={true}
                  />
                ) : previewedOrder.freeShipping ? (
                  <s className="text-base font-opensans text-black font-semibold">
                    ₦{Number(previewedOrder.deliveryCharge).toLocaleString()}
                  </s>
                ) : (
                  <span className="text-base font-opensans text-black font-semibold">
                    ₦{Number(previewedOrder.deliveryCharge).toLocaleString()}
                  </span>
                )}
              </div>
            )}
            <div className="border-t mt-3 border-gray-300 my-2"></div>
            <div className="flex justify-between mt-2">
              <label className="block mb-2 font-opensans text-base font-semibold">
                Total
              </label>
              <p className="text-lg font-opensans text-black font-semibold">
                {isLoadingTotal ? (
                  <p className="font-opensans text-xs text-black animate-pulse">
                    {" "}
                    Estimating total...
                  </p>
                ) : previewedOrder.total == null ? (
                  <p className="font-opensans text-xs text-black animate-pulse">
                    Just a moment...
                  </p>
                ) : (
                  `₦${Number(previewedOrder.total).toLocaleString()}`
                )}
              </p>
            </div>

            {isRepiling && (
              <div className="flex items-center bg-green-50 p-3 rounded-lg mt-3">
                <PiStackSimpleFill className="text-green-600 text-3xl mr-3" />
                <div>
                  <p className="font-opensans text-xs text-green-700 font-semibold">
                    You’ve saved ₦{previewedOrder.serviceFee.toLocaleString()}{" "}
                    in service fees by choosing to stockpile.
                  </p>
                </div>
              </div>
            )}
          </div>
          <TriviaGame onReward={fetchPreviewWithDiscount} />

          <div className="mt-2">
            <div
              className={`mt-3 px-3 w-full py-4 rounded-lg ${
                isRepiling ? "bg-white" : "bg-white"
              }`}
            >
              <div className="flex justify-between items-center">
                <h1 className="text-black font-semibold font-opensans text-base">
                  Delivery Information
                </h1>

                <FaPen
                  className={`${
                    isRepiling
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-black cursor-pointer"
                  }`}
                  onClick={() => {
                    if (!isRepiling) {
                      setShowEditModal(true);
                    }
                  }}
                />
              </div>

              <div className="border-t  border-gray-300 my-2"></div>

              <div className="flex text-sm ">
                <label className="block mb-2 mr-1 font-semibold font-opensans">
                  Name:
                </label>
                <p className="font-opensans text-black">
                  {userInfo.displayName}
                </p>
              </div>
              <div className="flex text-sm">
                <label className="block mb-2 mr-1 font-semibold font-opensans">
                  Phone Number:
                </label>
                <p className="font-opensans text-black ">
                  {userInfo.phoneNumber}
                </p>
              </div>
              <div className="flex text-sm">
                <label className="block mb-2 font-semibold mr-1 font-opensans">
                  Email:
                </label>
                <p className="font-opensans text-black">{userInfo.email}</p>
              </div>
              <div className="flex text-sm">
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
                  <h1 className="text-black font-semibold font-opensans text-base">
                    {isRepiling || checkoutMode === "stockpile"
                      ? "Pile"
                      : "Shipment"}
                  </h1>
                  <h3 className="text-xs font-opensans">
                    <span className="text-gray-600 mr-1 font-normal text-xs font-opensans">
                      From:
                    </span>
                    {vendorsInfo[vendorId]?.shopName?.length > 26
                      ? `${vendorsInfo[vendorId]?.shopName.slice(0, 26)}...`
                      : vendorsInfo[vendorId]?.shopName || `Vendor`}
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
                            <p className="font-opensans text-md mt-1 text-black font-bold">
                              ₦{product.price.toLocaleString()}
                            </p>
                            <div className="flex items-center space-x-3 text-sm mt-1 ">
                              {product.isFashion && (
                                <>
                                  <p className="text-black text-sm font-semibold font-opensans">
                                    <span className="font-normal text-xs text-gray-600">
                                      Size:
                                    </span>{" "}
                                    {product.selectedSize || "N/A"}
                                  </p>
                                  <p className="text-black text-sm font-semibold font-opensans">
                                    <span className="font-normal text-xs text-gray-600">
                                      Color:
                                    </span>{" "}
                                    {formatColorText(product.selectedColor)}
                                  </p>
                                </>
                              )}
                              <p className="text-black text-sm font-semibold font-opensans">
                                <span className="font-normal text-xs text-gray-600">
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
          {!isRepiling && (
            <div className="bg-white mt-3 p-3 rounded-lg shadow-md">
              {vendorId && vendorsInfo[vendorId] && (
                <>
                  <h2 className="text-base font-opensans font-semibold mb-3">
                    Delivery Method
                  </h2>
                  <div className="border-t border-gray-200 mb-2" />
                  <div className="px-2">
                    <button
                      type="button"
                      onClick={() => handleDeliveryModeSelection("Pickup")}
                      className={`w-full flex items-center justify-between py-2  ${
                        selectedDeliveryMode === "Pickup"
                      }`}
                    >
                      <div className="flex flex-col items-start">
                        <p className="text-base font-opensans font-semibold text-black">
                          Pick-up
                          {/* <span className="font-normal text-xs text-customOrange ml-1">
                            {pickupDistance
                              ? `(≈ ${pickupDistance})`
                              : "(distance — …)"}
                          </span> */}
                        </p>
                        {/* <p className="text-xs text-gray-800 font-opensans">
                          {tripAdvice
                            ? `${tripAdvice.headline} • ${tripAdvice.sub}`
                            : "Calculating …"}
                        </p> */}
                      </div>
                      <span
                        className={`w-5 h-5 rounded-full border-2 mr-2 flex items-center justify-center ${
                          selectedDeliveryMode === "Pickup"
                            ? "border-customOrange"
                            : "border-gray-300"
                        }`}
                      >
                        {selectedDeliveryMode === "Pickup" && (
                          <span className="w-3 h-3 rounded-full bg-customOrange" />
                        )}
                      </span>
                    </button>

                    {/* Pick-up location (always visible) */}
                    <div className="mt-1 rounded bg-gray-100 py-3 px-2">
                      {supportsPickup &&
                      vendorsInfo[vendorId]?.pickupLat &&
                      vendorsInfo[vendorId]?.pickupLng &&
                      vendorsInfo[vendorId]?.pickupAddress ? (
                        <>
                          <button
                            onClick={handleShowMapToast}
                            className="w-full flex items-center justify-between"
                          >
                            <span className="font-opensans font-semibold text-xs">
                              Pick-up location
                            </span>
                            <div className="flex items-center text-xs font-opensans text-blue-800">
                              <span>Open map</span>
                              <GoChevronRight className="text-lg" />
                            </div>
                          </button>
                          <hr className="border-t border-gray-300 my-2" />
                          <p className="mt-2 text-xs font-opensans text-black">
                            {vendorsInfo[vendorId].pickupAddress}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs font-opensans text-gray-500">
                          Vendor doesn’t offer pickup
                        </p>
                      )}
                    </div>

                    <hr className="border-t border-gray-200 my-2" />

                    {/* Door delivery */}
                    <button
                      type="button"
                      onClick={() => handleDeliveryModeSelection("Delivery")}
                      className={`w-full flex items-start justify-between py-4 ${
                        selectedDeliveryMode === "Delivery"
                      }`}
                    >
                      <div className="flex flex-col items-start">
                        <p className="text-base font-opensans font-semibold text-black">
                          Door delivery
                        </p>
                        <p className="text-xs text-gray-800 font-opensans">
                          1–3 working days
                        </p>
                      </div>
                      <span
                        className={`w-5 h-5 rounded-full border-2 mr-2 flex items-center justify-center ${
                          selectedDeliveryMode === "Delivery"
                            ? "border-customOrange"
                            : "border-gray-300"
                        }`}
                      >
                        {selectedDeliveryMode === "Delivery" && (
                          <span className="w-3 h-3 rounded-full bg-customOrange" />
                        )}
                      </span>
                    </button>
                  </div>
                  {/* Pick-up */}
                </>
              )}
            </div>
          )}
          {/* ───────────────── Payment Method ───────────────── */}
          <div className="bg-white mt-3 p-4 rounded-lg shadow-md">
            <h2 className="text-base font-opensans font-semibold mb-3">
              Payment Method
            </h2>
            <div className="border-t border-gray-200 my-2" />

            {[
              {
                id: "paystack",
                label: "Paystack",
                icon: (
                  <img src="/paystacklogo.png" alt="" className="w-6 h-6" />
                ),
              },
              {
                id: "wallet",
                label: "Wallet",
                icon: <TfiWallet className="text-xl" />,
              },
              {
                id: "share",
                label: "Pay for me",
                icon: <FaUserFriends className="text-xl" />,
              },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedPayment(opt.id)}
                className="w-full flex items-center justify-between py-4 border-b last:border-0"
              >
                <span className="flex items-center space-x-3">
                  {opt.icon}
                  <span className="text-sm font-semibold font-opensans">
                    {opt.label}
                  </span>
                  {opt.id === "wallet" &&
                    (walletSetup ? (
                      <span className="text-[11px] -translate-x-1 font-opensans font-medium text-customOrange">
                        [₦{walletBal.toLocaleString()}]
                      </span>
                    ) : (
                      <span
                        className=" -translate-x-1 font-opensans py-0.5 font-medium bg-customOrange  px-1 rounded-md cursor-pointer"
                        onClick={() => navigate("/your-wallet")}
                      >
                        <p className="text-[10px] text-white font-opensans font-medium">
                          {" "}
                          Setup Wallet
                        </p>
                      </span>
                    ))}
                </span>

                {/* radio */}
                <span
                  className={`w-5 h-5 rounded-full mr-2 border-2 flex items-center justify-center ${
                    selectedPayment === opt.id
                      ? "border-customOrange"
                      : "border-gray-300"
                  }`}
                >
                  {selectedPayment === opt.id && (
                    <span className="w-3 h-3 rounded-full bg-customOrange" />
                  )}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-2">
            <div className="mt-3 px-3 w-full py-4 rounded-lg bg-white">
              <div
                onClick={() => setShowShopSafelyModal(true)}
                className="flex justify-between items-center"
              >
                <h1 className="text-black font-semibold font-opensans text-base">
                  Shop safely and sustainably
                </h1>
                <GoChevronRight className="text-black text-2xl cursor-pointer" />
              </div>

              <div className="border-t border-gray-300 my-2"></div>

              <div className="flex mt-3 -mx-2 space-x-0.5">
                <div className="flex items-center flex-col">
                  <RiSecurePaymentFill className="text-3xl text-green-700" />
                  <p className="text-xs text-gray-600 font-opensans text-center">
                    Secure your payment
                  </p>
                </div>
                <div className="flex items-center flex-col">
                  <MdOutlineLock className="text-3xl text-green-700" />
                  <p className="text-xs text-gray-600 font-opensans text-center">
                    Security & Privacy
                  </p>
                </div>
                <div className="flex items-center flex-col">
                  <LiaShippingFastSolid className="text-3xl text-green-700" />
                  <p className="text-xs font-opensans text-gray-600 text-center">
                    Secure Shipment Guarantee
                  </p>
                </div>
                <div className="flex items-center flex-col">
                  <MdSupportAgent className="text-3xl text-green-700" />
                  <p className="text-xs text-gray-600 font-opensans text-center">
                    Customer Support
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-3">
          <div className="bg-white text-xs font-opensans text-gray-800 px-4 py-3 rounded-lg flex items-start space-x-2 ">
            <BsInfoCircle className="text-5xl text-gray-600" />
            <div>
              <p className="font-semibold font-opensans text-sm text-black mb-1">
                You've selected Stockpiling.
              </p>
              <p className="mb- text-gray-800 font-opensans text-xs">
                The vendor allows a maximum stockpile time of{" "}
                <span className="font-semibold text-customOrange">
                  {vendorsInfo[vendorId]?.stockpile?.durationInWeeks} weeks
                </span>
                .
              </p>
              <p className="text-xs text-gray-800">
                Stockpiling means your order won't be shipped immediately — you
                can keep adding more items to your pile after this order is
                placed.
              </p>
            </div>
          </div>

          <div className="mt-4 px-4 w-full py-4 rounded-lg bg-white ">
            <h1 className="text-black font-semibold font-opensans text-base ">
              {isRepiling || checkoutMode === "stockpile"
                ? "Pile Summary"
                : "Order Summary"}
            </h1>

            <div className="border-t border-gray-300 my-2"></div>
            <div className="flex justify-between">
              <label className="block mb-2 text-sm font-opensans ">
                Sub-Total
              </label>
              <p className="text-base font-opensans text-black font-semibold">
                ₦
                {(
                  previewedOrder.subtotal ??
                  calculateCartTotalForVendor(cart, vendorId)
                ).toLocaleString()}
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
                  {isLoadingTotal ? (
                    <RotatingLines
                      strokeColor="#f97316"
                      strokeWidth="3"
                      animationDuration="0.75"
                      width="20"
                      visible={true}
                    />
                  ) : (
                    `₦${previewedOrder.bookingFee.toLocaleString()}`
                  )}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <label className=" flex items-center text-sm mb-2 font-opensans">
                Buyers Protection Fee
                <AiOutlineSafety
                  className="inline ml-2 text-green-600 cursor-pointer"
                  onClick={() => setShowBuyersFee(true)}
                />
              </label>
              <p
                className={`font-opensans font-semibold ${
                  !showServiceFee
                    ? "loading-text text-xs"
                    : "text-black text-base"
                }`}
              >
                {isLoadingTotal ? (
                  <RotatingLines
                    strokeColor="#f97316"
                    strokeWidth="3"
                    animationDuration="0.75"
                    width="20"
                    visible={true}
                  />
                ) : showServiceFee ? (
                  `₦${previewedOrder.serviceFee.toLocaleString()}`
                ) : (
                  <RotatingLines
                    strokeColor="#f97316"
                    strokeWidth="3"
                    animationDuration="0.75"
                    width="20"
                    visible={true}
                  />
                )}
              </p>
            </div>
            <div className="flex items-center bg-orange-50 py-3 px-2 rounded-lg mt-3">
              <CiWarning className="text-orange-600 text-7xl mr-3" />
              <div>
                <p className="font-opensans text-xs text-orange-700 font-semibold">
                  You won’t be charged any delivery fees until your stockpile
                  ships. The vendor will share an estimated cost with you once
                  it’s ready to go.
                </p>
              </div>
            </div>

            <div className="border-t mt-3 border-gray-300 my-2"></div>
            <div className="flex justify-between mt-2">
              <label className="block mb-2 font-opensans text-base font-semibold">
                Total
              </label>
              <p className="text-lg font-opensans text-black font-semibold">
                {isLoadingTotal ? (
                  <p className="font-opensans text-xs text-black animate-pulse">
                    {" "}
                    Just a moment...
                  </p>
                ) : (
                  `₦${previewedOrder.total.toLocaleString()}`
                )}
              </p>
            </div>
          </div>
          <div className="bg-white mt-3 p-3 rounded-lg shadow-md">
            {vendorId && vendorsInfo[vendorId] && (
              <>
                <div className="flex items-center">
                  <h1 className="text-black font-semibold font-opensans text-base">
                    Stockpile Instructions
                  </h1>
                  {/* <CiCircleInfo
                  className="text-customOrange ml-2 cursor-pointer text-xl"
                  onClick={() => setShowDeliveryInfoModal(true)}
                /> */}
                </div>

                <div className="border-t border-gray-300 my-3"></div>

                <div className="mt-2">
                  <label className="block text-sm font-opensans  mb-1">
                    How many weeks would you like to stockpile?
                  </label>
                  {/* Convert the stockpile weeks into an array of {value, label} objects */}
                  {(() => {
                    const duration =
                      vendorsInfo[vendorId]?.stockpile?.durationInWeeks || 2;

                    // Create the array [2,3,4,...,duration]
                    const weekOptions = Array.from(
                      { length: duration - 1 },
                      (_, i) => i + 2
                    ).map((week) => ({
                      value: week,
                      label: `${week} weeks`,
                    }));
                    const customStyles = {
                      control: (base, state) => ({
                        ...base,
                        borderColor: state.isFocused ? "#F97316" : "#ccc", // orange when focused
                        boxShadow: state.isFocused
                          ? "0 0 0 1px #f9531e"
                          : "none",
                        "&:hover": {
                          borderColor: "#F97316",
                        },
                      }),
                      option: (base, state) => ({
                        ...base,
                        backgroundColor: state.isSelected
                          ? "#F97316"
                          : state.isFocused
                          ? "#fde4c5" // light orange on hover
                          : "white",
                        color: state.isSelected ? "white" : "#111827", // text color
                        "&:hover": {
                          backgroundColor: "#fde4c5",
                        },
                      }),
                      singleValue: (base) => ({
                        ...base,
                        color: "#f9531e", // text in dropdown
                        fontWeight: "600",
                      }),
                    };
                    // Our current selection in { value, label } form
                    const selectedOption =
                      weekOptions.find(
                        (opt) => opt.value === (selectedWeeks || 2)
                      ) ||
                      weekOptions[0] ||
                      null;

                    return (
                      // In your ReactSelect component:
                      <ReactSelect
                        className="mt-3 w-32 font-opensans text-customRichBrown text-sm"
                        options={weekOptions}
                        value={selectedOption}
                        onChange={(option) => {
                          console.log("User selected weeks:", option.value); // Log the change
                          setSelectedWeeks(option.value);
                        }}
                        isSearchable={false}
                        styles={customStyles}
                      />
                    );
                  })()}
                </div>
              </>
            )}
          </div>

          <form className="bg-white mt-3 p-3 rounded-lg shadow-md">
            {vendorId && cart[vendorId] && (
              <>
                <div className="flex justify-between">
                  <div className="flex items-center">
                    <h1 className="text-black font-medium mr-1 font-opensans text-base">
                      Pile
                    </h1>
                    <PiStackSimpleFill className="text-xl" />
                  </div>

                  <h3 className="text-xs font-opensans ">
                    <span className="text-gray-600 text-xs mr-1 font-opensans">
                      From:
                    </span>
                    {vendorsInfo[vendorId]?.shopName?.length > 8
                      ? `${vendorsInfo[vendorId]?.shopName.slice(0, 28)}`
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
                            <p className="font-opensans text-md mt-1 text-black font-bold">
                              ₦{product.price.toLocaleString()}
                            </p>
                            <div className="flex items-center space-x-3 text-sm mt-1 ">
                              {product.isFashion && (
                                <>
                                  <p className="text-black text-sm font-semibold font-opensans">
                                    <span className="font-normal text-xs text-gray-600">
                                      Size:
                                    </span>{" "}
                                    {product.selectedSize || "N/A"}
                                  </p>
                                  <p className="text-black text-sm font-semibold font-opensans">
                                    <span className="font-normal text-xs text-gray-600">
                                      Color:
                                    </span>{" "}
                                    {formatColorText(product.selectedColor)}
                                  </p>
                                </>
                              )}
                              <p className="text-black text-sm font-semibold font-opensans">
                                <span className="font-normal text-xs text-gray-600">
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

          <div className="mt-2">
            <div className="mt-3 px-3 w-full py-4 rounded-lg bg-white">
              <div className="flex justify-between items-center">
                <h1 className="text-black font-semibold font-opensans text-base">
                  Delivery Information
                </h1>
                <FaPen
                  className="text-black cursor-pointer"
                  onClick={() => setShowEditModal(true)}
                />
              </div>

              <div className="border-t border-gray-300 my-2"></div>

              <div className="flex text-sm">
                <label className="block mb-2 mr-1 font-semibold font-opensans">
                  Name:
                </label>
                <p className="font-opensans text-black">
                  {userInfo.displayName}
                </p>
              </div>
              <div className="flex text-sm">
                <label className="block mb-2 mr-1 font-semibold font-opensans">
                  Phone Number:
                </label>
                <p className="font-opensans text-black ">
                  {userInfo.phoneNumber}
                </p>
              </div>
              <div className="flex text-sm">
                <label className="block mb-2 font-semibold mr-1 font-opensans">
                  Email:
                </label>
                <p className="font-opensans text-black">{userInfo.email}</p>
              </div>
              <div className="flex text-sm">
                <label className="block mb-2 mr-1 font-semibold font-opensans">
                  Address:
                </label>
                <p className="font-opensans text-black ">{userInfo.address}</p>
              </div>
              <div className="bg-customCream flex items-center py-1 mt-4 animate-pulse px-2 text-left rounded-md">
                <CiWarning className="text-orange-600 text-4xl mr-3" />
                <p className="text-xs font-ubuntu font-medium text-red-600">
                  This cannot be updated after now. Please ensure to put your
                  correct details
                </p>
              </div>
            </div>
          </div>
          {/* ───────────────── Payment Method ───────────────── */}
          <div className="bg-white mt-3 p-4 rounded-lg shadow-md">
            <h2 className="text-base font-opensans font-semibold mb-3">
              Payment Method
            </h2>
            <div className="border-t border-gray-200 my-2" />

            {[
              {
                id: "paystack",
                label: "Paystack",
                icon: (
                  <img src="/paystacklogo.png" alt="" className="w-6 h-6" />
                ),
              },
              {
                id: "wallet",
                label: "Wallet",
                icon: <TfiWallet className="text-xl" />,
              },
              {
                id: "share",
                label: "Pay for me",
                icon: <FaUserFriends className="text-xl" />,
              },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedPayment(opt.id)}
                className="w-full flex items-center justify-between py-4 border-b last:border-0"
              >
                <span className="flex items-center space-x-3">
                  {opt.icon}
                  <span className="text-sm font-semibold font-opensans">
                    {opt.label}
                  </span>
                  {opt.id === "wallet" &&
                    (walletSetup ? (
                      <span className="text-[11px] -translate-x-1 font-opensans font-medium text-customOrange">
                        [₦{walletBal.toLocaleString()}]
                      </span>
                    ) : (
                      <span
                        className=" -translate-x-1 font-opensans py-0.5 font-medium bg-customOrange  px-1 rounded-md cursor-pointer"
                        onClick={() => navigate("/your-wallet")}
                      >
                        <p className="text-[10px] text-white font-opensans font-medium">
                          {" "}
                          Setup Wallet
                        </p>
                      </span>
                    ))}
                </span>

                {/* radio */}
                <span
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPayment === opt.id
                      ? "border-customOrange"
                      : "border-gray-300"
                  }`}
                >
                  {selectedPayment === opt.id && (
                    <span className="w-3 h-3 rounded-full bg-customOrange" />
                  )}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-2">
            <div className="mt-3 px-3 w-full py-4 rounded-lg bg-white">
              <div
                onClick={() => setShowShopSafelyModal(true)}
                className="flex justify-between items-center"
              >
                <h1 className="text-black font-semibold font-opensans text-base">
                  Shop safely and sustainably
                </h1>
                <GoChevronRight className="text-black text-2xl cursor-pointer" />
              </div>

              <div className="border-t border-gray-300 my-2"></div>

              <div className="flex mt-3 -mx-2 space-x-0.5">
                <div className="flex items-center flex-col">
                  <RiSecurePaymentFill className="text-3xl text-green-700" />
                  <p className="text-xs text-gray-600 font-opensans text-center">
                    Secure your payment
                  </p>
                </div>
                <div className="flex items-center flex-col">
                  <MdOutlineLock className="text-3xl text-green-700" />
                  <p className="text-xs text-gray-600 font-opensans text-center">
                    Security & Privacy
                  </p>
                </div>
                <div className="flex items-center flex-col">
                  <LiaShippingFastSolid className="text-3xl text-green-700" />
                  <p className="text-xs font-opensans text-gray-600 text-center">
                    Secure Shipment Guarantee
                  </p>
                </div>
                <div className="flex items-center flex-col">
                  <MdSupportAgent className="text-3xl text-green-700" />
                  <p className="text-xs text-gray-600 font-opensans text-center">
                    Customer Support
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <EditDeliveryModal
        isOpen={showEditModal}
        userInfo={userInfo}
        setUserInfo={setUserInfo}
        onClose={() => setShowEditModal(false)}
      />
      <NoStockpileModal
        isOpen={showNoStockpileModal}
        onClose={() => setShowNoStockpileModal(false)}
      />
      <AlreadyStockpiledModal
        isOpen={showAlreadyStockpiledModal}
        onClose={() => setShowAlreadyStockpiledModal(false)}
        vendorId={vendorId}
        dispatch={dispatch}
        navigate={navigate}
      />
      {/* <MapModal
        isOpen={showMapModal}
        onClose={() => setShowMapModal(false)}
        origin={{
          lat: userInfo.latitude,
          lng: userInfo.longitude,
        }}
        destination={{
          lat: vendorsInfo[vendorId]?.pickupLat,
          lng: vendorsInfo[vendorId]?.pickupLng,
        }}
      /> */}

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
      <BuyersFeeModal
        isOpen={showBuyersFee}
        onClose={() => setShowBuyersFee(false)}
      />
      <BookingFeeModal
        isOpen={showBookingFeeModal}
        onClose={() => setShowBookingFeeModal(false)}
      />

      <div className=" px-4 mt-6 pb-6 ">
        <button
          onClick={() => {
            if (selectedPayment === "wallet" && !walletSetup) {
              navigate("/your-wallet");
              return;
            }

            if (selectedPayment === "share") return handleShareLink();
            return handleProceedToPayment();
          }}
          disabled={
            !selectedPayment ||
            isLoading ||
            mustChooseDelivery ||
            isLoadingLink ||
            (checkoutMode === "stockpile" && !selectedWeeks)
          }
          className={`w-full h-12 rounded-full font-opensans font-semibold flex items-center justify-center
    ${
      !selectedPayment ||
      isLoading ||
      isLoadingLink ||
      mustChooseDelivery ||
      (checkoutMode === "stockpile" && !selectedWeeks)
        ? "bg-gray-400 cursor-not-allowed text-white"
        : "bg-customOrange text-white"
    }`}
        >
          {isLoading || isLoadingLink ? (
            <RotatingLines strokeColor="#fff" strokeWidth="5" width="24" />
          ) : (
            (() => {
              if (selectedPayment === "wallet") return "Pay with Wallet";
              if (selectedPayment === "share") return "Generate link";
              return "Pay with Paystack";
            })()
          )}
        </button>
      </div>
    </div>
  );
};

export default Checkout;
