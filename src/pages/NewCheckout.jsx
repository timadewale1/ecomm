import {recordOperationalEvent} from "../services/operationalEvents";
import {reportAppException} from "../services/crashReporting";
import {getOrderProductSnapshots} from "../services/orderProductSnapshots";
import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { clearCart, removeFromCart } from "../redux/actions/action";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase.config";
import { appHaptics } from "../services/haptics";
import usePriceLockExpiryClock from "../custom-hooks/usePriceLockExpiryClock";
import { resolveEffectiveUnitPrice } from "../services/priceLocks";
import { resumePaystackTransaction } from "../services/paystackCheckout";
import { markOrderPaymentClientCompleted } from "../services/paymentConfirmation";
import { PiStackPlusFill, PiStackSimpleFill } from "react-icons/pi";
import { getTripAdvice } from "../services/estimateTrips";
import { useAuth } from "../custom-hooks/useAuth";
import useHorizontalTabSwipe from "../custom-hooks/useHorizontalTabSwipe";
import { RiShareForwardBoxLine } from "react-icons/ri";
import { SiAdguard } from "react-icons/si";
import {
  enterStockpileMode,
  exitStockpileMode,
} from "../redux/reducers/stockpileSlice";
import { CiWarning } from "react-icons/ci";
import { GiBookPile } from "react-icons/gi";
import { Clock3, X } from "lucide-react";
import AppPageHeader from "../components/layout/AppPageHeader";
import AppBottomSheet from "../components/layout/AppBottomSheet";
import NativePickerField from "../components/Form/NativePickerField";
import { IoIosInformationCircle } from "react-icons/io";
import { IoCopyOutline } from "react-icons/io5";
// import { createOrderAndReduceStock } from "../styles/services/Services";
import {
  getDoc,
  doc,
  collection,
  onSnapshot,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase.config";
import Loading from "../components/Loading/Loading";
import { GoChevronRight } from "react-icons/go";
import { RiSecurePaymentFill } from "react-icons/ri";
import {
  MdDeliveryDining,
  MdOutlineLock,
  MdSupportAgent,
} from "react-icons/md";
import { LiaShippingFastSolid } from "react-icons/lia";
import { FaCheck } from "react-icons/fa6";
import Skeleton from "react-loading-skeleton";
import { RotatingLines } from "react-loader-spinner";
import { calculateDeliveryFee } from "../services/states";
import LocationPicker from "../components/Location/LocationPicker";

import { getPublicVendor } from "../services/publicVendors";
import SEO from "../components/Helmet/SEO";
import { RiUser3Line } from "react-icons/ri";
import { LuCreditCard } from "react-icons/lu";

import Link from "../components/Loading/Link";
import WithdrawLoad from "../components/Loading/WithdrawLoad";
import { generateCartHash } from "../services/cartHash";
import IframeModal from "../components/PwaModals/PushNotifsModal";
import "./new-checkout.css";
import { isVariantSizeHidden } from "../services/productVariantSelection";
import { isMarketplaceVendorEligible } from "../services/marketplaceVisibility";

const CHECKOUT_ASSETS = {
  edit: "/figma-assets/checkout-edit.svg",
  info: "/figma-assets/checkout-info.svg",
  payForMe: "/figma-assets/checkout-pay-for-me.svg",
  paystack: "/figma-assets/checkout-paystack.svg",
  radioEmpty: "/figma-assets/checkout-radio-empty.svg",
  radioEmptyPayment: "/figma-assets/checkout-radio-empty-payment.svg",
  radioSelected: "/figma-assets/checkout-radio-selected.svg",
  trash: "/figma-assets/checkout-trash.svg",
  wallet: "/figma-assets/checkout-wallet.svg",
};

const formatNaira = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? `₦${amount.toLocaleString()}` : "—";
};

const CheckoutRadio = ({ selected, payment = false }) => (
  <span className="checkout-radio" aria-hidden="true">
    <img
      src={
        selected
          ? CHECKOUT_ASSETS.radioSelected
          : payment
            ? CHECKOUT_ASSETS.radioEmptyPayment
            : CHECKOUT_ASSETS.radioEmpty
      }
      alt=""
    />
  </span>
);

const CheckoutSheetHeader = ({ title, onClose }) => (
  <header className="checkout-modal-header">
    <span aria-hidden="true" />
    <h2>{title}</h2>
    <button type="button" aria-label={`Close ${title}`} onClick={onClose}>
      <X aria-hidden="true" />
    </button>
  </header>
);

const EditDeliveryModal = ({ isOpen, userInfo, setUserInfo, onClose }) => {
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const handleLocationSelect = ({ lat, lng, address }) => {
    setUserInfo({
      ...userInfo,
      address,
      latitude: lat, // <-- overwrite these
      longitude: lng,
    });
    setShowLocationPicker(false); // Hide the picker
  };

  return (
    <AppBottomSheet
      open={isOpen}
      onClose={onClose}
      height="78dvh"
      ariaLabel="Edit delivery information"
      surfaceClassName="checkout-edit-sheet checkout-font-surface"
    >
      <form className="checkout-edit-sheet-form">
        <header className="checkout-edit-sheet-header">
          <span aria-hidden="true" />
          <h2>Edit Delivery Information</h2>
          <button
            type="button"
            aria-label="Close delivery information"
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="checkout-edit-sheet-scroll scrollbar-hide">
          <div className="checkout-edit-fields">
            <label className="checkout-edit-field">
              <span>Name</span>
              <input
                type="text"
                value={userInfo.displayName}
                onChange={(e) =>
                  setUserInfo({ ...userInfo, displayName: e.target.value })
                }
              />
            </label>

            <label className="checkout-edit-field">
              <span>Phone Number</span>
              <input
                type="text"
                inputMode="tel"
                value={userInfo.phoneNumber}
                onChange={(e) =>
                  setUserInfo({ ...userInfo, phoneNumber: e.target.value })
                }
              />
            </label>

            <label className="checkout-edit-field">
              <span>Email</span>
              <input
                type="text"
                inputMode="email"
                value={userInfo.email}
                onChange={(e) =>
                  setUserInfo({ ...userInfo, email: e.target.value })
                }
              />
            </label>

            <div className="checkout-edit-field">
              <span>Delivery Address</span>
              {!showLocationPicker ? (
                <input
                  type="text"
                  value={userInfo.address}
                  readOnly
                  onClick={() => setShowLocationPicker(true)}
                  placeholder="Click to select your location"
                />
              ) : (
                <div className="checkout-edit-location-picker">
                  <LocationPicker
                    onLocationSelect={handleLocationSelect}
                    initialAddress={userInfo.address}
                    initialCoords={{
                      lat: userInfo.latitude,
                      lng: userInfo.longitude,
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="checkout-edit-sheet-actions">
          <button
            type="button"
            className="checkout-edit-save"
            onClick={onClose}
          >
            Save Changes
          </button>
          <button
            type="button"
            onClick={onClose}
            className="checkout-edit-cancel"
          >
            Cancel
          </button>
        </footer>
      </form>
    </AppBottomSheet>
  );
};

const ShopSafelyModal = ({ isOpen, onClose }) => {
  return (
    <AppBottomSheet
      open={isOpen}
      onClose={onClose}
      height="78dvh"
      ariaLabel="Shop safely and sustainably"
      surfaceClassName="checkout-modal-sheet checkout-font-surface"
    >
      <div className="checkout-modal-shell">
        <CheckoutSheetHeader
          title="Shop Safely and Sustainably"
          onClose={onClose}
        />

        <div className="checkout-modal-scroll scrollbar-hide">
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
                Escrow Payments: A percentage of your funds are held securely
                and released to the vendor only after delivery is confirmed.
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
                Our dedicated support team is available to assist with any
                issues related to your order, payment, or delivery.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppBottomSheet>
  );
};

const AlreadyStockpiledModal = ({
  isOpen,
  onClose,
  vendorId,
  vendorName,
  dispatch,
}) => (
  <AppBottomSheet
    open={isOpen}
    onClose={onClose}
    height="42dvh"
    ariaLabel="Active stockpile found"
    surfaceClassName="checkout-modal-sheet checkout-font-surface"
  >
    <div className="checkout-modal-shell">
      <CheckoutSheetHeader title="Active Stockpile Found" onClose={onClose} />
      <div className="checkout-modal-scroll checkout-notice-content scrollbar-hide">
        <div className="checkout-notice-icon checkout-notice-icon--stockpile">
          <GiBookPile aria-hidden="true" />
        </div>
        <p>
          You already have an active stockpile with{" "}
          <strong>{vendorName || "this vendor"}</strong>. Would you like to add
          more items to your pile?
        </p>
      </div>

      <footer className="checkout-modal-actions">
        <button
          type="button"
          className="checkout-modal-primary"
          onClick={() => {
            dispatch(enterStockpileMode({ vendorId }));
            void appHaptics.success();
            onClose();
          }}
        >
          Repile Now
        </button>
        <button
          type="button"
          className="checkout-modal-secondary"
          onClick={onClose}
        >
          Cancel
        </button>
      </footer>
    </div>
  </AppBottomSheet>
);

const ExistingStockpileDeliveryModal = ({
  isOpen,
  vendorName,
  onContinue,
  onBack,
}) => (
  <AppBottomSheet
    open={isOpen}
    onClose={onBack}
    variant="fullscreen"
    dismissible={false}
    closeOnBackdrop={false}
    ariaLabel="Deliver separately from active stockpile"
    zIndex={9500}
    surfaceClassName="checkout-existing-pile-screen checkout-font-surface"
  >
    <div className="checkout-existing-pile-shell">
      <header className="checkout-existing-pile-header">
        <span aria-hidden="true" />
        <h2>Active stockpile</h2>
        <button type="button" onClick={onBack} aria-label="Return to cart">
          <X aria-hidden="true" />
        </button>
      </header>

      <main className="checkout-existing-pile-content">
        <div className="checkout-existing-pile-icon" aria-hidden="true">
          <GiBookPile />
        </div>
        <div>
          <p className="checkout-existing-pile-eyebrow">Before you continue</p>
          <h1>You already have a stockpile with this store</h1>
        </div>
        <p>
          Your active stockpile with{" "}
          <strong>{vendorName || "this vendor"}</strong> will remain exactly as
          it is.
        </p>
        <div className="checkout-existing-pile-card">
          <h3>Deliver Now is a separate order</h3>
          <p>
            These items will not be added to your existing stockpile. Once the
            vendor accepts the order, it will be prepared and delivered
            separately using the delivery option you select here.
          </p>
        </div>
        <p className="checkout-existing-pile-hint">
          Want these items in your pile instead? Continue to Checkout, open the{" "}
          <strong>Stockpile</strong> tab, then choose{" "}
          <strong>Repile Now</strong>.
        </p>
      </main>

      <footer className="checkout-existing-pile-actions">
        <button type="button" className="is-primary" onClick={onContinue}>
          I understand, continue
        </button>
        <button type="button" className="is-secondary" onClick={onBack}>
          Go back
        </button>
      </footer>
    </div>
  </AppBottomSheet>
);

const NoStockpileModal = ({ isOpen, onClose }) => (
  <AppBottomSheet
    open={isOpen}
    onClose={onClose}
    height="34dvh"
    ariaLabel="Stockpiling not available"
    surfaceClassName="checkout-modal-sheet checkout-font-surface"
  >
    <div className="checkout-modal-shell">
      <CheckoutSheetHeader
        title="Stockpiling Not Available"
        onClose={onClose}
      />
      <div className="checkout-modal-scroll checkout-notice-content scrollbar-hide">
        <div className="checkout-notice-icon checkout-notice-icon--unavailable">
          <GiBookPile aria-hidden="true" />
        </div>
        <p>Sorry, but this vendor does not offer stockpiling at the moment.</p>
      </div>
    </div>
  </AppBottomSheet>
);

const BuyersFeeModal = ({ isOpen, onClose, isStockpile }) => {
  const title = isStockpile
    ? "Stockpile Buyer Protection"
    : "Buyer Protection Fee";

  return (
    <AppBottomSheet
      open={isOpen}
      onClose={onClose}
      height={isStockpile ? "56dvh" : "42dvh"}
      ariaLabel={title}
      surfaceClassName="checkout-modal-sheet checkout-font-surface"
    >
      <div className="checkout-modal-shell">
        <CheckoutSheetHeader title={title} onClose={onClose} />
        <div className="checkout-modal-scroll checkout-protection-content scrollbar-hide">
          <div className="checkout-protection-icon">
            <SiAdguard aria-hidden="true" />
          </div>

          {isStockpile ? (
            <div className="checkout-protection-copy">
              <p>
                Stockpile Buyer Protection covers the items in your new pile
                while they are stored with the vendor and until the pile is
                delivered.
              </p>
              <p>
                The protection fee is charged when you start a new stockpile.
                Its exact amount is shown in your order summary before you pay,
                so you can review the complete total first.
              </p>
              <p>
                If you add more items to the same active stockpile, you will not
                be charged another Buyer Protection fee for items you add later.
              </p>
              <p>
                Delivery is separate from Buyer Protection. Any applicable
                delivery charge will be provided when your completed pile is
                ready to ship.
              </p>
            </div>
          ) : (
            <div className="checkout-protection-copy">
              <p>
                Buyer Protection helps keep your purchase safe if an order is
                missing, damaged or not as described.
              </p>
              <p>
                The applicable fee is shown in your order summary before you
                pay, so you can review the complete checkout total first.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppBottomSheet>
  );
};

const Checkout = () => {
  const { vendorId } = useParams();
  const [searchParams] = useSearchParams();
  const [showDeliveryInfoModal, setShowDeliveryInfoModal] = useState(false);
  const note = searchParams.get("note") || "";
  const [deliveryEstimate, setDeliveryEstimate] = useState("");
  const [selectedDeliveryMode, setSelectedDeliveryMode] = useState("");
  // The delivery API may return a recommended/default option with its quote.
  // Keep the customer's actual choice separate so a returned recommendation
  // can never silently become a charge in the checkout UI or payment payload.
  const [selectedCourierOptionId, setSelectedCourierOptionId] = useState("");
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
  const closeEditModal = useCallback(() => setShowEditModal(false), []);
  const [showShopSafelyModal, setShowShopSafelyModal] = useState(false);
  const closeShopSafelyModal = useCallback(
    () => setShowShopSafelyModal(false),
    []
  );
  const [previewedOrder, setPreviewedOrder] = useState({
    subtotal: null,
    bookingFee: null,
    serviceFee: null,
    deliveryCharge: null,
    providerDeliveryCharge: null,
    total: null,
    discount: 0,
    freeShipping: false,
    freeServiceFee: false,
    deliveryFulfillmentId: null,
    deliveryOption: null,
    deliveryOptions: [],
    deliveryQuoteGeneration: null,
    deliveryQuoteRefreshAfter: null,
    deliveryQuoteExpiresAt: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLink, setIsLoadingLink] = useState(false);
  const [showServiceFee, setShowServiceFee] = useState(false);
  const [showBuyersFee, setShowBuyersFee] = useState(false);
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
  const previewRequestIdRef = useRef(0);
  const deliveryMethodTransitionRef = useRef(false);
  const deliveryQuoteSessionIdRef = useRef(
    window.crypto?.randomUUID?.() ||
      `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  const stockpileTabTransitionRef = useRef(false);
  const [isSelectingCourier, setIsSelectingCourier] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [walletSetup, setWalletSetup] = useState(false);
  const [isPickup, setIsPickup] = useState(false);
  const [tripAdvice, setTripAdvice] = useState(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showAlreadyStockpiledModal, setShowAlreadyStockpiledModal] =
    useState(false);
  const closeAlreadyStockpiledModal = useCallback(
    () => setShowAlreadyStockpiledModal(false),
    []
  );

  const [showNoStockpileModal, setShowNoStockpileModal] = useState(false);
  const closeNoStockpileModal = useCallback(
    () => setShowNoStockpileModal(false),
    []
  );
  const closeBuyersFeeModal = useCallback(() => setShowBuyersFee(false), []);
  const [locksByProduct, setLocksByProduct] = useState({});
  const [activePile, setActivePile] = useState({
    items: [],
    itemCount: 0,
    subtotal: 0,
    endDate: null,
    loading: false,
  });

  const [selectedWeeks, setSelectedWeeks] = useState(null);
  const { isActive, vendorId: stockpileVendorId } = useSelector(
    (state) => state.stockpile
  );
  const isRepiling = isActive && stockpileVendorId === vendorId;
  const vendorDeliveryMode = vendorsInfo[vendorId]?.deliveryMode || "";
  const [existingStockpileForCheckout, setExistingStockpileForCheckout] =
    useState(false);
  const [existingStockpileCheckPending, setExistingStockpileCheckPending] =
    useState(true);
  const [deliverNowWarningAccepted, setDeliverNowWarningAccepted] =
    useState(false);
  const priceLocks = locksByProduct;
  const priceLockNow = usePriceLockExpiryClock(locksByProduct);
  const [liveProductPrices, setLiveProductPrices] = useState({});
  const checkoutProductIds = useMemo(
    () =>
      Array.from(
        new Set(
          Object.values(cart[vendorId]?.products || {})
            .map((product) => product?.id)
            .filter(Boolean),
        ),
      ),
    [cart, vendorId],
  );

  useEffect(() => {
    let cancelled = false;

    const checkExistingStockpile = async () => {
      setDeliverNowWarningAccepted(false);

      if (!currentUser?.uid || !vendorId || isRepiling) {
        setExistingStockpileForCheckout(false);
        setExistingStockpileCheckPending(false);
        return;
      }

      setExistingStockpileCheckPending(true);
      try {
        const pileSnapshot = await getDocs(
          query(
            collection(db, "stockpiles"),
            where("userId", "==", currentUser.uid),
            where("vendorId", "==", vendorId),
            where("isActive", "==", true)
          )
        );
        if (!cancelled) {
          setExistingStockpileForCheckout(!pileSnapshot.empty);
        }
      } catch (error) {
        console.warn("Unable to check for an existing stockpile:", error);
        // Do not strand a customer on a blocking screen if this advisory read
        // is temporarily unavailable. The Stockpile tab performs its own
        // authoritative check before enabling repile mode.
        if (!cancelled) setExistingStockpileForCheckout(false);
      } finally {
        if (!cancelled) setExistingStockpileCheckPending(false);
      }
    };

    void checkExistingStockpile();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid, vendorId, isRepiling]);

  useEffect(() => {
    let cancelled = false;

    if (!checkoutProductIds.length) {
      setLiveProductPrices({});
      return () => {
        cancelled = true;
      };
    }

    void Promise.all(
      checkoutProductIds.map(async (productId) => {
        try {
          const snapshot = await getDoc(doc(db, "publicProducts", productId));
          if (!snapshot.exists()) return [productId, null];
          const price = Number(snapshot.data()?.price);
          return [productId, Number.isFinite(price) ? price : null];
        } catch (error) {
          console.warn("[CHK] Unable to refresh current product price:", {
            productId,
            error,
          });
          return [productId, null];
        }
      }),
    ).then((entries) => {
      if (cancelled) return;
      setLiveProductPrices(
        Object.fromEntries(entries.filter(([, price]) => price != null)),
      );
    });

    return () => {
      cancelled = true;
    };
  }, [checkoutProductIds]);

  const prepareOrderData = (isPreview = false) => {
    const vendorCart = cart[vendorId]?.products;

    if (!vendorCart || Object.keys(vendorCart).length === 0) {
      // Preview effects can run once more after a successful payment clears the
      // paid vendor cart and before navigation unmounts checkout. That is an
      // expected transition, not a payment failure, so only an explicit payment
      // attempt should surface the empty-cart error.
      if (!isPreview) toast.error("Cart is empty");
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
    const checkoutPaymentMethod = selectedPayment
      ? selectedPayment === "wallet"
        ? "wallet"
        : "paystack"
      : null;

    const orderData = {
      cartItems,
      cartHash,
      userInfo: {
        ...userInfo,
        isPickup,
        ...(checkoutPaymentMethod && {
          paymentMethod: checkoutPaymentMethod,
        }),
      },
      preview: isPreview,
      isRepiling,
      deliveryNote: userInfo.deliveryNote,
      isStockpile: checkoutMode === "stockpile" || isRepiling,
      stockpileDuration:
        checkoutMode === "stockpile" && selectedWeeks
          ? selectedWeeks
          : undefined,
    };
    if (checkoutMode === "deliver" && !isRepiling && !isPickup) {
      orderData.deliveryQuoteSessionId =
        deliveryQuoteSessionIdRef.current;
    }

    // Persist a canonical method on newly-created orders. Pay-for-me still
    // settles through Paystack, while previews may run before a method is set.
    if (checkoutPaymentMethod) {
      orderData.paymentMethod = checkoutPaymentMethod;
    }

    if (note) {
      orderData.note = note;
    }
    if (selectedPayment === "wallet") {
      orderData.walletId = walletId;
    }
    if (
      checkoutMode === "deliver" &&
      !isRepiling &&
      !isPickup &&
      previewedOrder.deliveryFulfillmentId
    ) {
      orderData.deliveryFulfillmentId =
        previewedOrder.deliveryFulfillmentId;
      if (!isPreview && selectedCourierOptionId) {
        orderData.deliveryQuoteOptionId =
          selectedCourierOptionId;
      }
    }

    return orderData;
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

  const fetchPreview = async (requestId) => {
    if (!currentUser) return;

    // Kick off loaders
    const isDeliveryMethodTransition = deliveryMethodTransitionRef.current;
    deliveryMethodTransitionRef.current = false;
    if (!isDeliveryMethodTransition) setIsLoadingServiceFee(true);
    setIsLoadingDeliveryFee(true);
    setIsLoadingTotal(true);
    if (checkoutMode === "deliver" && !isRepiling && !isPickup) {
      // A refreshed quote has a new authoritative option set. Force a fresh,
      // explicit customer selection instead of retaining an option from the
      // previous address/cart/quote generation.
      setSelectedCourierOptionId("");
      setPreviewedOrder((previous) => ({
        ...previous,
        deliveryFulfillmentId: null,
      }));
    }

    // Ensure user info is complete
    if (
      !userInfo.displayName ||
      !userInfo.email ||
      !userInfo.phoneNumber ||
      !userInfo.address
    ) {
      if (requestId === previewRequestIdRef.current) {
        setIsLoadingServiceFee(false);
        setIsLoadingDeliveryFee(false);
        setIsLoadingTotal(false);
        setShowServiceFee(false);
      }
      return;
    }

    try {
      const orderData = prepareOrderData(true);
      if (!orderData) return;

      const processOrder = httpsCallable(functions, "processOrder");
      const { data } = await processOrder(orderData);

      // A mode, timeline, address or cart change may have started a newer
      // preview while this callable was in flight. Never let an older response
      // replace the latest checkout totals.
      if (requestId !== previewRequestIdRef.current) return;

      setPreviewedOrder((prev) => {
        const isStockpilePreview = checkoutMode === "stockpile" || isRepiling;
        const isDoorDeliveryPreview = !isStockpilePreview && !isPickup;
        const returnedDeliveryCharge = Number(data.deliveryCharge || 0);
        const returnedTotal =
          data.total != null ? Number(data.total) : Number(prev.total);
        const totalBeforeCourier = Number.isFinite(returnedTotal)
          ? Math.max(0, returnedTotal - returnedDeliveryCharge)
          : prev.total;

        // build new sticky flags
        const newFreeService = isStockpilePreview
          ? Boolean(data.freeServiceFee)
          : prev.freeServiceFee || Boolean(data.freeServiceFee);
        const newFreeShipping = isStockpilePreview
          ? Boolean(data.freeShipping)
          : prev.freeShipping || Boolean(data.freeShipping);

        if (isPickup && !isStockpilePreview) {
          // Pickup still returns authoritative totals. Clear the courier quote
          // without leaving a stale/string service fee behind.
          return {
            ...prev,
            subtotal:
              data.subtotal != null ? Number(data.subtotal) : prev.subtotal,
            serviceFee:
              data.serviceFee != null
                ? Number(data.serviceFee)
                : prev.serviceFee,
            deliveryCharge:
              data.deliveryCharge != null ? Number(data.deliveryCharge) : 0,
            total: data.total != null ? Number(data.total) : prev.total,
            discount:
              data.discount != null ? Number(data.discount) : prev.discount,
            freeServiceFee: Boolean(data.freeServiceFee),
            freeShipping: newFreeShipping,
            deliveryFulfillmentId: null,
            deliveryOption: null,
            deliveryOptions: [],
            providerDeliveryCharge: null,
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
            // A stockpile preview must always render the exact fee returned by
            // processOrder. Deliver-now reward behavior remains unchanged.
            serviceFee:
              isStockpilePreview && data.serviceFee != null
                ? Number(data.serviceFee)
                : newFreeService
                ? prev.serviceFee
                : data.serviceFee != null
                ? Number(data.serviceFee)
                : prev.serviceFee,
            deliveryCharge: isDoorDeliveryPreview
              ? null
              : isStockpilePreview && data.deliveryCharge != null
                ? Number(data.deliveryCharge)
                : newFreeShipping
                ? prev.deliveryCharge
                : data.deliveryCharge != null
                ? Number(data.deliveryCharge)
                : prev.deliveryCharge,
            // The API can recommend a courier, but the customer has not yet
            // selected it. Until they do, the checkout total intentionally
            // excludes that returned quote.
            total: isDoorDeliveryPreview
              ? totalBeforeCourier
              : data.total != null
              ? Number(data.total)
              : prev.total,

            // once discount > 0 it sticks
            discount:
              isStockpilePreview
                ? Number(data.discount || 0)
                : prev.discount > 0
                ? prev.discount
                : data.discount != null
                ? Number(data.discount)
                : 0,

            freeServiceFee: newFreeService,
            freeShipping: newFreeShipping,
            deliveryFulfillmentId:
              data.deliveryFulfillmentId || null,
            deliveryOption: isDoorDeliveryPreview
              ? null
              : data.deliveryOption || null,
            deliveryOptions: Array.isArray(data.deliveryOptions)
              ? data.deliveryOptions
              : [],
            providerDeliveryCharge: isDoorDeliveryPreview
              ? null
              : data.providerDeliveryCharge != null
                ? Number(data.providerDeliveryCharge)
                : null,
            deliveryQuoteGeneration:
              data.deliveryQuoteGeneration ?? null,
            deliveryQuoteRefreshAfter:
              Number(data.deliveryQuoteRefreshAfter) || null,
            deliveryQuoteExpiresAt:
              Number(data.deliveryQuoteExpiresAt) || null,
          };
        }
      });
      setShowServiceFee(true);
    } catch (err) {
      if (requestId === previewRequestIdRef.current) {
        console.error("Preview error:", err);
        setShowServiceFee(false);
      }
    } finally {
      if (requestId === previewRequestIdRef.current) {
        setIsLoadingServiceFee(false);
        setIsLoadingDeliveryFee(false);
        setIsLoadingTotal(false);
      }
    }
  };

  // 3) Call it in an effect whenever inputs change
  useEffect(() => {
    const requestId = ++previewRequestIdRef.current;

    if (!currentUser) {
      setIsLoadingServiceFee(false);
      setIsLoadingDeliveryFee(false);
      setIsLoadingTotal(false);
      setShowServiceFee(false);
      return;
    }

    // Vendor data and the customer's fulfilment choice arrive asynchronously.
    // Do not let the default `isPickup=false` state manufacture a delivery
    // quote before either one is known.
    if (
      checkoutMode === "deliver" &&
      !isRepiling &&
      (!vendorDeliveryMode || !selectedDeliveryMode)
    ) {
      setSelectedCourierOptionId("");
      setIsLoadingServiceFee(false);
      setIsLoadingDeliveryFee(false);
      setIsLoadingTotal(false);
      setShowServiceFee(false);
      setPreviewedOrder((previous) => ({
        ...previous,
        serviceFee: null,
        deliveryCharge: null,
        total: null,
        deliveryFulfillmentId: null,
        deliveryOption: null,
        deliveryOptions: [],
        providerDeliveryCharge: null,
      }));
      return;
    }

    // Do not create a delivery quote behind the required active-stockpile
    // decision screen. Waiting here avoids orphaned quote sessions and makes
    // the customer's explicit choice the start of the Deliver Now flow.
    if (
      existingStockpileCheckPending ||
      (existingStockpileForCheckout &&
        !isRepiling &&
        !deliverNowWarningAccepted)
    ) {
      setIsLoadingServiceFee(false);
      setIsLoadingDeliveryFee(false);
      setIsLoadingTotal(false);
      setShowServiceFee(false);
      setPreviewedOrder((previous) => ({
        ...previous,
        deliveryFulfillmentId: null,
        deliveryOption: null,
        deliveryOptions: [],
        providerDeliveryCharge: null,
      }));
      return;
    }

    // A new stockpile is not priceable until its timeline is selected. Besides
    // preventing a misleading stale fee, this avoids sending the backend the
    // same payload shape used by a genuine repile (stockpile with no duration).
    if (checkoutMode === "stockpile" && !isRepiling && !selectedWeeks) {
      setIsLoadingServiceFee(false);
      setIsLoadingDeliveryFee(false);
      setIsLoadingTotal(false);
      setShowServiceFee(false);
      setPreviewedOrder((prev) => ({
        ...prev,
        serviceFee: null,
        deliveryCharge: null,
        total: null,
        freeServiceFee: false,
        freeShipping: false,
        deliveryFulfillmentId: null,
        deliveryOption: null,
        deliveryOptions: [],
        providerDeliveryCharge: null,
      }));
      return;
    }

    fetchPreview(requestId);
  }, [
    vendorId,
    cart,
    currentUser,
    checkoutMode,
    isRepiling,
    isPickup,
    userInfo.address,
    userInfo.latitude,
    userInfo.longitude,
    selectedWeeks,
    existingStockpileCheckPending,
    existingStockpileForCheckout,
    deliverNowWarningAccepted,
    selectedDeliveryMode,
    vendorDeliveryMode,
  ]);

  useEffect(
    () => () => {
      // Invalidate any callable response that completes after checkout unmounts.
      previewRequestIdRef.current += 1;
    },
    []
  );
  useEffect(() => {
    const refreshAt = Number(previewedOrder.deliveryQuoteRefreshAfter);
    if (
      !refreshAt ||
      !previewedOrder.deliveryFulfillmentId ||
      checkoutMode !== "deliver" ||
      isRepiling ||
      isPickup ||
      isLoading
    ) {
      return undefined;
    }

    const refreshQuote = () => {
      const requestId = ++previewRequestIdRef.current;
      void fetchPreview(requestId);
    };
    const delay = Math.max(0, refreshAt - Date.now());
    const timeout = window.setTimeout(refreshQuote, delay);
    return () => window.clearTimeout(timeout);
  }, [
    checkoutMode,
    isLoading,
    isPickup,
    isRepiling,
    previewedOrder.deliveryFulfillmentId,
    previewedOrder.deliveryQuoteRefreshAfter,
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
    let cancelled = false;
    const fetchVendorInfo = async () => {
      try {
        if (!vendorId) return;

        const vendor = await getPublicVendor(vendorId);
        if (cancelled) return;
        if (vendor) {
          if (!isMarketplaceVendorEligible(vendor)) {
            toast.error("This store is not currently available.");
            navigate("/latest-cart", { replace: true });
            return;
          }
          setVendorsInfo({ [vendorId]: vendor });
        } else {
          toast.error("This store is not currently available.");
          navigate("/latest-cart", { replace: true });
        }
      } catch (error) {
        if (cancelled) return;
        console.error("Error fetching vendor info:", error);
        toast.error("Unable to verify this store right now. Please try again.");
      }
    };

    fetchVendorInfo();
    return () => { cancelled = true; };
  }, [vendorId, navigate]);
  useEffect(() => {
    const mode = vendorsInfo[vendorId]?.deliveryMode;
    if (!mode) return;

    // Every stockpile, including a genuine repile, is delivered later as one
    // pile. A pickup-only vendor must not leak isPickup=true into that order.
    if (isRepiling) {
      setIsPickup(false);
      return;
    }

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
  }, [vendorsInfo, vendorId, isRepiling]);
  useEffect(() => {
    if (!currentUser?.uid) {
      setLocksByProduct({});
      console.debug("[CHK] no user → clear locks");
      return;
    }

    const qLocks = query(
      collection(db, "priceLocks"),
      where("buyerId", "==", currentUser.uid),
      where("state", "==", "active")
    );

    const unsub = onSnapshot(
      qLocks,
      (snap) => {
        const map = {};
        snap.forEach((d) => {
          map[d.data().productId] = d.data();
        });
        setLocksByProduct(map);
        console.debug("[CHK] locks snapshot:", {
          count: Object.keys(map).length,
          keys: Object.keys(map),
          sample: Object.values(map)[0],
        });
      },
      (err) => console.error("[CHK] priceLocks onSnapshot error:", err)
    );

    return () => unsub();
  }, [currentUser?.uid]);

  useEffect(() => {
    let cancelled = false;

    const loadActivePile = async () => {
      if (!isRepiling || !currentUser?.uid || !vendorId) {
        setActivePile({
          items: [],
          itemCount: 0,
          subtotal: 0,
          endDate: null,
          loading: false,
        });
        return;
      }

      setActivePile((previous) => ({ ...previous, loading: true }));

      try {
        const pileSnapshot = await getDocs(
          query(
            collection(db, "stockpiles"),
            where("userId", "==", currentUser.uid),
            where("vendorId", "==", vendorId),
            where("isActive", "==", true)
          )
        );

        if (pileSnapshot.empty) {
          if (!cancelled) {
            setActivePile({
              items: [],
              itemCount: 0,
              subtotal: 0,
              endDate: null,
              loading: false,
            });
          }
          return;
        }

        const pileData = pileSnapshot.docs[0].data();
        const orderIds = Array.isArray(pileData.orderIds)
          ? pileData.orderIds
          : [];
        const orderSnapshots = await Promise.all(
          orderIds.map((orderId) => getDoc(doc(db, "orders", orderId)))
        );

        const orders = orderSnapshots.filter(snapshot=>snapshot.exists())
          .map(snapshot=>({...snapshot.data(),id:snapshot.id}));
        const products = await getOrderProductSnapshots(orders);
        const rawItems = orders.flatMap(order=>order.cartItems || []);
        const items = orders.flatMap(order=>(order.cartItems || []).map((item,index)=>{
          const product=products[order.id]?.[index] || item.productSnapshot || {};
          return {...item,key:order.id+"-"+index,
            name:item.name || item.productName || product.name || "Stockpiled item",
            imageUrl:item.selectedImageUrl || item.imageUrl || item.image || product.imageUrl || product.coverImageUrl || product.imageUrls?.[0] || ""};
        }));

        if (!cancelled) {
          setActivePile({
            items,
            itemCount: rawItems.reduce(
              (sum, item) => sum + Number(item.quantity || 1),
              0
            ),
            subtotal: orders.reduce(
              (sum, order) => sum + Number(order.subtotal || 0),
              0
            ),
            endDate: pileData.endDate || null,
            loading: false,
          });
        }
      } catch (error) {
        console.error("Unable to load active stockpile preview:", error);
        if (!cancelled) {
          setActivePile((previous) => ({ ...previous, loading: false }));
        }
      }
    };

    loadActivePile();
    return () => {
      cancelled = true;
    };
  }, [isRepiling, currentUser?.uid, vendorId]);

  const supportsPickup =
    vendorsInfo[vendorId]?.deliveryMode === "Delivery & Pickup" ||
    vendorsInfo[vendorId]?.deliveryMode === "Pickup";

  const getEffectiveUnitPrice = useCallback(
    (product, productKey) => {
      const lock = priceLocks[product.id];
      const resolution = resolveEffectiveUnitPrice({
        product,
        lock,
        basePrice: liveProductPrices[product.id],
        now: priceLockNow,
      });

      console.debug(`[PRICE] ${product.name} (${productKey})`, {
        picked: resolution.unitPrice,
        base: resolution.base,
        source: resolution.source,
        hasLock: Boolean(lock),
      });
      return resolution.unitPrice;
    },
    [liveProductPrices, priceLockNow, priceLocks],
  );

  const calcFallbackSubtotal = useMemo(() => {
    const vendorCart = cart[vendorId]?.products || {};
    return Object.entries(vendorCart).reduce((sum, [k, p]) => {
      const unit = getEffectiveUnitPrice(p, k);
      const qty = Number(p.quantity || 1);
      return sum + unit * qty;
    }, 0);
  }, [cart, vendorId, getEffectiveUnitPrice]);

  const checkoutItemCount = useMemo(
    () =>
      Object.values(cart[vendorId]?.products || {}).reduce(
        (sum, product) => sum + Number(product.quantity || 1),
        0
      ),
    [cart, vendorId]
  );

  const handleProceedToPayment = async () => {
    if (isLoading) return;

    if (
      existingStockpileCheckPending ||
      (existingStockpileForCheckout &&
        !isRepiling &&
        !deliverNowWarningAccepted)
    ) {
      return;
    }

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
    if (
      checkoutMode === "deliver" &&
      !isRepiling &&
      !isPickup &&
      !previewedOrder.deliveryFulfillmentId
    ) {
      toast.error("Please wait while we prepare your delivery quote.");
      return;
    }
    if (
      checkoutMode === "deliver" &&
      !isRepiling &&
      !isPickup &&
      !selectedCourierOptionId
    ) {
      toast.error("Please select a courier before continuing.");
      return;
    }
    const orderData = prepareOrderData();
    if (!orderData) return;

    try {
      // Ignore any preview/courier response that was already in flight. The
      // backend now locks the same quote, and this keeps stale UI work from
      // being applied while payment is processing.
      previewRequestIdRef.current += 1;
      setIsLoading(true);
      if (selectedPayment === "wallet") {
        void appHaptics.medium();
      }
      const processOrder = httpsCallable(functions, "processOrder");
      const { data } = await processOrder(orderData);
      if (selectedPayment === "wallet") {
        if (data?.success) {
          // Payment/order creation is authoritative. Wallet refresh and local
          // cart persistence are follow-up synchronisation and must never hold
          // the success transition on a slow iOS network.
          void refreshWalletInfo().catch((refreshError) => {
            console.warn("Wallet balance refresh will retry later:", refreshError);
          });
          void Promise.resolve(dispatch(clearCart(vendorId))).catch(
            (cartError) => {
              console.warn("Paid cart cleanup will retry from sync:", cartError);
            },
          );
          dispatch(exitStockpileMode());
          void appHaptics.success();
          toast.success("Paid with wallet balance! 🎉");
          navigate("/user-orders", {
            replace: true,
            state: {
              orderCreated: true,
              orderId: data?.orderId || null,
              paymentReference: data?.reference || null,
            },
          });
        } else {
          toast.error(data?.message || "Wallet payment failed.");
        }
        return; // stop here – no Paystack
      }

      /* Paystack flow (default). The backend/webhook remains authoritative;
       * the inline callback only tells us that the customer finished the
       * secure Paystack interaction. */
      const outcome = await resumePaystackTransaction({
        accessCode: data?.access_code,
      });
      if (outcome.status === "cancelled") return;

      // The webhook remains authoritative for stock and order creation. This
      // acknowledgement gives the backend a deterministic recovery signal if
      // Paystack completed in the app but its webhook is delayed or fails.
      void markOrderPaymentClientCompleted(outcome.reference).catch(
        (confirmationError) => {
          console.warn(
            "Payment completion acknowledgement will be reconciled server-side:",
            confirmationError,
          );
        },
      );

      // A completed Buy Now/checkout is the end of the current repile
      // session regardless of which payment rail was used. Wallet and
      // Pay-for-me already clear this state; keep Paystack consistent so a
      // successful Buy Now cannot leave the customer trapped in repile mode.
      dispatch(exitStockpileMode());
      void appHaptics.success();
      toast.success("Payment received. We’re confirming your order.");
      navigate("/user-orders", {
        replace: true,
        state: {
          paymentConfirmationPending: true,
          paymentReference: outcome.reference || null,
        },
      });
    } catch (err) {
      recordOperationalEvent("checkout_error",{screen:"checkout",code:err?.details?.code || err?.code || "checkout_failed"});
      void reportAppException(err,"checkout");
      console.error("Error in payment process:", err);
      appHaptics.error();

      const checkoutErrorCode =
        err?.details?.code || err?.data?.code || err?.code || null;
      if (
        checkoutErrorCode === "ORDER_PAYMENT_FINALIZATION_PENDING" ||
        checkoutErrorCode === "ORDER_PAYMENT_OUTCOME_UNKNOWN"
      ) {
        dispatch(exitStockpileMode());
        toast("Your payment is being confirmed. Please don’t pay again.");
        navigate("/user-orders", {
          replace: true,
          state: {
            paymentConfirmationPending: true,
            paymentReference:
              err?.details?.reference || err?.data?.reference || null,
          },
        });
      } else if (err?.details?.code === "INSUFFICIENT_FUNDS") {
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
      !["Delivery & Pickup", "Pickup"].includes(
        vendorsInfo[vendorId]?.deliveryMode
      )
    ) {
      toast.error("Sorry, this vendor doesn’t offer pick-up.");
      return;
    }
    if (selectedDeliveryMode === mode) return;
    deliveryMethodTransitionRef.current = true;
    setSelectedCourierOptionId("");
    setIsPickup(mode === "Pickup");
    setSelectedDeliveryMode(mode);
  };

  const courierPickerOptions = useMemo(
    () =>
      previewedOrder.deliveryOptions.map((option) => {
        const quotedAmount = Number(option.amount || 0);
        const priceLabel = previewedOrder.freeShipping
          ? "Free"
          : `₦${quotedAmount.toLocaleString()}`;
        const estimate = option.eta
          ? `Estimated delivery: ${option.eta}`
          : "Delivery estimate unavailable";
        return {
          value: option.id,
          label: `${option.provider || "Courier"} · ${priceLabel}`,
          detail: previewedOrder.freeShipping
            ? `${estimate} · Normally ₦${quotedAmount.toLocaleString()}`
            : estimate,
        };
      }),
    [previewedOrder.deliveryOptions, previewedOrder.freeShipping]
  );

  const handleCourierSelection = async (quoteOptionId) => {
    if (
      !quoteOptionId ||
      quoteOptionId === selectedCourierOptionId ||
      !previewedOrder.deliveryFulfillmentId ||
      isSelectingCourier ||
      isLoading
    ) {
      return;
    }
    const requestId = ++previewRequestIdRef.current;
    setIsSelectingCourier(true);
    setIsLoadingDeliveryFee(true);
    setIsLoadingTotal(true);
    try {
      const selectCourier = httpsCallable(
        functions,
        "selectNormalOrderDeliveryOptionV1"
      );
      const { data } = await selectCourier({
        deliveryFulfillmentId: previewedOrder.deliveryFulfillmentId,
        quoteOptionId,
      });
      if (requestId !== previewRequestIdRef.current) return;
      setSelectedCourierOptionId(data.selectedOption?.id || quoteOptionId);
      setPreviewedOrder((previous) => {
        const previousDelivery = Number(previous.deliveryCharge || 0);
        const nextDelivery = Number(data.deliveryCharge || 0);
        const currentTotal = Number(previous.total);
        return {
          ...previous,
          deliveryCharge: nextDelivery,
          providerDeliveryCharge: Number(
            data.providerQuotedAmount ?? nextDelivery
          ),
          deliveryOption: data.selectedOption || previous.deliveryOption,
          deliveryOptions: Array.isArray(data.deliveryOptions)
            ? data.deliveryOptions
            : previous.deliveryOptions,
          total: Number.isFinite(currentTotal)
            ? currentTotal - previousDelivery + nextDelivery
            : previous.total,
        };
      });
      void appHaptics.selection();
    } catch (error) {
      console.error("Unable to select courier:", error);
      toast.error(
        error?.message || "This courier could not be selected. Please retry."
      );
    } finally {
      if (requestId === previewRequestIdRef.current) {
        setIsLoadingDeliveryFee(false);
        setIsLoadingTotal(false);
      }
      setIsSelectingCourier(false);
    }
  };
  const handleShareLink = async () => {
    if (checkoutMode === "stockpile" && !selectedWeeks) {
      toast.error("Please select how many weeks you want to stockpile.");
      return;
    }
    if (
      checkoutMode === "deliver" &&
      !isRepiling &&
      !isPickup &&
      !previewedOrder.deliveryFulfillmentId
    ) {
      toast.error("Please wait while we prepare your delivery quote.");
      return;
    }
    if (
      checkoutMode === "deliver" &&
      !isRepiling &&
      !isPickup &&
      !selectedCourierOptionId
    ) {
      toast.error("Please select a courier before continuing.");
      return;
    }

    setIsLoadingLink(true);
    try {
      const orderData = prepareOrderData();
      if (!orderData) return;

      const { walletId: _walletId, ...payForMeOrderData } = orderData;
      const payload = {
        ...payForMeOrderData,
        userInfo: {
          ...payForMeOrderData.userInfo,
          paymentMethod: "pay for me",
        },
        paymentMethod: "pay for me",
        shareOnly: true,
      };
      const processOrder = httpsCallable(functions, "processOrder");
      const { data } = await processOrder(payload);
      // Clearing is immediate locally; the persistence queue retries in the
      // background without showing cart-sync implementation details.
      await dispatch(clearCart(vendorId));
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
  const mustChooseCourier =
    checkoutMode === "deliver" &&
    !isRepiling &&
    selectedDeliveryMode === "Delivery" &&
    !selectedCourierOptionId;

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

  const handleShowMapToast = () => {
    toast(
      " ⚠️ We will allow you to calculate an estimate for pickup and distance after the order has been placed."
    );
  };

  const handleStockpileClick = async () => {
    if (checkoutMode === "stockpile" || stockpileTabTransitionRef.current) {
      return;
    }

    stockpileTabTransitionRef.current = true;
    try {
      if (existingStockpileForCheckout) {
        void appHaptics.selection();
        setShowAlreadyStockpiledModal(true);
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
        setExistingStockpileForCheckout(true);
        void appHaptics.selection();
        setShowAlreadyStockpiledModal(true);
      } else if (!vendorsInfo[vendorId]?.stockpile?.enabled) {
        // A vendor turning off new stockpiles must not prevent customers from
        // repiling into a pile that already exists. Only show unavailable once
        // the active-pile query has confirmed that this customer has none.
        console.log("Vendor does not offer new stockpiles");
        setShowNoStockpileModal(true);
      } else {
        console.log("No stockpile found. Entering stockpile mode...");
        // Stockpiles are delivered later as one pile; do not carry a previous
        // Deliver Now pickup choice into either the preview or final order.
        setIsPickup(false);
        setCheckoutMode("stockpile");
        setSelectedWeeks(null);
        appHaptics.selection();
      }
    } catch (error) {
      console.error("Unable to check active stockpile:", error);
      toast.error("We couldn’t check your stockpile. Please try again.");
    } finally {
      stockpileTabTransitionRef.current = false;
    }
  };

  const handleDeliverClick = () => {
    if (checkoutMode === "deliver") return;
    setCheckoutMode("deliver");
    // Restore the vendor/default Deliver Now selection after leaving the
    // Stockpile tab. selectedDeliveryMode is intentionally retained while the
    // Stockpile tab is active so the user's earlier choice is not lost.
    setIsPickup(selectedDeliveryMode === "Pickup");
    appHaptics.selection();
  };

  const checkoutTabSwipeHandlers = useHorizontalTabSwipe({
    tabs: ["deliver", "stockpile"],
    activeTab: checkoutMode,
    enabled: !isRepiling,
    onChange: (nextMode) => {
      if (nextMode === "stockpile") {
        void handleStockpileClick();
      } else {
        handleDeliverClick();
      }
    },
  });

  const formatColorText = (color) => {
    if (!color) return "";
    return color.charAt(0).toUpperCase() + color.slice(1).toLowerCase();
  };

  const formatConditionText = (condition) => {
    if (!condition) return "";
    const clean = String(condition).replace(/:$/, "").trim();
    return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
  };

  const getActivePileTimeLeft = () => {
    if (!activePile.endDate) return "Active";
    const end = activePile.endDate.toDate
      ? activePile.endDate.toDate()
      : new Date(activePile.endDate);
    const days = Math.max(
      0,
      Math.ceil((end.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    );
    return days === 1 ? "1 day left" : `${days} days left`;
  };

  const handleCheckoutItemRemove = async (productKey, product) => {
    const syncPromise = dispatch(removeFromCart({ vendorId, productKey }));
    appHaptics.removeFromCart();
    toast(`Removed ${product?.name || "item"} from cart`, { icon: "ℹ️" });

    if (Object.keys(cart[vendorId]?.products || {}).length <= 1) {
      navigate("/latest-cart", { replace: true });
    }

    await syncPromise;
  };

  if (loading || existingStockpileCheckPending) {
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
    <div
      {...checkoutTabSwipeHandlers}
      className="new-checkout-page app-horizontal-tab-swipe"
    >
      <SEO
        title={`Checkout - My Thrift`}
        description={`Checkout your order on My Thrift`}
        url={`https://www.shopmythrift.store/newcheckout/`}
      />
      {isLoadingLink && <Link />}
      {isLoading && selectedPayment === "wallet" && (
        <WithdrawLoad message="Securing your order…" />
      )}

      <AppPageHeader title="Checkout" onBack={() => navigate(-1)} />
      <div className="checkout-tabs-wrap">
        {!isRepiling && (
          <div className="checkout-tabs">
            <button
              onClick={handleDeliverClick}
              className={checkoutMode === "deliver" ? "is-active" : ""}
            >
              Deliver Now
            </button>

            <div>
              <button
                onClick={handleStockpileClick}
                className={checkoutMode === "stockpile" ? "is-active" : ""}
              >
                Stockpile
              </button>

             
            </div>
          </div>
        )}
      </div>
      <div className="checkout-tab-swipe-surface">
      {checkoutMode === "deliver" ? (
        <div className="checkout-flow checkout-deliver-flow">
          <div className="checkout-section checkout-summary order-7">
            <h1 className="text-black font-semibold font-opensans text-base ">
              Order Summary
            </h1>

            <div className="border-t border-gray-300 my-2"></div>
            <div className="flex justify-between">
              <label className="block mb-2 text-sm font-opensans ">
                Items ({checkoutItemCount})
              </label>
              <p className="text-base font-opensans text-black font-semibold">
                {isLoadingTotal
                  ? `₦${(
                      previewedOrder.subtotal ?? calcFallbackSubtotal
                    ).toLocaleString()}`
                  : `₦${(
                      previewedOrder.subtotal ?? calcFallbackSubtotal
                    ).toLocaleString()}`}
              </p>
            </div>

            {!isRepiling && (
              <div className="flex justify-between">
                <label className="block mb-2 text-sm font-opensans">
                  Buyer Protection fee
                  <img
                    src={CHECKOUT_ASSETS.info}
                    alt="More information about Buyer Protection"
                    className="checkout-summary-info"
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
                        {formatNaira(previewedOrder.serviceFee)}
                      </s>
                    ) : (
                      formatNaira(previewedOrder.serviceFee)
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
            <div className="flex justify-between">
                <span className="font-opensans text-sm">Delivery Fee</span>

                {isRepiling ? (
                  <span className="text-xs font-opensans text-orange-700 font-semibold">
                    At shipping
                  </span>
                ) : !selectedDeliveryMode ? (
                  <span className="text-xs font-opensans text-gray-500 font-semibold">
                    Select method
                  </span>
                ) : selectedDeliveryMode === "Pickup" ? (
                  <span className="text-base font-opensans text-black font-semibold">
                    ₦0
                  </span>
                ) : isLoadingDeliveryFee ? (
                  <RotatingLines
                    strokeColor="#f97316"
                    strokeWidth="3"
                    animationDuration="0.75"
                    width="20"
                    visible={true}
                  />
                ) : !selectedCourierOptionId ? (
                  <span className="text-xs font-opensans text-gray-500 font-semibold">
                    Select courier
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
                    ₦
                    {Number(
                      previewedOrder.providerDeliveryCharge || 0
                    ).toLocaleString()}
                  </s>
                ) : (
                  <span className="text-base font-opensans text-black font-semibold">
                    ₦{Number(previewedOrder.deliveryCharge).toLocaleString()}
                  </span>
                )}
              </div>

            {isRepiling && (
              <div className="flex items-center bg-green-50 p-3 rounded-lg mt-3">
                <PiStackSimpleFill className="text-green-600 text-3xl mr-3" />
                <div>
                  <p className="font-opensans text-xs text-green-700 font-semibold">
                    You won’t be charged a new Buyer Protection Fee when
                    adding these items to your active pile.
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="order-3">
            <div
              className="checkout-section checkout-delivery-info"
            >
              <div className="flex justify-between items-center">
                <h1 className="text-black font-semibold font-opensans text-base">
                  Delivery Information
                </h1>

                <img
                  src={CHECKOUT_ASSETS.edit}
                  alt=""
                  className={`checkout-edit-icon ${
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
                  Name
                </label>
                <p className="font-opensans text-black">
                  {userInfo.displayName}
                </p>
              </div>
              <div className="flex text-sm">
                <label className="block mb-2 mr-1 font-semibold font-opensans">
                  Phone Number
                </label>
                <p className="font-opensans text-black ">
                  {userInfo.phoneNumber}
                </p>
              </div>
              <div className="flex text-sm">
                <label className="block mb-2 font-semibold mr-1 font-opensans">
                  Email
                </label>
                <p className="font-opensans text-black">{userInfo.email}</p>
              </div>
              <div className="flex text-sm">
                <label className="block mb-2 mr-1 font-semibold font-opensans">
                  Delivery Address
                </label>
                <p className="font-opensans text-black ">{userInfo.address}</p>
              </div>
            </div>
          </div>

          <form className="checkout-section checkout-products order-1">
            {vendorId && cart[vendorId] && (
              <>
                <div className="flex justify-between">
                  <h1 className="text-black font-semibold font-opensans text-base">
                    Review Item(s)
                  </h1>
                  <h3 className="text-xs font-opensans">
                    <span className="text-gray-600 mr-1 font-normal text-xs font-opensans">
                      From
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
                            className="checkout-product-image"
                            onError={(e) => {
                              e.target.src = "https://via.placeholder.com/150";
                            }}
                          />
                          <div>
                            <h4 className="text-sm font-opensans">
                              {product.name}
                            </h4>
                            <p className="font-opensans text-md mt-1 text-black font-bold">
                              ₦
                              {getEffectiveUnitPrice(
                                product,
                                productKey
                              ).toLocaleString()}
                            </p>
                            <div className="checkout-product-attributes">
                              {product.isFashion && (
                                <>
                                  {!isVariantSizeHidden(product) && (
                                    <span>
                                      {product.selectedSize || "N/A"}
                                    </span>
                                  )}
                                  <span>
                                    {formatColorText(product.selectedColor)}
                                  </span>
                                </>
                              )}
                              {product.condition && (
                                <span>
                                  {formatConditionText(product.condition)}
                                </span>
                              )}
                            </div>
                            <p className="checkout-product-quantity">
                              Qty: {product.quantity}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="checkout-remove-item"
                          aria-label={`Remove ${product.name} from cart`}
                          onClick={() =>
                            handleCheckoutItemRemove(productKey, product)
                          }
                        >
                          <img src={CHECKOUT_ASSETS.trash} alt="" />
                        </button>
                      </div>
                    )
                  )}
                </div>
              </>
            )}
          </form>
          {isRepiling && (
            <section className="checkout-section checkout-current-pile order-2">
              <div className="checkout-section-heading">
                <div className="checkout-pile-heading-copy">
                  <h2>Current Pile</h2>
                  <div className="checkout-pile-meta">
                    <span>
                      {vendorsInfo[vendorId]?.shopName || "This vendor"}
                    </span>
                    <span>{getActivePileTimeLeft()}</span>
                  </div>
                </div>
              </div>
              {activePile.loading ? (
                <div className="checkout-pile-loading">
                  <Skeleton count={1} height={72} />
                </div>
              ) : activePile.items.length ? (
                <>
                  <div className="checkout-pile-strip">
                    {activePile.items.map((item) => (
                      <img
                        key={item.key}
                        src={item.imageUrl || "https://via.placeholder.com/150"}
                        alt={item.name}
                        onError={(event) => {
                          event.currentTarget.src =
                            "https://via.placeholder.com/150";
                        }}
                      />
                    ))}
                  </div>
                  <div className="checkout-pile-total">
                    <span>
                      {activePile.itemCount}{" "}
                      {activePile.itemCount === 1 ? "item" : "items"}
                    </span>
                    <strong>
                      Item(s) Total: ₦{activePile.subtotal.toLocaleString()}
                    </strong>
                  </div>
                </>
              ) : (
                <p className="checkout-muted">Your active pile is loading.</p>
              )}
            </section>
          )}
          {!isRepiling && (
            <div className="checkout-section checkout-delivery-method order-4">
              {vendorId && vendorsInfo[vendorId] && (
                <>
                  <h2 className="text-base font-opensans font-semibold mb-3">
                    Delivery Method
                  </h2>
                  <div className="border-t border-gray-200 mb-2" />
                  <div className="px-2">
                    <div
                      role="radio"
                      aria-checked={selectedDeliveryMode === "Pickup"}
                      tabIndex={0}
                      onClick={() => handleDeliveryModeSelection("Pickup")}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleDeliveryModeSelection("Pickup");
                        }
                      }}
                      className={`checkout-choice checkout-pickup-choice w-full ${
                        selectedDeliveryMode === "Pickup" ? "is-selected" : ""
                      }`}
                    >
                      <div className="checkout-pickup-copy">
                        <p className="checkout-pickup-title">Pick-up location</p>
                        <p className="checkout-pickup-address">
                          {supportsPickup
                            ? "Exact address available after you place your pickup order"
                            : "Vendor doesn’t offer pickup"}
                        </p>
                      </div>
                      <div className="checkout-pickup-actions">
                        <CheckoutRadio
                          selected={selectedDeliveryMode === "Pickup"}
                        />
                      </div>
                    </div>

                    <hr className="border-t border-gray-200 my-2" />

                    {/* Door delivery */}
                    <button
                      type="button"
                      onClick={() => handleDeliveryModeSelection("Delivery")}
                      className={`checkout-choice w-full flex items-start justify-between ${
                        selectedDeliveryMode === "Delivery"
                          ? "is-selected"
                          : ""
                      }`}
                    >
                      <div className="flex flex-col items-start">
                        <p className="text-base font-opensans font-semibold text-black">
                          Home delivery
                        </p>

                        <p>Delivered straight to your doorstep</p>
                      </div>

                      <CheckoutRadio
                        selected={selectedDeliveryMode === "Delivery"}
                      />
                    </button>

                    {selectedDeliveryMode === "Delivery" &&
                      (isSelectingCourier || isLoadingDeliveryFee) && (
                        <div
                          className="checkout-courier-loading"
                          role="status"
                          aria-live="polite"
                        >
                          <div
                            className="checkout-courier-loading-visual"
                            aria-hidden="true"
                          >
                            <MdDeliveryDining />
                            <span className="checkout-courier-loading-road" />
                          </div>
                          <div className="checkout-courier-loading-copy">
                            <strong>
                              {isSelectingCourier
                                ? "Finalising delivery…"
                                : courierPickerOptions.length > 0
                                  ? "Updating courier options…"
                                  : "Finding available couriers"}
                            </strong>
                            <span>
                              {isSelectingCourier
                                ? "Confirming your courier and updating the total…"
                                : "Checking live prices and delivery times…"}
                            </span>
                          </div>
                          <span
                            className="checkout-courier-loading-spinner"
                            aria-hidden="true"
                          />
                        </div>
                      )}

                    {selectedDeliveryMode === "Delivery" &&
                      courierPickerOptions.length > 0 && (
                        <div
                          className="checkout-courier-picker"
                          aria-busy={isSelectingCourier || isLoadingDeliveryFee}
                        >
                          <span className="checkout-courier-picker-label">
                            Courier
                          </span>
                          <NativePickerField
                            id="checkout-courier"
                            title="Select courier"
                            value={selectedCourierOptionId}
                            options={courierPickerOptions}
                            onChange={handleCourierSelection}
                            placeholder="Select courier"
                            disabled={
                              isSelectingCourier || isLoadingDeliveryFee
                            }
                            className="checkout-courier-picker-control"
                            ariaLabel="Select a courier and delivery price"
                          />
                        </div>
                      )}
                  </div>
                  {/* Pick-up */}
                </>
              )}
            </div>
          )}
          {/* ───────────────── Payment Method ───────────────── */}
          <div className="checkout-section checkout-payment-method order-5">
            <h2 className="text-base font-opensans font-semibold mb-3">
              Payment method
            </h2>
            <div className="border-t border-gray-200 my-2" />

            {[
              {
                id: "paystack",
                label: "Paystack",
                icon: <img src={CHECKOUT_ASSETS.paystack} alt="" />,
              },
              {
                id: "wallet",
                label: walletSetup
                  ? `My Wallet (₦${walletBal.toLocaleString()})`
                  : "My Wallet",
                icon: <img src={CHECKOUT_ASSETS.wallet} alt="" />,
              },
              {
                id: "share",
                label: "Pay for me",
                description: "Send a payment link to someone",
                icon: <img src={CHECKOUT_ASSETS.payForMe} alt="" />,
              },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedPayment(opt.id)}
                className={`w-full flex items-center justify-between ${
                  selectedPayment === opt.id ? "is-selected" : ""
                }`}
              >
                <span className="flex items-center space-x-3">
                  {opt.icon}
                  <span className="checkout-payment-copy">
                    <span>{opt.label}</span>
                    {opt.description && <small>{opt.description}</small>}
                  </span>
                  {opt.id === "wallet" &&
                    !walletSetup && (
                      <span
                        className="checkout-wallet-setup"
                        onClick={() => navigate("/your-wallet")}
                      >
                        Setup Wallet
                      </span>
                    )}
                </span>

                {/* radio */}
                <CheckoutRadio
                  selected={selectedPayment === opt.id}
                  payment
                />
              </button>
            ))}
          </div>
          {note.trim() && (
            <section className="checkout-section checkout-note order-6">
              <h2>Your note</h2>
              <p>{note}</p>
            </section>
          )}
          <div className="order-8">
            <div className="checkout-section checkout-safe-card">
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
        <div className="checkout-flow checkout-stockpile-flow">
          <section className="checkout-section checkout-stockpile-intro-section order-1">
            <div className="checkout-stockpile-intro">
              <Clock3 />
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
          </section>

          <div className="checkout-section checkout-summary order-7">
            <h1 className="text-black font-semibold font-opensans text-base ">
              Order Summary
            </h1>

            <div className="border-t border-gray-300 my-2"></div>
            <div className="flex justify-between">
              <label className="block mb-2 text-sm font-opensans ">
                Items ({checkoutItemCount})
              </label>
              <p className="text-base font-opensans text-black font-semibold">
                ₦
                {(
                  previewedOrder.subtotal ?? calcFallbackSubtotal
                ).toLocaleString()}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <label className=" flex items-center text-sm mb-2 font-opensans">
                Buyer Protection fee
                <img
                  src={CHECKOUT_ASSETS.info}
                  alt="More information about Buyer Protection"
                  className="checkout-summary-info"
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
                  formatNaira(previewedOrder.serviceFee)
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
                  No delivery charge today. Choose and pay for delivery when
                  you end your pile.
                </p>
              </div>
            </div>

          </div>
          <div className="checkout-section checkout-timeline order-3">
            {vendorId && vendorsInfo[vendorId] && (
              <>
                <div className="flex items-center">
                    <h1 className="text-black font-semibold font-opensans text-base">
                    Set Timeline
                  </h1>
                  {/* <CiCircleInfo
                  className="text-customOrange ml-2 cursor-pointer text-xl"
                  onClick={() => setShowDeliveryInfoModal(true)}
                /> */}
                </div>

                <div className="border-t border-gray-300 my-3"></div>

                <div className="mt-2">
                  <div className="checkout-timeline-note">
                    <Clock3 />
                    <span>
                      {vendorsInfo[vendorId]?.shopName || "This vendor"} allows
                      you to stockpile up to{" "}
                      <strong>
                        {vendorsInfo[vendorId]?.stockpile?.durationInWeeks || 2}
                        {" "}weeks
                      </strong>
                    </span>
                  </div>
                  {(() => {
                    const duration =
                      vendorsInfo[vendorId]?.stockpile?.durationInWeeks || 2;
                    const weekOptions = Array.from(
                      { length: duration - 1 },
                      (_, i) => i + 2
                    );

                    return (
                      <select
                        className={`checkout-stockpile-native-select ${
                          selectedWeeks ? "is-selected" : ""
                        }`}
                        value={selectedWeeks ?? ""}
                        aria-label="Select stockpile timeline"
                        onChange={(event) => {
                          const value = event.target.value;
                          appHaptics.selection();
                          setSelectedWeeks(value ? Number(value) : null);
                        }}
                      >
                        <option value="" disabled>
                          Select timeline
                        </option>
                        {weekOptions.map((week) => (
                          <option value={week} key={week}>
                            {week} weeks
                          </option>
                        ))}
                      </select>
                    );
                  })()}
                </div>
              </>
            )}
          </div>

          <form className="checkout-section checkout-products order-2">
            {vendorId && cart[vendorId] && (
              <>
                <div className="flex justify-between">
                  <h1 className="text-black font-medium mr-1 font-opensans text-base">
                    Review Item(s)
                  </h1>

                  <h3 className="text-xs font-opensans ">
                    <span className="text-gray-600 text-xs mr-1 font-opensans">
                      From
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
                            className="checkout-product-image"
                            onError={(e) => {
                              e.target.src = "https://via.placeholder.com/150";
                            }}
                          />
                          <div>
                            <h4 className="text-sm font-opensans">
                              {product.name}
                            </h4>
                            <p className="font-opensans text-md mt-1 text-black font-bold">
                              ₦
                              {getEffectiveUnitPrice(
                                product,
                                productKey
                              ).toLocaleString()}
                            </p>
                            <div className="checkout-product-attributes">
                              {product.isFashion && (
                                <>
                                  {!isVariantSizeHidden(product) && (
                                    <span>
                                      {product.selectedSize || "N/A"}
                                    </span>
                                  )}
                                  <span>
                                    {formatColorText(product.selectedColor)}
                                  </span>
                                </>
                              )}
                              {product.condition && (
                                <span>
                                  {formatConditionText(product.condition)}
                                </span>
                              )}
                            </div>
                            <p className="checkout-product-quantity">
                              Qty: {product.quantity}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="checkout-remove-item"
                          aria-label={`Remove ${product.name} from cart`}
                          onClick={() =>
                            handleCheckoutItemRemove(productKey, product)
                          }
                        >
                          <img src={CHECKOUT_ASSETS.trash} alt="" />
                        </button>
                      </div>
                    )
                  )}
                </div>
              </>
            )}
          </form>

          <div className="order-4">
            <div className="checkout-section checkout-delivery-info">
              <div className="flex justify-between items-center">
                <h1 className="text-black font-semibold font-opensans text-base">
                  Delivery Information
                </h1>
                <img
                  src={CHECKOUT_ASSETS.edit}
                  alt=""
                  className="checkout-edit-icon cursor-pointer"
                  onClick={() => setShowEditModal(true)}
                />
              </div>

              <div className="border-t border-gray-300 my-2"></div>

              <div className="flex text-sm">
                <label className="block mb-2 mr-1 font-semibold font-opensans">
                  Name
                </label>
                <p className="font-opensans text-black">
                  {userInfo.displayName}
                </p>
              </div>
              <div className="flex text-sm">
                <label className="block mb-2 mr-1 font-semibold font-opensans">
                  Phone Number
                </label>
                <p className="font-opensans text-black ">
                  {userInfo.phoneNumber}
                </p>
              </div>
              <div className="flex text-sm">
                <label className="block mb-2 font-semibold mr-1 font-opensans">
                  Email
                </label>
                <p className="font-opensans text-black">{userInfo.email}</p>
              </div>
              <div className="flex text-sm">
                <label className="block mb-2 mr-1 font-semibold font-opensans">
                  Delivery Address
                </label>
                <p className="font-opensans text-black ">{userInfo.address}</p>
              </div>
              <div className="bg-customCream flex items-center py-1 mt-4 animate-pulse px-2 text-left rounded-md">
                <CiWarning className="text-orange-600 text-4xl mr-3" />
                <p className="text-xs font-ubuntu font-medium text-red-600">
                  You can update these details and choose the final delivery
                  address when you close the stockpile and request delivery.
                </p>
              </div>
            </div>
          </div>
          {/* ───────────────── Payment Method ───────────────── */}
          <div className="checkout-section checkout-payment-method order-5">
            <h2 className="text-base font-opensans font-semibold mb-3">
              Payment method
            </h2>
            <div className="border-t border-gray-200 my-2" />

            {[
              {
                id: "paystack",
                label: "Paystack",
                icon: <img src={CHECKOUT_ASSETS.paystack} alt="" />,
              },
              {
                id: "wallet",
                label: walletSetup
                  ? `My Wallet (₦${walletBal.toLocaleString()})`
                  : "My Wallet",
                icon: <img src={CHECKOUT_ASSETS.wallet} alt="" />,
              },
              {
                id: "share",
                label: "Pay for me",
                description: "Send a payment link to someone",
                icon: <img src={CHECKOUT_ASSETS.payForMe} alt="" />,
              },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedPayment(opt.id)}
                className={`w-full flex items-center justify-between ${
                  selectedPayment === opt.id ? "is-selected" : ""
                }`}
              >
                <span className="flex items-center space-x-3">
                  {opt.icon}
                  <span className="checkout-payment-copy">
                    <span>{opt.label}</span>
                    {opt.description && <small>{opt.description}</small>}
                  </span>
                  {opt.id === "wallet" &&
                    !walletSetup && (
                      <span
                        className="checkout-wallet-setup"
                        onClick={() => navigate("/your-wallet")}
                      >
                        Setup Wallet
                      </span>
                    )}
                </span>

                {/* radio */}
                <CheckoutRadio
                  selected={selectedPayment === opt.id}
                  payment
                />
              </button>
            ))}
          </div>
          {note.trim() && (
            <section className="checkout-section checkout-note order-6">
              <h2>Your note</h2>
              <p>{note}</p>
            </section>
          )}
          <div className="order-8">
            <div className="checkout-section checkout-safe-card">
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
      </div>
      <EditDeliveryModal
        isOpen={showEditModal}
        userInfo={userInfo}
        setUserInfo={setUserInfo}
        onClose={closeEditModal}
      />
      <NoStockpileModal
        isOpen={showNoStockpileModal}
        onClose={closeNoStockpileModal}
      />
      <AlreadyStockpiledModal
        isOpen={showAlreadyStockpiledModal}
        onClose={closeAlreadyStockpiledModal}
        vendorId={vendorId}
        vendorName={vendorsInfo[vendorId]?.shopName}
        dispatch={dispatch}
      />
      <ExistingStockpileDeliveryModal
        isOpen={
          !existingStockpileCheckPending &&
          existingStockpileForCheckout &&
          !isRepiling &&
          !deliverNowWarningAccepted
        }
        vendorName={vendorsInfo[vendorId]?.shopName}
        onContinue={() => {
          void appHaptics.selection();
          setDeliverNowWarningAccepted(true);
        }}
        onBack={() => {
          void appHaptics.selection();
          navigate(-1);
        }}
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
        onClose={closeShopSafelyModal}
      />
      {/* <DeliveryInfoModal
        isOpen={showDeliveryInfoModal}
        onClose={() => setShowDeliveryInfoModal(false)}
      /> */}
      <BuyersFeeModal
        isOpen={showBuyersFee}
        onClose={closeBuyersFeeModal}
        isStockpile={checkoutMode === "stockpile"}
      />

      <div className="checkout-pay-bar" data-native-bottom-bar>
        <div className="checkout-pay-total">
          <span>Total to pay</span>
          <strong>
            {mustChooseDelivery
              ? "Select delivery"
              : isLoadingTotal || previewedOrder.total == null
              ? "Calculating…"
              : `₦${Number(previewedOrder.total).toLocaleString()}`}
          </strong>
        </div>
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
            isSelectingCourier ||
            isLoadingDeliveryFee ||
            isLoadingTotal ||
            mustChooseDelivery ||
            mustChooseCourier ||
            isLoadingLink ||
            (checkoutMode === "stockpile" && !selectedWeeks)
          }
          className={`checkout-pay-button
    ${
      !selectedPayment ||
      isLoading ||
      isSelectingCourier ||
      isLoadingDeliveryFee ||
      isLoadingTotal ||
      isLoadingLink ||
      mustChooseDelivery ||
      mustChooseCourier ||
      (checkoutMode === "stockpile" && !selectedWeeks)
        ? "bg-gray-400 cursor-not-allowed text-white"
        : "bg-customOrange text-white"
    }`}
        >
          {isLoading || isLoadingLink ? (
            <RotatingLines strokeColor="#fff" strokeWidth="5" width="24" />
          ) : (
            "Pay"
          )}
        </button>
      </div>
    </div>
  );
};

export default Checkout;
