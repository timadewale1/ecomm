import React, { useState, useEffect } from "react";
import moment from "moment";
import { useNavigate } from "react-router-dom";
import TrashIcon from "./Loading/trash";
import EnvelopeIcon from "./Loading/Envelope";
import { PiPackage } from "react-icons/pi";
import { IoTimeOutline } from "react-icons/io5";
import { TbTruckDelivery } from "react-icons/tb";
import { db } from "../firebase.config";
import { doc, getDoc } from "firebase/firestore";
import toast, { Toaster } from "react-hot-toast";
import Skeleton from "react-loading-skeleton";

const NotificationItem = ({
  notification,
  markAsRead,
  deleteNotification,
  loading,
}) => {
  const [translateX, setTranslateX] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState("");
  const [isRead, setIsRead] = useState(notification?.seen);
  const [isDeleted, setIsDeleted] = useState(false);
  const [hasSwiped, setHasSwiped] = useState(false);
  const [vendorName, setVendorName] = useState("Unknown Vendor");
  const [productImage, setProductImage] = useState(null);

  const defaultVendorImage =
    "https://images.saatchiart.com/saatchi/1750204/art/9767271/8830343-WUMLQQKS-7.jpg";

  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        const orderRef = doc(db, "orders", notification.orderId);
        const orderDoc = await getDoc(orderRef);

        if (orderDoc.exists()) {
          const orderData = orderDoc.data();
          const firstProduct = Object.values(orderData.products)[0];

          if (firstProduct.coverImageUrl) {
            setProductImage(firstProduct.coverImageUrl);
          }

          const vendorRef = doc(db, "vendors", orderData.vendorId);
          const vendorDoc = await getDoc(vendorRef);
          if (vendorDoc.exists()) {
            setVendorName(vendorDoc.data().shopName || "Unknown Vendor");
          }
        }
      } catch (error) {
        console.error("Error fetching order details: ", error);
      }
    };

    if (notification.orderId) {
      fetchOrderDetails();
    }
  }, [notification.orderId]);

  let notificationIcon;
  let notificationMessage;

  if (notification.message.includes("In Progress")) {
    notificationIcon = (
      <div className="border rounded-full p-1">
        <PiPackage className="text-3xl text-gray-500" />
      </div>
    );
    notificationMessage = `${vendorName} has accepted your order with ID ${notification.orderId} and is packaging 🤝🏾.`;
  } else if (notification.message.includes("Ready for Delivery")) {
    notificationIcon = (
      <div className="border rounded-full p-1">
        <IoTimeOutline className="text-3xl text-gray-500" />
      </div>
    );
    notificationMessage = `${vendorName} has packaged your order. It will be delivered within 3-7 working days 😊.`;
  } else if (notification.message.includes("Out for Delivery")) {
    notificationIcon = (
      <div className="border rounded-full p-1">
        <TbTruckDelivery className="text-3xl text-gray-500" />
      </div>
    );
    notificationMessage = `Your order with ID ${notification.orderId} from ${vendorName} has been shipped 😁.`;
  } else {
    notificationIcon = (
      <img
        src={notification.vendorCoverImage || defaultVendorImage}
        alt="Vendor"
        className="w-9 h-9 rounded-full object-cover mr-4 border-2 border-gray-300"
      />
    );
    notificationMessage = notification.message;
  }
  

  const handleSwipe = (direction) => {
    const swipeDistance = 80;

    if (direction === "left" && !hasSwiped) {
      setTranslateX(-swipeDistance);
      setSwipeDirection("left");
      setHasSwiped(true);
    } else if (direction === "right" && !hasSwiped) {
      setTranslateX(swipeDistance);
      setSwipeDirection("right");
      setHasSwiped(true);
    } else if (hasSwiped) {
      setTranslateX(0);
      setSwipeDirection("");
      setHasSwiped(false);
    }
  };

  const handleDelete = async () => {
    try {
      deleteNotification(notification.id);
      setIsDeleted(true);
      toast.success("Notification deleted", { position: "bottom-center" });
    } catch (error) {
      console.error(`Error deleting notification ${notification.id}:`, error);
    }
  };

  const handleMarkAsRead = async () => {
    try {
      markAsRead(notification.id);
      setIsRead(true);
      toast.success("Notification marked as read", {
        position: "bottom-center",
      });
    } catch (error) {
      console.error(
        `Error marking notification ${notification.id} as read:`,
        error
      );
    }
  };

  const handleNotificationClick = () => {
    if (notification?.productId) {
      navigate(`/product/${notification.productId}`);
    } else {
      console.log("No productId found, cannot navigate.");
    }
  };

  const handleTouchStart = (e) => {
    e.preventDefault();
    const startX = e.touches[0].clientX;

    const handleTouchMove = (moveEvent) => {
      const currentX = moveEvent.touches[0].clientX;
      const deltaX = currentX - startX;

      setTranslateX(deltaX);

      if (deltaX < 0) {
        handleSwipe("left");
      } else if (deltaX > 0) {
        handleSwipe("right");
      }
    };

    const handleTouchEnd = () => {
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };

    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);
  };

  if (isDeleted) return null;

  if (loading) {
    return (
      <li className="relative mt-4 overflow-hidden w-full mb-2">
        <Skeleton height={70} />
      </li>
    );
  }

  return (
    <li className="relative mt-4 overflow-hidden w-full mb-2">
      <Toaster />
      <div
        className={`absolute inset-y-6.5 ${
          swipeDirection === "right" ? "left-0" : "right-0"
        } bg-customOrange flex justify-center items-center`}
        style={{
          width: "80px",
          height: "100%",
          opacity: swipeDirection !== "" ? 1 : 0,
          transition: "opacity 0.3s ease",
          zIndex: 1,
        }}
      >
        {swipeDirection === "right" ? (
          <div
            className="flex justify-center items-center"
            onClick={handleDelete}
            style={{
              transform: `scale(${Math.abs(translateX) / 65})`,
              transition: "transform 0.3s ease",
              cursor: "pointer",
            }}
          >
            <TrashIcon />
          </div>
        ) : swipeDirection === "left" ? (
          <div
            className="flex justify-center  items-center"
            onClick={handleMarkAsRead}
            style={{
              transform: `scale(${Math.abs(translateX) / 90})`,
              transition: "transform 0.3s ease",
              cursor: "pointer",
            }}
          >
            <EnvelopeIcon />
          </div>
        ) : null}
      </div>
      <div
        className={`flex justify-between items-center relative z-10 bg-white`}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: "transform 0.3s ease",
        }}
        onTouchStart={handleTouchStart}
        onClick={handleNotificationClick}
      >
        <div className="flex  flex-grow">
          <div className="mr-4">{notificationIcon}</div>
          <div className="flex-grow">
            <p
              className={`mr-1.5 font-opensans text-sm ${
                isRead ? "text-gray-500" : "text-black font-semibold"
              }`}
            >
              {notificationMessage}
            </p>
            <span className="text-xs text-gray-500">
              {moment(notification.createdAt.seconds * 1000).format(
                "HH:mm, DD/MM/YYYY"
              )}
            </span>
          </div>
        </div>

        {productImage && (
          <div className="flex-shrink-0 w-14 h-16 ml-4">
            <img
              src={productImage}
              alt="Product"
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
        )}
      </div>
    </li>
  );
};

export default NotificationItem;
