import React, { useState } from "react";
import moment from "moment";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import TrashIcon from "./Loading/trash";
import EnvelopeIcon from "./Loading/Envelope";
import { PiPackage } from "react-icons/pi";
import { TbTruckDelivery } from "react-icons/tb";

import { FaRegSadCry, FaRegSmile } from "react-icons/fa"; // Import new icons
import { MdCancel, MdOutlineClose } from "react-icons/md";
import Modal from "react-modal";

const defaultVendorImage =
  "https://images.saatchiart.com/saatchi/1750204/art/9767271/8830343-WUMLQQKS-7.jpg";

const defaultProductImage = "https://via.placeholder.com/150"; // Replace with your default product image URL

const NotificationItem = ({ notification, markAsRead, deleteNotification }) => {

  const [translateX, setTranslateX] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState("");
  const [isRead, setIsRead] = useState(notification?.seen);
  const [isDeleted, setIsDeleted] = useState(false);
  const [hasSwiped, setHasSwiped] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  // Use data directly from the notification object
  const vendorName = notification.vendorName || "Unknown Vendor";
  const productImage =
    notification.productImage && notification.productImage !== ""
      ? notification.productImage
      : defaultProductImage;
  const vendorImage =
    notification.vendorCoverImage && notification.vendorCoverImage !== ""
      ? notification.vendorCoverImage
      : defaultVendorImage;


  let notificationIcon;
  let notificationMessage = notification.message;

  // Determine if the notification is an order notification
  const isOrderNotification = [
    "In Progress",
    "Shipped",
    "Delivered",
    "Declined",
  ].some((status) => notification.message.includes(status));

  // Adjust notification icon and message based on the message content
  if (notification.message.includes("In Progress")) {
    notificationIcon = (
      <div className="border rounded-full p-1">
        <PiPackage className="text-3xl text-gray-700" />
      </div>
    );
    notificationMessage = `${vendorName} has accepted your order with ID ${notification.orderId} and is packaging 🤝🏾.`;
  } else if (notification.message.includes("Shipped")) {
    notificationIcon = (
      <div className="border rounded-full p-1">
        <TbTruckDelivery className="text-3xl text-gray-700" />
      </div>
    );

    notificationMessage = `Your order with ID ${notification.orderId} from ${vendorName} has been shipped. Click to see Rider's details 😁.`;

  } else if (notification.message.includes("Delivered")) {
    notificationIcon = (
      <div className="border rounded-full p-1">
        <FaRegSmile className="text-3xl text-gray-700" />
      </div>
    );

    notificationMessage = `${vendorName} has marked your order as delivered! 🥳 If you have a problem with this order, or you haven't received it, reach out to customer care immediately.`;
  } else if (notification.message.includes("Declined")) {
    notificationIcon = (
      <div className="border rounded-full p-1">
        <MdCancel className="text-3xl text-gray-700" />

      </div>
    );
    notificationMessage = `Your order with ID ${notification.orderId} from ${vendorName} has been cancelled. Click to see why 😢.`;
  } else {

    // For vendor notifications or other types, keep the vendor image and message as is
    notificationIcon = null; // No icon needed

    notificationMessage = notification.message;
  }

  // Determine if the notification should be clickable
  const isClickableNotification =
    notification.type === "order" &&
    (notification.message.includes("Shipped") ||
      notification.message.includes("Declined"));

  // Swipe handling functions (no changes needed)
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
    // Open modal only for order notifications with status "Shipped" or "Declined"
    if (
      notification.type === "order" &&
      (notification.message.includes("Shipped") ||
        notification.message.includes("Declined"))
    ) {
      setIsModalOpen(true);
    } else {
      // For other notifications, existing navigation logic
      if (notification.productLink) {
        navigate(notification.productLink);
      } else if (notification.productId) {
        navigate(`/product/${notification.productId}`);
      } else if (notification.orderId) {
        navigate(`/order/${notification.orderId}`);
      } else {
        console.log("No productId or orderId found, cannot navigate.");
      }
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

  return (
    <>
      <li className="relative mt-4 overflow-hidden w-full mb-2">
        {/* Swipe Actions */}
        <div
          className={`absolute inset-y-0 ${
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
                transform: `scale(${Math.min(Math.abs(translateX) / 65, 1)})`,
                transition: "transform 0.3s ease",
                cursor: "pointer",
              }}
            >
              <TrashIcon />
            </div>
          ) : swipeDirection === "left" ? (
            <div
              className="flex justify-center items-center"
              onClick={handleMarkAsRead}
              style={{
                transform: `scale(${Math.min(Math.abs(translateX) / 90, 1)})`,
                transition: "transform 0.3s ease",
                cursor: "pointer",
              }}
            >
              <EnvelopeIcon />
            </div>
          ) : null}
        </div>

        {/* Notification Content */}
        <div
          className={`flex items-center justify-between relative z-10 bg-white ${
            isClickableNotification || notification.type !== "order"
              ? "cursor-pointer"
              : ""
          }`}
          style={{
            transform: `translateX(${translateX}px)`,
            transition: "transform 0.3s ease",
          }}
          onTouchStart={handleTouchStart}
          onClick={
            isClickableNotification || notification.type !== "order"
              ? handleNotificationClick
              : undefined
          }
        >
          {/* Left Container */}
          <div className="flex-shrink-0">
            {isOrderNotification ? (
              // For order notifications, use icon
              notificationIcon
            ) : (
              // For vendor notifications, use vendor image (no styling changes)
              <img
                src={vendorImage}
                alt="Vendor"
                className="w-12 h-12 rounded-full object-cover border-2 border-gray-300"
              />
            )}
          </div>

          {/* Notification Message */}
          <div className="flex-grow mx-3">
            <p
              className={`mr-1.5 font-opensans text-xs  ${
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

          {/* Product Image */}
          {productImage && (
            <div className="flex-shrink-0">
              <img
                src={productImage}
                alt="Product"
                className="w-12 h-12 rounded-lg object-cover"
              />
            </div>
          )}
        </div>
      </li>

      {/* Modal for Shipped and Declined order notifications */}
      <Modal
        isOpen={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
        contentLabel="Notification Details"
        ariaHideApp={false}
        className="modal-content-reason" // Use the same class as the Call Confirmation modal
        overlayClassName="modal-overlay"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 bg-rose-100 flex justify-center items-center rounded-full">
              {notification.message.includes("Shipped") ? (
                <TbTruckDelivery className="text-customRichBrown" />
              ) : notification.message.includes("Declined") ? (
                <MdCancel className="text-customRichBrown" />
              ) : null}
            </div>
            <h2 className="font-opensans text-base font-semibold">
              {notification.message.includes("Shipped")
                ? "Order Shipped"
                : notification.message.includes("Declined")
                ? "Order Declined"
                : ""}
            </h2>
          </div>
          <MdOutlineClose
            className="text-black text-xl cursor-pointer"
            onClick={() => setIsModalOpen(false)}
          />
        </div>

        {/* Modal Content */}
        {notification.message.includes("Declined") &&
        notification.declineReason ? (
          <div>
            <p className="text-xs text-gray-700 font-opensans mb-6">
              We're sorry! Your order has been declined by{" "}
              {notification.vendorName}.
            </p>
            <div className="space-y-2">
              <p className="text-sm font-opensans text-gray-700">
                <strong>Reason:</strong> {notification.declineReason}
              </p>
            </div>
            <div className="mt-12">
              <p className="text-xs font-opensans text-gray-600 italic border-l-2 border-gray-300 pl-3 mt-4">
                Note: Refunds typically take 3-5 business days to appear in your
                account, depending on your payment method.
              </p>
            </div>
          </div>
        ) : notification.message.includes("Shipped") &&
          notification.riderInfo ? (
          <div>
            <p className="text-xs text-gray-700 font-opensans mb-6">
              Your order with {notification.vendorName} has been shipped.
            </p>
            <div className="space-y-2">
              <p className="text-xs font-opensans text-gray-700">
                <strong>Rider Name:</strong> {notification.riderInfo.riderName}
              </p>
              <p className="text-xs font-opensans text-gray-700">
                <strong>Rider Number:</strong>{" "}
                {notification.riderInfo.riderNumber}
              </p>
              <p className="text-xs font-opensans text-gray-700">
                <strong>Note:</strong>{" "}
                {notification.riderInfo.note || "No additional notes"}
              </p>
            </div>
            <div className="mt-12">
              <p className="text-xs font-opensans text-gray-600 italic border-l-2 border-gray-300 pl-3 mt-4">
                Note: Orders usually take 2-7 days to be shipped, depending on
                your location. Rider information has been shared with you for
                transparency.
              </p>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
};

export default NotificationItem;
