import React, { useState } from "react";
import moment from "moment";
import { useNavigate } from "react-router-dom"; // Importing useNavigate from react-router-dom
import TrashIcon from "./Loading/trash"; // Importing animated trash icon
import EnvelopeIcon from "./Loading/Envelope"; // Importing animated envelope icon
import toast, { Toaster } from "react-hot-toast"; // Importing React Hot Toast
import Skeleton from "react-loading-skeleton"; // Import skeleton

const NotificationItem = ({ notification, markAsRead, deleteNotification, loading }) => {
  const [translateX, setTranslateX] = useState(0); // Track swipe distance
  const [swipeDirection, setSwipeDirection] = useState(""); // Track the swipe direction
  const [isRead, setIsRead] = useState(notification?.seen); // Track if notification is read
  const [isDeleted, setIsDeleted] = useState(false); // Track if notification is deleted
  const [hasSwiped, setHasSwiped] = useState(false); // Track if user has swiped in any direction

  const defaultVendorImage =
    "https://images.saatchiart.com/saatchi/1750204/art/9767271/8830343-WUMLQQKS-7.jpg";

  const navigate = useNavigate(); // Initialize navigation

  // Handle swipe move
  const handleSwipe = (direction) => {
    const swipeDistance = 80; // Fixed swipe distance

    if (direction === "left" && !hasSwiped) {
      setTranslateX(-swipeDistance); // Move halfway left
      setSwipeDirection("left"); // Set swipe direction to left
      setHasSwiped(true); // Mark that the user has swiped once
    } else if (direction === "right" && !hasSwiped) {
      setTranslateX(swipeDistance); // Move halfway right
      setSwipeDirection("right"); // Set swipe direction to right
      setHasSwiped(true); // Mark that the user has swiped once
    } else if (hasSwiped) {
      // On any further swipe, just reset to the original state
      setTranslateX(0); // Reset the swipe to initial state
      setSwipeDirection(""); // Clear swipe direction
      setHasSwiped(false); // Reset swipe tracking
    }
  };

  // Action handlers for tapping on the icons
  const handleDelete = async () => {
    try {
      deleteNotification(notification.id); // Call parent function to delete
      setIsDeleted(true);
      toast.success("Notification deleted", { position: "bottom-center" });
    } catch (error) {
      console.error(`Error deleting notification ${notification.id}:`, error);
    }
  };

  const handleMarkAsRead = async () => {
    try {
      markAsRead(notification.id); // Call parent function to mark as read
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

  // Navigate to product details when clicking on a notification
  const handleNotificationClick = () => {
    if (notification?.productId) {
      navigate(`/product/${notification.productId}`); // Use productId for navigation
    } else {
      console.log("No productId found, cannot navigate.");
    }
  };

  // Manually handle touch start, move, and end events
  const handleTouchStart = (e) => {
    e.preventDefault();
    const startX = e.touches[0].clientX;

    // Handle touch move to detect swipe direction
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

    // Handle touch end to reset the position and perform actions
    const handleTouchEnd = () => {
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };

    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);
  };

  if (isDeleted) return null; // If deleted, hide the notification

  // Show skeleton when loading
  if (loading) {
    return (
      <li className="relative mt-4 your-list-class w-full mb-2">
        <Skeleton height={70} />
      </li>
    );
  }

  return (
    <li className="relative mt-4 your-list-class w-full mb-2">
      <Toaster /> {/* For displaying toast notifications */}
      {/* Background that shows on the left or right during swipe */}
      <div
        className={`absolute inset-y-6.5 ${
          swipeDirection === "right" ? "left-0" : "right-0"
        } bg-customOrange flex justify-center items-center`}
        style={{
          width: "80px", // Reduced width of the orange background
          height: "100%",
          opacity: swipeDirection !== "" ? 1 : 0, // Only show background when swiping
          transition: "opacity 0.3s ease", // Smooth opacity transition
          zIndex: 1, // Make sure the background is behind the notification
        }}
      >
        {/* Show the icon based on swipe direction, and add click handler */}
        {swipeDirection === "right" ? (
          <div
            className="flex justify-center items-center"
            onClick={handleDelete} // Trigger delete on click
            style={{
              transform: `scale(${Math.abs(translateX) / 65})`, // Scale icon based on swipe distance
              transition: "transform 0.3s ease", // Smooth scaling
              cursor: "pointer",
            }}
          >
            <TrashIcon />
          </div>
        ) : swipeDirection === "left" ? (
          <div
            className="flex justify-center items-center"
            onClick={handleMarkAsRead} // Trigger mark as read on click
            style={{
              transform: `scale(${Math.abs(translateX) / 90})`, // Scale icon based on swipe distance
              transition: "transform 0.3s ease", // Smooth scaling
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
          transform: `translateX(${translateX}px)`, // Move horizontally during swipe
          transition: "transform 0.3s ease", // Smooth return after swipe ends
        }}
        onTouchStart={handleTouchStart} // Start detecting swipe direction
        onClick={handleNotificationClick} // Trigger navigation on click
      >
        <div className="flex flex-grow">
          <img
            src={notification.vendorCoverImage || defaultVendorImage}
            alt="Vendor"
            className="w-9 h-9 rounded-full object-cover mr-4"
          />
          <div className="flex-grow">
            <p
              className={`mr-1.5 font-opensans text-sm ${
                isRead ? "text-gray-500" : "text-black font-semibold"
              }`} // Make the text gray and normal when marked as read, bold and black when unread
            >
              {notification.message}
            </p>
            <span className="text-xs text-gray-500">
              {moment(notification.createdAt.seconds * 1000).format(
                "HH:mm, DD/MM/YYYY"
              )}
            </span>
          </div>
        </div>

        {notification.productImage && (
          <div className="flex-shrink-0 w-14 h-16 ml-4">
            <img
              src={notification.productImage}
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
