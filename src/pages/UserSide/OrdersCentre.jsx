import React, { useEffect, useState, useRef } from "react";
import { GoChevronLeft } from "react-icons/go";
import { addToCart } from "../../redux/actions/action";
import { useNavigate, useLocation } from "react-router-dom";
import { db, auth } from "../../firebase.config";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  limit,
  documentId,
} from "firebase/firestore";
import { FcOnlineSupport } from "react-icons/fc";
import { TbBasketPlus, TbBasketX, TbBasketQuestion } from "react-icons/tb";
import { FaClipboardCheck } from "react-icons/fa";
import { onAuthStateChanged } from "firebase/auth";
import {
  MdCancel,
  MdClose,
  MdOutlineAddToPhotos,
  MdPendingActions,
} from "react-icons/md";
import { FaMoneyBillTransfer } from "react-icons/fa6";
import moment from "moment";
import { TbTruckDelivery } from "react-icons/tb";
import { enrichWithProductInfo } from "../../services/enrichWithProductInfo";
import { FaTimes } from "react-icons/fa";
import { IoCopyOutline, IoTimeOutline } from "react-icons/io5";
import { MdOutlinePendingActions } from "react-icons/md";
// import { GoChevronLeft } from "react-icons/go";
import { useDispatch } from "react-redux";
import Loading from "../../components/Loading/Loading";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import { BsFillBoxSeamFill, BsFillFileEarmarkTextFill } from "react-icons/bs";
import Orderpic from "../../Images/orderpic.svg";
import RelatedProducts from "./SimilarProducts";
import ScrollToTop from "../../components/layout/ScrollToTop";
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

import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase.config";
import { clearCart } from "../../redux/actions/action";
import { RiShareForwardBoxLine } from "react-icons/ri";
const ConfirmShippingModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center px-4">
      <div className="bg-white p-6 rounded-lg max-w-sm w-full">
        <h2 className="text-lg font-opensans font-semibold mb-4">
          Confirm Shipping Request ⚠️
        </h2>
        <p className="text-sm text-gray-700 font-opensans mb-6">
          This action cannot be undone. Requesting for shipping means you are
          ready for delivery. Ensure your items are complete and accurate before
          proceeding. THIS PILE WILL CLOSE!
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className=" text-sm border border-customRichBrown text-customRichBrown font-opensans px-4 py-2 rounded"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="bg-customOrange font-opensans text-sm text-white px-4 py-2 rounded"
          >
            I Confirm
          </button>
        </div>
      </div>
    </div>
  );
};
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

          <MdClose className="-top-1 left-4 relative" onClick={onClose} />
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
              navigator.clipboard.writeText(shareUrl);
              toast.success("Copied!");
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
  const [orders, setOrders] = useState([]);
  const [vendors, setVendors] = useState({});
  const [activeTab, setActiveTab] = useState("All");
  const [userId, setUserId] = useState(null);
  const [draftOrders, setDraftOrders] = useState([]);
  const [allOrders, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null); // Selected order for modal
  const [isModalOpen, setIsModalOpen] = useState(false); // Modal visibility
  const [activeProductIndex, setActiveProductIndex] = useState(0); // Track current product in the modal
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [showConfirmShippingModal, setShowConfirmShippingModal] =
    useState(false);
  const [orderToRequestShipping, setOrderToRequestShipping] = useState(null);

  const [sampleProduct, setSampleProduct] = useState(null);
  const ordersFetched = useRef(false);
  const [showOrderPlacedModal, setShowOrderPlacedModal] = useState(false);
  const [orderForPopup, setOrderForPopup] = useState(null); // The order that triggers the popup
  const [isRequestingShipping, setIsRequestingShipping] = useState(false);
  const [shareUrl, setShareUrl] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const countdown = expiresAt ? Math.max(0, expiresAt - Date.now()) : 0; // you can transform to “mm:ss” later if you like

  const location = useLocation();
  const { currentUser } = useAuth();
  const fromPaymentApprove = location.state?.fromPaymentApprove;
  const dispatch = useDispatch();
  useEffect(() => {
    window.scrollTo(0, 0);
  });
  useEffect(() => {
    if (!location.state?.draftShareUrl) return;
    setShareUrl(location.state.draftShareUrl);
    setExpiresAt(new Date(location.state.draftExpires));
    setShowShareModal(true);
    // clean out the history state, so refresh doesn’t open it again
    navigate(location.pathname, { replace: true, state: {} });
  }, [location]);

  useEffect(() => {
    if (!userId || ordersFetched.current) return;

    const fetchOrdersAndProducts = async () => {
      try {
        console.log("Fetching orders for userId:", userId);

        // 1. Fetch orders for this user
        const q = query(
          collection(db, "orders"),
          where("userId", "==", userId)
        );
        const querySnapshot = await getDocs(q);
        const fetchedOrders = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        console.log("Fetched orders:", fetchedOrders);

        // 2. Sort by createdAt (newest first)
        fetchedOrders.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);

        // 3. Fetch vendor names
        const vendorIds = [
          ...new Set(fetchedOrders.map((order) => order.vendorId)),
        ];
        const vendorSnapshots = await Promise.all(
          vendorIds.map((id) => getDoc(doc(db, "vendors", id)))
        );

        const vendorMap = {};
        vendorSnapshots.forEach((snap) => {
          if (snap.exists()) {
            vendorMap[snap.id] = snap.data().shopName;
          }
        });

        // 4. Attach vendorName to each order
        const enrichedOrders = fetchedOrders.map((order) => ({
          ...order,
          vendorName: vendorMap[order.vendorId] || "Unknown Vendor",
        }));

        // 5. Gather unique product IDs
        const productIds = new Set();
        enrichedOrders.forEach((order) =>
          order.cartItems.forEach((item) => productIds.add(item.productId))
        );

        const productsSnapshot = await getDocs(
          query(
            collection(db, "products"),
            where(documentId(), "in", Array.from(productIds))
          )
        );

        const productsData = {};
        productsSnapshot.forEach((doc) => {
          productsData[doc.id] = doc.data();
        });

        // 6. Attach product info to cartItems
        const ordersWithProductDetails = enrichedOrders.map((order) => {
          const cartItemsWithDetails = order.cartItems.map((item) => {
            const product = productsData[item.productId];
            let imageUrl = "";
            let name = "";
            let price = 0;
            let color = "";
            let size = "";

            if (product) {
              name = product.name;
              price = product.price;

              if (item.subProductId) {
                const sub = product.subProducts?.find(
                  (sp) => sp.subProductId === item.subProductId
                );
                if (sub) {
                  imageUrl = sub.images?.[0] || "";
                  color = sub.color || "";
                  size = sub.size || "";
                  if (sub.price) price = sub.price;
                }
              } else if (item.variantAttributes) {
                imageUrl = product.imageUrls?.[0] || "";
                color = item.variantAttributes.color || "";
                size = item.variantAttributes.size || "";
              } else {
                imageUrl = product.coverImageUrl || "";
              }
            }

            return { ...item, name, price, imageUrl, color, size };
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
              (a, b) => a.createdAt.seconds - b.createdAt.seconds
            );
            groupedKeys.add(key);

            const combinedCartItems = relatedOrders.flatMap((o) =>
              o.cartItems.map((item) => ({
                ...item,
                _orderId: o.id,
                _orderCreatedAt: o.createdAt, // 👈 attach originating order ID
              }))
            );

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

            groupedMap.set(key, {
              ...order,
              cartItems: combinedCartItems,
              orderIds,
              combinedTotal,
              combinedSubtotal,
              stockpileDocId: order.stockpileDocId,
              chosenWeeks: stockpileData.chosenWeeks || null,
              endDate: stockpileData.endDate || null,
              isActive: stockpileData.isActive ?? null,
              firstOrderStatus:
                firstOrder?.progressStatus || order.progressStatus,

              firstOrderCreatedAt: firstOrder?.createdAt || null,
              firstOrderRiderInfo: firstOrder?.riderInfo || null,
              firstOrderServiceFee: firstOrder?.serviceFee || 0,
            });
          } else {
            groupedMap.set(order.id, order);
          }
        }

        // Convert map to array and sort
        const finalOrders = Array.from(groupedMap.values()).sort(
          (a, b) => b.createdAt.seconds - a.createdAt.seconds
        );
        setOrders(finalOrders);

        console.log("🧾 Final grouped orders:", finalOrders);
        setOrders(finalOrders);
      } catch (error) {
        console.error("Error fetching orders and products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrdersAndProducts();
  }, [userId]);
  const handleRequestShipping = async (order) => {
    console.log("Requesting shipping for order:", order);

    if (!order?.stockpileDocId) {
      console.log("No stockpileDocId found");
      return;
    }

    setIsRequestingShipping(true);

    try {
      const stockpileRef = doc(db, "stockpiles", order.stockpileDocId);
      console.log("Updating stockpile document:", stockpileRef);

      await updateDoc(stockpileRef, {
        requestedForShipping: true,
        isActive: false,
      });

      const updatedStockpileSnap = await getDoc(stockpileRef);
      let updatedStockpileData = {};
      if (updatedStockpileSnap.exists()) {
        updatedStockpileData = updatedStockpileSnap.data();
      }

      toast.success("Shipping request sent successfully!");

      // Update local UI State
      setSelectedOrder((prev) => ({
        ...prev,
        requestedForShipping: true,
        isActive: updatedStockpileData.isActive,
      }));

      setOrders((prevOrders) =>
        prevOrders.map((o) =>
          o.stockpileDocId === order.stockpileDocId
            ? {
                ...o,
                requestedForShipping: true,
                isActive: updatedStockpileData.isActive,
              }
            : o
        )
      );

      // === CALL THE CLOUD FUNCTION ===
      const notifyVendorShippingRequest = httpsCallable(
        functions,
        "notifyVendorShippingRequest"
      );

      await notifyVendorShippingRequest({
        vendorId: order.vendorId,
        stockpileDocId: order.stockpileDocId,
        userName: currentUser?.displayName || "A Customer",
      });
      dispatch(exitStockpileMode());
      console.log("Vendor Notification Triggered Successfully");
    } catch (error) {
      console.error("Error requesting shipping:", error);
      toast.error("Failed to request shipping. Please try again.");
    } finally {
      setIsRequestingShipping(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    const now = Timestamp.fromDate(new Date());
    const draftQ = query(
      collection(db, "draftOrders"),
      where("ownerId", "==", userId),
      where("status", "==", "PAY_IN_PROGRESS"),
      where("expiresAt", ">", now)
    );

    const unsub = onSnapshot(draftQ, async (snap) => {
      // 1) build your raw drafts array
      const rawDrafts = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        _isDraft: true,
        progressStatus: "Awaiting Payment",
      }));

      // 2) enrich with product info exactly like we do for real orders
      const filledDrafts = await enrichWithProductInfo(rawDrafts);

      // 3) finally update state
      setDraftOrders(filledDrafts);
    });

    return unsub;
  }, [userId]);

  useEffect(() => {
    // naive merge; if an id clashes the "real" order wins
    const merged = [...draftOrders, ...orders].sort(
      (a, b) =>
        (b.createdAt?.seconds || b.createdAt) -
        (a.createdAt?.seconds || a.createdAt)
    );

    setAll(merged);
  }, [orders, draftOrders]);

  useEffect(() => {
    if (orders.length > 0) {
      const newOrder = orders.find((order) => order.showPopup === true);

      if (newOrder) {
        setOrderForPopup(newOrder);
        setShowOrderPlacedModal(true);

        // Clear the cart for that vendor immediately
        if (newOrder.vendorId) {
          dispatch(clearCart(newOrder.vendorId));
        }
      }
    }
  }, [orders, dispatch]);

  // Function to handle closing the popup.
  // Here you could update the order document in Firestore to mark that it’s no longer new.
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
  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setActiveProductIndex(0); // Reset to the first product
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };
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
  const openChat = () => {
    if (window.HelpCrunch) {
      console.log("Opening HelpCrunch chat...");
      window.HelpCrunch("openChat");
    } else {
      console.error("HelpCrunch is not initialized.");
    }
  };
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

  useEffect(() => {
    // Ensure HelpCrunch is fully initialized
    const initializeHelpCrunch = () => {
      if (window.HelpCrunch) {
        window.HelpCrunch("onReady", () => {
          console.log("HelpCrunch is ready.");
          window.HelpCrunch("hideChatWidget"); // Ensure widget is hidden
        });
      } else {
        console.error("HelpCrunch is not loaded.");
      }
    };

    initializeHelpCrunch();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
      setIsAuthChecked(true); // Authentication state has been determined
    });

    return () => unsubscribe();
  }, []);
  if (!isAuthChecked) {
    // Authentication state is not yet known show a loading indicator
    return <Loading />;
  }

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
        order.isStockpile
          ? order.firstOrderStatus === "Delivered"
          : order.progressStatus === "Delivered"
      );

    if (status === "Shipped")
      return allOrders.filter((order) =>
        order.isStockpile
          ? order.firstOrderStatus === "Shipped"
          : order.progressStatus === "Shipped"
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

  const handleBackClick = () => {
    if (fromPaymentApprove) {
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
    "Delivered",
    "Declined",
  ];

  return (
    <div>
      <SEO
        title={`Your Orders - My Thrift`}
        description={`View your orders on My Thrift`}
        url={`https://www.shopmythrift.store/user-orders`}
      />
      <ScrollToTop />
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
      <div className="sticky top-0 pb-2 bg-white w-full z-10">
        <div className="flex p-3 py-3 items-center bg-white h-20 mb-3 pb-2">
          <GoChevronLeft
            className="text-3xl cursor-pointer"
            onClick={() => navigate("/profile")}
          />
          <h1 className="text-xl font-opensans ml-5 font-semibold">Orders</h1>
        </div>
        <div className="border-t border-gray-300 my-2"></div>
        {/* Tabs Section (Inside Header) */}
        <div className="flex px-3 py-2 overflow-x-auto">
          <div className="flex space-x-3">
            {tabButtons.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-2 border h-12 rounded-full ${
                  activeTab === tab
                    ? "bg-customOrange text-xs font-opensans text-white"
                    : "bg-white text-xs font-opensans text-black"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {userId === null ? (
        <div className="flex flex-col items-center justify-center mt-10">
          <div className="bg-gray-200 flex justify-center rounded-full w-32 h-32 p-2">
            <img src={Orderpic} alt="Order" />
          </div>
          <div className="mt-20 flex items-center flex-col justify-center">
            <p className="text-gray-600 font-opensans text-center text-xs">
              Please login to view your order progress status and history.
            </p>
            <button
              className="text-white font-opensans font-semibold h-11 mt-3 mb-14 bg-customOrange rounded-full w-32"
              onClick={() => {
                navigate("/login", { state: { from: location.pathname } });
              }}
            >
              Login
            </button>
          </div>
          {/* Render RelatedProducts when user is not authenticated */}
          {sampleProduct && <RelatedProducts product={sampleProduct} />}
        </div>
      ) : (
        // Existing code to display orders when user is authenticated
        <>
          {loading ? (
            <Loading />
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center mt-10">
              <div className="bg-gray-200 flex justify-center rounded-full w-32 h-32 p-2">
                <img src={Orderpic} alt="Order" />
              </div>
              <div className="mt-20">
                <p className="text-gray-600 font-opensans text-center text-xs">
                  No order available
                </p>
                <button
                  className="text-white font-opensans font-semibold h-12 mt-3 mb-14 bg-customOrange rounded-full w-32"
                  onClick={() => navigate("/browse-markets")}
                >
                  Shop Now
                </button>
              </div>
              {/* Render RelatedProducts when there are no orders */}
              {sampleProduct && <RelatedProducts product={sampleProduct} />}
            </div>
          ) : (
            filteredOrders.map((order) => {
              const isStockpile = order.isStockpile;
              const firstStatus = order.firstOrderStatus;

              const isFirstDeclined = isStockpile && firstStatus === "Declined";
              const isFirstPending = isStockpile && firstStatus === "Pending";
              const isFirstAccepted =
                isStockpile && !isFirstDeclined && !isFirstPending;

              return (
                <div key={order.id} className="px-3 py-2">
                  <div
                    className={`shadow-lg px-3 py-4 rounded-lg ${
                      order._isDraft
                        ? "bg-gray-50 border border-dashed border-gray-300 "
                        : "bg-white"
                    }`}
                  >
                    <div className="flex justify-between  items-start mb-2">
                      <div className="flex flex-col">
                        <div className="flex items-center space-x-2">
                          {order.isStockpile ? (
                            <>
                              {order.firstOrderStatus === "Shipped" ? (
                                <>
                                  <TbTruckDelivery className="text-white bg-customOrange h-7 w-7 rounded-full p-1 text-lg" />
                                  <span className="text-sm text-black font-semibold font-opensans">
                                    Shipped
                                  </span>
                                </>
                              ) : order.firstOrderStatus === "Declined" ? (
                                <>
                                  <FaTimes className="text-white bg-gray-200 h-7 w-7 rounded-full p-1 text-lg" />
                                  <span className="text-sm text-black font-semibold font-opensans">
                                    Cancelled
                                  </span>
                                </>
                              ) : order._isDraft ? (
                                <>
                                  <FaMoneyBillTransfer className="text-white bg-customOrange h-7 w-7 rounded-full p-1 text-lg" />
                                  <span className="text-sm text-black font-semibold font-opensans">
                                    Awaiting Payment
                                  </span>
                                </>
                              ) : order.firstOrderStatus === "In Progress" ? (
                                <>
                                  <IoTimeOutline className="text-white bg-customOrange h-7 w-7 rounded-full p-1 text-lg" />
                                  <span className="text-sm text-black font-semibold font-opensans">
                                    In Progress
                                  </span>
                                </>
                              ) : order.firstOrderStatus === "Pending" ? (
                                <>
                                  <MdPendingActions className="text-white bg-customOrange h-7 w-7 rounded-full p-1 text-lg" />
                                  <span className="text-sm text-black font-semibold font-opensans">
                                    Pending Approval
                                  </span>
                                </>
                              ) : order.firstOrderStatus === "Delivered" ? (
                                <>
                                  <FaClipboardCheck className="text-white bg-customOrange h-7 w-7 rounded-full p-1 text-lg" />
                                  <span className="text-sm text-black font-semibold font-opensans">
                                    Delivered
                                  </span>
                                </>
                              ) : (
                                <span className="text-sm text-black font-semibold font-opensans">
                                  {order.firstOrderStatus || "Status Unknown"}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              {order.progressStatus === "Shipped" ? (
                                <>
                                  <TbTruckDelivery className="text-white bg-customOrange h-7 w-7 rounded-full p-1 text-lg" />
                                  <span className="text-sm text-black font-semibold font-opensans">
                                    Shipped
                                  </span>
                                </>
                              ) : order.progressStatus === "Declined" ? (
                                <>
                                  <FaTimes className="text-white bg-gray-200 h-7 w-7 rounded-full p-1 text-lg" />
                                  <span className="text-sm text-black font-semibold font-opensans">
                                    Cancelled
                                  </span>
                                </>
                              ) : order.progressStatus === "In Progress" ? (
                                <>
                                  <IoTimeOutline className="text-white bg-customOrange h-7 w-7 rounded-full p-1 text-lg" />
                                  <span className="text-sm text-black font-semibold font-opensans">
                                    In Progress
                                  </span>
                                </>
                              ) : order._isDraft ? (
                                <>
                                  <FaMoneyBillTransfer className="text-white bg-customOrange h-7 w-7 rounded-full p-1 text-lg" />
                                  <span className="text-sm text-black font-semibold font-opensans">
                                    Awaiting Payment
                                  </span>
                                </>
                              ) : order.progressStatus === "Pending" ? (
                                <>
                                  <MdPendingActions className="text-white bg-customOrange h-7 w-7 rounded-full p-1 text-lg" />
                                  <span className="text-sm text-black font-semibold font-opensans">
                                    Pending Approval
                                  </span>
                                </>
                              ) : order.progressStatus === "Delivered" ? (
                                <>
                                  <FaClipboardCheck className="text-white bg-customOrange h-7 w-7 rounded-full p-1 text-lg" />
                                  <span className="text-sm text-black font-semibold font-opensans">
                                    Delivered
                                  </span>
                                </>
                              ) : (
                                <span className="text-sm text-black font-semibold font-opensans">
                                  {order.progressStatus || "Status Unknown"}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                        <div className="ml-9 -translate-y-1">
                          {order._isDraft ? (
                            // DRAFT: show only the countdown
                            order.expiresAt && (
                              <p className="text-xs text-gray-700 font-opensans">
                                This order will expire in{" "}
                                <span className="text-xs text-red-500 font-semibold font-opensans">
                                  <Countdown
                                    expiresAtMs={order.expiresAt
                                      .toDate()
                                      .getTime()}
                                  />
                                </span>
                              </p>
                            )
                          ) : (
                            // REAL ORDER: show placed-at timestamp
                            <span className="text-xs text-gray-700 font-opensans">
                              {moment(order.createdAt.seconds * 1000).format(
                                "HH:mm, DD/MM/YYYY"
                              )}
                            </span>
                          )}
                        </div>

                        {/* Aligning date under the order status */}
                      </div>
                      {order.isStockpile &&
                        (() => {
                          if (isFirstDeclined) {
                            return (
                              <TbBasketX
                                className="text-red-600 text-2xl cursor-pointer"
                                title="Stockpile Declined"
                                onClick={() => {
                                  toast.error(
                                    `This Stockpile was declined by ${order.vendorName}. You cannot re-pile.`
                                  );
                                }}
                              />
                            );
                          } else if (isFirstPending) {
                            return (
                              <TbBasketQuestion
                                className="text-gray-400 text-2xl cursor-pointer"
                                title="Stockpile Pending"
                                onClick={() => {
                                  toast(
                                    `Stockpile from ${order.vendorName} is still pending approval.`
                                  );
                                }}
                              />
                            );
                          } else {
                            // Check if the stockpile is inactive:
                            const repileDisabled =
                              order.isActive === false || order._isDraft;
                            return (
                              <TbBasketPlus
                                className={`text-2xl ${
                                  repileDisabled
                                    ? "text-gray-400 cursor-not-allowed opacity-50"
                                    : "text-customOrange cursor-pointer"
                                }`}
                                title={
                                  repileDisabled
                                    ? "Stockpile is inactive, cannot repile"
                                    : "Add more items to pile"
                                }
                                onClick={() => {
                                  if (!repileDisabled) {
                                    handleStockpileAddMore(order);
                                  }
                                }}
                              />
                            );
                          }
                        })()}

                      {/* Vendor name aligned on the right */}
                    </div>
                    <div className="border-t border-gray-300 my-2"></div>
                    <OrderStepper
                      orderStatus={
                        order.firstOrderStatus || order.progressStatus
                      }
                      isStockpile={order.isStockpile}
                    />
                    <div className="border-t border-gray-300 my-2"></div>
                    {order.cartItems ? (
                      order.cartItems.map((item, index) => {
                        const itemOrder = item._orderId
                          ? orders.find((o) => o.id === item._orderId)
                          : null;
                        const isDeclined =
                          itemOrder?.progressStatus === "Declined";

                        return (
                          <div
                            key={index}
                            className="flex flex-col items-start py-2 border-b"
                          >
                            <div
                              className={`flex items-center justify-between w-full ${
                                isDeclined ? "opacity-50" : ""
                              }`}
                            >
                              <div className="flex items-center">
                                <img
                                  src={
                                    item.imageUrl ||
                                    "https://via.placeholder.com/150"
                                  }
                                  alt={item.name}
                                  className="w-16 h-16 object-cover rounded-lg mr-4"
                                  onError={(e) => {
                                    e.target.src =
                                      "https://via.placeholder.com/150";
                                  }}
                                />
                                <div>
                                  <h4 className="text-sm font-opensans">
                                    {item.name}
                                  </h4>
                                  <p className="font-opensans text-md mt-2 text-black font-bold">
                                    ₦
                                    {item.price
                                      ? item.price.toLocaleString()
                                      : "0"}
                                  </p>
                                </div>
                              </div>

                              {isDeclined && (
                                <MdCancel
                                  className="text-red-600 text-xl"
                                  title="Order Declined"
                                />
                              )}
                            </div>

                            {index === order.cartItems.length - 1 && (
                              <div className="flex justify-start ml-[77px] mt-2">
                                <button
                                  onClick={() => handleViewOrder(order)}
                                  className="bg-customCream bg-opacity-60 text-xs text-customRichBrown font-opensans font-medium border-2 border-customOrange px-2.5 py-1.5 rounded-full "
                                >
                                  Tap to view
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-red-500">
                        No products found in this order.
                      </p>
                    )}
                    <div className="mt-2">
                      {order._isDraft ? (
                        <div className="mt-2 flex justify-end">
                          <button
                            onClick={() => {
                              const link = `${window.location.origin}/pay/${order.id}`;
                              navigator.clipboard.writeText(link);
                              toast.success("Link copied!");
                            }}
                            className="px-2 py-1.5 z-50 bg-customOrange text-white rounded-md text-xs font-opensans"
                          >
                            Copy Payment Link
                          </button>
                        </div>
                      ) : (
                        <div className="mt-2">
                          <div className="flex justify-end">
                            <span className="text-sm font-opensans font-normal">
                              Order Total:
                            </span>
                            <span className="text-sm font-opensans font-semibold ml-1">
                              ₦{" "}
                              {order.isStockpile && order.combinedTotal
                                ? Number(order.combinedTotal).toLocaleString()
                                : order.total
                                ? Number(order.total).toLocaleString()
                                : "0"}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </>
      )}
      {isModalOpen &&
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
                        id="contact-support-tab"
                        className="text-2xl cursor-pointer"
                        onClick={openChat}
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
                      {
                        label: "Size:",
                        value:
                          selectedOrder.cartItems[activeProductIndex].size ||
                          "N/A",
                      },
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
                        {index < 4 && <div className="border-b my-2"></div>}
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
                  <div className="mt-6">
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
                        isRequestingShipping ||
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
                        isRequestingShipping ||
                        selectedOrder?.requestedForShipping ||
                        selectedOrder?.isActive === false
                          ? "border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed"
                          : "border-customRichBrown text-customRichBrown bg-transparent text-xs font-medium"
                      }`}
                    >
                      {isRequestingShipping
                        ? "Requesting..."
                        : selectedOrder?.requestedForShipping
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
              {showConfirmShippingModal && (
                <ConfirmShippingModal
                  isOpen={showConfirmShippingModal}
                  onClose={() => setShowConfirmShippingModal(false)}
                  onConfirm={() => {
                    handleRequestShipping(orderToRequestShipping);
                    setShowConfirmShippingModal(false);
                  }}
                />
              )}

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
