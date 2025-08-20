// src/components/orders/OrderDetailsModal.js
import React, { useEffect, useState } from "react";
import Modal from "react-modal";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import moment from "moment";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { useTawk } from "../../components/Context/TawkProvider";
import { db } from "../../firebase.config";
import { MdOutlineClose, MdOutlineMail, MdOutlineInfo } from "react-icons/md";
import { BsTelephone, BsBoxSeam } from "react-icons/bs";
import { GrNotes } from "react-icons/gr";
import { LiaCoinsSolid } from "react-icons/lia";
import { ImSad2 } from "react-icons/im";
import { HiReceiptTax } from "react-icons/hi";
import { FaGift, FaSmileBeam } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { MdCancel } from "react-icons/md";
import {
  IoPricetags,
  IoColorPaletteSharp,
  IoLocationOutline,
} from "react-icons/io5";
import PinInput from "react-pin-input";
import notifyOrderStatusChange from "../../services/notifyorderstatus";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase.config";
import { PiCoinsFill } from "react-icons/pi";
import { IoIosBody, IoMdInformationCircleOutline } from "react-icons/io";
import { FaShoppingBag } from "react-icons/fa";
import { AiFillProduct } from "react-icons/ai";
import { FaRegUser, FaUser, FaTruck } from "react-icons/fa6";
import { GoChevronLeft, GoClockFill } from "react-icons/go";
import toast from "react-hot-toast";
import { IoMdCheckmark } from "react-icons/io";
import { RotatingLines } from "react-loader-spinner";
import { serverTimestamp } from "firebase/firestore";

import { BiCoinStack } from "react-icons/bi";
import addActivityNote from "../../services/activityNotes";
import { GiBookPile, GiStarsStack } from "react-icons/gi";
const OrderDetailsModal = ({
  isOpen,
  onClose,
  order,
  fetchVendorRevenue,
  setTotalRevenue,
}) => {
  const [productImages, setProductImages] = useState({});
  const [productDetails, setProductDetails] = useState({});
  const [vendorDeliveryMode, setVendorDeliveryMode] = useState("");
  const [loading, setLoading] = useState(true);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [acceptLoading, setAcceptLoading] = useState(false);

  // New state for tracking the remaining time (in milliseconds)
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [deliverLoading, setDeliverLoading] = useState(false);
  const [isConfirmDeliveryModalOpen, setIsConfirmDeliveryModalOpen] =
    useState(false);
  const [isSupportCallModalOpen, setIsSupportCallModalOpen] = useState(false);
  const [confirmDeliveryChecked, setConfirmDeliveryChecked] = useState(false);

  const [declineLoading, setDeclineLoading] = useState(false);
  const [isMovingToShipping, setIsMovingToShipping] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  // New state variables for Rider Details
  const [isRiderModalOpen, setIsRiderModalOpen] = useState(false);
  const [riderName, setRiderName] = useState("");
  const [riderNumber, setRiderNumber] = useState("");
  const [riderNote, setRiderNote] = useState("");
  const [isSending, setIsSending] = useState(false);

  const [otherReasonText, setOtherReasonText] = useState("");
  const [isDeclineInfoModalOpen, setIsDeclineInfoModalOpen] = useState(false);
  const userId = order?.userId; // Directly access userId from the order document
  const navigate = useNavigate();
  const [stockpileOrders, setStockpileOrders] = useState([]);
  // state
  const [vendorDeliveryPreference, setVendorDeliveryPreference] =
    useState(null);

  const [vendorName, setVendorName] = useState(
    order?.vendorName || "Your Vendor Name"
  );
  const [vendorAmounts, setVendorAmounts] = useState(null);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  useEffect(() => {
    const fetchVendorName = async () => {
      if (!order.vendorName && order.vendorId) {
        const vendorRef = doc(db, "vendors", order.vendorId);
        const vendorSnap = await getDoc(vendorRef);
        if (vendorSnap.exists()) {
          const vendorData = vendorSnap.data();
          const fetchedVendorName = vendorData.shopName || "Unknown Vendor";

          // Update the local state with the fetched vendor name
          setVendorName(fetchedVendorName);
        }
      } else if (order.vendorName) {
        // If vendorName is already present in the order, use it
        setVendorName(order.vendorName);
      }
    };

    if (isOpen && order) {
      fetchVendorName();
    }
  }, [isOpen, order]);

  useEffect(() => {
    const fetchProductDetails = async () => {
      const images = {};
      const details = {};

      for (const item of order.cartItems) {
        const productRef = doc(db, "products", item.productId);
        const productSnap = await getDoc(productRef);

        if (productSnap.exists()) {
          const productData = productSnap.data();

          if (item.subProductId) {
            const subProduct = productData.subProducts?.find(
              (sp) => sp.subProductId === item.subProductId
            );
            if (subProduct) {
              images[item.subProductId] = subProduct.images[0];
              details[item.subProductId] = {
                name: productData.name,
                price: productData.price,
                color: subProduct.color,
                size: subProduct.size,
              };
            }
          } else if (item.variantAttributes) {
            images[item.productId] = productData.imageUrls[0];
            details[item.productId] = {
              name: productData.name,
              price: productData.price,
              color: item.variantAttributes.color,
              size: item.variantAttributes.size,
            };
          } else {
            images[item.productId] = productData.imageUrls[0];
            details[item.productId] = {
              name: productData.name,
              price: productData.price,
            };
          }
        }
      }
      setProductImages(images);
      setProductDetails(details);

      // inside fetchProductDetails (where you read the vendor doc)
      if (order.vendorId) {
        const vendorRef = doc(db, "vendors", order.vendorId);
        const vendorSnap = await getDoc(vendorRef);
        if (vendorSnap.exists()) {
          const v = vendorSnap.data();
          setVendorDeliveryMode(v.deliveryMode || "Not Specified");
          setVendorDeliveryPreference(v.deliveryPreference || null); // "platform" | "self"
        }
      }
      setLoading(false);
    };

    if (isOpen && order) {
      fetchProductDetails();
    }
  }, [isOpen, order]);
  // Add these imports at the top if not already imported

  // Effect to update countdown every second based on order.endDate
  useEffect(() => {
    if (order && order.endDate) {
      const intervalId = setInterval(() => {
        // Convert Firestore Timestamp to Date if needed
        const endDate = order.endDate.toDate
          ? order.endDate.toDate()
          : order.endDate;
        const now = moment();
        const end = moment(endDate);
        const diff = end.diff(now); // in ms
        setTimeRemaining(diff > 0 ? diff : 0);
      }, 1000);

      return () => clearInterval(intervalId);
    }
  }, [order]);

  useEffect(() => {
    const fetchStockpileOrders = async () => {
      if (order.isStockpile && order.stockpileDocId) {
        const q = collection(db, "orders");
        const stockpileQuery =
          order.vendorId && order.stockpileDocId
            ? query(
                q,
                where("vendorId", "==", order.vendorId),
                where("stockpileDocId", "==", order.stockpileDocId)
              )
            : null;
        if (stockpileQuery) {
          const snapshot = await getDocs(stockpileQuery);
          const ordersData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          ordersData.sort((a, b) => a.createdAt.seconds - b.createdAt.seconds);
          setStockpileOrders(ordersData);
        }
      }
    };

    if (isOpen && order && order.isStockpile) {
      fetchStockpileOrders();
    }
  }, [isOpen, order]);

  const handleDecline = async () => {
    if (!declineReason && otherReasonText === "") {
      toast.error("Select a reason or type one.");
      return;
    }
    const finalReason =
      declineReason === "Other" ? otherReasonText : declineReason;

    setDeclineLoading(true);
    try {
      /* ---------- 1. trigger Cloud Function ---------- */
      const declineFn = httpsCallable(functions, "declineVendorOrder");
      const { data } = await declineFn({
        orderId: order.id,
        declineReason: finalReason,
      });

      if (data.alreadyDeclined) {
        toast.success("Order already declined");
        onClose();
        return;
      }

      /* ---------- 2. local helpers (images, notifications, notes) ---------- */
      // vendorCoverImage & productImage – same look‑ups you already have
      const vendorSnap = await getDoc(doc(db, "vendors", order.vendorId));
      const vendorCoverImage = vendorSnap.exists()
        ? vendorSnap.data().coverImageUrl ?? null
        : null;

      let productImage = null;
      if (order.cartItems?.length) {
        const first = order.cartItems[0];
        const prod = await getDoc(doc(db, "products", first.productId));
        if (prod.exists()) {
          const pd = prod.data();
          productImage = first.subProductId
            ? pd.subProducts?.find(
                (sp) => sp.subProductId === first.subProductId
              )?.images?.[0] || null
            : pd.imageUrls?.[0] || null;
        }
      }

      await notifyOrderStatusChange(
        order.userId,
        order.id,
        "Declined",
        vendorSnap.data()?.shopName || "Vendor",
        vendorCoverImage,
        productImage,
        finalReason,
        null
      );

      await addActivityNote(
        order.vendorId,
        "Order Declined 🛑",
        `Order with ID: ${order.id} was declined. Reason: ${finalReason}.`,
        "order"
      );

      toast.success("Order declined successfully");
      onClose();
    } catch (err) {
      console.error("declineVendorOrder failed:", err);
      toast.error("Failed to decline the order");
    } finally {
      setDeclineLoading(false);
    }
  };
  const handleMoveToShippingWithRider = async () => {
    setIsMovingToShipping(true);
    try {
      // 1) If you don't already have stockpileOrders, fetch them
      if (!stockpileOrders || stockpileOrders.length === 0) {
        throw new Error("No stockpile orders available.");
      }

      // 2) Identify the primary order (e.g. first in sorted array)
      const primaryOrder = stockpileOrders[0];

      // 3) Loop over *all* orders in the stockpile
      for (const stockOrder of stockpileOrders) {
        // Skip if this sub-order was previously Declined
        if (stockOrder.progressStatus === "Declined") {
          continue; // do not overwrite Declined orders
        }

        const orderRef = doc(db, "orders", stockOrder.id);

        // If it’s the primary doc, also update rider info
        if (stockOrder.id === primaryOrder.id) {
          await updateDoc(orderRef, {
            progressStatus: "Shipped",
            riderInfo: {
              riderName,
              riderNumber,
              note: riderNote,
            },
            shippedAt: serverTimestamp(),
          });
        } else {
          // For the “repile” docs, just set progressStatus to "Shipped"
          // to keep them consistent, but skip notifications
          await updateDoc(orderRef, { progressStatus: "Shipped" });
        }
      }

      // 4) Optionally update the stockpile doc to set isActive = false
      if (order.stockpileDocId) {
        const stockpileRef = doc(db, "stockpiles", order.stockpileDocId);
        await updateDoc(stockpileRef, { isActive: false });
      }

      // 5) Add an activity note for the vendor
      await addActivityNote(
        primaryOrder.vendorId,
        "Stockpile Shipped",
        `Stockpile (ID: ${order.stockpileDocId}) has been shipped. Rider: ${riderName}`,
        "order"
      );

      // 6) Call the Cloud Function to notify the user (via email and SMS)
      const notifyUserStockpileUpdate = httpsCallable(
        functions,
        "notifyUserStockpileUpdate"
      );
      await notifyUserStockpileUpdate({
        eventType: "shipping",
        userEmail: primaryOrder.userInfo.email, // assumes userInfo contains the email
        userName: primaryOrder.userInfo.displayName,
        orderId: primaryOrder.id,
        stockpileDocId: primaryOrder.stockpileDocId,
        vendorName, // make sure vendorName is defined in your component or passed as needed
        riderInfo: {
          riderName,
          riderNumber,
          note: riderNote,
        },
        userPhone: primaryOrder.userInfo.phoneNumber,
      });

      toast.success("Stockpile moved to Shipping successfully.");
      setIsRiderModalOpen(false);
      onClose();
    } catch (error) {
      console.error("Error moving stockpile to shipping:", error);
      toast.error("Failed to move stockpile to Shipping.");
    } finally {
      setIsMovingToShipping(false);
    }
  };

  const closeRiderModal = () => {
    setIsRiderModalOpen(false);
  };
  const handleAccept = async () => {
    setAcceptLoading(true);
    try {
      /* ----------------------------------------------------
       * 0.  (optional) read some quick data you still need
       * -------------------------------------------------- */
      const orderRef = doc(db, "orders", order.id);
      const orderSnap = await getDoc(orderRef);
      if (!orderSnap.exists()) {
        toast.error("Order not found");
        return;
      }
      const orderData = orderSnap.data();

      /* ----------------------------------------------------
       * 1.  call the Cloud Function
       * -------------------------------------------------- */
      const acceptFn = httpsCallable(functions, "acceptVendorOrder");
      const result = await acceptFn({ orderId: order.id });

      // everything inside result.data is what you `return`‑ed
      const { alreadyAccepted, vendor60Pay, isStockpile, stockpileDuration } =
        result.data || {};

      if (alreadyAccepted) {
        toast.success("Order already accepted ✅");
        onClose();
        return;
      }

      /* ----------------------------------------------------
       * 2.  do the *pure‑UI* things that still belong here
       * -------------------------------------------------- */

      /* 2a — cover / product images (still local look‑ups) */
      let vendorCoverImage = null;
      let productImage = null;

      const vendorSnap = await getDoc(doc(db, "vendors", order.vendorId));
      if (vendorSnap.exists()) {
        vendorCoverImage = vendorSnap.data().coverImageUrl || null;
      }

      if (order.cartItems?.length) {
        const first = order.cartItems[0];
        const prod = await getDoc(doc(db, "products", first.productId));
        if (prod.exists()) {
          const pd = prod.data();
          productImage = first.subProductId
            ? pd.subProducts?.find(
                (sp) => sp.subProductId === first.subProductId
              )?.images?.[0] || null
            : pd.imageUrls?.[0] || null;
        }
      }

      /* 2b — local helpers */
      await notifyOrderStatusChange(
        orderData.userId,
        order.id,
        "In Progress",
        vendorSnap.data()?.shopName || "Vendor",
        vendorCoverImage,
        productImage,
        null,
        null
      );

      if (!isStockpile && vendor60Pay) {
        const amt = `₦${Number(vendor60Pay).toLocaleString()}`;
        await addActivityNote(
          order.vendorId,
          "You’ve Been Credited 💰",
          `You’ve received ${amt} as a 60% payout for order ID: ${order.id}.`,
          "transactions"
        );
      } else if (isStockpile) {
        await addActivityNote(
          order.vendorId,
          "Stockpile Payment in Full 💰",
          `You have been paid in full for the stockpile order (ID: ${order.id}).`,
          "transactions"
        );
      }

      toast.success("Order accepted successfully");
      onClose();
    } catch (err) {
      console.error("acceptVendorOrder failed:", err);
      toast.error("Failed to accept the order");
    } finally {
      setAcceptLoading(false);
    }
  };

  // Make sure to convert each order's subtotal to a number safely
  const totalSubtotal = stockpileOrders.reduce((acc, curr) => {
    // Only count orders that have been accepted
    if (curr.vendorStatus !== "accepted") return acc;
    const val = parseFloat(curr.subtotal);
    return acc + (isNaN(val) ? 0 : val);
  }, 0);

  useEffect(() => {
    /*  ───────────────────────────────────────────────────────────────
      Fetch the vendor 40 / 60 percentages for the given order
  ────────────────────────────────────────────────────────────────── */
    const fetchVendorPercentages = async () => {
      console.groupCollapsed("[Vendor %] 🔄 fetchVendorPercentages()");
      try {
        /* ── 0. Sanity-check props ─────────────────────────────── */
        console.log("isOpen prop →", isOpen);
        console.log("order prop  →", order);

        if (!order?.id) {
          console.warn("⌛ No order.id – aborting.");
          return;
        }

        /* ── 1. Load Firestore order doc ────────────────────────── */
        const orderRef = doc(db, "orders", order.id);
        console.log("📄 Getting Firestore doc → orders/%s", order.id);
        const orderSnap = await getDoc(orderRef);

        if (!orderSnap.exists()) {
          console.error("❌ Firestore doc not found (orders/%s)", order.id);
          return;
        }

        const orderData = orderSnap.data();
        console.log("✅ Firestore data:", orderData);

        const { orderReference, vendorId } = orderData;
        if (!orderReference || !vendorId) {
          console.warn("⚠️ orderReference or vendorId missing on doc.");
          return;
        }

        /* ── 2. Build the API URL ──────────────────────────────── */
        const base = import.meta.env.VITE_API_BASE_URL;
        const token = import.meta.env.VITE_RESOLVE_TOKEN;
        console.log("🔐 ENV  VITE_API_BASE_URL   →", base);
        console.log(
          "🔐 ENV  VITE_RESOLVE_TOKEN →",
          token ? "[present]" : "[undefined]"
        );

        const url =
          base.replace(/\/$/, "") + // remove trailing slash if present
          "/transaction-percentages" + // add our endpoint
          `?vendorId=${encodeURIComponent(vendorId)}` +
          `&orderReference=${encodeURIComponent(orderReference)}`;

        /* ── 3. Call the endpoint ──────────────────────────────── */
        const response = await fetch(url.toString(), {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log(`↩︎  HTTP ${response.status} – ${response.statusText}`);

        /* ── 4. Parse body (even on errors for debugging) ───────── */
        const bodyText = await response.text();
        let body;
        try {
          body = JSON.parse(bodyText);
        } catch {
          body = bodyText;
        }
        console.log("📝 Response body:", body);

        if (!response.ok) {
          console.error("❌ Network / server error – aborting.");
          return;
        }

        if (!body || body.status !== true || !body.data) {
          console.warn("⚠️ Unexpected JSON shape:", body);
          return;
        }

        /* ── 5. Normalise & set state ──────────────────────────── */
        const { "forty-percent": forty, "sixty-percent": sixty } = body.data;
        setVendorAmounts({ vendor40Pay: forty, vendor60Pay: sixty });

        console.log("💾 State updated →", {
          vendor40Pay: forty,
          vendor60Pay: sixty,
        });
      } catch (err) {
        console.error("🚨 Exception in fetchVendorPercentages:", err);
      } finally {
        console.groupEnd();
      }
    };

    /* Trigger only when the sheet is open & an order is present */
    if (isOpen && order) {
      fetchVendorPercentages();
    } else {
      console.log(
        "[Vendor %] Sheet closed or order undefined – skipping fetch."
      );
    }
  }, [isOpen, order, db]);

  // Determine if the stockpile has matured (end date reached)
  const isMature = order?.endDate ? timeRemaining === 0 : false;

  const formattedTime = () => {
    if (timeRemaining === null || timeRemaining === 0) return "";
    const duration = moment.duration(timeRemaining);
    const days = duration.days();
    const hours = duration.hours();
    const minutes = duration.minutes();
    const seconds = duration.seconds();
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  };

  const handleMarkAsDelivered = async () => {
    if (!confirmDeliveryChecked) return;

    setDeliverLoading(true);
    try {
      const markFn = httpsCallable(functions, "markOrderDelivered");
      const { data } = await markFn({ orderId: order.id });

      if (data.alreadyDelivered) {
        toast.success("Order is already delivered ✅");
        onClose();
        return;
      }

      // 2a — vendorName, cover, and deliveryPreference
      let vendorName = order.vendorName;
      let vendorCoverImage = null;
      let isPlatform = false;

      if (!vendorName && order.vendorId) {
        const vSnap = await getDoc(doc(db, "vendors", order.vendorId));
        if (vSnap.exists()) {
          const vData = vSnap.data();
          vendorName = vData.shopName || "Unknown Vendor";
          vendorCoverImage = vData.coverImageUrl || null;
          isPlatform =
            (vData.deliveryPreference || "").toLowerCase() === "platform";
        }
      }

      // 2b — first product image (unchanged)
      let productImage = null;
      if (order.cartItems?.length) {
        const first = order.cartItems[0];
        const pSnap = await getDoc(doc(db, "products", first.productId));
        if (pSnap.exists()) {
          const pd = pSnap.data();
          productImage = first.subProductId
            ? pd.subProducts?.find(
                (sp) => sp.subProductId === first.subProductId
              )?.images?.[0] || null
            : pd.imageUrls?.[0] || null;
        }
      }

      // 2c — notify user ONLY if not Kwik AND not platform
      if (!order.kwikJob && !isPlatform) {
        await notifyOrderStatusChange(
          order.userId,
          order.id,
          "Delivered",
          vendorName,
          vendorCoverImage,
          productImage
        );
      }

      // 2d — activity note (unchanged)
      await addActivityNote(
        order.vendorId,
        "Order Delivered 😊",
        "You marked this order as delivered.",
        "order"
      );

      // cache clear + revenue refresh (unchanged)
      localStorage.removeItem(`vendorRevenue_${order.vendorId}`);
      localStorage.removeItem(`vendorRevenue_time_${order.vendorId}`);
      fetchVendorRevenue(order.vendorId)
        .then(setTotalRevenue)
        .catch(() => {});

      toast.success("Order marked as delivered!");
      onClose();
    } catch (err) {
      console.error("markOrderDelivered failed:", err);
      toast.error("Failed to mark as delivered. Please try again.");
    } finally {
      setDeliverLoading(false);
      setIsConfirmDeliveryModalOpen(false);
    }
  };

  const handleMarkStockpileAsDelivered = async () => {
    setDeliverLoading(true);
    try {
      /* 1️⃣ call Cloud Function */
      const markFn = httpsCallable(functions, "markStockpileDelivered");
      const { data } = await markFn({ stockpileDocId: order.stockpileDocId });

      if (data.alreadyDelivered) {
        toast.success("Stockpile already delivered ✅");
        onClose();
        return;
      }

      /* 2️⃣ FE‑only helpers (same as before) -------------------------- */
      // 2a. figure out primary order (we still have stockpileOrders in state)
      const primaryOrder =
        stockpileOrders.find((o) => o.id === data.primaryOrderId) ||
        stockpileOrders[0];

      /* vendorName / cover */
      let vendorName = order.vendorName;
      let vendorCoverImage = null;
      if (!vendorName && order.vendorId) {
        const vSnap = await getDoc(doc(db, "vendors", order.vendorId));
        if (vSnap.exists()) {
          const vd = vSnap.data();
          vendorName = vd.shopName || "Unknown Vendor";
          vendorCoverImage = vd.coverImageUrl || null;
        }
      }

      /* first product image */
      let productImage = null;
      if (primaryOrder.cartItems?.length) {
        const first = primaryOrder.cartItems[0];
        const pSnap = await getDoc(doc(db, "products", first.productId));
        if (pSnap.exists()) {
          const pd = pSnap.data();
          productImage = first.subProductId
            ? pd.subProducts?.find(
                (sp) => sp.subProductId === first.subProductId
              )?.images?.[0] || null
            : pd.imageUrls?.[0] || null;
        }
      }

      /* 2b. in‑app notification + activity note */
      await notifyOrderStatusChange(
        data.userId,
        primaryOrder.id,
        "Delivered",
        vendorName,
        vendorCoverImage,
        productImage
      );

      await addActivityNote(
        data.vendorId,
        "Stockpile Delivered 😊",
        "You’ve marked this entire stockpile as delivered. If this was a mistake, reach out immediately!",
        "order"
      );

      /* 2c. revenue refresh */
      localStorage.removeItem(`vendorRevenue_${data.vendorId}`);
      localStorage.removeItem(`vendorRevenue_time_${data.vendorId}`);
      fetchVendorRevenue(data.vendorId)
        .then((rev) => setTotalRevenue(rev))
        .catch(() => console.error("Failed to refresh vendor revenue"));

      /* 3️⃣ UI feedback */
      toast.success("Stockpile marked as delivered. Congrats!");
      onClose();
    } catch (err) {
      console.error("markStockpileAsDelivered failed:", err);
      toast.error("Failed to mark stockpile as delivered");
    } finally {
      setDeliverLoading(false);
      setIsConfirmDeliveryModalOpen(false);
    }
  };
  const { openChat } = useTawk();
  const handleNavigation = () => {
    navigate("/delivery-guidelines");
  };
  const handleDeclineInfoModal = () => {
    setIsDeclineInfoModalOpen(true);
  };

  const handleSend = () => {
    if (!declineReason || (declineReason === "Other" && !otherReasonText)) {
      toast.error("Please select or enter a reason for decline.");
      return;
    }
    const finalReason =
      declineReason === "Other" ? otherReasonText : declineReason;
    handleDecline(finalReason);
  };

  const handleProceedCall = () => {
    setIsCallModalOpen(false);
    window.open(`tel:${userInfo.phoneNumber}`, "_self");
  };

  const handleContactUs = () => {
    setIsSupportCallModalOpen(true);
  };

  const handleProceedCallSupport = () => {
    setIsSupportCallModalOpen(false);
    window.open(`tel:08105911662`, "_self");
  };
  if (!order) {
    return null;
  }
  // If an order is a stockpile + pending, we want to hide start/end date & show doc's own subtotal
  const shouldHideStockpileDates =
    order.isStockpile && order.progressStatus === "Pending";

  const {
    userInfo,
    cartItems,
    progressStatus,
    note,
    createdAt,
    subtotal,
    riderInfo = {},
  } = order;

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="Order Details"
      ariaHideApp={false}
      className="modal-content-order"
      overlayClassName="modal-overlay"
    >
      <div className="relative h-full pb-12 px-3 overflow-y-auto space-y-4">
        {/* Sticky Header */}
        <div className="sticky -top-1 bg-white z-10 py-4  flex justify-between items-center ">
          <GoChevronLeft
            className="text-2xl cursor-pointer"
            onClick={onClose}
          />
          <h1 className="font-opensans text-black font-semibold text-base">
            {order.isStockpile ? "Stockpile Details" : "Order Details"}
          </h1>

          {progressStatus === "Declined" ? (
            <IoMdInformationCircleOutline
              className="text-xl text-customRichBrown cursor-pointer"
              onClick={handleDeclineInfoModal}
            />
          ) : (
            <BsTelephone
              className={`text-xl cursor-pointer ${
                progressStatus === "Delivered"
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
              onClick={() => {
                if (
                  progressStatus === "Pending" ||
                  progressStatus === "Shipped" ||
                  progressStatus === "In Progress"
                ) {
                  setIsCallModalOpen(true);
                } else if (progressStatus === "Delivered") {
                  toast.error("Cannot call, order is already delivered");
                }
              }}
            />
          )}
        </div>
        <Modal
          isOpen={isCallModalOpen}
          onRequestClose={() => setIsCallModalOpen(false)}
          contentLabel="Call Confirmation"
          ariaHideApp={false}
          className="modal-content-reason"
          overlayClassName="modal-overlay"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-rose-100 flex justify-center items-center rounded-full">
                <FaSmileBeam className="text-customRichBrown" />
              </div>
              <h2 className="font-opensans text-base font-semibold">
                Call Confirmation
              </h2>
            </div>
            <MdOutlineClose
              className="text-black text-xl cursor-pointer"
              onClick={() => setIsCallModalOpen(false)}
            />
          </div>
          <p className="text-xs text-gray-700 font-opensans mb-6">
            As you prepare to speak with a potential customer, remember to be
            friendly and approachable. You can call them to:
          </p>
          <div className="text-xs text-gray-700 font-opensans mb-6 space-y-4">
            <div>
              <p className="font-semibold font-opensans text-sm text-black">
                1. Confirm their Order:
              </p>
              <p className="font-opensans text-xs">
                Ensure they are aware of the details of their order and that
                everything is correct.
              </p>
            </div>
            <hr className="my-2 border-gray-200" />
            <div>
              <p className="font-semibold font-opensans text-sm text-black">
                2. Notify them about Order Status:
              </p>
              <p className="font-opensans text-xs">
                Provide updates on their order status to keep them informed and
                engaged.
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-700 font-opensans mb-6">
            Always maintain a polite tone throughout the conversation, as this
            reflects our commitment to excellent customer service. Please adhere
            to our communication guidelines to create a positive experience for
            our customers.
          </p>

          <div className="flex justify-end">
            <button
              onClick={handleProceedCall}
              className="bg-customOrange text-white font-opensans py-2 px-8 rounded-full"
            >
              Proceed
            </button>
          </div>
        </Modal>
        {/* Customer Details */}
        <div className="border border-black rounded-lg py-4 px-3">
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-8 h-8 bg-rose-100 flex justify-center items-center rounded-full">
              <FaUser className="text-customRichBrown" />
            </div>
            <p className="text-sm font-opensans font-medium text-customRichBrown">
              {progressStatus === "Declined"
                ? "Decline Reason"
                : "Customer Details"}
            </p>
          </div>

          <div className="space-y-4">
            {progressStatus === "Declined" ? (
              // Show decline reason if the order is declined
              <div className="flex items-center space-x-2 pb-2 border-b border-gray-100">
                <GrNotes className="text-gray-500 text-xl" />
                <p className="ml-6 font-opensans text-black text-sm flex-grow">
                  {order.declineReason || "No reason provided"}
                </p>
              </div>
            ) : (
              // Show customer details if the order is not declined
              <>
                <div className="flex items-center space-x-2 pb-2 border-b border-gray-100">
                  <FaRegUser className="text-gray-500 text-xl" />
                  <p className="text-gray-500 text-sm font-opensans">Name:</p>
                  <p className="ml-6 font-opensans text-black text-sm flex-grow">
                    {loading ? (
                      <Skeleton width={100} />
                    ) : (
                      userInfo?.displayName || "Unknown User"
                    )}
                  </p>
                </div>
                <div className="flex items-center space-x-2 pb-2 border-b border-gray-100">
                  <MdOutlineMail className="text-gray-500 text-xl" />
                  <p className="text-gray-500 text-sm font-opensans">Email:</p>
                  <p
                    className={`ml-6 font-opensans text-black text-sm flex-grow ${
                      progressStatus === "Delivered" ? "blur-sm" : ""
                    }`}
                  >
                    {loading ? (
                      <Skeleton width={150} />
                    ) : (
                      userInfo.email || "Not Available"
                    )}
                  </p>
                </div>
                <div className="flex items-center space-x-2 pb-2 border-b border-gray-100">
                  <BsTelephone className="text-gray-500 text-xl" />
                  <p className="text-gray-500 text-sm font-opensans">Phone:</p>
                  <p
                    className={`ml-6 font-opensans text-black text-sm flex-grow ${
                      progressStatus === "Delivered" ? "blur-sm" : ""
                    }`}
                  >
                    {loading ? (
                      <Skeleton width={120} />
                    ) : (
                      userInfo.phoneNumber || "Not Available"
                    )}
                  </p>
                </div>
                {/* Location — hide for pickup or platform-delivery vendors */}
                {!(
                  order.isPickup ||
                  (vendorDeliveryPreference || "").toLowerCase() === "platform"
                ) && (
                  <div className="flex items-center space-x-2 pb-2 border-b border-gray-100">
                    <IoLocationOutline className="text-gray-500 text-xl" />
                    <p className="text-gray-500 text-sm font-opensans">
                      Location:
                    </p>
                    <p
                      className={`ml-6 font-opensans text-black text-sm flex-grow ${
                        progressStatus === "Delivered" ? "blur-sm" : ""
                      }`}
                    >
                      {loading ? (
                        <Skeleton width={200} />
                      ) : (
                        userInfo.address || "Not Available"
                      )}
                    </p>
                  </div>
                )}

                <div className="flex items-center space-x-2 pb-2 border-b border-gray-100">
                  <BsBoxSeam className="text-gray-500 text-xl" />
                  <p className="text-gray-500 text-sm font-opensans">
                    {order.isStockpile ? "Stockpile ID:" : "Order ID:"}
                  </p>
                  <p className="ml-6 font-opensans text-black text-sm flex-grow">
                    {order.isStockpile ? order.stockpileDocId : order.id}
                  </p>
                </div>
                {order.isStockpile &&
                  order.stockpileDuration &&
                  order.progressStatus !== "Pending" && (
                    <>
                      {/* Duration */}
                      <div className="flex items-center space-x-2 pb-2 border-b border-gray-100">
                        <GiBookPile className="text-gray-500 text-xl" />
                        <p className="text-gray-500 text-sm font-opensans">
                          Duration:
                        </p>
                        <p className="ml-6 font-opensans text-black text-sm flex-grow">
                          {order.stockpileDuration || "Not Available"} weeks
                        </p>
                      </div>

                      {/* Start Date */}
                      <div className="flex items-center space-x-2 pb-2 border-b border-gray-100">
                        <GoClockFill className="text-gray-500 text-xl" />
                        <p className="text-gray-500 text-sm font-opensans">
                          Start Date:
                        </p>
                        <p className="ml-6 font-opensans text-black text-sm flex-grow">
                          {order.startDate
                            ? moment(order.startDate.toDate()).format(
                                "DD/MM/YYYY"
                              )
                            : "Not Available"}
                        </p>
                      </div>

                      {/* End Date */}
                      <div className="flex items-center space-x-2 pb-2 border-b border-gray-100">
                        <GoClockFill className="text-gray-500 text-xl" />
                        <p className="text-gray-500 text-sm font-opensans">
                          End Date:
                        </p>
                        <p className="ml-6 font-opensans text-black text-sm flex-grow">
                          {order.endDate
                            ? moment(order.endDate.toDate()).format(
                                "DD/MM/YYYY"
                              )
                            : "Not Available"}
                        </p>
                      </div>
                    </>
                  )}

                {note && (
                  <div className="flex items-start space-x-2 pb-2 border-b border-gray-100">
                    <GrNotes className="text-gray-500 text-xl mt-1" />
                    <p className="text-gray-500 text-sm font-opensans">Note:</p>
                    <p className="ml-6 font-opensans text-black text-sm flex-grow">
                      {note}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {!order.isPickup &&
          (order.progressStatus === "Shipped" ||
            order.progressStatus === "Delivered") && (
            <div className="border border-black rounded-lg py-4 px-3 mt-4">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-8 h-8 bg-rose-100 flex justify-center items-center rounded-full">
                  <FaTruck className="text-customRichBrown" />
                </div>
                <p className="text-sm font-opensans font-medium text-customRichBrown">
                  Rider Details
                </p>
              </div>

              <div className="space-y-4">
                {/* Rider Name */}
                <div className="flex items-center space-x-2 pb-2 border-b border-gray-100">
                  <FaRegUser className="text-gray-500 text-xl" />
                  <p className="text-gray-500 text-sm font-opensans">
                    Rider Name:
                  </p>
                  <p className="ml-6 font-opensans text-black text-sm flex-grow">
                    {riderInfo?.riderName || "Not Available"}
                  </p>
                </div>

                {/* Rider Phone */}
                <div className="flex items-center space-x-2 pb-2 border-b border-gray-100">
                  <BsTelephone className="text-gray-500 text-xl" />
                  <p className="text-gray-500 text-sm font-opensans">
                    Rider Phone:
                  </p>
                  <p className="ml-6 font-opensans text-black text-sm flex-grow">
                    {riderInfo?.riderNumber || "Not Available"}
                  </p>
                </div>

                {/* Rider Note */}
                <div className="flex items-center space-x-2 pb-2 border-b border-gray-100">
                  <GrNotes className="text-gray-500 text-xl" />
                  <p className="text-gray-500 text-sm font-opensans">Note:</p>
                  <p className="ml-6 font-opensans text-black text-sm flex-grow">
                    {riderInfo?.note || "None"}
                  </p>
                </div>
              </div>
            </div>
          )}
        {/* Product Details */}
        <div className="bg-white rounded-lg space-y-6">
          {cartItems.map((item, index) => (
            <div key={index} className="text-sm text-gray-700 mb-4">
              {loading ? (
                <Skeleton height={240} />
              ) : (
                productImages[item.subProductId || item.productId] && (
                  <img
                    src={productImages[item.subProductId || item.productId]}
                    alt="Product Image"
                    className="w-full h-60 p-1 border-opacity-45 border-dashed border-customBrown border-2 object-cover rounded mb-4"
                  />
                )
              )}

              <div className="border border-black rounded-lg py-4 px-3">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-rose-100 flex justify-center items-center rounded-full">
                    <AiFillProduct className="text-customRichBrown text-xl" />
                  </div>
                  <p className="ml-2 text-base font-opensans font-medium text-customRichBrown">
                    Product {index + 1}
                  </p>
                </div>

                {/* Product Details */}
                <div className="space-y-3 mt-4">
                  <div className="flex items-center pb-3 border-b border-gray-100">
                    <AiFillProduct className="text-orange-700 text-xl" />
                    <p className="ml-3 text-gray-500 text-sm font-opensans">
                      Product Name:
                    </p>
                    <p className="ml-10 font-opensans text-black text-sm flex-grow">
                      {loading ? (
                        <Skeleton width={100} />
                      ) : (
                        productDetails[item.subProductId || item.productId]
                          ?.name || "Unknown Product"
                      )}
                    </p>
                  </div>

                  <div className="flex items-center pb-3 border-b border-gray-100">
                    <IoPricetags className="text-green-500 text-xl" />
                    <p className="ml-3 text-gray-500 text-sm font-opensans">
                      Price:
                    </p>
                    <p className="ml-10 font-opensans bg-green-100 px-2 h-6 text-black text-sm flex justify-center items-center rounded-md">
                      {loading ? (
                        <Skeleton width={60} />
                      ) : (
                        `₦${
                          productDetails[
                            item.subProductId || item.productId
                          ]?.price.toLocaleString() || "N/A"
                        }`
                      )}
                    </p>
                  </div>

                  <div className="flex items-center pb-3 border-b border-gray-100">
                    <FaShoppingBag className="text-blue-800 text-xl" />
                    <p className="ml-3 text-gray-500 text-sm font-opensans">
                      Quantity:
                    </p>
                    <p className="ml-10 font-opensans bg-blue-100 px-2 h-6 rounded-md text-black text-sm flex justify-center items-center">
                      {loading ? <Skeleton width={20} /> : item.quantity}
                    </p>
                  </div>

                  <div className="flex items-center pb-3 border-b border-gray-100">
                    <IoColorPaletteSharp className="text-orange-700 text-xl" />
                    <p className="ml-3 text-gray-500 text-sm font-opensans">
                      Color:
                    </p>
                    <p className="ml-10 font-opensans text-black text-sm flex-grow">
                      {loading ? (
                        <Skeleton width={80} />
                      ) : (
                        productDetails[item.subProductId]?.color ||
                        item.variantAttributes?.color ||
                        "N/A"
                      )}
                    </p>
                  </div>

                  <div className="flex items-center pb-3 border-b border-gray-100">
                    <IoIosBody className="text-blue-800 text-xl" />
                    <p className="ml-3 text-gray-500 text-sm font-opensans">
                      Size:
                    </p>
                    <p className="ml-10 font-opensans text-black text-sm flex-grow">
                      {loading ? (
                        <Skeleton width={50} />
                      ) : (
                        productDetails[item.subProductId]?.size ||
                        item.variantAttributes?.size ||
                        "N/A"
                      )}
                    </p>
                  </div>

                  <div className="flex items-center pb-3 border-b border-gray-100">
                    <GoClockFill className="text-indigo-700 text-xl" />
                    <p className="ml-3 text-gray-500 text-sm font-opensans">
                      Status:
                    </p>
                    <p className="ml-10 font-opensans text-black text-sm">
                      <span
                        className={`${
                          order.progressStatus === "Pending"
                            ? "text-black px-2 bg-yellow-100 h-6 rounded-md flex justify-center items-center"
                            : order.progressStatus === "In Progress"
                            ? "text-black px-2 bg-blue-100 h-6 rounded-md flex justify-center items-center"
                            : order.progressStatus === "Shipped"
                            ? "text-black px-2 bg-green-100 h-6 rounded-md flex justify-center items-center"
                            : order.progressStatus === "Delivered"
                            ? "text-white px-2 bg-green-600 h-6 rounded-md flex justify-center items-center"
                            : "text-black px-2 bg-red-100 h-6 rounded-md flex justify-center items-center"
                        }`}
                      >
                        {loading ? (
                          <Skeleton width={50} />
                        ) : (
                          <>
                            {order.progressStatus === "Delivered" && (
                              <GiStarsStack className="mr-1 text-yellow-300" />
                            )}
                            {order.progressStatus}
                          </>
                        )}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center pb-3 border-b border-gray-100">
                    <FaTruck className="text-orange-700 text-xl" />
                    <p className="ml-3 text-gray-500 text-sm font-opensans">
                      Delivery Mode:
                    </p>
                    <p className="ml-4 font-opensans text-black text-sm flex-grow">
                      {loading ? (
                        <Skeleton width={100} />
                      ) : order.isPickup ? (
                        "Pick-up"
                      ) : order.isStockpile ? (
                        order.isActive ? (
                          "Delivery when stockpile has ended"
                        ) : (
                          "Delivery"
                        )
                      ) : vendorDeliveryPreference === "platform" ? (
                        "Delivery handled by My Thrift logistics partners"
                      ) : vendorDeliveryPreference === "self" ? (
                        "Delivery handled by you"
                      ) : order.deliveryInfo ? (
                        // fallback if you still want to show the Kwik phrase when present
                        `${vendorDeliveryMode} with Kwik Logistics`
                      ) : (
                        vendorDeliveryMode || "Not Specified"
                      )}
                    </p>
                  </div>

                  {/* For Stockpile Orders, show each product's order id and creation time */}
                  {order.isStockpile && (
                    <>
                      <div className="flex items-center pb-3 border-b border-gray-100">
                        <BsBoxSeam className="text-gray-500 text-xl" />
                        <p className="ml-3 text-gray-500 text-sm font-opensans">
                          Order ID:
                        </p>
                        <p className="ml-10 font-opensans text-black text-sm flex-grow">
                          {item._orderId || order.id}
                        </p>
                      </div>

                      <div className="flex items-center pb-3 border-b border-gray-100">
                        <GoClockFill className="text-indigo-700 text-xl" />
                        <p className="ml-3 text-gray-500 text-sm font-opensans">
                          Created At:
                        </p>
                        <p className="ml-10 font-opensans text-black text-sm flex-grow">
                          {item._orderCreatedAt
                            ? moment(item._orderCreatedAt.toDate()).format(
                                "MMMM DD [at] hh:mm A"
                              )
                            : moment(order.createdAt.seconds * 1000).format(
                                "MMMM DD [at] hh:mm A"
                              )}
                        </p>
                      </div>
                    </>
                  )}

                  {/* <div className="flex items-center pb-3 border-b border-gray-100">
                    <AiFillProduct className="text-orange-700 text-xl" />
                    <p className="ml-3 text-gray-500 text-sm font-opensans">
                      Created At:
                    </p>
                    <p className="ml-10 font-opensans text-black text-sm">
                      {moment(createdAt.seconds * 1000).format(
                        "MMMM DD [at] hh:mm A"
                      )}
                    </p>
                  </div> */}
                </div>
              </div>
            </div>
          ))}
        </div>
        {!(order.isStockpile || order.stockpileDuration) && (
          <div className="border border-black rounded-lg py-4 px-3">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-7 h-7 bg-rose-100 flex justify-center items-center rounded-full">
                <PiCoinsFill className="text-customRichBrown" />
              </div>
              <h2 className="font-opensans text-base text-customRichBrown font-semibold">
                Balance
              </h2>
            </div>
            {(() => {
              const m = userInfo.rewardType?.match(/^DISCOUNT_(\d{1,2})$/);
              const pct = m ? Number(m[1]) : null;
              // only show for 5–50%
              return pct && pct >= 5 && pct <= 50 ? (
                <div className="flex items-center space-x-2 pb-2 border-b border-gray-100">
                  <FaGift className="text-green-500 text-3xl" />
                  <p className="ml-6 font-opensans text-black text-xs flex-grow">
                    There's an active {pct}% order discount! Dont worry We’ll
                    credit your wallet the full payment for these item(s).
                  </p>
                </div>
              ) : null;
            })()}
            <div className="space-y-2 mt-3">
              {/* Total Amount */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="flex items-center space-x-2">
                  <LiaCoinsSolid className="text-green-300 text-lg" />
                  <p className="font-opensans text-xs text-gray-700">
                    Subtotal:
                  </p>
                </div>
                <p className="font-opensans text-xs font-semibold text-gray-700">
                  ₦{subtotal?.toLocaleString() || "0.00"}
                </p>
              </div>
              {/* Amount to Receive Now */}
              {vendorAmounts && (
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <div className="flex items-center space-x-2">
                    <BiCoinStack className="text-green-500" />
                    <p className="font-opensans text-xs text-gray-700">
                      Wallet Amount to Receive Now (60%):
                    </p>
                  </div>
                  <p className="font-opensans text-xs font-semibold text-gray-700">
                    ₦{vendorAmounts.vendor60Pay.toLocaleString() || "0.00"}
                  </p>
                </div>
              )}

              {/* Amount to Receive on Delivery */}
              {vendorAmounts && (
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <div className="flex items-center space-x-2">
                    <BiCoinStack className="text-blue-500" />
                    <p className="font-opensans text-xs text-gray-700">
                      Wallet to be Credited on Delivery (40%):
                    </p>
                  </div>
                  <p className="font-opensans text-xs font-semibold text-gray-700">
                    ₦{vendorAmounts.vendor40Pay.toLocaleString() || "0.00"}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        {order.isStockpile && order.stockpileDuration && (
          <div className="border border-black rounded-lg py-4 px-3 mt-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-7 h-7 bg-rose-100 flex justify-center items-center rounded-full">
                <PiCoinsFill className="text-customRichBrown" />
              </div>
              <h2 className="font-opensans text-base text-customRichBrown font-semibold">
                Stockpile value
              </h2>
            </div>

            {/* If not hiding, we show the merged totalSubtotal (multiple orders) */}
            {!shouldHideStockpileDates && (
              <div className="space-y-2 mt-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <div className="flex items-center space-x-2">
                    <LiaCoinsSolid className="text-green-300 text-lg" />
                    <p className="font-opensans text-xs text-gray-700">
                      Subtotal:
                    </p>
                  </div>
                  <p className="font-opensans text-xs font-semibold text-gray-700">
                    ₦{Number(totalSubtotal).toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {/* If we should hide, just show single doc's own .subtotal */}
            {shouldHideStockpileDates && (
              <div className="space-y-2 mt-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <div className="flex items-center space-x-2">
                    <LiaCoinsSolid className="text-green-300 text-lg" />
                    <p className="font-opensans text-xs text-gray-700">
                      Subtotal:
                    </p>
                  </div>
                  <p className="font-opensans text-xs font-semibold text-gray-700">
                    ₦{Number(order.subtotal || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {order.isStockpile && order.progressStatus === "In Progress" && (
          <div className="flex flex-col items-center mt-4">
            {!(order.requestedForShipping || !order.isActive || isMature) && (
              <div className="mb-2 bg-gray-200 text-gray-700 text-[10px] px-3 py-1 rounded-full font-opensans">
                available in {formattedTime()}
              </div>
            )}

            <button
              onClick={() => setIsRiderModalOpen(true)}
              className={`font-opensans px-16 py-2 text-base rounded-full transition-opacity duration-300
        ${
          order.requestedForShipping || !order.isActive || isMature
            ? "bg-customOrange text-white"
            : "bg-gray-300 text-gray-500 cursor-not-allowed"
        }`}
              disabled={
                !(order.requestedForShipping || !order.isActive || isMature)
              }
            >
              Move to Shipping
            </button>
          </div>
        )}
        {order.isPickup && (
          <div className="mb-4 p-3 bg-yellow-50 border-l-4 font-opensans text-xs border-yellow-400 text-yellow-800  rounded">
            <span className="font-semibold">Pickup PIN Required:</span>
            This order can only be marked as delivered once the customer
            provides their unique PIN. Always verify the code before handing
            over items.
          </div>
        )}

        <div className="flex justify-between mt-4">
          {order.progressStatus === "Pending" && (
            <>
              <button
                onClick={() => setIsDeclineModalOpen(true)}
                className="bg-transparent font-medium text-customOrange text-sm font-opensans py-2.5 px-14 rounded-full border-customBrown border"
              >
                {declineLoading ? (
                  <RotatingLines
                    strokeColor="orange"
                    strokeWidth="5"
                    animationDuration="0.75"
                    width="20"
                    visible={true}
                  />
                ) : (
                  "Decline"
                )}
              </button>
              <button
                onClick={handleAccept}
                className="text-sm font-medium text-white font-opensans py-2.5 px-14 rounded-full bg-customOrange"
                disabled={acceptLoading}
              >
                {acceptLoading ? (
                  <RotatingLines
                    strokeColor="white"
                    strokeWidth="5"
                    animationDuration="0.75"
                    width="20"
                    visible={true}
                  />
                ) : (
                  "Accept"
                )}
              </button>
            </>
          )}
        </div>
        {/* Inside OrderDetailsModal's return: */}

        <div className="flex justify-between mt-4">
          {/* If the order is Shipped AND is NOT a stockpile => normal flow */}
          {progressStatus === "Shipped" && !order.isStockpile && (
            <>
              <button
                onClick={handleContactUs}
                className="bg-transparent font-medium text-customOrange text-xs font-opensans py-2.5 px-8 rounded-full border-customBrown border"
              >
                Contact Us
              </button>
              <button
                onClick={() => {
                  order.isPickup
                    ? setIsPinModalOpen(true)
                    : setIsConfirmDeliveryModalOpen(true);
                }}
                className="text-xs font-medium text-white font-opensans py-2.5 px-8 rounded-full bg-customOrange"
                disabled={deliverLoading}
              >
                {deliverLoading ? (
                  <RotatingLines
                    strokeColor="white"
                    strokeWidth="5"
                    animationDuration="0.75"
                    width="20"
                    visible={true}
                  />
                ) : (
                  "Mark as Delivered"
                )}
              </button>
            </>
          )}

          {/* If the order is Shipped AND IS a stockpile => new button that calls handleMarkStockpileAsDelivered */}
          {progressStatus === "Shipped" && order.isStockpile && (
            <div className="w-full flex justify-center">
              <button
                onClick={() => setIsConfirmDeliveryModalOpen(true)}
                className="text-xs font-medium text-white font-opensans py-2.5 px-8 rounded-full bg-customOrange"
                disabled={deliverLoading}
              >
                {deliverLoading ? (
                  <RotatingLines
                    strokeColor="white"
                    strokeWidth="5"
                    animationDuration="0.75"
                    width="20"
                    visible={true}
                  />
                ) : (
                  "Mark Stockpile as Delivered"
                )}
              </button>
            </div>
          )}
        </div>
        {order.isPickup && isPinModalOpen && (
          <Modal
            isOpen
            onRequestClose={() => setIsPinModalOpen(false)}
            // make the modal itself white, rounded and nicely padded
            className="modal-content-otp bg-white rounded-lg p-6 mt-60 mx-auto w-11/12 max-w-sm"
            overlayClassName="modal-overlay backdrop-blur-sm"
          >
            <div className="mb-4 text-center">
              <h2 className="font-opensans text-base font-semibold">
                Enter Pickup PIN
              </h2>
              <p className="text-xs font-opensans text-gray-600 mt-1">
                Ask the customer for the 4-digit code to enable you mark as
                delivered.
              </p>
            </div>
            <div className="flex justify-center mb-2">
              <PinInput
                length={4}
                focus
                type="numeric"
                style={{ padding: "10px" }}
                inputStyle={{
                  borderColor: "#ddd",
                  borderRadius: "4px",
                  width: "2.5rem",
                  height: "2.5rem",
                  margin: "0 4px",
                  fontSize: "1.5rem",
                  textAlign: "center",
                }}
                onChange={(value) => {
                  setPin(value);
                  if (pinError) setPinError("");
                }}
              />
            </div>
            {pinError && (
              <p className="text-red-500 font-opensans text-xs text-center mb-2">
                {pinError}
              </p>
            )}
            {/* center the button */}
            <div className="flex justify-center mt-4">
              <button
                onClick={async () => {
                  if (pin.length !== 4) {
                    setPinError("Please enter the 4-digit code.");
                    return;
                  }
                  setDeliverLoading(true);
                  try {
                    const fn = httpsCallable(functions, "markOrderDelivered");
                    const res = await fn({ orderId: order.id, pin });
                    if (res.data.invalidPin) {
                      setPinError("Incorrect PIN, please try again.");
                    } else {
                      toast.success("Order marked as delivered!");
                      setIsPinModalOpen(false);
                      onClose();
                    }
                  } catch (e) {
                    console.error(e);
                    toast.error("Failed to validate PIN. Try again.");
                  } finally {
                    setDeliverLoading(false);
                  }
                }}
                className="bg-customOrange text-white font-opensans py-2 px-8 rounded-full"
                disabled={deliverLoading}
              >
                {deliverLoading ? (
                  <RotatingLines strokeColor="white" width="20" />
                ) : (
                  "Confirm"
                )}
              </button>
            </div>
          </Modal>
        )}

        {/* Decline Reason Modal */}
        <Modal
          isOpen={isDeclineModalOpen}
          onRequestClose={() => setIsDeclineModalOpen(false)}
          className={`modal-content-reason ${
            declineReason === "Other" ? "h-auto" : "h-[50%]"
          }`}
          overlayClassName="modal-overlay"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-rose-100 flex justify-center items-center rounded-full">
                <MdCancel className="text-customRichBrown" />
              </div>
              <h2 className="font-opensans text-base font-semibold">
                Reason for decline
              </h2>
            </div>
            <MdOutlineClose
              className="text-black text-xl cursor-pointer"
              onClick={() => setIsDeclineModalOpen(false)}
            />
          </div>
          <div className="space-y-3 mb-4">
            {[
              "Out of stock",
              "Delivery Timing",
              "Can't deliver to Location",
              "Other",
            ].map((reason, index) => (
              <div
                key={index}
                className={`cursor-pointer flex items-center text-gray-800 mb-1 ${
                  declineReason === reason
                    ? "border-customOrange"
                    : "border-gray-200"
                }`}
                onClick={() => {
                  setDeclineReason(reason);
                  if (reason !== "Other") setOtherReasonText(""); // Clear otherReasonText if not "Other"
                }}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex justify-center items-center mr-3 ${
                    declineReason === reason
                      ? "border-customOrange"
                      : "border-customOrange border-opacity-80"
                  }`}
                >
                  {declineReason === reason && (
                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                  )}
                </div>
                <span className="font-opensans text-black">{reason}</span>
              </div>
            ))}

            {/* Show text input if "Other" is selected */}
            {declineReason === "Other" && (
              <input
                type="text"
                placeholder="Other reason..."
                className="border px-2 h-20 text-xs rounded w-full"
                value={otherReasonText}
                onChange={(e) => setOtherReasonText(e.target.value)}
              />
            )}
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={handleSend}
              className="bg-customOrange text-white font-opensans py-2 px-12 rounded-full"
              disabled={declineLoading}
            >
              {declineLoading ? (
                <RotatingLines
                  strokeColor="white"
                  strokeWidth="5"
                  animationDuration="0.75"
                  width="20"
                  visible={true}
                />
              ) : (
                "Send"
              )}
            </button>
          </div>
        </Modal>
        <Modal
          isOpen={isRiderModalOpen}
          onRequestClose={closeRiderModal}
          className="modal-content-rider h-auto"
          overlayClassName="modal-overlay backdrop-blur-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-rose-100 flex justify-center items-center rounded-full">
                <FaTruck className="text-customRichBrown" />
              </div>
              <h2 className="font-opensans text-base font-semibold">
                Delivery Details
              </h2>
            </div>
            <MdOutlineClose
              className="text-xl relative -top-2"
              onClick={closeRiderModal}
            />
          </div>
          <div className="space-y-3 mb-4">
            <h1 className="text-xs font-opensans text-black font-medium">
              Rider's Name
            </h1>
            <input
              type="text"
              placeholder="Rider's Name"
              value={riderName}
              onChange={(e) => setRiderName(e.target.value)}
              className="w-full p-2 border text-xs rounded h-10 focus:outline-none"
            />
            <h1 className="text-xs font-opensans text-black font-medium">
              Rider's Number
            </h1>
            <input
              type="number"
              placeholder="Enter Rider's Phone Number"
              value={riderNumber}
              onChange={(e) => setRiderNumber(e.target.value.slice(0, 11))}
              className="w-full p-2 border text-xs h-10 rounded focus:outline-none"
            />
            <textarea
              placeholder="Add a short note here (optional)"
              value={riderNote}
              onChange={(e) => setRiderNote(e.target.value)}
              className="w-full p-2 border text-xs h-20 rounded focus:outline-none"
            />
          </div>
          <div className="flex justify-end mt-2">
            <button
              onClick={handleMoveToShippingWithRider}
              className="bg-customOrange text-white font-opensans py-2 px-12 rounded-full flex items-center"
              disabled={isMovingToShipping || isSending}
            >
              {isMovingToShipping ? (
                <RotatingLines strokeColor="white" width="20" />
              ) : (
                "Send"
              )}
            </button>
          </div>
        </Modal>
        <Modal
          isOpen={isConfirmDeliveryModalOpen}
          onRequestClose={() => setIsConfirmDeliveryModalOpen(false)}
          contentLabel="Confirm Delivery"
          ariaHideApp={false}
          className="modal-content-reason"
          overlayClassName="modal-overlay"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-rose-100 flex justify-center items-center rounded-full">
                <FaSmileBeam className="text-customRichBrown" />
              </div>
              <h2 className="font-opensans text-base font-semibold">
                Confirm Delivery
              </h2>
            </div>
            <MdOutlineClose
              className="text-black text-xl cursor-pointer"
              onClick={() => setIsConfirmDeliveryModalOpen(false)}
            />
          </div>
          <p className="text-xs text-gray-700 font-opensans mb-6">
            Please confirm that the order has been successfully delivered to the
            customer. Here are some points to ensure successful delivery:
          </p>
          <ul className="list-disc pl-2 text-xs text-gray-700 font-opensans font-medium space-y-2">
            <li className="flex">
              <IoMdCheckmark className="text-green-800 mr-4 text-4xl" /> You
              have spoken to the rider/logistics company, and they have
              confirmed that the order has been delivered.
            </li>

            <li className="flex ">
              <IoMdCheckmark className="text-green-800 mr-4 text-4xl" />
              You received delivery confirmation or a signed proof of delivery
              from the logistics provider.
            </li>
          </ul>
          <p className="text-xs text-gray-700 font-opensans mt-4">
            For more details on marking an order as delivered, please refer to
            our
            <span
              onClick={handleNavigation}
              className="text-customOrange underline cursor-pointer"
            >
              Order Delivery Guide
            </span>
            .
          </p>
          <div className="flex mt-4 items-center mb-4">
            <input
              type="checkbox"
              checked={confirmDeliveryChecked}
              onChange={() =>
                setConfirmDeliveryChecked(!confirmDeliveryChecked)
              }
              className="mr-2"
            />
            <span className="text-xs font-opensans text-red-500">
              I confirm that the order has been delivered and accept full
              responsibility for this action.
            </span>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => {
                // Call a helper that conditionally triggers the correct function
                if (order.isStockpile) {
                  handleMarkStockpileAsDelivered();
                } else {
                  handleMarkAsDelivered();
                }
              }}
              className="bg-customOrange text-white font-opensans py-2 px-8 rounded-full"
              disabled={!confirmDeliveryChecked || deliverLoading}
            >
              {deliverLoading ? (
                <RotatingLines
                  strokeColor="white"
                  strokeWidth="5"
                  animationDuration="0.75"
                  width="20"
                  visible={true}
                />
              ) : (
                "Confirm"
              )}
            </button>
          </div>
        </Modal>

        <Modal
          isOpen={isDeclineInfoModalOpen}
          onRequestClose={() => setIsDeclineInfoModalOpen(false)}
          contentLabel="Decline Info"
          ariaHideApp={false}
          className="modal-content-reason"
          overlayClassName="modal-overlay"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-rose-100 flex justify-center items-center rounded-full">
                <ImSad2 className="text-customRichBrown" />
              </div>
              <h2 className="font-opensans text-base font-semibold">
                Declined Order
              </h2>
            </div>
            <MdOutlineClose
              className="text-black text-xl cursor-pointer"
              onClick={() => setIsDeclineInfoModalOpen(false)}
            />
          </div>
          <div>
            <p className="font-opensans text-sm text-black font-medium">
              Order was declined by you (Vendor). This process cannot be
              reversed!
            </p>
          </div>
        </Modal>
        <Modal
          isOpen={isInfoModalOpen}
          onRequestClose={() => setIsInfoModalOpen(false)}
          contentLabel="About Charges"
          ariaHideApp={false}
          className="modal-content-charge"
          overlayClassName="modal-overlay backdrop-blur-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-rose-100 flex justify-center items-center rounded-full">
                <HiReceiptTax className="text-customRichBrown" />
              </div>
              <h2 className="font-opensans text-base font-semibold">
                About Charges
              </h2>
            </div>
            <MdOutlineClose
              className="text-black text-xl cursor-pointer"
              onClick={() => setIsInfoModalOpen(false)}
            />
          </div>
          <p className="text-xs text-gray-700 font-opensans mb-6">
            Please note that the charges reflected in the total amount after tax
            are incurred due to processing fees from our payment partners
            (Paystack). If you have any questions or concerns, please contact
            support. My Thrift does not take any percentage from your stipend.
          </p>

          <div className="flex justify-end">
            <button
              onClick={() => setIsInfoModalOpen(false)}
              className="bg-customOrange text-white font-opensans py-1.5 text-xs px-6 rounded-full"
            >
              I Understand
            </button>
          </div>
        </Modal>
        {/* Support Call Modal */}
        <Modal
          isOpen={isSupportCallModalOpen}
          onRequestClose={() => setIsSupportCallModalOpen(false)}
          contentLabel="Contact Support"
          ariaHideApp={false}
          className="modal-content-reason"
          overlayClassName="modal-overlay"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-rose-100 flex justify-center items-center rounded-full">
                <FaSmileBeam className="text-customRichBrown" />
              </div>
              <h2 className="font-opensans text-base font-semibold">
                Contact Support
              </h2>
            </div>
            <MdOutlineClose
              className="text-black text-xl cursor-pointer"
              onClick={() => setIsSupportCallModalOpen(false)}
            />
          </div>
          <p className="text-xs text-gray-700 font-opensans mb-6">
            If you are facing issues with this order, please contact us.
            Recommended reasons to call:
          </p>
          <ul className="text-xs text-gray-700 font-opensans mb-6 list-disc pl-5 space-y-1">
            <li>- Order mishandling or damage.</li>
            <li>- Rider missing or unresponsive.</li>
            <li>- Issues with the delivery location.</li>
            <li>- Delivery delayed beyond the expected timeframe.</li>
          </ul>

          <p className="text-xs text-gray-700 font-opensans mb-6">
            Need help? Start a live chat with our support team.
          </p>

          <div className="flex justify-end">
            <button
              onClick={() => {
                openChat();
                setIsSupportCallModalOpen(false);
              }}
              className="bg-customOrange text-white font-opensans py-2 px-8 rounded-full"
            >
              Chat Now
            </button>
          </div>
        </Modal>
      </div>
    </Modal>
  );
};

export default OrderDetailsModal;
