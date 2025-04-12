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
import { db } from "../../firebase.config";
import { MdOutlineClose, MdOutlineMail, MdOutlineInfo } from "react-icons/md";
import { BsTelephone, BsBoxSeam } from "react-icons/bs";
import { GrNotes } from "react-icons/gr";
import { LiaCoinsSolid } from "react-icons/lia";
import { ImSad2 } from "react-icons/im";
import { HiReceiptTax } from "react-icons/hi";
import { FaSmileBeam } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { MdCancel } from "react-icons/md";
import {
  IoPricetags,
  IoColorPaletteSharp,
  IoLocationOutline,
} from "react-icons/io5";

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

  const [isConfirmDeliveryModalOpen, setIsConfirmDeliveryModalOpen] =
    useState(false);
  const [isSupportCallModalOpen, setIsSupportCallModalOpen] = useState(false);
  const [confirmDeliveryChecked, setConfirmDeliveryChecked] = useState(false);
  const [deliverLoading, setDeliverLoading] = useState(false);
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

      if (order.vendorId) {
        const vendorRef = doc(db, "vendors", order.vendorId);
        const vendorSnap = await getDoc(vendorRef);
        if (vendorSnap.exists()) {
          setVendorDeliveryMode(
            vendorSnap.data().deliveryMode || "Not specified"
          );
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

  const handleDecline = async (reason) => {
    setDeclineLoading(true);
    try {
      console.log("Starting handleDecline process...");

      // Fetching order document and extracting orderReference
      console.log("Fetching order document...");
      const orderRef = doc(db, "orders", order.id);
      const orderSnap = await getDoc(orderRef);
      if (!orderSnap.exists()) {
        console.error("Order document does not exist.");
        toast.error("Order not found.");
        return;
      }

      const orderData = orderSnap.data();
      console.log("Order data fetched:", orderData);

      const orderId = orderData.orderId;
      const orderReference = orderData.orderReference;
      console.log("Order ID extracted:", orderId);
      console.log("OrderReference extracted:", orderReference);

      // Fetching user details
      const userPhoneNumber = orderData.userInfo?.phoneNumber;
      const userName = orderData.userInfo?.displayName;
      if (!userPhoneNumber) {
        console.warn("User phone number not available.");
      } else {
        console.log(`User phone number: ${userPhoneNumber}`);
      }
      if (!userName) {
        console.warn("User name not available.");
      } else {
        console.log(`User name: ${userName}`);
      }

      // Fetch vendor cover image and recipient code
      let vendorCoverImage = null;
      let recipientCode = null;
      if (order.vendorId) {
        console.log(`Fetching vendor data for vendorId: ${order.vendorId}...`);
        const vendorRef = doc(db, "vendors", order.vendorId);
        const vendorSnap = await getDoc(vendorRef);
        if (vendorSnap.exists()) {
          const vendorData = vendorSnap.data();
          console.log("Vendor data fetched:", vendorData);
          vendorCoverImage = vendorData.coverImageUrl || null;
          recipientCode = vendorData.recipientCode || null;
          console.log("Vendor recipientCode:", recipientCode);
          console.log("Vendor coverImageUrl:", vendorCoverImage);
        } else {
          console.error("Vendor document does not exist.");
        }
      }
      let productImage = null;
      if (order.cartItems && order.cartItems.length > 0) {
        const firstItem = order.cartItems[0];
        console.log(
          `Fetching product data for productId: ${firstItem.productId}...`
        );
        const productRef = doc(db, "products", firstItem.productId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const productData = productSnap.data();
          console.log("Product data fetched:", productData);
          if (firstItem.subProductId) {
            console.log(
              `Searching for subProductId: ${firstItem.subProductId}...`
            );
            const subProduct = productData.subProducts?.find(
              (sp) => sp.subProductId === firstItem.subProductId
            );
            productImage = subProduct?.images?.[0] || null;
            console.log("Sub-product image found:", productImage);
          } else {
            productImage = productData.imageUrls?.[0] || null;
            console.log("Main product image found:", productImage);
          }
        } else {
          console.error("Product document does not exist.");
        }
      }
      // Continue with the existing decline process
      const token = import.meta.env.VITE_RESOLVE_TOKEN;
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
      console.log("Token fetched from environment variable:", token);

      const payload = {
        orderReference: orderReference,
        vendorId: order.vendorId,
        vendorStatus: "declined",
        recipientCode: recipientCode, // Correctly using recipientCode
      };
      console.log("Payload being sent:", payload);

      console.log("Sending data to external endpoint...");
      const response = await fetch(`${API_BASE_URL}/acceptOrder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to send data to external endpoint:", errorData);
        throw new Error(`External API error: ${response.status}`);
      }

      console.log("Data successfully sent to external endpoint.");

      console.log("Updating order progressStatus to 'Declined'...");
      await updateDoc(orderRef, {
        progressStatus: "Declined",
        vendorStatus: "declined",
        isStockpile: false,
        declineReason: reason || "Reason not provided",
      });

      console.log("Sending order status change notification...");
      await notifyOrderStatusChange(
        userId, // userId
        order.id, // orderId
        "Declined", // newStatus
        vendorName, // vendorName
        vendorCoverImage, // vendorCoverImage
        productImage, // productImage
        reason, // declineReason
        null // riderInfo
      );

      console.log("Adding activity note for vendor...");
      await addActivityNote(
        order.vendorId,
        "Order Declined 🛑",
        `Order with ID: ${order.id} was declined by ${vendorName}. Reason: ${reason}.`,
        "order"
      );

      if (userPhoneNumber) {
        console.log("Preparing to send SMS to user...");
        const formattedPhoneNumber = userPhoneNumber.startsWith("0")
          ? userPhoneNumber.slice(1)
          : userPhoneNumber;

        const smsPayload = {
          message: `Hello, ${userName}, your order with ID ${orderId} has been declined by ${vendorName}. Here's why: ${reason}. Refunds typically take 3-7 days depending on your payment method. Matilda from My Thrift.`,
          receiverNumber: formattedPhoneNumber,
          receiverId: orderData.userInfo?.uid || order.userId,
        };

        const smsToken = import.meta.env.VITE_BETOKEN;
        console.log("SMS Token fetched from environment variable:", smsToken);
        console.log("SMS Payload being sent:", smsPayload);

        try {
          const smsResponse = await fetch(
            "https://mythrift-sms.fly.dev/sendMessage",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${smsToken}`,
              },
              body: JSON.stringify(smsPayload),
            }
          );

          const smsResult = await smsResponse.json();
          console.log("SMS API Response:", smsResult);

          if (smsResponse.ok) {
            console.log(
              `SMS sent successfully to user ${userPhoneNumber} (formatted: ${formattedPhoneNumber}).`
            );
          } else {
            console.warn("SMS sending failed:", smsResult);
          }
        } catch (smsError) {
          console.error("Error sending SMS:", smsError);
        }
      } else {
        console.warn("User phone number not available, skipping SMS.");
      }

      toast.success("Order declined successfully");
      setIsDeclineModalOpen(false);
      onClose();
    } catch (error) {
      console.error("Error declining order:", error);
      toast.error("Failed to decline the order");
    } finally {
      setDeclineLoading(false);
      console.log("handleDecline process completed.");
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
      console.log("Starting handleAccept process...");

      // Fetching order document and extracting orderReference
      console.log("Fetching order document...");
      const orderRef = doc(db, "orders", order.id);
      const orderSnap = await getDoc(orderRef);

      if (!orderSnap.exists()) {
        console.error("Order document does not exist.");
        toast.error("Order not found.");
        return;
      }

      const orderData = orderSnap.data();
      console.log("Order data fetched:", orderData);
      const orderId = orderData.orderId;

      const userPhoneNumber = orderData.userInfo?.phoneNumber;
      const userName = orderData.userInfo?.displayName;
      const userId = orderData.userId;

      if (!orderId) {
        console.error("Order ID is missing.");
        setAcceptLoading(false);
        return;
      }

      console.log("Order ID extracted:", orderId);
      const orderReference = orderData.orderReference;
      console.log("OrderReference extracted:", orderReference);

      if (!userPhoneNumber) {
        console.warn("User phone number not available.");
      } else {
        console.log(`User phone number: ${userPhoneNumber}`);
      }

      if (!userName) {
        console.warn("User name not available.");
      } else {
        console.log(`User name: ${userName}`);
      }

      // Fetch vendor cover image and recipient code
      let vendorCoverImage = null;
      let recipientCode = null;
      if (order.vendorId) {
        console.log(`Fetching vendor data for vendorId: ${order.vendorId}...`);
        const vendorRef = doc(db, "vendors", order.vendorId);
        const vendorSnap = await getDoc(vendorRef);
        if (vendorSnap.exists()) {
          const vendorData = vendorSnap.data();
          console.log("Vendor data fetched:", vendorData);
          vendorCoverImage = vendorData.coverImageUrl || null;
          recipientCode = vendorData.recipientCode || null;
          console.log("Vendor recipientCode:", recipientCode);
          console.log("Vendor coverImageUrl:", vendorCoverImage);
        } else {
          console.error("Vendor document does not exist.");
        }
      }

      // Fetch product image
      let productImage = null;
      if (order.cartItems && order.cartItems.length > 0) {
        const firstItem = order.cartItems[0];
        console.log(
          `Fetching product data for productId: ${firstItem.productId}...`
        );
        const productRef = doc(db, "products", firstItem.productId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const productData = productSnap.data();
          console.log("Product data fetched:", productData);
          if (firstItem.subProductId) {
            console.log(
              `Searching for subProductId: ${firstItem.subProductId}...`
            );
            const subProduct = productData.subProducts?.find(
              (sp) => sp.subProductId === firstItem.subProductId
            );
            productImage = subProduct?.images?.[0] || null;
            console.log("Sub-product image found:", productImage);
          } else {
            productImage = productData.imageUrls?.[0] || null;
            console.log("Main product image found:", productImage);
          }
        } else {
          console.error("Product document does not exist.");
        }
      }

      // Get the token from the environment variable
      const token = import.meta.env.VITE_RESOLVE_TOKEN;
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
      console.log("Token fetched from environment variable:", token);

      // Constructing payload
      const payload = {
        orderReference: orderReference,
        vendorId: order.vendorId,
        vendorStatus: "accepted",
        recipientCode: recipientCode,
      };
      console.log("Payload being sent:", payload);

      // Send data to the external endpoint FIRST
      console.log("Sending data to external endpoint...");
      const response = await fetch(`${API_BASE_URL}/acceptOrder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to send data to external endpoint:", errorData);
        throw new Error(`External API error: ${response.status}`);
      }

      console.log("Data successfully sent to external endpoint.");

      // Now that external call is successful, update Firebase
      console.log("Updating order progressStatus to 'In Progress'...");
      await updateDoc(orderRef, { progressStatus: "In Progress" });
      await updateDoc(orderRef, { vendorStatus: "accepted" });

      // Send notification
      console.log("Sending order status change notification...");
      await notifyOrderStatusChange(
        userId,
        order.id,
        "In Progress",
        vendorName,
        vendorCoverImage,
        productImage,
        null,
        null
      );

      // Add activity note
      console.log("Adding activity note for vendor...");
      if (order.isStockpile) {
        await addActivityNote(
          order.vendorId,
          "Stockpile Payment in Full 💰",
          `You have been paid in full for the stockpile order (ID: ${order.id}).`,
          "transactions"
        );
      } else {
        let vendor60Pay = null;
        const paymentResponse = await fetch(
          `${API_BASE_URL}/calculateVendorPay/${orderReference}`,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!paymentResponse.ok) {
          throw new Error("Failed to fetch payment data.");
        }
        const paymentData = await paymentResponse.json();
        vendor60Pay = paymentData.amount?.vendor60Pay;

        if (vendor60Pay) {
          const amountFormatted = `₦${vendor60Pay.toLocaleString()}`;
          await addActivityNote(
            order.vendorId,
            "You’ve Been Credited 💰",
            `You’ve received ${amountFormatted} as a 60% payout for order ID: ${order.id}.`,
            "transactions"
          );
        }
      }

      // Send SMS to User
      if (userPhoneNumber) {
        console.log("Preparing to send SMS to user...");
        const formattedPhoneNumber = userPhoneNumber.startsWith("0")
          ? userPhoneNumber.slice(1)
          : userPhoneNumber;

        // Set SMS message conditionally for stockpile orders
        let smsMessage = "";
        if (order.isStockpile) {
          if (order.stockpileDuration) {
            // New stockpile orders with duration
            smsMessage = `Hello, ${userName}, your new stockpile from ${vendorName} has been accepted! You can keep adding more items to your pile for an eco-friendly shopping experience. Cheers, Matilda from My Thrift.`;
          } else {
            // Repile: stockpile orders without duration
            smsMessage = `Hello, ${userName}, your stockpile has been updated! You're doing great—keep on repiling and supporting eco-friendly fashion. Cheers, Matilda from My Thrift.`;
          }
        } else {
          // Normal orders
          smsMessage = `Hello, ${userName}, your order with ID ${orderId} from ${vendorName} has been accepted and is in progress. We will update you when it is shipped. Cheers, Matilda from My Thrift.`;
        }

        const smsPayload = {
          message: smsMessage,
          receiverNumber: formattedPhoneNumber,
          receiverId: userId,
        };

        const smsToken = import.meta.env.VITE_BETOKEN;
        console.log("SMS Token fetched from environment variable:", smsToken);
        console.log("SMS Payload being sent:", smsPayload);

        try {
          const smsResponse = await fetch(
            "https://mythrift-sms.fly.dev/sendMessage",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${smsToken}`,
              },
              body: JSON.stringify(smsPayload),
            }
          );

          const smsResult = await smsResponse.json();
          console.log("SMS API Response:", smsResult);

          if (smsResponse.ok) {
            console.log(
              `SMS sent successfully to user ${userPhoneNumber} (formatted: ${formattedPhoneNumber}).`
            );
          } else {
            console.warn("SMS sending failed:", smsResult);
          }
        } catch (smsError) {
          console.error("Error sending SMS:", smsError);
        }
      } else {
        console.warn("User phone number not available, skipping SMS.");
      }

      toast.success("Order accepted successfully");
      onClose();
    } catch (error) {
      console.error("Failed to accept the order:", error);
      toast.error("Failed to accept the order");
    } finally {
      setAcceptLoading(false);
      console.log("handleAccept process completed.");
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
    const fetchVendorAmounts = async () => {
      if (order && order.id) {
        console.log("Fetching vendor amounts...");
        try {
          const orderRef = doc(db, "orders", order.id);
          console.log("Fetching Firestore order document for ID:", order.id);

          const orderSnap = await getDoc(orderRef);

          if (orderSnap.exists()) {
            console.log("Order document found in Firestore.");
            const orderData = orderSnap.data();
            const orderReference = orderData.orderReference;

            console.log("Order reference from Firestore:", orderReference);

            if (orderReference) {
              const token = import.meta.env.VITE_RESOLVE_TOKEN;
              const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

              console.log("Authorization Token:", token);
              console.log("API_BASE_URL:", API_BASE_URL);

              const response = await fetch(
                `${API_BASE_URL}/calculateVendorPay/${orderReference}`,
                {
                  method: "GET",
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

              console.log(
                `API response status: ${response.status}, statusText: ${response.statusText}`
              );

              if (response.ok) {
                const data = await response.json();
                console.log("API response data:", data);

                if (data && data.amount) {
                  setVendorAmounts(data.amount);
                  console.log(
                    "Vendor amounts successfully fetched:",
                    data.amount
                  );
                } else {
                  console.warn(
                    "API response does not contain 'amount'. Full response:",
                    data
                  );
                }
              } else {
                console.error(
                  "Failed to fetch vendor amounts. Response details:",
                  await response.json()
                );
              }
            } else {
              console.warn(
                "Order reference is undefined or null. Skipping API request."
              );
            }
          } else {
            console.error(
              "Order document does not exist in Firestore for ID:",
              order.id
            );
          }
        } catch (firestoreError) {
          console.error(
            "Error fetching order document from Firestore:",
            firestoreError
          );
        }
      } else {
        console.warn(
          "Order or order.id is undefined. Ensure 'order' is passed as a prop and contains an 'id'."
        );
      }
    };

    if (isOpen && order) {
      console.log(
        "Modal is open, and order data is available. Starting fetchVendorAmounts."
      );
      fetchVendorAmounts();
    } else {
      console.log(
        "Modal is not open or order data is unavailable. Skipping fetchVendorAmounts."
      );
    }
  }, [isOpen, order]);
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
    setDeliverLoading(true);
    try {
      console.log("Starting handleMarkAsDelivered process...");

      const orderRef = doc(db, "orders", order.id);
      const orderSnap = await getDoc(orderRef);
      if (!orderSnap.exists()) {
        console.error("Order document does not exist.");
        toast.error("Order not found.");
        return;
      }

      const orderData = orderSnap.data();
      const orderReference = orderData.orderReference;
      const orderId = orderData.orderId;
      const userPhoneNumber = orderData.userInfo?.phoneNumber;
      const userName = orderData.userInfo?.displayName;
      const userId = orderData.userId; // Assuming `userInfo` contains `id`
      console.log("Order data fetched:", orderData);

      // Fetch vendor cover image
      let vendorCoverImage = null;
      if (order.vendorId) {
        const vendorRef = doc(db, "vendors", order.vendorId);
        const vendorSnap = await getDoc(vendorRef);
        if (vendorSnap.exists()) {
          vendorCoverImage = vendorSnap.data().coverImageUrl || null;
        }
      }

      // Fetch product image
      let productImage = null;
      if (order.cartItems && order.cartItems.length > 0) {
        const firstItem = order.cartItems[0];
        const productRef = doc(db, "products", firstItem.productId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const productData = productSnap.data();
          if (firstItem.subProductId) {
            const subProduct = productData.subProducts?.find(
              (sp) => sp.subProductId === firstItem.subProductId
            );
            productImage = subProduct?.images?.[0] || null;
          } else {
            productImage = productData.imageUrls?.[0] || null;
          }
        }
      }

      // Prepare payload for updateDelivery endpoint
      const deliveryPayload = {
        delivered: true,
        orderReference: orderReference,
      };

      const token = import.meta.env.VITE_RESOLVE_TOKEN; // Ensure your token is set up
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

      // Send request to updateDelivery endpoint FIRST
      console.log("Sending delivery update to endpoint...");
      const deliveryResponse = await fetch(`${API_BASE_URL}/updateDelivery`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(deliveryPayload),
      });

      if (!deliveryResponse.ok) {
        const errorData = await deliveryResponse.json();
        console.error("Failed to update delivery status via API:", errorData);
        throw new Error(`Delivery API error: ${deliveryResponse.status}`);
      }

      console.log("Delivery update successfully sent to API.");

      console.log("Updating order progressStatus to 'Delivered'...");
      await updateDoc(orderRef, {
        progressStatus: "Delivered",
        orderDelivered: true,
      });
      // Send notification to the user
      console.log("Sending notification about order delivery...");
      await notifyOrderStatusChange(
        userId, // userId
        order.id, // orderId
        "Delivered", // newStatus
        vendorName, // vendorName
        vendorCoverImage, // vendorCoverImage
        productImage // productImage
      );

      // Add activity note
      console.log("Adding activity note for delivery...");
      await addActivityNote(
        order.vendorId,
        "Order Delivered 😊",
        `You have marked this order as delivered. You will receive your remaining percentage shortly. If this was a mistake, reach out to us immediately!`,
        "order"
      );

      console.log("Clearing and refreshing vendor revenue cache...");
      localStorage.removeItem(`vendorRevenue_${order.vendorId}`);
      localStorage.removeItem(`vendorRevenue_time_${order.vendorId}`);
      fetchVendorRevenue(order.vendorId)
        .then((revenue) => {
          setTotalRevenue(revenue);
          console.log("Vendor revenue refreshed successfully.");
        })
        .catch(() => {
          console.error("Failed to refresh vendor revenue.");
        });

      // Send SMS using the new API
      if (userPhoneNumber) {
        console.log("Preparing to send SMS to user...");
        const formattedPhoneNumber = userPhoneNumber.startsWith("0")
          ? userPhoneNumber.slice(1) // Remove the leading '0'
          : userPhoneNumber;

        const smsPayload = {
          message: `Your order with ID ${orderId} has been marked delivered by ${vendorName}. We hope you love it! If you haven't received your package or you think this was a mistake, contact support (support@shopmythrift.store).`,
          receiverNumber: formattedPhoneNumber,
          receiverId: userId,
        };

        const smsToken = import.meta.env.VITE_BETOKEN;

        console.log("SMS Payload:", smsPayload);

        try {
          const smsResponse = await fetch(
            "https://mythrift-sms.fly.dev/sendMessage",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${smsToken}`,
              },
              body: JSON.stringify(smsPayload),
            }
          );

          const smsResult = await smsResponse.json();
          console.log("SMS API Response:", smsResult);

          if (smsResponse.ok) {
            console.log(
              `SMS sent successfully to user ${userPhoneNumber} (formatted: ${formattedPhoneNumber}).`
            );
          } else {
            console.warn("SMS sending failed:", smsResult);
          }
        } catch (smsError) {
          console.error("Error sending SMS:", smsError);
        }
      } else {
        console.warn("User phone number not available, skipping SMS.");
      }

      toast.success(
        "Order marked as delivered and your funds are on their way!"
      );
      onClose();
    } catch (error) {
      console.error("Failed to mark as delivered:", error);
      toast.error("Failed to mark as delivered");
    } finally {
      setDeliverLoading(false);
      setIsConfirmDeliveryModalOpen(false);
      console.log("handleMarkAsDelivered process completed.");
    }
  };
  const handleMarkStockpileAsDelivered = async () => {
    setDeliverLoading(true);
    try {
      console.log("Starting handleMarkStockpileAsDelivered process...");

      // 1) Ensure we have the stockpile orders
      if (!stockpileOrders || stockpileOrders.length === 0) {
        throw new Error("No stockpile orders available.");
      }

      // 2) Identify the primary order (the first in your sorted array)
      const primaryOrder = stockpileOrders[0];

      // Basic fields from your primaryOrder for convenience
      const { orderId, userInfo, vendorId } = primaryOrder;
      const userPhoneNumber = userInfo?.phoneNumber;
      const userName = userInfo?.displayName;
      const userId = userInfo?.uid || primaryOrder.userId;

      // 3) Update every order doc in the stockpile to “Delivered”
      //    except those that are "Declined"
      for (const stockOrder of stockpileOrders) {
        if (stockOrder.progressStatus === "Declined") {
          continue; // do not overwrite Declined orders
        }

        const ref = doc(db, "orders", stockOrder.id);
        await updateDoc(ref, {
          progressStatus: "Delivered",
          orderDelivered: true,
          deliveredAt: serverTimestamp(), // store a timestamp for reference
        });
      }

      // 4) Optionally fetch vendor cover image + product image for notifications
      let vendorCoverImage = null;
      if (vendorId) {
        const vendorRef = doc(db, "vendors", vendorId);
        const vendorSnap = await getDoc(vendorRef);
        if (vendorSnap.exists()) {
          vendorCoverImage = vendorSnap.data().coverImageUrl || null;
        }
      }

      let productImage = null;
      if (primaryOrder.cartItems && primaryOrder.cartItems.length > 0) {
        const firstItem = primaryOrder.cartItems[0];
        const productRef = doc(db, "products", firstItem.productId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const productData = productSnap.data();
          if (firstItem.subProductId) {
            const sub = productData.subProducts?.find(
              (sp) => sp.subProductId === firstItem.subProductId
            );
            productImage = sub?.images?.[0] || null;
          } else {
            productImage = productData.imageUrls?.[0] || null;
          }
        }
      }

      // 5) Send a "Delivered" notification for the primary order
      console.log("Sending ‘Delivered’ notification for the primary doc...");
      await notifyOrderStatusChange(
        userId,
        primaryOrder.id,
        "Delivered",
        vendorName,
        vendorCoverImage,
        productImage
      );

      // 6) Add an activity note for the vendor
      console.log("Adding activity note for the vendor...");
      await addActivityNote(
        vendorId,
        "Stockpile Delivered 😊",
        `You’ve marked this entire stockpile as delivered. If this was a mistake, reach out immediately!`,
        "order"
      );

      // 7) Clear and refresh vendor revenue
      console.log("Clearing and refreshing vendor revenue cache...");
      localStorage.removeItem(`vendorRevenue_${vendorId}`);
      localStorage.removeItem(`vendorRevenue_time_${vendorId}`);
      fetchVendorRevenue(vendorId)
        .then((revenue) => {
          setTotalRevenue(revenue);
          console.log("Vendor revenue refreshed successfully.");
        })
        .catch(() => {
          console.error("Failed to refresh vendor revenue.");
        });

      // 8) Send SMS to the user (only once)
      // if (userPhoneNumber) {
      //   console.log("Preparing to send SMS about delivered stockpile...");
      //   const formattedPhoneNumber = userPhoneNumber.startsWith("0")
      //     ? userPhoneNumber.slice(1)
      //     : userPhoneNumber;

      //   const smsPayload = {
      //     message: `Your entire stockpile (ref: ${orderId}) has been marked delivered by ${vendorName}. We hope you love your items! If you haven't received them or this was a mistake, please contact support@shopmythrift.store.`,
      //     receiverNumber: formattedPhoneNumber,
      //     receiverId: userId,
      //   };

      //   const smsToken = import.meta.env.VITE_BETOKEN;
      //   console.log("SMS Payload:", smsPayload);

      //   try {
      //     const smsResponse = await fetch(
      //       "https://mythrift-sms.fly.dev/sendMessage",
      //       {
      //         method: "POST",
      //         headers: {
      //           "Content-Type": "application/json",
      //           Authorization: `Bearer ${smsToken}`,
      //         },
      //         body: JSON.stringify(smsPayload),
      //       }
      //     );
      //     const smsResult = await smsResponse.json();
      //     console.log("SMS API Response:", smsResult);

      //     if (smsResponse.ok) {
      //       console.log(
      //         `SMS sent successfully to user ${userPhoneNumber} (formatted: ${formattedPhoneNumber}).`
      //       );
      //     } else {
      //       console.warn("SMS sending failed:", smsResult);
      //     }
      //   } catch (smsError) {
      //     console.error("Error sending SMS:", smsError);
      //   }
      // } else {
      //   console.warn("User phone number not available, skipping SMS.");
      // }

      // 9) Now call the Cloud Function to notify the user (via email and SMS)
      const notifyUserStockpileUpdate = httpsCallable(
        functions,
        "notifyUserStockpileUpdate"
      );
      await notifyUserStockpileUpdate({
        eventType: "delivered",
        userEmail: userInfo.email,
        userName,
        orderId: primaryOrder.id,
        stockpileDocId: primaryOrder.stockpileDocId,
        vendorName,
        userPhone: userPhoneNumber,
      });

      toast.success("Stockpile marked as delivered. Congrats!");
      onClose();
    } catch (error) {
      console.error("Failed to mark stockpile as delivered:", error);
      toast.error("Failed to mark stockpile as delivered");
    } finally {
      setDeliverLoading(false);
      setIsConfirmDeliveryModalOpen(false);
      console.log("handleMarkStockpileAsDelivered process completed.");
    }
  };

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
        {(order.progressStatus === "Shipped" ||
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

                  {!order.isStockpile && (
                    <div className="flex items-center pb-3 border-b border-gray-100">
                      <FaTruck className="text-orange-700 text-xl" />
                      <p className="ml-3 text-gray-500 text-sm font-opensans">
                        Delivery Mode:
                      </p>
                      <p className="ml-10 font-opensans text-black text-sm flex-grow">
                        {loading ? (
                          <Skeleton width={100} />
                        ) : (
                          vendorDeliveryMode || "Not Specified"
                        )}
                      </p>
                    </div>
                  )}
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
                      Amount to Receive Now (60%):
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
                      Balance to Receive on Delivery (40%):
                    </p>
                  </div>
                  <p className="font-opensans text-xs font-semibold text-gray-700">
                    ₦{vendorAmounts.vendor40pay.toLocaleString() || "0.00"}
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
                onClick={() => setIsConfirmDeliveryModalOpen(true)} // existing confirm modal
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

          <div className="flex justify-end">
            <button
              onClick={handleProceedCallSupport}
              className="bg-customOrange text-white font-opensans py-2 px-8 rounded-full"
            >
              Proceed
            </button>
          </div>
        </Modal>
      </div>
    </Modal>
  );
};

export default OrderDetailsModal;
