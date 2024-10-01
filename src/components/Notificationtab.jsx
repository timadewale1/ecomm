import React, { useState } from "react";
import moment from "moment";
import { useNavigate } from "react-router-dom"; 
import TrashIcon from "./Loading/trash"; 
import EnvelopeIcon from "./Loading/Envelope"; 
import toast, { Toaster } from "react-hot-toast";
import Skeleton from "react-loading-skeleton"; 
const NotificationItem = ({ notification, markAsRead, deleteNotification, loading }) => {
  const [translateX, setTranslateX] = useState(0); 
  const [swipeDirection, setSwipeDirection] = useState(""); 
  const [isRead, setIsRead] = useState(notification?.seen); 
  const [isDeleted, setIsDeleted] = useState(false); 
  const [hasSwiped, setHasSwiped] = useState(false); 

  const defaultVendorImage =
    "https://images.saatchiart.com/saatchi/1750204/art/9767271/8830343-WUMLQQKS-7.jpg";

  const navigate = useNavigate(); 

  // Handle swipe move
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
            className="flex justify-center items-center"
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
              }`} 
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
