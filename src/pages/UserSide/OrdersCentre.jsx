import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { canUseBuyerContactEmail, CONTACT_SIGN_IN_MESSAGE } from "../../services/accountLookups";
import { GoChevronLeft, GoChevronRight } from "react-icons/go";
import { addToCart } from "../../redux/actions/action";
import { useNavigate, useLocation } from "react-router-dom";
import { deactivateQuickMode } from "../../redux/reducers/quickModeSlice";
import { db, auth } from "../../firebase.config";
import { getOwnedPickupDetails } from "../../services/pickupOrderAccess";
import PrivateDeliveryProof from "../../components/Orders/PrivateDeliveryProof";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  limit,
  documentId,
} from "firebase/firestore";
import { FcOnlineSupport } from "react-icons/fc";
import { TbBasketPlus, TbBasketX, TbBasketQuestion } from "react-icons/tb";
import { FaClipboardCheck } from "react-icons/fa";
import {
  MdCancel,
  MdClose,
  MdOutlineAddToPhotos,
  MdPendingActions,
} from "react-icons/md";
import { FaMoneyBillTransfer } from "react-icons/fa6";
import moment from "moment";
import { useTawk } from "../../components/Context/TawkProvider";
import { TbTruckDelivery } from "react-icons/tb";
import { enrichWithProductInfo } from "../../services/enrichWithProductInfo";
import {getOrderProductSnapshots} from "../../services/orderProductSnapshots";
import { isVariantSizeHidden } from "../../services/productVariantSelection";
import { FaTimes } from "react-icons/fa";
import { IoCopyOutline, IoTimeOutline } from "react-icons/io5";
import { MdOutlinePendingActions } from "react-icons/md";
// import { GoChevronLeft } from "react-icons/go";
import { useDispatch, useSelector } from "react-redux";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import { BsFillBoxSeamFill, BsFillFileEarmarkTextFill } from "react-icons/bs";
import Orderpic from "../../Images/orderpic.svg";
import ScrollToTop from "../../components/layout/ScrollToTop";
import AppPageHeader from "../../components/layout/AppPageHeader";
import OrderStepper from "../../components/Order/OrderStepper";
import SEO from "../../components/Helmet/SEO";
import toast from "react-hot-toast";
import { PiBasketFill } from "react-icons/pi";
import { useAuth } from "../../custom-hooks/useAuth";
import OrderPlacedModal from "../../components/OrderModal";
import {
  enterStockpileMode,
  exitStockpileMode,
} from "../../redux/reducers/stockpileSlice";

import { getOwnedOrderVendorSummaries } from "../../services/orderVendorSummaries";
import {
  EmailAuthProvider,
  linkWithCredential,
  fetchSignInMethodsForEmail,
  sendEmailVerification,
} from "firebase/auth";

import { clearCart } from "../../redux/actions/action";
import { RiShareForwardBoxLine } from "react-icons/ri";
import LinkAccountModal from "../../components/QuickMode/LinkAccountModal";
import AccountLinkBanner from "../../components/QuickMode/AccountLinkBanner";
import { appHaptics } from "../../services/haptics";
import { openExternalUrl } from "../../services/nativeLinks";
import { isNativeApp } from "../../services/platform";
import useNativePageRefresh from "../../custom-hooks/useNativePageRefresh";
import useHorizontalTabSwipe from "../../custom-hooks/useHorizontalTabSwipe";
import {
  displayOrderPatched,
  displayOrderReplaced,
  draftsProjectionReceived,
  ordersProjectionReceived,
  selectBuyerDisplayDrafts,
  selectBuyerDisplayOrders,
  selectBuyerDraftsRevision,
  selectBuyerOrdersRevision,
  selectBuyerProjectedDraftsRevision,
  selectBuyerProjectedOrdersRevision,
  selectRawBuyerDrafts,
  selectRawBuyerOrders,
} from "../../redux/reducers/buyerOrdersSlice";
import { refreshBuyerOrdersFromServer } from "../../services/realtime/userRealtimeSync";
import { firestoreValueToSerializable } from "../../services/realtime/serializeFirestore";
import StockpileDeliverySheet from "../../components/Order/StockpileDeliverySheet";
import DeliveryTrackingCard from "../../components/Order/DeliveryTrackingCard";
import CourierReviewSheet from "../../components/Order/CourierReviewSheet";
import { refreshDeliveryTracking } from "../../services/deliveryTracking";
import {
  LuBookOpen,
  LuCheckCircle,
  LuChevronRight,
  LuClock3,
  LuCopy,
  LuHelpCircle,
  LuMapPin,
  LuMessageCircle,
  LuPackage,
  LuPackageCheck,
  LuRefreshCw,
  LuSearch,
  LuStar,
  LuTruck,
  LuXCircle,
} from "react-icons/lu";
import "./order-history.css";

const ORDER_KNOWLEDGE_BASE_URL = "";
const PRODUCT_QUERY_BATCH_SIZE = 30;
const PICKUP_ACTIVE_STATUSES = new Set([
  "In Progress",
  "Shipped",
  "Ready for Pickup",
  "Ready for Pick-up",
]);

const toOrderDate = (value) => {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatOrderDate = (value) => {
  const date = toOrderDate(value);
  return date ? moment(date).format("DD/MM/YYYY, HH:mm") : "Date unavailable";
};

const formatCompletionDuration = (startedAt, completedAt) => {
  const started = toOrderDate(startedAt);
  const completed = toOrderDate(completedAt);
  if (!started || !completed || completed <= started) return null;

  const totalMinutes = Math.max(
    1,
    Math.round((completed.getTime() - started.getTime()) / 60000),
  );
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days) {
    return `${days} day${days === 1 ? "" : "s"}${
      hours ? ` ${hours} hr${hours === 1 ? "" : "s"}` : ""
    }`;
  }
  if (hours) {
    return `${hours} hr${hours === 1 ? "" : "s"}${
      minutes ? ` ${minutes} min` : ""
    }`;
  }
  return `${minutes} min`;
};

const getOrderTime = (value) => toOrderDate(value)?.getTime() || 0;

const chunkValues = (values, size) => {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
};

const getOrderProgress = (order) =>
  order?.isStockpile
    ? order.firstOrderStatus || order.progressStatus
    : order?.progressStatus;

const getOrderDetailHistoryKey = (order) => {
  if (!order) return null;
  if (order.isStockpile && order.stockpileDocId) {
    return `stockpile:${order.stockpileDocId}`;
  }
  if (order._isDraft && order.id) return `draft:${order.id}`;
  return order.id ? `order:${order.id}` : null;
};

const orderContainsOrderId = (order, orderId) => {
  const target = String(orderId || "").trim();
  if (!target) return false;
  if (String(order?.id || "") === target) return true;
  if (Array.isArray(order?.orderIds) && order.orderIds.some((id) => String(id) === target)) {
    return true;
  }
  return Array.isArray(order?._relatedOrders) &&
    order._relatedOrders.some((related) => String(related?.id || "") === target);
};

const isOrderReviewable = (order) => {
  if (!order || order._isDraft) return false;
  if (!order.isStockpile) {
    return order.progressStatus === "Delivered";
  }
  const relatedOrders = order._relatedOrders || [];
  const fulfilledOrders = relatedOrders.filter(
    (item) => item.progressStatus !== "Declined"
  );
  return (
    fulfilledOrders.length > 0 &&
    fulfilledOrders.every((item) => item.progressStatus === "Delivered")
  );
};

const getOrderIdentifier = (order) =>
  order?.isStockpile && order?.stockpileDocId
    ? order.stockpileDocId
    : order?.id || "Unavailable";

const getOrderIdentifierLabel = (order) =>
  order?.isStockpile ? "Stockpile" : "Order";

const compactOrderIdentifier = (value) => {
  const identifier = String(value || "");
  if (identifier.length <= 14) return identifier;
  return `${identifier.slice(0, 7)}…${identifier.slice(-4)}`;
};

const getVisibleOrderIdentifier = (order) => {
  if (order?._isDraft) return "---";
  return compactOrderIdentifier(getOrderIdentifier(order));
};

const getVisibleStockpileIdentifier = compactOrderIdentifier;

const canUsePickupDetails = (order) =>
  Boolean(
    order?.isPickup &&
      order?.pickupCode &&
      PICKUP_ACTIVE_STATUSES.has(getOrderProgress(order))
  );

const isGroupedStockpile = (order) =>
  Boolean(order?.isStockpile && Array.isArray(order?._relatedOrders));

const getStockpileStatusView = (order) => {
  const lifecycleStatus = String(order?.stockpileStatus || "")
    .trim()
    .toLowerCase();
  const allOrdersDeclined = Boolean(
    order?._relatedOrders?.length &&
      order._relatedOrders.every(
        (entry) =>
          String(entry?.vendorStatus || "").toLowerCase() === "declined" ||
          entry?.progressStatus === "Declined",
      ),
  );

  if (allOrdersDeclined && order?.isActive === false) {
    return {label: "Closed", color: "#6b7280"};
  }

  const statusViews = {
    active: {label: "Active stockpile", color: "#f05a2a"},
    awaiting_delivery_request: {label: "Delivery required", color: "#d97706"},
    closing: {label: "Preparing delivery", color: "#d97706"},
    preparing_quote: {label: "Preparing delivery", color: "#d97706"},
    quote_retry: {label: "Delivery needs attention", color: "#dc2626"},
    awaiting_delivery_payment: {label: "Awaiting delivery payment", color: "#d97706"},
    payment_processing: {label: "Processing delivery payment", color: "#d97706"},
    booking: {label: "Booking courier", color: "#2563eb"},
    booking_retry: {label: "Booking courier", color: "#2563eb"},
    booking_outcome_unknown: {label: "Confirming courier", color: "#2563eb"},
    booked: {label: "Courier assigned", color: "#2563eb"},
    courier_assigned: {label: "Courier assigned", color: "#2563eb"},
    ready_for_collection: {label: "Courier assigned", color: "#2563eb"},
    in_transit: {label: "In transit", color: "#2563eb"},
    completed: {label: "Delivered", color: "#16a34a"},
    delivered: {label: "Delivered", color: "#16a34a"},
    cancelled: {label: "Closed", color: "#6b7280"},
  };

  return statusViews[lifecycleStatus] ||
    (order?.isActive === true
      ? statusViews.active
      : order?.isActive === false
        ? {label: "Preparing delivery", color: "#d97706"}
        : {label: "Status unavailable", color: "#6b7280"});
};

const getOrderStatusView = (order) => {
  if (order?._isDraft) {
    return { label: "Awaiting payment", color: "#d97706" };
  }

  // A grouped stockpile owns its own lifecycle. The status of its newest (or
  // first) order must only appear inside that order's row, never as the pile's
  // overall status.
  if (isGroupedStockpile(order)) {
    return getStockpileStatusView(order);
  }

  const progress = getOrderProgress(order);
  const vendorStatus = String(order?.vendorStatus || "").toLowerCase();
  if (progress === "Declined" || vendorStatus === "declined") {
    return { label: "Declined", color: "#dc2626" };
  }
  if (progress === "Delivered") {
    return {
      label: order?.isPickup ? "Collected" : "Delivered",
      color: "#16a34a",
    };
  }
  if (progress === "Shipped") {
    return {
      label: order?.isPickup ? "Ready for pick-up" : "Shipped",
      color: "#2563eb",
    };
  }
  if (order?.isStockpile && vendorStatus === "accepted") {
    return { label: "Accepted", color: "#16a34a" };
  }
  if (progress === "In Progress") {
    return {
      label: order?.isStockpile ? "Accepted" : "Processing",
      color: "#16a34a",
    };
  }
  if (progress === "Pending") {
    return { label: "Pending", color: "#d97706" };
  }
  return {
    label: progress || "Status unavailable",
    color: "#6b7280",
  };
};

const getOrderTotal = (order) =>
  Number(
    order?._isDraft
      ? order.amount || 0
      : order?.isStockpile
      ? order.combinedTotal ?? order.total ?? 0
      : order?.total || 0
  );

const getStockpileDaysLeft = (order) => {
  const endDate = toOrderDate(order?.endDate);
  if (!endDate || order?.isActive === false) return null;
  return Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / 86400000));
};

const OrderStatus = ({ order }) => {
  const status = getOrderStatusView(order);
  return (
    <span className="order-status" style={{ "--status-color": status.color }}>
      <span className="order-status-dot" aria-hidden="true" />
      {status.label}
    </span>
  );
};

const PickupCode = ({ code }) => (
  <div className="pickup-code-block" aria-label={`Pickup code ${code}`}>
    {String(code || "")
      .split("")
      .map((digit, index) => (
        <span key={`${digit}-${index}`}>{digit}</span>
      ))}
  </div>
);

const SkeletonLine = ({ className = "" }) => (
  <span className={`orders-skeleton-block ${className}`} aria-hidden="true" />
);

const OrderCardsSkeleton = () => (
  <section
    className="orders-content orders-card-skeletons"
    aria-label="Loading orders"
    aria-busy="true"
  >
    {[0, 1, 2].map((card) => (
      <article className="order-history-card order-card-skeleton" key={card}>
        <div className="order-card-top">
          <div className="order-card-title-wrap">
            <SkeletonLine className="is-order-title" />
            <SkeletonLine className="is-order-meta" />
          </div>
          <SkeletonLine className="is-order-status" />
        </div>
        <div className="order-card-products">
          {[0, 1, 2].map((item) => (
            <SkeletonLine className="is-product-image" key={item} />
          ))}
        </div>
        <div className="order-card-skeleton-summary">
          <SkeletonLine className="is-summary-short" />
          <SkeletonLine className="is-summary-total" />
        </div>
      </article>
    ))}
  </section>
);

const OrderDetailsSkeleton = () => (
  <div
    className="order-details-content order-details-skeleton"
    aria-label="Loading order details"
    aria-busy="true"
  >
    <section className="order-detail-section">
      <div className="order-detail-skeleton-head">
        <div>
          <SkeletonLine className="is-detail-title" />
          <SkeletonLine className="is-detail-meta" />
        </div>
        <SkeletonLine className="is-order-status" />
      </div>
      {[0, 1].map((item) => (
        <div className="order-detail-skeleton-product" key={item}>
          <SkeletonLine className="is-detail-image" />
          <div>
            <SkeletonLine className="is-detail-product-name" />
            <SkeletonLine className="is-detail-product-line" />
            <SkeletonLine className="is-detail-product-short" />
          </div>
        </div>
      ))}
    </section>
    {[0, 1, 2].map((section) => (
      <section className="order-detail-section" key={section}>
        <SkeletonLine className="is-section-title" />
        {[0, 1, 2].map((row) => (
          <div className="order-detail-skeleton-row" key={row}>
            <SkeletonLine className="is-row-label" />
            <SkeletonLine className="is-row-value" />
          </div>
        ))}
      </section>
    ))}
  </div>
);

const OrderTimeline = ({ order }) => {
  const progress = getOrderProgress(order);
  const isDeclined = progress === "Declined";
  const isDraft = Boolean(order?._isDraft);
  const transportLabel = order?.isPickup ? "Ready for pick-up" : "Shipped";
  const handover = order?.vendorHandover;
  const hasVendorHandover = Boolean(handover?.confirmedAt);
  const courierName =
    handover?.courier || order?.deliveryProvider || "the courier";

  const steps = isDeclined
    ? [
        {
          label: "Pending",
          description: "Order placed and sent to the vendor",
          icon: LuClock3,
          date: order?.createdAt,
        },
        {
          label: "Declined",
          description: order?.declineReason || "The vendor declined this order",
          icon: LuXCircle,
        },
      ]
    : [
        {
          label: isDraft ? "Awaiting payment" : "Pending",
          description: isDraft
            ? "Payment is pending for this order"
            : "Order placed and waiting for vendor review",
          icon: LuClock3,
          date: order?.createdAt,
        },
        {
          label: order?.isPickup ? "Processing" : "Accepted",
          description: order?.isPickup
            ? "The vendor is preparing your order for pick-up"
            : "Vendor accepted the order",
          icon: LuCheckCircle,
        },
        ...(order?.isStockpile
          ? [
              {
                label: "Piling",
                description: "Your stockpile is active",
                icon: LuPackage,
              },
            ]
          : []),
        ...(!order?.isPickup && hasVendorHandover
          ? [
              {
                label: "Handed to courier",
                description: `The vendor handed your parcel to ${courierName}. We’re waiting for the courier’s next update.`,
                icon: LuPackageCheck,
                date: handover.confirmedAt,
              },
            ]
          : []),
        {
          label: transportLabel,
          description: order?.isPickup
            ? "Your order is ready at the pick-up location"
            : "Your order is on the way",
          icon: order?.isPickup ? LuPackage : LuTruck,
          date: order?.shippedAt,
        },
        {
          label: order?.isPickup ? "Collected" : "Delivered",
          description: order?.isPickup
            ? "Order collected from the pick-up location"
            : "Order completed",
          icon: LuCheckCircle,
          date: order?.deliveredAt,
        },
      ];

  let currentIndex = 0;
  if (isDeclined) currentIndex = 1;
  else if (progress === "Delivered") currentIndex = steps.length - 1;
  else if (progress === "Shipped") currentIndex = steps.length - 2;
  else if (hasVendorHandover) {
    currentIndex = steps.findIndex((step) => step.label === "Handed to courier");
  } else if (progress === "In Progress") {
    currentIndex = order?.isStockpile ? 2 : 1;
  }

  return (
    <div className="order-timeline">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const complete = index < currentIndex;
        const current = index === currentIndex;
        return (
          <div
            key={step.label}
            className={`order-timeline-step ${complete ? "is-complete" : ""} ${
              current ? "is-current" : ""
            }`}
          >
            <span className="order-timeline-icon" aria-hidden="true">
              <Icon size={18} />
            </span>
            <div className="order-timeline-copy">
              <div className="order-timeline-heading">
                <strong>{step.label}</strong>
                {step.date && <time>{formatOrderDate(step.date)}</time>}
              </div>
              {step.description && <p>{step.description}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const OrderHelpSheet = ({ onClose, onChat, onKnowledgeBase }) => (
  <div className="orders-help-overlay" onClick={onClose}>
    <section
      className="orders-help-sheet"
      aria-modal="true"
      role="dialog"
      aria-labelledby="order-help-title"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="orders-help-handle" aria-hidden="true" />
      <h2 id="order-help-title">How can we help?</h2>
      <button className="orders-help-option" type="button" onClick={onKnowledgeBase}>
        <LuBookOpen aria-hidden="true" />
        Order knowledge base
      </button>
      <button className="orders-help-option" type="button" onClick={onChat}>
        <LuMessageCircle aria-hidden="true" />
        Talk to support
      </button>
    </section>
  </div>
);
const Countdown = ({ expiresAtMs }) => {
  const [text, setText] = useState("");

  useEffect(() => {
    const update = () => {
      const diff = expiresAtMs - Date.now();
      if (diff <= 0) {
        setText("Expired");
      } else {
        const mins = String(Math.floor(diff / 60000)).padStart(2, "0");
        const secs = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
        setText(`${mins}:${secs}`);
      }
    };

    update(); // initialize immediately
    const iv = setInterval(update, 500);
    return () => clearInterval(iv);
  }, [expiresAtMs]);

  return <>{text}</>;
};
const LinkShareModal = ({
  isOpen,
  shareUrl,
  countdown,
  expiresAt,
  onClose,
}) => {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-4 w-[90%] max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center  space-x-2 mb-4">
          <div className="w-7 h-7 bg-rose-100 flex justify-center items-center rounded-full">
            <RiShareForwardBoxLine className="text-customRichBrown" />
          </div>
          <h2 className="font-opensans text-base font-semibold">
            Link is ready to share!
          </h2>

          <MdClose className="-top-1 left-10 relative" onClick={onClose} />
        </div>

        {expiresAt && (
          <p className="text-sm font-opensans mb-2 text-gray-900">
            Expires in{" "}
            <span className="text-customOrange font-bold">
              <Countdown expiresAtMs={expiresAt.getTime()} />
            </span>
          </p>
        )}

        <p className="text-xs mb-4 font-opensans text-gray-900">
          We’re holding this order for you! As soon as we receive your payment,
          we’ll send you a confirmation email and the vendor will start
          processing it. Please note that this order hasn’t been finalized yet.
        </p>

        <div className="flex items-center border border-customRichBrown rounded-md mt-8 px-3 py-2">
          <p className="truncate w-full font-opensans text-sm">{shareUrl}</p>
          <IoCopyOutline
            className="ml-2 text-lg text-gray-600 cursor-pointer hover:text-gray-800"
            onClick={() => {
              void navigator.clipboard
                .writeText(shareUrl)
                .then(() => {
                  appHaptics.success();
                  toast.success("Copied!");
                })
                .catch(() => {
                  appHaptics.error();
                  toast.error("Could not copy. Please try again.");
                });
            }}
            title="Copy link"
          />
        </div>
      </div>
    </div>
  );
};

const OrdersCentre = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, currentUserData, loading: authLoading } = useAuth();
  const userId = currentUser?.uid || null;
  const orders = useSelector(selectBuyerDisplayOrders);
  const draftOrders = useSelector(selectBuyerDisplayDrafts);
  const rawOrders = useSelector(selectRawBuyerOrders);
  const rawDraftOrders = useSelector(selectRawBuyerDrafts);
  const ordersRevision = useSelector(selectBuyerOrdersRevision);
  const draftsRevision = useSelector(selectBuyerDraftsRevision);
  const projectedOrdersRevision = useSelector(
    selectBuyerProjectedOrdersRevision
  );
  const projectedDraftsRevision = useSelector(
    selectBuyerProjectedDraftsRevision
  );
  const allOrders = useMemo(
    () =>
      [...draftOrders, ...orders].sort(
        (a, b) => getOrderTime(b.createdAt) - getOrderTime(a.createdAt)
      ),
    [draftOrders, orders]
  );
  const [activeTab, setActiveTab] = useState("All");
  const [loading, setLoading] = useState(
    () => projectedOrdersRevision < ordersRevision && orders.length === 0
  );
  const [draftsLoading, setDraftsLoading] = useState(
    () =>
      projectedDraftsRevision < draftsRevision && draftOrders.length === 0
  );
  const [loadError, setLoadError] = useState(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState(null); // Selected order for modal
  const [isModalOpen, setIsModalOpen] = useState(false); // Modal visibility
  const [detailLoading, setDetailLoading] = useState(false);
  const [trackingRefreshing, setTrackingRefreshing] = useState(false);
  const [courierReviewTarget, setCourierReviewTarget] = useState(null);
  const [activeProductIndex, setActiveProductIndex] = useState(0); // Track current product in the modal
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [showConfirmShippingModal, setShowConfirmShippingModal] =
    useState(false);
  const [orderToRequestShipping, setOrderToRequestShipping] = useState(null);
  // ↥ stay with the other useState hooks
  const [showLinkBanner, setShowLinkBanner] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [sampleProduct, setSampleProduct] = useState(null);
  const detailRequestId = useRef(0);
  const pickupMapOpeningRef = useRef(false);
  const ordersTabsRef = useRef(null);
  const listLoadedHapticPlayed = useRef(false);
  const [showOrderPlacedModal, setShowOrderPlacedModal] = useState(false);
  const [orderForPopup, setOrderForPopup] = useState(null); // The order that triggers the popup
  const [shareUrl, setShareUrl] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showHelpOptions, setShowHelpOptions] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState(null);
  const [returnToProfile] = useState(() =>
    Boolean(
      location.state?.fromPaymentApprove ||
        location.state?.paymentConfirmationPending ||
        location.state?.orderCreated,
    ),
  );
  const [focusedOrderKey, setFocusedOrderKey] = useState(null);
  const focusedOrderTimerRef = useRef(null);

  const countdown = expiresAt ? Math.max(0, expiresAt - Date.now()) : 0; // you can transform to “mm:ss” later if you like

  const fromPaymentApprove = location.state?.fromPaymentApprove;
  const dispatch = useDispatch();

  useEffect(() => {
    if (!userId) {
      setPendingCheckout(null);
      return;
    }
    const storageKey = `mythrift.pending-order.${userId}`;
    const incomingPending =
      location.state?.paymentConfirmationPending || location.state?.orderCreated
        ? {
            orderId: location.state?.orderId || null,
            reference: location.state?.paymentReference || null,
            kind: location.state?.orderCreated ? "created" : "confirming",
            startedAt: Date.now(),
          }
        : null;

    if (incomingPending) {
      setPendingCheckout(incomingPending);
      try {
        localStorage.setItem(storageKey, JSON.stringify(incomingPending));
      } catch {}
      const remainingState = {...(location.state || {})};
      delete remainingState.paymentConfirmationPending;
      delete remainingState.orderCreated;
      delete remainingState.orderId;
      delete remainingState.paymentReference;
      navigate(`${location.pathname}${location.search}${location.hash}`, {
        replace: true,
        state: remainingState,
      });
      return;
    }

    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "null");
      setPendingCheckout(stored);
    } catch {
      setPendingCheckout(null);
    }
  }, [
    location.hash,
    location.pathname,
    location.search,
    location.state,
    navigate,
    userId,
  ]);

  useEffect(() => {
    if (!pendingCheckout || !userId) return;
    const matchingOrder = allOrders.find(
      (order) =>
        (pendingCheckout.orderId && order.id === pendingCheckout.orderId) ||
        (pendingCheckout.reference &&
          order.orderReference === pendingCheckout.reference),
    );
    if (!matchingOrder) return;
    setPendingCheckout(null);
    try {
      localStorage.removeItem(`mythrift.pending-order.${userId}`);
    } catch {}
  }, [allOrders, pendingCheckout, userId]);

  useEffect(() => {
    const focusOrderId = location.state?.focusOrderId;
    if (!focusOrderId || allOrders.length === 0) return undefined;
    const matchingOrder = allOrders.find((order) =>
      orderContainsOrderId(order, focusOrderId),
    );
    if (!matchingOrder) return undefined;

    const focusKey = getOrderDetailHistoryKey(matchingOrder);
    setActiveTab("All");
    setFocusedOrderKey(focusKey);
    appHaptics.selection();
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document
          .querySelector(`[data-order-focus-key="${CSS.escape(focusKey)}"]`)
          ?.scrollIntoView({behavior: "smooth", block: "center"});
      });
    });
    if (focusedOrderTimerRef.current) {
      window.clearTimeout(focusedOrderTimerRef.current);
    }
    focusedOrderTimerRef.current = window.setTimeout(
      () => setFocusedOrderKey(null),
      2400,
    );

    const remainingState = {...(location.state || {})};
    delete remainingState.focusOrderId;
    navigate(`${location.pathname}${location.search}${location.hash}`, {
      replace: true,
      state: remainingState,
    });

    return undefined;
  }, [allOrders, location.hash, location.pathname, location.search, location.state, navigate]);

  useEffect(
    () => () => {
      if (focusedOrderTimerRef.current) {
        window.clearTimeout(focusedOrderTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    const stockpileId = location.state?.reopenStockpileDeliveryId;
    if (!stockpileId || allOrders.length === 0) return;
    const matchingOrder = allOrders.find(
      (order) => order.stockpileDocId === stockpileId
    );
    if (!matchingOrder) return;
    setOrderToRequestShipping(matchingOrder);
    setShowConfirmShippingModal(true);
    const { reopenStockpileDeliveryId, ...remainingState } = location.state;
    navigate(`${location.pathname}${location.search}${location.hash}`, {
      replace: true,
      state: remainingState,
    });
  }, [allOrders, location.hash, location.pathname, location.search, location.state, navigate]);
  const refreshOrders = useCallback(async () => {
    if (!currentUser?.uid) return;
    await refreshBuyerOrdersFromServer(currentUser.uid);
  }, [currentUser?.uid]);

  useNativePageRefresh(refreshOrders, {
    enabled: Boolean(currentUser?.uid),
    verticalOffset: 112,
  });
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  useEffect(() => {
    if (!location.state?.draftShareUrl) return;
    setShareUrl(location.state.draftShareUrl);
    setExpiresAt(new Date(location.state.draftExpires));
    setShowShareModal(true);
    // clean out the history state, so refresh doesn’t open it again
    navigate(location.pathname, { replace: true, state: {} });
  }, [location]);
  // Show banner if current user is anonymous
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setShowLinkBanner(!!u && u.isAnonymous === true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!userId) {
      dispatch(
        ordersProjectionReceived({ orders: [], revision: ordersRevision })
      );
      setLoading(false);
      setLoadError(null);
      return;
    }

    // Wait for the auth-scoped realtime listener's first snapshot. This avoids
    // replacing a warm Redux projection with a temporary empty list on mount.
    if (ordersRevision === 0) return;

    // The enriched projection survives route unmounts in Redux. If it already
    // represents this source revision, navigation back to Orders is instant
    // and performs no Firestore enrichment reads.
    if (projectedOrdersRevision >= ordersRevision) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchOrdersAndProducts = async () => {
      // Keep the existing projection visible while a realtime update is being
      // enriched; skeletons are only for the genuinely empty initial load.
      setLoading(orders.length === 0);
      setLoadError(null);
      try {
        // Orders are supplied incrementally by the auth-scoped Firestore
        // listener. This effect only builds the existing enriched UI model.
        const fetchedOrders = rawOrders.map((order) => ({ ...order }));

        // 2. Sort by createdAt (newest first)
        fetchedOrders.sort(
          (a, b) => getOrderTime(b.createdAt) - getOrderTime(a.createdAt)
        );

        // A name lookup must never make a paid order disappear. Authorize
        // historical store summaries by order ownership, not public eligibility.
        const vendorMap = await getOwnedOrderVendorSummaries(fetchedOrders, userId)
          .catch((error) => {
            console.warn("[orders] store names unavailable", {code: error?.code});
            return {};
          });

        // 4. Attach vendorName to each order
        const enrichedOrders = fetchedOrders.map((order) => ({
          ...order,
          vendorName: vendorMap[order.vendorId]?.shopName || order.vendorName || order.shopName || "Unknown Vendor",
          // Never copy another vendor's private address into every order.
          // Pickup details are authorized on demand when opening that order.
          pickupLat: null,
          pickupLng: null,
          pickupAddress: "",
        }));

        const productsData = await getOrderProductSnapshots(enrichedOrders);

        // 6. Attach product info to cartItems
        const ordersWithProductDetails = enrichedOrders.map((order) => {
          const items = Array.isArray(order.cartItems) ? order.cartItems : [];
          const cartItemsWithDetails = items.map((item, index) => {
            const product = productsData[order.id]?.[index] || item.productSnapshot;
            let imageUrl = item.selectedImageUrl || item.imageUrl || item.image || product?.imageUrl || "";
            let name = item.name || item.productName || product?.name || "Product";
            let price = Number(item.unitPrice ?? item.productSnapshot?.price ?? item.price ?? product?.price ?? 0);
            let color = item.color || item.variantAttributes?.color || "";
            let size = item.size || item.variantAttributes?.size || "";
            const savedSizeHidden =
              item.variantAttributes?.sizeHidden ?? item.sizeHidden;
            const hideSize =
              typeof savedSizeHidden === "boolean"
                ? savedSizeHidden
                : product
                  ? isVariantSizeHidden(product)
                  : false;

            if (product) {

              if (item.subProductId) {
                const sub = product.subProducts?.find(
                  (sp) => sp.subProductId === item.subProductId
                );
                if (sub) {
                  imageUrl = imageUrl || sub.images?.[0] || "";
                  color = sub.color || "";
                  size = sub.size || "";
                }
              } else if (item.variantAttributes) {
                imageUrl = imageUrl || product.imageUrls?.[0] || "";
                color = item.variantAttributes.color || "";
                size = item.variantAttributes.size || "";
              } else {
                imageUrl = imageUrl || product.coverImageUrl || "";
              }
            }

            return { ...item, name, price, imageUrl, color, size, hideSize };
          });

          return {
            ...order,
            cartItems: cartItemsWithDetails,
          };
        });

        // 7. Group Stockpile Orders by vendorId + stockpileDocId
        const groupedMap = new Map();
        const groupedKeys = new Set();

        for (const order of ordersWithProductDetails) {
          if (order.isStockpile && order.stockpileDocId) {
            const key = `stockpile-${order.vendorId}-${order.stockpileDocId}`;
            if (groupedKeys.has(key)) continue;

            const relatedOrders = ordersWithProductDetails.filter(
              (o) =>
                o.isStockpile &&
                o.vendorId === order.vendorId &&
                o.stockpileDocId === order.stockpileDocId
            );
            relatedOrders.sort(
              (a, b) => getOrderTime(a.createdAt) - getOrderTime(b.createdAt)
            );
            groupedKeys.add(key);

            const combinedCartItems = relatedOrders.flatMap((o) => o.cartItems);

            const orderIds = relatedOrders.map((o) => o.id);
            const combinedTotal = relatedOrders.reduce(
              (sum, o) => sum + parseFloat(o.total || 0),
              0
            );
            const combinedSubtotal = relatedOrders.reduce(
              (sum, o) => sum + parseFloat(o.subtotal || 0),
              0
            );

            // ✅ Safe await now
            const stockpileRef = doc(db, "stockpiles", order.stockpileDocId);
            const stockpileSnap = await getDoc(stockpileRef);

            let stockpileData = {};
            if (stockpileSnap.exists()) {
              stockpileData = stockpileSnap.data();
            }
            const firstOrder = relatedOrders[0];
            const latestOrder = relatedOrders[relatedOrders.length - 1] || order;
            const vendorHandover =
              stockpileData.vendorHandover ||
              relatedOrders.find((item) => item.vendorHandover?.confirmedAt)
                ?.vendorHandover ||
              latestOrder.vendorHandover ||
              null;

            groupedMap.set(key, {
              ...latestOrder,
              cartItems: combinedCartItems,
              orderIds,
              _relatedOrders: relatedOrders,
              isReviewed: relatedOrders.every(
                (item) =>
                  Boolean(item.reviewId) && Number(item.reviewRating) > 0,
              ),
              reviewRating:
                relatedOrders.find((item) => Number(item.reviewRating) > 0)
                  ?.reviewRating || null,
              combinedTotal,
              combinedSubtotal,
              stockpileDocId: order.stockpileDocId,
              chosenWeeks: stockpileData.chosenWeeks || null,
              endDate: stockpileData.endDate || null,
              isActive: stockpileData.isActive ?? null,
              requestedForShipping:
                stockpileData.requestedForShipping ??
                latestOrder.requestedForShipping ??
                false,
              stockpileStatus:
                stockpileData.status ||
                (stockpileData.isActive === false ? "closing" : "active"),
              deliveryFulfillmentId:
                stockpileData.deliveryFulfillmentId || null,
              vendorHandover,
              firstOrderStatus:
                firstOrder?.progressStatus || latestOrder.progressStatus,

              firstOrderCreatedAt: firstOrder?.createdAt || null,
              firstOrderRiderInfo: firstOrder?.riderInfo || null,
              firstOrderServiceFee: firstOrder?.serviceFee || 0,
              paymentMethod:
                firstOrder?.paymentMethod || latestOrder.paymentMethod || null,
              userInfo: firstOrder?.userInfo || latestOrder.userInfo || {},
              declineReason:
                firstOrder?.declineReason || latestOrder.declineReason || "",
            });
          } else {
            groupedMap.set(order.id, order);
          }
        }

        // Convert map to array and sort
        const finalOrders = Array.from(groupedMap.values()).sort(
          (a, b) => getOrderTime(b.createdAt) - getOrderTime(a.createdAt)
        );
        if (!cancelled) {
          dispatch(
            ordersProjectionReceived({
              orders: finalOrders.map(firestoreValueToSerializable),
              revision: ordersRevision,
            })
          );
        }

      } catch (error) {
        console.error("Error fetching orders and products:", error);
        if (!cancelled) {
          setLoadError("We couldn’t load your orders. Check your connection and try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchOrdersAndProducts();
    return () => {
      cancelled = true;
    };
  }, [
    dispatch,
    loadAttempt,
    ordersRevision,
    projectedOrdersRevision,
    rawOrders,
    userId,
  ]);
  const handleStockpileDeliveryState = useCallback(
    (state) => {
      if (!orderToRequestShipping?.stockpileDocId || !state?.status) return;
      const isActive = state.status === "active";
      const changes = {
        stockpileStatus: state.status,
        deliveryFulfillmentId: state.deliveryFulfillmentId || null,
        requestedForShipping: !isActive,
        isActive,
      };
      setSelectedOrder((previous) =>
        previous?.stockpileDocId === orderToRequestShipping.stockpileDocId
          ? { ...previous, ...changes }
          : previous
      );
      dispatch(
        displayOrderPatched({
          stockpileDocId: orderToRequestShipping.stockpileDocId,
          changes,
        })
      );
      if (!isActive) dispatch(exitStockpileMode());
    },
    [dispatch, orderToRequestShipping?.stockpileDocId]
  );

  useEffect(() => {
    if (!userId) {
      dispatch(
        draftsProjectionReceived({ drafts: [], revision: draftsRevision })
      );
      setDraftsLoading(false);
      return;
    }

    if (draftsRevision === 0) return;

    if (projectedDraftsRevision >= draftsRevision) {
      setDraftsLoading(false);
      return;
    }

    let active = true;
    setDraftsLoading(rawDraftOrders.length > 0 && draftOrders.length === 0);

    const buildDraftProjection = async () => {
      try {
        const drafts = rawDraftOrders.map((draft) => ({
          ...draft,
          _isDraft: true,
          progressStatus: "Awaiting Payment",
        }));
        const filledDrafts = await enrichWithProductInfo(drafts);
        if (active) {
          dispatch(
            draftsProjectionReceived({
              drafts: filledDrafts.map(firestoreValueToSerializable),
              revision: draftsRevision,
            })
          );
        }
      } catch (error) {
        console.error("Error enriching draft orders:", error);
      } finally {
        if (active) setDraftsLoading(false);
      }
    };

    void buildDraftProjection();

    return () => {
      active = false;
    };
  }, [
    dispatch,
    draftOrders.length,
    draftsRevision,
    projectedDraftsRevision,
    rawDraftOrders,
    userId,
  ]);

  useEffect(() => {
    listLoadedHapticPlayed.current = false;
  }, [userId]);

  useEffect(() => {
    if (
      authLoading ||
      !userId ||
      loading ||
      draftsLoading ||
      allOrders.length === 0 ||
      listLoadedHapticPlayed.current
    ) {
      return;
    }

    listLoadedHapticPlayed.current = true;
    appHaptics.light();
  }, [allOrders.length, authLoading, draftsLoading, loading, userId]);

  useEffect(() => {
    if (orders.length > 0) {
      const newOrder = orders.find((order) => order.showPopup === true);

      if (newOrder) {
        setOrderForPopup(newOrder);
        setShowOrderPlacedModal(true);

        // Clear the cart for that vendor immediately
        if (newOrder.vendorId) {
          dispatch(clearCart(newOrder.vendorId)).then((synced) => {
            if (!synced) {
              console.warn(
                "Order completed, but the cart clear is pending cloud sync",
                { vendorId: newOrder.vendorId },
              );
            }
          });
          dispatch(exitStockpileMode());
        }
        dispatch(deactivateQuickMode());
        try {
          Object.keys(sessionStorage)
            .filter((k) => k.startsWith("quickMode_"))
            .forEach((k) => sessionStorage.removeItem(k));
        } catch {}
      }
    }
  }, [orders, dispatch]);
  const { openChat } = useTawk();

  const handleCloseOrderPlacedModal = async () => {
    setShowOrderPlacedModal(false);
    if (orderForPopup) {
      try {
        const orderRef = doc(db, "orders", orderForPopup.id);
        // Update the order's showPopup field to false so that the modal doesn't show again.
        await updateDoc(orderRef, { showPopup: false });
        // Optionally update local state if needed.
        setOrderForPopup(null);
      } catch (error) {
        console.error("Error updating order showPopup field:", error);
      }
    }
  };

  const revalidateOrderDetails = async (order, requestId) => {
    try {
      let refreshedOrder = order;

      if (order.deliveryFulfillmentId) {
        try {
          await refreshDeliveryTracking({
            deliveryFulfillmentId: order.deliveryFulfillmentId,
            mode: "modal",
          });
        } catch (trackingError) {
          // The saved order remains usable offline or while the courier is
          // unavailable. Scheduled tracking will retry in the background.
          console.warn("Could not refresh delivery tracking on open:", {
            code: trackingError?.code || "unknown",
          });
        }
      }

      if (order.isStockpile && order.stockpileDocId) {
        const orderIds = Array.from(
          new Set(
            (order.orderIds || order._relatedOrders?.map((item) => item.id) || [])
              .filter(Boolean)
          )
        );
        const [orderSnapshots, stockpileSnapshot] = await Promise.all([
          Promise.all(orderIds.map((id) => getDoc(doc(db, "orders", id)))),
          getDoc(doc(db, "stockpiles", order.stockpileDocId)),
        ]);
        const freshRelatedOrders = orderSnapshots
          .filter((snapshot) => snapshot.exists())
          .map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }))
          .sort(
            (a, b) => getOrderTime(a.createdAt) - getOrderTime(b.createdAt)
          );

        if (freshRelatedOrders.length > 0) {
          // Keep the product metadata already enriched for the UI while
          // replacing status and order fields with the latest Firestore data.
          const existingOrdersById = new Map(
            (order._relatedOrders || []).map((item) => [item.id, item])
          );
          const relatedOrders = freshRelatedOrders.map((freshOrder) => {
            const existingOrder = existingOrdersById.get(freshOrder.id);
            return {
              ...existingOrder,
              ...freshOrder,
              cartItems:
                existingOrder?.cartItems || freshOrder.cartItems || [],
            };
          });
          const firstOrder = relatedOrders[0];
          const latestOrder = relatedOrders[relatedOrders.length - 1];
          const freshById = new Map(relatedOrders.map((item) => [item.id, item]));
          const stockpileData = stockpileSnapshot.exists()
            ? stockpileSnapshot.data()
            : {};

          refreshedOrder = {
            ...order,
            ...latestOrder,
            id: order.id,
            stockpileDocId: order.stockpileDocId,
            orderIds: relatedOrders.map((item) => item.id),
            _relatedOrders: relatedOrders,
            cartItems: (order.cartItems || []).map((item) => {
              const sourceOrder = freshById.get(item._orderId);
              return {
                ...item,
                _orderProgressStatus:
                  sourceOrder?.progressStatus || item._orderProgressStatus,
                _orderDeclineReason:
                  sourceOrder?.declineReason || item._orderDeclineReason || "",
              };
            }),
            combinedTotal: relatedOrders.reduce(
              (sum, item) => sum + Number(item.total || 0),
              0
            ),
            combinedSubtotal: relatedOrders.reduce(
              (sum, item) => sum + Number(item.subtotal || 0),
              0
            ),
            chosenWeeks: stockpileData.chosenWeeks ?? order.chosenWeeks ?? null,
            endDate: stockpileData.endDate ?? order.endDate ?? null,
            isActive: stockpileData.isActive ?? order.isActive ?? null,
            requestedForShipping:
              stockpileData.requestedForShipping ??
              order.requestedForShipping ??
              false,
            stockpileStatus:
              stockpileData.status ||
              order.stockpileStatus ||
              (stockpileData.isActive === false ? "closing" : "active"),
            deliveryFulfillmentId:
              stockpileData.deliveryFulfillmentId ||
              order.deliveryFulfillmentId ||
              null,
            firstOrderStatus:
              firstOrder.progressStatus || order.firstOrderStatus,
            firstOrderCreatedAt:
              firstOrder.createdAt || order.firstOrderCreatedAt || null,
            firstOrderRiderInfo:
              firstOrder.riderInfo || order.firstOrderRiderInfo || null,
            firstOrderServiceFee:
              firstOrder.serviceFee ?? order.firstOrderServiceFee ?? 0,
            paymentMethod:
              firstOrder.paymentMethod || order.paymentMethod || null,
            userInfo: firstOrder.userInfo || order.userInfo || {},
            declineReason:
              firstOrder.declineReason || order.declineReason || "",
          };
        }
      } else {
        const orderSnapshot = await getDoc(doc(db, "orders", order.id));
        if (orderSnapshot.exists()) {
          refreshedOrder = {
            ...order,
            ...orderSnapshot.data(),
            id: order.id,
            cartItems: order.cartItems,
          };
        }
      }

      if (refreshedOrder.isPickup || refreshedOrder.userInfo?.isPickup) {
        // Failure to enrich a location must not discard a fresh order status.
        // Do not fall back to a public vendor document or stale pickup details.
        refreshedOrder = {
          ...refreshedOrder,
          pickupAddress: "", pickupLat: null, pickupLng: null,
        };
        try {
          const pickup = await getOwnedPickupDetails([refreshedOrder], userId);
          refreshedOrder = {...refreshedOrder, ...(pickup[refreshedOrder.id] || {})};
        } catch (pickupError) {
          console.warn("Could not refresh pickup location:", {code: pickupError?.code || "unknown"});
          if (detailRequestId.current === requestId && auth.currentUser?.uid === userId) {
            toast.error("Your order is up to date, but the pickup address couldn’t load. Try again shortly.");
          }
        }
      }
      if (detailRequestId.current !== requestId || auth.currentUser?.uid !== userId) return;
      const serializableOrder = firestoreValueToSerializable(refreshedOrder);
      setSelectedOrder(serializableOrder);
      dispatch(
        displayOrderReplaced({
          order: serializableOrder,
        })
      );
    } catch (error) {
      console.error("Could not refresh order details:", error);
      if (detailRequestId.current === requestId) {
        appHaptics.warning();
        toast("Showing the last loaded order details.");
      }
    } finally {
      if (detailRequestId.current === requestId) setDetailLoading(false);
    }
  };

  const handleViewOrder = (order) => {
    const historyKey = getOrderDetailHistoryKey(order);
    if (historyKey) {
      navigate(`${location.pathname}${location.search}${location.hash}`, {
        state: {
          ...(location.state || {}),
          mtOrderDetailKey: historyKey,
        },
      });
    }

    const requestId = detailRequestId.current + 1;
    detailRequestId.current = requestId;
    setSelectedOrder(order);
    setActiveProductIndex(0); // Reset to the first product
    setIsModalOpen(true);
    appHaptics.light();

    if (order._isDraft) {
      setDetailLoading(false);
      return;
    }

    // Render the cached Redux order immediately and revalidate it behind the
    // modal. This avoids replacing usable details with a loading screen.
    setDetailLoading(false);
    void revalidateOrderDetails(order, requestId);
  };

  const handleManualTrackingRefresh = async () => {
    if (!selectedOrder?.deliveryFulfillmentId || trackingRefreshing) return;
    setTrackingRefreshing(true);
    appHaptics.selection();
    try {
      const result = await refreshDeliveryTracking({
        deliveryFulfillmentId: selectedOrder.deliveryFulfillmentId,
        mode: "manual",
      });
      const requestId = detailRequestId.current + 1;
      detailRequestId.current = requestId;
      await revalidateOrderDetails(selectedOrder, requestId);
      toast.success(
        result?.reason === "fresh"
          ? "Tracking is already up to date."
          : "Tracking status refreshed."
      );
      appHaptics.success();
    } catch (error) {
      toast.error(
        error?.message?.replace(/^Firebase:\s*/i, "") ||
          "We couldn’t refresh tracking. Please try again."
      );
      appHaptics.error();
    } finally {
      setTrackingRefreshing(false);
    }
  };

  const openPickupMap = async (order) => {
    if (pickupMapOpeningRef.current) return;
    if (!canUsePickupDetails(order)) {
      toast.error(
        "The pickup route is available after acceptance and before delivery."
      );
      return;
    }
    // Reserve the web tab within the tap itself: opening it only after the
    // authenticated lookup can be blocked by Safari's popup protection.
    // Native WebViews retain their existing external Maps navigation.
    const mapTab = isNativeApp ? null : window.open("about:blank", "_blank");
    if (mapTab) mapTab.opener = null;
    pickupMapOpeningRef.current = true;
    try {
      const details = await getOwnedPickupDetails([order], userId);
      const pickup = details[order.id];
      if (!pickup || auth.currentUser?.uid !== userId) {
        mapTab?.close();
        toast.error("Pickup details are not available for this order.");
        return;
      }
      const latitude = Number(pickup.pickupLat);
      const longitude = Number(pickup.pickupLng);
      const hasCoordinates =
        pickup.pickupLat != null && pickup.pickupLng != null &&
        Number.isFinite(latitude) && Number.isFinite(longitude);
      const destination = hasCoordinates
        ? `${latitude},${longitude}`
        : String(pickup.pickupAddress || "").trim();
      if (!destination) {
        mapTab?.close();
        toast.error("Vendor did not set a pick-up point.");
        return;
      }
      appHaptics.selection();
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
      if (isNativeApp) window.open(url, "_blank", "noopener,noreferrer");
      else if (mapTab && !mapTab.closed) mapTab.location.replace(url);
      else if (!mapTab) window.location.assign(url);
      // Closing the reserved tab while loading is cancellation, not an error.
    } catch {
      mapTab?.close();
      toast.error("Couldn’t load the pickup route. Please try again.");
    } finally {
      pickupMapOpeningRef.current = false;
    }
  };

  const openKnowledgeBase = () => {
    setShowHelpOptions(false);
    if (ORDER_KNOWLEDGE_BASE_URL) {
      void openExternalUrl(ORDER_KNOWLEDGE_BASE_URL);
      return;
    }
    toast("Order knowledge base is coming soon.");
  };

  const openOrderSupport = () => {
    const productIds = Array.from(
      new Set(
        (selectedOrder?.cartItems || [])
          .map((item) => item?.productId)
          .filter(Boolean)
      )
    );
    setShowHelpOptions(false);
    openChat({
      "support-entry": "order-help",
      screen: "order-details",
      ...(selectedOrder?.id ? { "order-id": selectedOrder.id } : {}),
      ...(selectedOrder?.vendorId
        ? { "vendor-id": selectedOrder.vendorId }
        : {}),
      ...(selectedOrder?.orderReference
        ? { "payment-reference": selectedOrder.orderReference }
        : {}),
      ...(productIds.length === 1 ? { "product-id": productIds[0] } : {}),
    });
  };

  const dismissOrderDetails = () => {
    detailRequestId.current += 1;
    setDetailLoading(false);
    setIsModalOpen(false);
    setSelectedOrder(null);
  };

  const closeModal = () => {
    if (location.state?.mtOrderDetailKey) {
      navigate(-1);
      return;
    }
    dismissOrderDetails();
  };

  // Order Details is visually a full screen, so give it a real browser-history
  // entry. Native WebKit Back can then close Details before leaving Orders;
  // Forward also restores the same selected order without refetching the list.
  useEffect(() => {
    const historyKey = location.state?.mtOrderDetailKey || null;
    if (!historyKey) {
      if (isModalOpen) dismissOrderDetails();
      return;
    }

    const selectedKey = getOrderDetailHistoryKey(selectedOrder);
    if (isModalOpen && selectedKey === historyKey) return;

    const order = allOrders.find(
      (candidate) => getOrderDetailHistoryKey(candidate) === historyKey
    );
    if (!order) return;

    const requestId = detailRequestId.current + 1;
    detailRequestId.current = requestId;
    setSelectedOrder(order);
    setActiveProductIndex(0);
    setIsModalOpen(true);

    if (order._isDraft) {
      setDetailLoading(false);
    } else {
      setDetailLoading(false);
      void revalidateOrderDetails(order, requestId);
    }
  }, [allOrders, isModalOpen, location.state?.mtOrderDetailKey, selectedOrder]);
  useEffect(() => {
    if (orders.length > 0) {
      console.log("Orders available:", orders);
      // Look for an order with a field "showPopup" set to true.
      const newOrder = orders.find((order) => {
        console.log(`Order ${order.id} showPopup value:`, order.showPopup);
        return order.showPopup === true;
      });
      if (newOrder) {
        console.log("Found new order for popup:", newOrder);
        setOrderForPopup(newOrder);
        setShowOrderPlacedModal(true);
      } else {
        console.log("No order found with showPopup === true");
      }
    }
  }, [orders]);

  const handleStockpileAddMore = (order) => {
    if (!currentUser) {
      // require login
      return;
    }
    // 1) Dispatch
    dispatch(enterStockpileMode({ vendorId: order.vendorId }));
    // 2) Navigate
    navigate(`/store/${order.vendorId}?stockpile=1`);
  };
  // For stockpile orders, use the rider details from the first order (primary)
  // Otherwise, use the riderInfo from the current order.

  const openLinkDialog = () => setShowLinkDialog(true);

  const linkAnonymousAccount = async ({ email, password }) => {
    const u = auth.currentUser;
    if (!u || !u.isAnonymous) {
      toast.error("You're not signed in as a guest.");
      return;
    }

    const inputEmail = email.trim().toLowerCase();

    try {
      // 0) Load anon user's Firestore doc
      const userRef = doc(db, "users", u.uid);
      const snap = await getDoc(userRef);
      const savedEmail =
        (snap.exists() ? snap.data()?.email : "")
          ?.toString()
          .trim()
          .toLowerCase() || "";

      // 1) Enforce email match if one was saved earlier
      if (savedEmail && savedEmail !== inputEmail) {
        const mask = (e) => {
          const [name, domain] = e.split("@");
          if (!domain) return e;
          const safeName =
            name.length <= 2 ? name[0] + "*" : name[0] + "***" + name.slice(-1);
          return `${safeName}@${domain}`;
        };
        toast.error(
          `Please use the same email you used earlier: ${mask(savedEmail)}`
        );
        return;
      }

      if (!(await canUseBuyerContactEmail(inputEmail))) {
        toast.error(CONTACT_SIGN_IN_MESSAGE);
        return;
      }

      // 3) If email already registered (any provider), don't link; ask to sign in
      const methods = await fetchSignInMethodsForEmail(auth, inputEmail);
      if (methods.length > 0) {
        toast.error(
          "This email is already registered. Please sign in and we’ll merge your data."
        );
        return;
      }

      // 4) Link anonymous → email/password
      const cred = EmailAuthProvider.credential(inputEmail, password);
      const res = await linkWithCredential(u, cred);

      // 5) Upsert Firestore (non-destructive)
      const patch = {
        uid: res.user.uid,
        email: inputEmail,
        accountLinked: true,
        updatedAt: new Date(),
      };
      await setDoc(
        userRef,
        snap.exists()
          ? patch
          : { createdAt: new Date(), role: "user", ...patch },
        { merge: true }
      );

      // 6) Verification email
      try {
        await sendEmailVerification(res.user);
      } catch (e) {
        console.error("sendEmailVerification failed:", e);
      }

      toast.success("Account linked! We’ve sent a verification email.");
      setShowLinkDialog(false);
      setShowLinkBanner(false);
    } catch (err) {
      console.error("linkWithCredential failed:", err);
      if (err.code === "auth/email-already-in-use") {
        toast.error(
          "This email is already in use. Please sign in and link from settings."
        );
      } else if (err.code === "auth/invalid-credential") {
        toast.error("Invalid email or password.");
      } else {
        toast.error("Could not link account. Please try again.");
      }
    }
  };
  const filterOrdersByStatus = (status) => {
    if (status === "All") return allOrders;
    if (status === "Stockpile")
      return allOrders.filter((order) => order.isStockpile);

    // Check for Pending filter
    if (status === "Pending") {
      return allOrders.filter((order) =>
        order._isDraft
          ? true // show every draft in “Pending”
          : order.isStockpile
          ? order.firstOrderStatus === "Pending"
          : order.progressStatus === "Pending"
      );
    }

    if (status === "Processing")
      return allOrders.filter((order) =>
        order.isStockpile
          ? order.firstOrderStatus === "In Progress"
          : order.progressStatus === "In Progress"
      );

    if (status === "Delivered")
      return allOrders.filter((order) =>
        !order.isPickup && getOrderProgress(order) === "Delivered"
      );

    if (status === "Collected")
      return allOrders.filter(
        (order) => order.isPickup && getOrderProgress(order) === "Delivered"
      );

    if (status === "Shipped")
      return allOrders.filter((order) =>
        !order.isPickup && getOrderProgress(order) === "Shipped"
      );

    if (status === "Ready for pick-up")
      return allOrders.filter(
        (order) => order.isPickup && getOrderProgress(order) === "Shipped"
      );

    if (status === "Declined")
      return allOrders.filter((order) =>
        order.isStockpile
          ? order.firstOrderStatus === "Declined"
          : order.progressStatus === "Declined"
      );

    return [];
  };

  const filteredOrders = filterOrdersByStatus(activeTab);
  const pageLoading =
    authLoading ||
    Boolean(
      userId &&
        (loading ||
          draftsLoading ||
          (ordersRevision === 0 && orders.length === 0) ||
          (draftsRevision === 0 && draftOrders.length === 0))
    );

  const copyOrderText = async (value, successMessage) => {
    try {
      await navigator.clipboard.writeText(value);
      appHaptics.success();
      toast.success(successMessage);
    } catch (error) {
      console.error("Could not copy order text:", error);
      appHaptics.error();
      toast.error("Could not copy. Please try again.");
    }
  };

  const handleTabChange = (tab) => {
    if (tab === activeTab) return;
    appHaptics.selection();
    setActiveTab(tab);
  };

  const handleRateSeller = (order) => {
    appHaptics.selection();
    const queryString = order.isStockpile && order.stockpileDocId
      ? `rateStockpile=${encodeURIComponent(order.stockpileDocId)}`
      : `rateOrder=${encodeURIComponent(order.id)}`;
    navigate(`/store/${order.vendorId}?tab=reviews&${queryString}`);
  };

  const handleBackClick = () => {
    if (location.state?.returnTo) {
      navigate(location.state.returnTo);
    } else if (fromPaymentApprove || returnToProfile) {
      navigate("/profile");
    } else {
      navigate(-1);
    }
  };
  const closeFullscreenImage = () => setFullscreenImage(null);

  const tabButtons = [
    "All",
    "Stockpile",
    "Pending",
    "Processing",
    "Shipped",
    "Ready for pick-up",
    "Delivered",
    "Collected",
    "Declined",
  ];

  const orderTabSwipeHandlers = useHorizontalTabSwipe({
    tabs: tabButtons,
    activeTab,
    onChange: handleTabChange,
    enabled: !isModalOpen,
  });

  useEffect(() => {
    const activeButton = ordersTabsRef.current?.querySelector(
      '.orders-tab[aria-current="page"]'
    );
    activeButton?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeTab]);

  return (
    <div>
      <SEO
        title={`Your Orders - My Thrift`}
        description={`View your orders on My Thrift`}
        url={`https://www.shopmythrift.store/user-orders`}
      />
      <ScrollToTop />
      <LinkAccountModal
        open={showLinkDialog}
        onClose={() => setShowLinkDialog(false)}
        onSubmit={linkAnonymousAccount}
      />
      {showLinkBanner && (
        <AccountLinkBanner
          onLink={openLinkDialog}
          onClose={() => setShowLinkBanner(false)}
        />
      )}

      <LinkShareModal
        isOpen={showShareModal}
        shareUrl={shareUrl}
        countdown={countdown}
        expiresAt={expiresAt}
        onClose={() => setShowShareModal(false)}
      />

      {showOrderPlacedModal && orderForPopup && (
        <OrderPlacedModal
          showPopup={showOrderPlacedModal}
          onRequestClose={handleCloseOrderPlacedModal}
          isStockpile={orderForPopup.isStockpile}
          order={orderForPopup}
          currentUser={currentUser}
        />
      )}
      <main
        {...orderTabSwipeHandlers}
        className="orders-history-page app-horizontal-tab-swipe"
      >
        <AppPageHeader
          title="Orders"
          alignment="center"
          onBack={handleBackClick}
          className="orders-page-header"
          rightAction={
            <button
              type="button"
              className="orders-header-action"
              onClick={() => navigate("/search")}
              aria-label="Search"
            >
              <LuSearch aria-hidden="true" />
            </button>
          }
        >
          <nav
            ref={ordersTabsRef}
            className="orders-tabs"
            aria-label="Order status filters"
          >
            {tabButtons.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => handleTabChange(tab)}
                className={`orders-tab ${activeTab === tab ? "is-active" : ""}`}
                aria-current={activeTab === tab ? "page" : undefined}
              >
                {tab}
              </button>
            ))}
          </nav>
        </AppPageHeader>

        <div className="orders-tab-swipe-surface">
        {pendingCheckout && userId && (
          <section className="orders-payment-pending" role="status">
            <LuRefreshCw aria-hidden="true" />
            <div>
              <strong>
                {pendingCheckout.kind === "created"
                  ? "Order placed"
                  : "Payment received"}
              </strong>
              <p>
                {pendingCheckout.kind === "created"
                  ? "Loading your order details…"
                  : "We’re confirming your order. Please don’t pay again."}
              </p>
            </div>
          </section>
        )}
        {pageLoading ? (
          <OrderCardsSkeleton />
        ) : userId === null ? (
          <section className="orders-empty">
            <img
              src="/figma-assets/orders/empty-orders.png"
              alt=""
              aria-hidden="true"
            />
            <h2>No orders yet</h2>
            <p>After checkout your item(s) will appear here</p>
            <div className="orders-empty-actions">
              <button
                type="button"
                className="orders-empty-button is-primary"
                onClick={() =>
                  navigate("/login", { state: { from: location.pathname } })
                }
              >
                Log In or Sign Up
              </button>
              <button
                type="button"
                className="orders-empty-button is-secondary"
                onClick={() => navigate("/")}
              >
                Continue Shopping
              </button>
            </div>
          </section>
        ) : loadError && allOrders.length === 0 ? (
          <section className="orders-load-error" role="alert">
            <LuXCircle aria-hidden="true" />
            <h2>Orders couldn’t load</h2>
            <p>{loadError}</p>
            <button
              type="button"
              className="orders-empty-button is-primary"
              onClick={() => {
                setLoadAttempt((attempt) => attempt + 1);
                void refreshOrders();
              }}
            >
              Try again
            </button>
          </section>
        ) : filteredOrders.length === 0 ? (
          <section className="orders-empty">
            <img
              src="/figma-assets/orders/empty-orders.png"
              alt=""
              aria-hidden="true"
            />
            <h2>No orders yet</h2>
            <p>After checkout your item(s) will appear here</p>
            <div className="orders-empty-actions">
              <button
                type="button"
                className="orders-empty-button is-primary"
                onClick={() => navigate("/")}
              >
                Continue Shopping
              </button>
            </div>
          </section>
        ) : (
          <section className="orders-content" aria-live="polite">
            {loadError && (
              <div className="orders-inline-error" role="status">
                <span>{loadError}</span>
                <button
                  type="button"
                  onClick={() => setLoadAttempt((attempt) => attempt + 1)}
                >
                  Retry
                </button>
              </div>
            )}
            {filteredOrders.map((order) => {
              const progress = getOrderProgress(order);
              const items = Array.isArray(order.cartItems) ? order.cartItems : [];
              const daysLeft = order.isStockpile
                ? getStockpileDaysLeft(order)
                : null;
              const showPickupDetails = canUsePickupDetails(order);
              const orderIdentifier = getOrderIdentifier(order);
              const visibleOrderIdentifier = getVisibleOrderIdentifier(order);
              const orderIdentifierLabel = getOrderIdentifierLabel(order);
              const canRepile =
                order.isStockpile &&
                progress !== "Pending" &&
                progress !== "Declined" &&
                order.isActive !== false &&
                !order._isDraft;
              const canRateOrder = isOrderReviewable(order);
              const hasRecordedReview = order.isStockpile
                ? order.isReviewed === true
                : Boolean(order.reviewId) && Number(order.reviewRating) > 0;

              return (
                <article
                  key={
                    order.isStockpile
                      ? `stockpile-${order.stockpileDocId}`
                      : order.id
                  }
                  className={`order-history-card ${order._isDraft ? "is-draft" : ""} ${
                    focusedOrderKey === getOrderDetailHistoryKey(order) ? "is-focused" : ""
                  }`}
                  data-order-focus-key={getOrderDetailHistoryKey(order)}
                >
                  <button
                    type="button"
                    className="order-card-main-button"
                    onClick={() => handleViewOrder(order)}
                    aria-label={`View ${orderIdentifierLabel.toLowerCase()} ${orderIdentifier}`}
                  >
                    <div className="order-card-top">
                      <div className="order-card-title-wrap">
                        <div className="order-card-title">
                          <span title={orderIdentifier}>
                            {orderIdentifierLabel} {visibleOrderIdentifier}
                          </span>
                          <LuChevronRight aria-hidden="true" />
                        </div>
                        <div className="order-card-meta">
                          <span>{order.vendorName || "Unknown vendor"}</span>
                          <span className="order-meta-dot" aria-hidden="true" />
                          <span>
                            {formatOrderDate(
                              order.isStockpile
                                ? order.firstOrderCreatedAt || order.createdAt
                                : order.createdAt
                            )}
                          </span>
                        </div>
                      </div>
                      <OrderStatus order={order} />
                    </div>

                    <div
                      className="order-card-products"
                      aria-label={
                        order.isStockpile
                          ? "Products in stockpile"
                          : "Products in order"
                      }
                    >
                      {items.map((item, index) => (
                        <span
                          className="order-card-product-thumb"
                          key={`${item.productId || "item"}-${index}`}
                        >
                          <img
                            className="order-card-product-image"
                            src={item.imageUrl || "/Search_empty.svg"}
                            alt={item.name || "Order item"}
                          />
                        </span>
                      ))}
                    </div>

                    <div className="order-card-summary">
                      <span>
                        {items.length} {items.length === 1 ? "item" : "items"}
                      </span>
                      {daysLeft !== null && (
                        <>
                          <span className="order-meta-dot" aria-hidden="true" />
                          <span>{daysLeft}d left</span>
                        </>
                      )}
                      <span className="order-meta-dot" aria-hidden="true" />
                      <span>
                        Order total: <strong>₦{getOrderTotal(order).toLocaleString()}</strong>
                      </span>
                    </div>
                  </button>

                  {order._isDraft && order.expiresAt && (
                    <div className="order-card-conditional">
                      <span>
                        Expires in{" "}
                        <strong>
                          <Countdown expiresAtMs={toOrderDate(order.expiresAt)?.getTime()} />
                        </strong>
                      </span>
                      <button
                        type="button"
                        className="order-inline-action"
                        onClick={() => {
                          void copyOrderText(
                            `${window.location.origin}/pay/${order.id}`,
                            "Payment link copied"
                          );
                        }}
                      >
                        Copy payment link
                      </button>
                    </div>
                  )}

                  {showPickupDetails && (
                    <div className="order-card-conditional">
                      <PickupCode code={order.pickupCode} />
                      <button
                        type="button"
                        className="order-inline-action"
                        onClick={() => openPickupMap(order)}
                      >
                        Open in Google Maps
                      </button>
                    </div>
                  )}

                  {canRepile && (
                    <div className="order-card-conditional">
                      <span>Add more items to this active pile</span>
                      <button
                        type="button"
                        className="order-inline-action"
                        onClick={() => {
                          appHaptics.selection();
                          handleStockpileAddMore(order);
                        }}
                      >
                        Repile
                      </button>
                    </div>
                  )}

                  {canRateOrder &&
                    (hasRecordedReview ? (
                      <div className="order-rate-row is-complete">
                        <span>Your review</span>
                        <span className="order-stars" aria-label={`${
                          order.reviewRating || 5
                        } out of 5 stars`}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <LuStar
                              key={star}
                              className={
                                star <= Number(order.reviewRating || 5)
                                  ? "is-filled"
                                  : ""
                              }
                            />
                          ))}
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="order-rate-row"
                        onClick={() => handleRateSeller(order)}
                      >
                        <span>Rate this order</span>
                        <span className="order-stars" aria-hidden="true">
                          {[0, 1, 2, 3, 4].map((star) => (
                            <LuStar key={star} />
                          ))}
                        </span>
                      </button>
                    ))}
                </article>
              );
            })}
          </section>
        )}
        </div>
      </main>
      {isModalOpen && selectedOrder &&
        (() => {
          const progress = getOrderProgress(selectedOrder);
          const isStockpile = Boolean(selectedOrder.isStockpile);
          const isStockpileContainer = Boolean(
            selectedOrder.isStockpile,
          );
          const isFirstDeclined = isStockpile && progress === "Declined";
          const isFirstPending = isStockpile && progress === "Pending";
          const repileDisabled =
            isFirstPending ||
            isFirstDeclined ||
            selectedOrder._isDraft ||
            selectedOrder?.isActive === false;
          const deliveryActionDisabled =
            selectedOrder._isDraft ||
            !selectedOrder.stockpileDocId ||
            isFirstDeclined;
          const stockpileDeliveryLabel =
            selectedOrder.stockpileStatus === "awaiting_delivery_payment"
              ? "Pay for delivery"
              : selectedOrder.stockpileStatus === "quote_retry"
              ? "Retry delivery"
              : selectedOrder.stockpileStatus &&
                selectedOrder.stockpileStatus !== "active"
              ? "Delivery progress"
              : "End & deliver stockpile";
          const paymentMethod = selectedOrder._isDraft
            ? "pay for me"
            : selectedOrder.paymentMethod ||
              selectedOrder.userInfo?.paymentMethod ||
              null;
          const normalizedPaymentMethod = String(paymentMethod || "")
            .trim()
            .toLowerCase();
          const completionDuration = formatCompletionDuration(
            isStockpile
              ? selectedOrder.firstOrderCreatedAt || selectedOrder.createdAt
              : selectedOrder.createdAt,
            selectedOrder.deliveredAt || selectedOrder.collectedAt,
          );
          const paymentView =
            normalizedPaymentMethod === "wallet"
              ? {
                  label: "My Wallet",
                  icon: "/figma-assets/checkout-wallet.svg",
                }
              : normalizedPaymentMethod === "pay for me"
              ? {
                  label: "Pay for me",
                  icon: "/figma-assets/checkout-pay-for-me.svg",
                }
              : ["paystack", "card", "pay-for-me", "pay_for_me"].includes(
                  normalizedPaymentMethod,
                )
              ? {
                  label: "Paystack",
                  icon: "/figma-assets/checkout-paystack.svg",
                }
              : null;
          const detailPlaceholder = selectedOrder._isDraft ? "---" : "Not recorded";
          const paymentLabel = paymentView?.label || detailPlaceholder;
          const userSnapshot = selectedOrder.userInfo || {};
          const itemTotal = Number(
            isStockpileContainer
              ? selectedOrder.combinedSubtotal || selectedOrder.subtotal || 0
              : selectedOrder.subtotal || 0
          );
          const protectionFee = Number(
            isStockpileContainer
              ? selectedOrder.firstOrderServiceFee || selectedOrder.serviceFee || 0
              : selectedOrder.serviceFee || 0
          );
          const deliveryFee = Number(selectedOrder.deliveryFee || 0);
          const showPickupDetails = canUsePickupDetails(selectedOrder);
          const orderIdentifier = getOrderIdentifier(selectedOrder);
          const visibleOrderIdentifier = getVisibleOrderIdentifier(selectedOrder);
          const orderIdentifierLabel = getOrderIdentifierLabel(selectedOrder);
          const riderInfo = isStockpileContainer
            ? selectedOrder.firstOrderRiderInfo || {}
            : selectedOrder.riderInfo || {};
          const hasRiderInfo = Boolean(
            riderInfo.riderName || riderInfo.riderNumber || riderInfo.note
          );
          const deliveryTrackingStatus = String(
            selectedOrder.deliveryStatus || ""
          ).toLowerCase();
          const showDeliveryTracking = Boolean(
            !isStockpileContainer &&
              !selectedOrder.isPickup &&
              (["booking", "booked", "in_transit", "delivered"].includes(
                deliveryTrackingStatus
              ) ||
                selectedOrder.deliveryTrackingUrl ||
                selectedOrder.deliveryTrackingCode)
          );
          const deliveryProof =
            selectedOrder.vendorHandover?.proof ||
            selectedOrder.deliveryProof ||
            null;
          const stockpileOrders = isStockpileContainer
            ? [...(selectedOrder._relatedOrders || [])].sort(
                (first, second) =>
                  getOrderTime(first.createdAt) - getOrderTime(second.createdAt)
              )
            : [];
          const renderDetailProduct = (item, index, keyPrefix = "order") => {
            const variants = [
              item.hideSize ? null : item.size,
              item.color,
              item.condition,
            ].filter(Boolean);

            return (
              <article
                className="order-detail-product"
                key={`${keyPrefix}-${item.productId || "item"}-${index}`}
              >
                <img
                  src={item.imageUrl || "/Search_empty.svg"}
                  alt={item.name || "Order item"}
                  onClick={() =>
                    item.imageUrl && setFullscreenImage(item.imageUrl)
                  }
                />
                <div className="order-detail-product-copy">
                  <h3>{item.name || "Product"}</h3>
                  <p className="order-detail-product-price">
                    ₦{Number(item.price || 0).toLocaleString()}
                  </p>
                  {variants.length > 0 && (
                    <p className="order-detail-product-variant">
                      {variants.join(" · ")}
                    </p>
                  )}
                  <p className="order-detail-product-qty">
                    Qty: {item.quantity || 1}
                  </p>
                </div>
              </article>
            );
          };

          return (
            <section
              className={`order-details-page${
                isStockpileContainer ? " has-stockpile-actions" : ""
              }`}
              aria-label="Order details"
            >
              <AppPageHeader
                title="Order details"
                alignment="center"
                onBack={closeModal}
                className="order-details-header"
                sticky={false}
                rightAction={
                  <button
                    type="button"
                    className="orders-header-action"
                    onClick={() => setShowHelpOptions(true)}
                    aria-label="Order help"
                  >
                    <LuHelpCircle aria-hidden="true" />
                  </button>
                }
              />

              {detailLoading ? (
                <OrderDetailsSkeleton />
              ) : (
                <>
              <div className="order-details-content">
                <section className="order-detail-section">
                  <div className="order-detail-order-head">
                    <div>
                      {selectedOrder._isDraft ? (
                        <span className="order-detail-id-button">
                          {orderIdentifierLabel} ---
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="order-detail-id-button"
                          title={orderIdentifier}
                          onClick={() =>
                            void copyOrderText(
                              orderIdentifier,
                              `${orderIdentifierLabel} ID copied`
                            )
                          }
                        >
                          {orderIdentifierLabel} {visibleOrderIdentifier}
                          <LuCopy aria-hidden="true" />
                        </button>
                      )}
                      <div className="order-card-meta">
                        <span>{selectedOrder.vendorName || "Unknown vendor"}</span>
                        <span className="order-meta-dot" aria-hidden="true" />
                        <span>
                          {formatOrderDate(
                            isStockpileContainer
                              ? selectedOrder.firstOrderCreatedAt ||
                                  selectedOrder.createdAt
                              : selectedOrder.createdAt
                          )}
                        </span>
                      </div>
                    </div>
                    <OrderStatus order={selectedOrder} />
                  </div>

                  {isStockpileContainer && stockpileOrders.length > 0 ? (
                    <div
                      className="stockpile-detail-orders"
                      aria-label="Individual orders in this stockpile"
                    >
                      {stockpileOrders.map((stockpileOrder, orderIndex) => {
                        const stockpileOrderId = String(
                          stockpileOrder.id || "Unavailable"
                        );
                        const declineReason =
                          getOrderProgress(stockpileOrder) === "Declined"
                            ? stockpileOrder.declineReason ||
                              "The vendor declined this order."
                            : null;

                        return (
                          <section
                            className="stockpile-detail-order"
                            key={stockpileOrderId}
                          >
                            <div className="stockpile-detail-order-head">
                              <div>
                                <button
                                  type="button"
                                  className="stockpile-detail-order-id"
                                  title={stockpileOrderId}
                                  onClick={() =>
                                    void copyOrderText(
                                      stockpileOrderId,
                                      "Order ID copied"
                                    )
                                  }
                                >
                                  Order {getVisibleStockpileIdentifier(stockpileOrderId)}
                                  <LuCopy aria-hidden="true" />
                                </button>
                                <p>
                                  {formatOrderDate(stockpileOrder.createdAt)}
                                </p>
                              </div>
                              <OrderStatus order={stockpileOrder} />
                            </div>

                            <div className="stockpile-detail-order-products">
                              {(stockpileOrder.cartItems || []).map(
                                (item, itemIndex) =>
                                  renderDetailProduct(
                                    item,
                                    itemIndex,
                                    `stockpile-${orderIndex}-${stockpileOrderId}`
                                  )
                              )}
                            </div>

                            {declineReason && (
                              <p className="stockpile-detail-decline-reason">
                                {declineReason}
                              </p>
                            )}
                          </section>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="order-detail-products">
                      {(selectedOrder.cartItems || []).map((item, index) =>
                        renderDetailProduct(item, index)
                      )}
                    </div>
                  )}
                </section>

                {!selectedOrder._isDraft && (
                  <section className="order-detail-section">
                    <h2 className="order-section-title">Costs</h2>
                    <div className="order-detail-rows">
                      <div className="order-detail-row">
                        <span>Item(s) Total</span>
                        <strong>₦{itemTotal.toLocaleString()}</strong>
                      </div>
                      <div className="order-detail-row">
                        <span>Buyer Protection fee</span>
                        <strong>₦{protectionFee.toLocaleString()}</strong>
                      </div>
                      {!isStockpile && (
                        <div className="order-detail-row">
                          <span>Delivery fee</span>
                          <strong>₦{deliveryFee.toLocaleString()}</strong>
                        </div>
                      )}
                      <div className="order-detail-row is-total">
                        <span>Order Total</span>
                        <strong>₦{getOrderTotal(selectedOrder).toLocaleString()}</strong>
                      </div>
                    </div>
                  </section>
                )}

                <section className="order-detail-section">
                  <h2 className="order-section-title">Delivery Information</h2>
                  <div className="order-detail-rows">
                    <div className="order-detail-row">
                      <span>Name</span>
                      <strong>{userSnapshot.displayName || detailPlaceholder}</strong>
                    </div>
                    <div className="order-detail-row">
                      <span>Phone Number</span>
                      <strong>
                        {userSnapshot.phoneNumber ||
                          userSnapshot.phone ||
                          detailPlaceholder}
                      </strong>
                    </div>
                    <div className="order-detail-row">
                      <span>Email</span>
                      <strong>{userSnapshot.email || detailPlaceholder}</strong>
                    </div>
                    <div className="order-detail-row">
                      <span>Delivery Address</span>
                      <strong>{userSnapshot.address || detailPlaceholder}</strong>
                    </div>
                  </div>
                </section>

                {selectedOrder.isPickup && (
                  <section className="order-detail-section">
                    <h2 className="order-section-title">Pick-up window</h2>
                    <div className="order-detail-rows">
                      <div className="order-detail-row">
                        <span>Available days</span>
                        <strong>
                          {selectedOrder.pickupDays || "Not scheduled yet"}
                        </strong>
                      </div>
                      <div className="order-detail-row">
                        <span>Available time</span>
                        <strong>
                          {selectedOrder.pickupTime || "Not scheduled yet"}
                        </strong>
                      </div>
                    </div>
                    {selectedOrder.pickupNote && (
                      <div className="order-delivery-note">
                        <span>Vendor note</span>
                        <p>{selectedOrder.pickupNote}</p>
                      </div>
                    )}
                  </section>
                )}

                <section className="order-detail-section">
                  <h2 className="order-section-title">Payment method</h2>
                  <div className="order-payment-method">
                    {paymentView && (
                      <img
                        src={paymentView.icon}
                        alt=""
                        aria-hidden="true"
                      />
                    )}
                    <span>{paymentLabel}</span>
                  </div>
                </section>

                <section className="order-detail-section">
                  <h2 className="order-section-title">Delivery method</h2>
                  <div className="order-detail-rows">
                    <div className="order-detail-row">
                      <span>Method</span>
                      <strong>
                        {isStockpile
                          ? "Stockpile delivery"
                          : selectedOrder.isPickup
                          ? "Pick-up"
                          : "Home delivery"}
                      </strong>
                    </div>
                    {selectedOrder.isPickup && (
                      <>
                        <div className="order-detail-row">
                          <span>Pick-up location</span>
                          <strong>
                            {selectedOrder.pickupAddress || "Location unavailable"}
                          </strong>
                        </div>
                        {showPickupDetails && (
                          <div className="order-card-conditional">
                            <PickupCode code={selectedOrder.pickupCode} />
                            <button
                              type="button"
                              className="order-inline-action"
                              onClick={() => openPickupMap(selectedOrder)}
                            >
                              <LuMapPin aria-hidden="true" /> Open in Google Maps
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </section>

                {showDeliveryTracking && (
                  <section className="order-detail-section">
                    <h2 className="order-section-title">Delivery tracking</h2>
                    <DeliveryTrackingCard
                      provider={
                        selectedOrder.deliveryProvider ||
                        selectedOrder.deliveryOption?.provider
                      }
                      providerLogo={
                        selectedOrder.deliveryProviderLogo ||
                        selectedOrder.deliveryOption?.providerLogo
                      }
                      status={deliveryTrackingStatus}
                      eta={selectedOrder.deliveryOption?.eta}
                      trackingUrl={selectedOrder.deliveryTrackingUrl}
                      trackingCode={selectedOrder.deliveryTrackingCode}
                    />
                    {selectedOrder.deliveryFulfillmentId && (
                      <button
                        type="button"
                        className="order-inline-action order-tracking-refresh"
                        onClick={handleManualTrackingRefresh}
                        disabled={trackingRefreshing}
                      >
                        <LuRefreshCw aria-hidden="true" />
                        {trackingRefreshing ? "Refreshing…" : "Refresh status"}
                      </button>
                    )}
                    {String(deliveryTrackingStatus || "").toLowerCase() ===
                      "delivered" &&
                      selectedOrder.deliveryFulfillmentId &&
                      !selectedOrder.courierReviewSubmitted && (
                        <button
                          type="button"
                          className="orders-empty-button is-primary order-courier-review-action"
                          onClick={() => {
                            appHaptics.selection();
                            setCourierReviewTarget({
                              deliveryFulfillmentId:
                                selectedOrder.deliveryFulfillmentId,
                              provider:
                                selectedOrder.deliveryProvider ||
                                selectedOrder.deliveryOption?.provider,
                            });
                          }}
                        >
                          Rate delivery courier
                        </button>
                      )}
                  </section>
                )}

                {(deliveryProof?.storagePath || deliveryProof?.url) && (
                  <PrivateDeliveryProof
                    key={`${isStockpileContainer ? "stockpile" : "order"}:${selectedOrder.id}`}
                    entityType={isStockpileContainer ? "stockpile" : "order"}
                    entityId={isStockpileContainer ? selectedOrder.stockpileDocId || selectedOrder.id : selectedOrder.id}
                    proof={deliveryProof}
                    onView={setFullscreenImage}
                  />
                )}

                {selectedOrder.note && (
                  <section className="order-detail-section">
                    <h2 className="order-section-title">Note</h2>
                    <p className="order-detail-note">{selectedOrder.note}</p>
                  </section>
                )}

                {(hasRiderInfo || selectedOrder.declineReason) && (
                  <section className="order-detail-section">
                    <h2 className="order-section-title">Order information</h2>
                    <div className="order-detail-rows">
                      {hasRiderInfo && (
                        <>
                          <div className="order-detail-row">
                            <span>Rider Name</span>
                            <strong>
                              {riderInfo.riderName || detailPlaceholder}
                            </strong>
                          </div>
                          <div className="order-detail-row">
                            <span>Rider Number</span>
                            <strong>
                              {riderInfo.riderNumber || detailPlaceholder}
                            </strong>
                          </div>
                        </>
                      )}
                      {selectedOrder.declineReason && (
                        <div className="order-detail-row">
                          <span>Decline Reason</span>
                          <strong>{selectedOrder.declineReason}</strong>
                        </div>
                      )}
                    </div>
                    {riderInfo.note && (
                      <div className="order-delivery-note">
                        <span>Delivery note</span>
                        <p>{riderInfo.note}</p>
                      </div>
                    )}
                  </section>
                )}

                {isStockpile && (
                  <section className="order-detail-section">
                    <h2 className="order-section-title">Stockpile information</h2>
                    <div className="order-detail-rows">
                      <div className="order-detail-row">
                        <span>Stockpile ID</span>
                        <strong title={selectedOrder.stockpileDocId || undefined}>
                          {selectedOrder.stockpileDocId
                            ? getVisibleStockpileIdentifier(
                                selectedOrder.stockpileDocId,
                              )
                            : detailPlaceholder}
                        </strong>
                      </div>
                      <div className="order-detail-row">
                        <span>Duration</span>
                        <strong>
                          {selectedOrder.chosenWeeks
                            ? `${selectedOrder.chosenWeeks} weeks`
                            : detailPlaceholder}
                        </strong>
                      </div>
                      <div className="order-detail-row">
                        <span>End date</span>
                        <strong>{formatOrderDate(selectedOrder.endDate)}</strong>
                      </div>
                      <div className="order-detail-row">
                        <span>Status</span>
                        <strong>{getStockpileStatusView(selectedOrder).label}</strong>
                      </div>
                    </div>
                  </section>
                )}

                <section className="order-detail-section">
                  <h2 className="order-section-title">Timeline</h2>
                  <OrderTimeline order={selectedOrder} />
                  {completionDuration && (
                    <div className="order-completion-duration">
                      <IoTimeOutline aria-hidden="true" />
                      <span>Completed in</span>
                      <strong>{completionDuration}</strong>
                    </div>
                  )}
                </section>

                {selectedOrder._isDraft && (
                  <section className="order-detail-section">
                    <button
                      type="button"
                      className="orders-empty-button is-primary order-copy-payment-link"
                      onClick={() =>
                        void copyOrderText(
                          `${window.location.origin}/pay/${selectedOrder.id}`,
                          "Payment link copied"
                        )
                      }
                    >
                      Copy payment link
                    </button>
                  </section>
                )}
              </div>

              {isStockpileContainer && (
                <div className="order-stockpile-actions">
                  <button
                    type="button"
                    className="order-stockpile-action"
                    disabled={deliveryActionDisabled}
                    onClick={() => {
                      appHaptics.selection();
                      setOrderToRequestShipping(selectedOrder);
                      setShowConfirmShippingModal(true);
                    }}
                  >
                    {stockpileDeliveryLabel}
                  </button>
                  <button
                    type="button"
                    className="order-stockpile-action is-primary"
                    disabled={repileDisabled}
                    onClick={() => {
                      appHaptics.selection();
                      handleStockpileAddMore(selectedOrder);
                    }}
                  >
                    Repile
                  </button>
                </div>
              )}
                </>
              )}
            </section>
          );
        })()}

      {showHelpOptions && (
        <OrderHelpSheet
          onClose={() => setShowHelpOptions(false)}
          onChat={openOrderSupport}
          onKnowledgeBase={openKnowledgeBase}
        />
      )}

      {showConfirmShippingModal && (
        <StockpileDeliverySheet
          open={showConfirmShippingModal}
          onClose={() => setShowConfirmShippingModal(false)}
          stockpileId={orderToRequestShipping?.stockpileDocId}
          currentUserData={currentUserData}
          onStateChange={handleStockpileDeliveryState}
          onEditDetails={() => {
            const stockpileId = orderToRequestShipping?.stockpileDocId;
            setShowConfirmShippingModal(false);
            navigate("/account-info", {
              state: {
                returnTo: `${location.pathname}${location.search}${location.hash}`,
                returnState: stockpileId
                  ? { reopenStockpileDeliveryId: stockpileId }
                  : null,
              },
            });
          }}
        />
      )}

      <CourierReviewSheet
        open={Boolean(courierReviewTarget)}
        onClose={() => setCourierReviewTarget(null)}
        deliveryFulfillmentId={courierReviewTarget?.deliveryFulfillmentId}
        provider={courierReviewTarget?.provider}
        onSubmitted={(result) => {
          setSelectedOrder((current) =>
            current
              ? {
                  ...current,
                  courierReviewSubmitted: true,
                  courierReviewRating: result?.rating || null,
                }
              : current
          );
        }}
      />

      {fullscreenImage && (
        <div
          className="fixed px-12 py-12 inset-0 z-[110] bg-black bg-opacity-90 flex items-center justify-center"
          data-native-back-block
          onClick={closeFullscreenImage}
        >
          <img
            src={fullscreenImage}
            alt="Full View"
            className="w-full h-full object-contain"
          />
          <MdClose
            onClick={closeFullscreenImage}
            className="absolute top-5 right-5 text-white text-3xl"
          />
        </div>
      )}

      {false && isModalOpen &&
        selectedOrder &&
        (() => {
          const isStockpile = selectedOrder.isStockpile;
          const firstStatus = selectedOrder.firstOrderStatus;

          const isFirstDeclined = isStockpile && firstStatus === "Declined";
          const isFirstPending = isStockpile && firstStatus === "Pending";
          const isFirstAccepted =
            isStockpile && !isFirstDeclined && !isFirstPending;

          return (
            <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center">
              <div className="bg-white h-full rounded-lg shadow-lg w-full max-w-2xl flex flex-col">
                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <GoChevronLeft
                        onClick={closeModal}
                        className="text-2xl cursor-pointer"
                      />
                      <h2 className="text-lg font-semibold font-opensans text-center">
                        Order{" "}
                        <span className="text-sm font-medium">
                          {selectedOrder.isStockpile
                            ? selectedOrder._isDraft
                              ? // draft stockpile → show the draft’s own ID
                                `(${selectedOrder.id.slice(0, 5)}…)`
                              : // real stockpile → show the stockpileDocId
                                `(${selectedOrder.stockpileDocId})`
                            : selectedOrder._isDraft
                            ? // non-stockpile draft
                              `(${selectedOrder.id.slice(0, 5)}…)`
                            : // fully placed, non-stockpile
                              `(${selectedOrder.id})`}
                        </span>
                      </h2>
                    </div>
                    {/* Floating Support Button in Top-Right Corner */}
                    <div className=" ">
                      <FcOnlineSupport
                        className="text-2xl cursor-pointer"
                        onClick={openOrderSupport}
                        title="Support"
                      />
                    </div>
                  </div>

                  {/* Product Images Carousel (using Swiper) */}
                  <Swiper
                    spaceBetween={10}
                    slidesPerView={1}
                    onSlideChange={(swiper) =>
                      setActiveProductIndex(swiper.activeIndex)
                    }
                  >
                    {selectedOrder.cartItems.map((item, index) => (
                      <SwiperSlide key={index}>
                        <div
                          className={`relative w-full h-64 rounded-lg overflow-hidden cursor-pointer ${
                            item._orderId &&
                            orders.find((o) => o.id === item._orderId)
                              ?.progressStatus === "Declined"
                              ? "opacity-50"
                              : ""
                          }`}
                        >
                          <img
                            src={
                              item.imageUrl || "https://via.placeholder.com/150"
                            }
                            alt={item.name}
                            onClick={() => setFullscreenImage(item.imageUrl)}
                            className="w-full h-full object-cover"
                          />

                          {/* Conditional Text */}
                          {item._orderId &&
                          orders.find((o) => o.id === item._orderId)
                            ?.progressStatus === "Declined" ? (
                            <div className="absolute bottom-3 right-3 bg-red-600 text-white text-[11px] px-3 py-1 rounded-full font-opensans shadow-lg">
                              Order was declined by{" "}
                              {orders.find((o) => o.id === item._orderId)
                                ?.vendorName || "Vendor"}
                            </div>
                          ) : (
                            <div className="absolute bottom-3 right-3 bg-black bg-opacity-70 text-white text-[11px] px-3 py-1 rounded-full font-opensans shadow-lg">
                              Tap to View
                            </div>
                          )}
                        </div>
                      </SwiperSlide>
                    ))}
                  </Swiper>

                  {/* Dots Navigation */}
                  {selectedOrder.cartItems.length > 1 && (
                    <div className="flex justify-center mt-2">
                      {selectedOrder.cartItems.map((_, index) => (
                        <div
                          key={index}
                          className={`cursor-pointer mx-0.5 rounded-full transition-all duration-300 ${
                            index === activeProductIndex
                              ? "bg-customOrange h-2.5 w-2.5"
                              : "bg-orange-300 h-2 w-2"
                          }`}
                          onClick={() => setActiveProductIndex(index)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Product Details */}
                  <div className="mt-4">
                    <div className="flex items-center mb-2">
                      <div className="w-7 h-7 bg-rose-100 flex justify-center items-center rounded-full">
                        <BsFillBoxSeamFill className="text-customRichBrown" />
                      </div>
                      <p className="text-base font-opensans ml-2 text-black font-semibold mt-2">
                        Product Details
                      </p>
                    </div>
                    <div className="border-b mb-2"></div>

                    {[
                      {
                        label: "Item Name:",
                        value: selectedOrder.cartItems[activeProductIndex].name,
                      },
                      {
                        label: "Price:",
                        value: `₦${
                          selectedOrder.cartItems[
                            activeProductIndex
                          ].price?.toLocaleString() || "0"
                        }`,
                      },
                      ...(!selectedOrder.cartItems[activeProductIndex].hideSize
                        ? [
                            {
                              label: "Size:",
                              value:
                                selectedOrder.cartItems[activeProductIndex]
                                  .size || "N/A",
                            },
                          ]
                        : []),
                      {
                        label: "Color:",
                        value:
                          selectedOrder.cartItems[activeProductIndex].color ||
                          "N/A",
                      },
                      {
                        label: "Quantity:",
                        value:
                          selectedOrder.cartItems[activeProductIndex]
                            .quantity || 1,
                      },
                    ].map(({ label, value }, index, rows) => (
                      <React.Fragment key={index}>
                        <div className="flex justify-between items-center my-2">
                          <p className="text-sm font-opensans text-black font-semibold text-left w-1/2">
                            {label}
                          </p>
                          <p className="text-sm font-opensans text-black text-center w-1/2">
                            {value}
                          </p>
                        </div>
                        {index < rows.length - 1 && (
                          <div className="border-b my-2"></div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Order Details Section */}
                  <div className="mt-4">
                    <div className="flex items-center mb-2">
                      <div className="w-7 h-7 bg-rose-100 flex justify-center items-center rounded-full">
                        <BsFillFileEarmarkTextFill className="text-customRichBrown" />
                      </div>
                      <p className="text-base font-opensans ml-2 text-black font-semibold mt-2">
                        Order Details
                      </p>
                    </div>
                    <div className="border-b mb-2"></div>

                    {[
                      {
                        label: "Order ID:",
                        value: selectedOrder._isDraft
                          ? `${selectedOrder.id.slice(0, 5)}…`
                          : selectedOrder.cartItems[activeProductIndex]
                              ._orderId || selectedOrder.id,
                      },
                      {
                        label: "Time Placed:",
                        value: selectedOrder.cartItems[activeProductIndex]
                          ._orderCreatedAt
                          ? moment(
                              selectedOrder.cartItems[activeProductIndex]
                                ._orderCreatedAt.seconds * 1000
                            ).format("HH:mm, DD/MM/YYYY")
                          : selectedOrder.createdAt
                          ? moment(
                              selectedOrder.createdAt.seconds * 1000
                            ).format("HH:mm, DD/MM/YYYY")
                          : "N/A",
                      },

                      {
                        label: "Vendor Name:",
                        value: selectedOrder.vendorName,
                      },
                      ...(selectedOrder.isPickup
                        ? [
                            {
                              label: "Pickup Address:",
                              value: selectedOrder.pickupAddress || "N/A",
                            },
                            {
                              label: "Pickup Code:",
                              // you could format this how you like, e.g. mask or spacer
                              value: selectedOrder.pickupCode || "— — — —",
                            },
                          ]
                        : []),

                      // Optionally show additional fields if available:
                      ...(selectedOrder.progressStatus === "Shipped"
                        ? [
                            {
                              label: "Rider Name:",
                              value: selectedOrder.isStockpile
                                ? selectedOrder.firstOrderRiderInfo
                                    ?.riderName || "N/A"
                                : selectedOrder.riderInfo?.riderName || "N/A",
                            },
                            {
                              label: "Rider Number:",
                              value: selectedOrder.isStockpile
                                ? selectedOrder.firstOrderRiderInfo
                                    ?.riderNumber || "N/A"
                                : selectedOrder.riderInfo?.riderNumber || "N/A",
                            },
                            {
                              label: "Note:",
                              value: selectedOrder.isStockpile
                                ? selectedOrder.firstOrderRiderInfo?.note ||
                                  "N/A"
                                : selectedOrder.riderInfo?.note || "N/A",
                            },
                          ]
                        : []),

                      ...(() => {
                        if (
                          selectedOrder.progressStatus === "Declined" &&
                          selectedOrder.declineReason
                        ) {
                          return [
                            {
                              label: "Decline Reason:",
                              value: selectedOrder.declineReason,
                            },
                          ];
                        }
                        return [];
                      })(),
                    ].map(({ label, value }, index) => (
                      <React.Fragment key={index}>
                        <div className="flex justify-between items-center my-2">
                          <p className="text-sm font-opensans text-black font-semibold text-left w-1/2">
                            {label}
                          </p>
                          <p className="text-sm font-opensans text-black text-center w-1/2">
                            {value}
                          </p>
                        </div>
                        {index < 5 && <div className="border-t my-2"></div>}
                      </React.Fragment>
                    ))}
                  </div>

                  {/* NEW: Stockpile Information Section */}
                  {selectedOrder.isStockpile && (
                    <div className="mt-6">
                      <div className="flex items-center mb-2">
                        <div className="w-7 h-7 bg-rose-100 flex justify-center items-center rounded-full">
                          <PiBasketFill className="text-customRichBrown" />
                        </div>
                        <p className="text-base font-opensans ml-2 text-black font-semibold mt-2">
                          Stockpile Info
                        </p>
                      </div>
                      <div className="border-b mb-2"></div>

                      {(() => {
                        const activeOrderId =
                          selectedOrder.orderIds?.[activeProductIndex] ||
                          selectedOrder.id;

                        return [
                          {
                            label: "Stockpile ID:",
                            value: selectedOrder.stockpileDocId || "N/A",
                          },

                          {
                            label: "Chosen Duration:",
                            value: selectedOrder.chosenWeeks
                              ? `${selectedOrder.chosenWeeks} weeks`
                              : "N/A",
                          },
                          {
                            label: "Expiry Date:",
                            value: selectedOrder.endDate
                              ? moment(selectedOrder.endDate.toDate()).format(
                                  "DD/MM/YYYY"
                                )
                              : "N/A",
                          },
                          {
                            label: "Active:",
                            value:
                              typeof selectedOrder.isActive === "boolean"
                                ? selectedOrder.isActive
                                  ? "Yes"
                                  : "No"
                                : "N/A",
                          },
                        ].map(({ label, value }, index) => (
                          <React.Fragment key={index}>
                            <div className="flex justify-between items-center my-2">
                              <p className="text-sm font-opensans text-black font-semibold w-1/2">
                                {label}
                              </p>
                              <p className="text-sm font-opensans text-black w-1/2 text-right">
                                {value}
                              </p>
                            </div>
                            {index < 4 && <div className="border-b my-2"></div>}
                          </React.Fragment>
                        ));
                      })()}
                    </div>
                  )}
                  <div className="mt-6 ">
                    <div className="flex items-center mb-2">
                      <div className="w-7 h-7 bg-rose-100 flex justify-center items-center rounded-full">
                        <BsFillFileEarmarkTextFill className="text-customRichBrown" />
                      </div>
                      <p className="text-base font-opensans ml-2 text-black font-semibold mt-2">
                        Order Summary
                      </p>
                    </div>
                    <div className="border-b mb-2"></div>

                    {(selectedOrder._isDraft
                      ? [
                          {
                            label: "Order Total:",
                            value: `₦${Number(
                              selectedOrder.amount || 0
                            ).toLocaleString()}`,
                          },
                        ]
                      : (() => {
                          // build up the summary rows for a “real” order
                          const rows = [
                            {
                              label: "Subtotal:",
                              value: `₦${
                                selectedOrder.isStockpile
                                  ? Number(
                                      selectedOrder.combinedSubtotal || 0
                                    ).toLocaleString()
                                  : Number(
                                      selectedOrder.subtotal || 0
                                    ).toLocaleString()
                              }`,
                            },
                          ];
                          // insert delivery fee if present (and not stockpile)
                          if (
                            !selectedOrder.isStockpile &&
                            selectedOrder.deliveryFee != null
                          ) {
                            rows.push({
                              label: "Delivery Fee:",
                              value: `₦${Number(
                                selectedOrder.deliveryFee
                              ).toLocaleString()}`,
                            });
                          }
                          // service/buyer protection fee
                          rows.push({
                            label: selectedOrder.isStockpile
                              ? "Buyers Protection Fee:"
                              : "Service Fee:",
                            value: `₦${
                              selectedOrder.isStockpile
                                ? Number(
                                    selectedOrder.firstOrderServiceFee || 0
                                  ).toLocaleString()
                                : Number(
                                    selectedOrder.serviceFee || 0
                                  ).toLocaleString()
                            }`,
                          });
                          // final total
                          rows.push({
                            label: "Order Total:",
                            value: `₦${
                              selectedOrder.isStockpile
                                ? Number(
                                    selectedOrder.combinedTotal || 0
                                  ).toLocaleString()
                                : Number(
                                    selectedOrder.total || 0
                                  ).toLocaleString()
                            }`,
                          });
                          return rows;
                        })()
                    ).map(({ label, value }, idx, arr) => (
                      <React.Fragment key={idx}>
                        <div className="flex justify-between items-center my-2">
                          <p className="text-sm font-opensans text-black font-semibold w-1/2">
                            {label}
                          </p>
                          <p className="text-sm font-opensans text-black w-1/2 text-right">
                            {value}
                          </p>
                        </div>
                        {/* draw a separator under every row except the last */}
                        {idx < arr.length - 1 && (
                          <div className="border-b my-2"></div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
                {isStockpile && (
                  <div className="w-full border-t p-6 flex justify-between gap-3 bg-white sticky bottom-0 z-10">
                    <button
                      disabled={
                        isFirstPending ||
                        isFirstDeclined ||
                        false ||
                        selectedOrder?.requestedForShipping ||
                        selectedOrder?.isActive === false ||
                        selectedOrder._isDraft
                      }
                      onClick={() => {
                        if (isFirstPending) {
                          toast("Order is still pending...");
                        } else if (isFirstDeclined) {
                          toast.error(
                            "Cannot request shipping. Stockpile was declined."
                          );
                        } else {
                          setOrderToRequestShipping(selectedOrder);
                          setShowConfirmShippingModal(true);
                        }
                      }}
                      className={`font-opensans px-2 text-xs rounded-md w-full border ${
                        isFirstDeclined ||
                        isFirstPending ||
                        selectedOrder._isDraft ||
                        false ||
                        selectedOrder?.requestedForShipping ||
                        selectedOrder?.isActive === false
                          ? "border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed"
                          : "border-customRichBrown text-customRichBrown bg-transparent text-xs font-medium"
                      }`}
                    >
                      {selectedOrder?.requestedForShipping
                        ? "Shipping Requested"
                        : "Request for Shipping"}
                    </button>

                    <button
                      disabled={
                        isFirstPending ||
                        selectedOrder._isDraft ||
                        isFirstDeclined ||
                        selectedOrder?.isActive === false
                      }
                      onClick={() => {
                        if (isFirstPending) {
                          toast("Stockpile is still pending approval...");
                        } else if (isFirstDeclined) {
                          toast.error(
                            "You cannot repile. Stockpile was declined."
                          );
                        } else if (selectedOrder?.isActive === false) {
                          toast.error(
                            "Stockpile is inactive. Cannot add more items."
                          );
                        } else {
                          handleStockpileAddMore(selectedOrder);
                        }
                      }}
                      className={`text-sm font-opensans px-4 py-2 rounded-md w-full ${
                        isFirstDeclined ||
                        isFirstPending ||
                        selectedOrder._isDraft ||
                        selectedOrder?.isActive === false
                          ? "bg-gray-300 text-white cursor-not-allowed"
                          : "bg-customOrange text-xs font-medium text-white"
                      }`}
                    >
                      Repile
                    </button>
                  </div>
                )}
              </div>
              {fullscreenImage && (
                <div
                  className="fixed px-12 py-12 inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center"
                  onClick={closeFullscreenImage}
                >
                  <img
                    src={fullscreenImage}
                    alt="Full View"
                    className="w-full h-full object-contain"
                  />
                  <MdClose
                    onClick={closeFullscreenImage}
                    className="absolute top-5 right-5 text-white text-3xl"
                  />
                </div>
              )}
            </div>
          );
        })()}
    </div>
  );
};

export default OrdersCentre;
