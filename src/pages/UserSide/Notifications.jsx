import React, { useState, useEffect } from "react";
import { db, auth } from "../../firebase.config"; // Adjust based on your setup
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { GoChevronLeft } from "react-icons/go";
import { useNavigate } from "react-router-dom";
import { format, isToday, isYesterday, isThisWeek, isThisMonth } from "date-fns";

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("all"); // For switching tabs (All, Vendors, Orders)
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNotifications = async (userId) => {
      try {
        const notificationsRef = collection(db, "notifications");
        const q = query(notificationsRef, where("userId", "==", userId));
        const querySnapshot = await getDocs(q);

        const notificationsList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setNotifications(notificationsList);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    // Check if user is authenticated and fetch notifications
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        fetchNotifications(user.uid);
      }
    });

    return () => unsubscribe();
  }, []);

  const markAsRead = async (notificationId) => {
    try {
      const notificationRef = doc(db, "notifications", notificationId);
      await updateDoc(notificationRef, { seen: true });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, seen: true } : n))
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Grouping notifications based on time
  const groupNotifications = () => {
    const todayNotifications = [];
    const thisWeekNotifications = [];
    const thisMonthNotifications = [];
    const olderNotifications = [];

    notifications.forEach((notification) => {
      const createdAt = new Date(notification.createdAt.seconds * 1000); // Convert Firestore timestamp

      if (isToday(createdAt)) {
        todayNotifications.push(notification);
      } else if (isYesterday(createdAt) || isThisWeek(createdAt)) {
        thisWeekNotifications.push(notification);
      } else if (isThisMonth(createdAt)) {
        thisMonthNotifications.push(notification);
      } else {
        olderNotifications.push(notification);
      }
    });

    return {
      today: todayNotifications,
      thisWeek: thisWeekNotifications,
      thisMonth: thisMonthNotifications,
      older: olderNotifications,
    };
  };

  const groupedNotifications = groupNotifications();

  const renderNotificationItem = (notification) => (
    <li
      key={notification.id}
      className={`flex justify-between p-4 rounded shadow-sm mb-2 ${
        notification.seen ? "bg-gray-200" : "bg-white"
      }`}
    >
      <div className="flex">
        {notification.productImage && (
          <img
            src={notification.productImage}
            alt="Product"
            className="w-12 h-12 object-cover mr-4"
          />
        )}
        <div>
          <p>{notification.message}</p>
          <span className="text-xs text-gray-500">
            {new Date(notification.createdAt.seconds * 1000).toLocaleString()}
          </span>
        </div>
      </div>
      {!notification.seen && (
        <button
          className="text-blue-500 hover:underline"
          onClick={() => markAsRead(notification.id)}
        >
          Mark as Read
        </button>
      )}
    </li>
  );

  return (
    <div className="p-4">
      {/* Navigation Header */}
      <div className="flex items-center mb-4">
        <GoChevronLeft
          className="text-3xl cursor-pointer"
          onClick={() => navigate("/newhome")}
        />
        <h1 className="text-2xl font-semibold ml-4">Notifications</h1>
      </div>

      {/* Tabs for All, Vendors, and Orders */}
      <div className="flex space-x-4 mb-4">
        <button
          onClick={() => setActiveTab("all")}
          className={`py-2 px-4 rounded-full ${
            activeTab === "all" ? "bg-blue-500 text-white" : "bg-gray-200"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setActiveTab("vendor")}
          className={`py-2 px-4 rounded-full ${
            activeTab === "vendor" ? "bg-blue-500 text-white" : "bg-gray-200"
          }`}
        >
          Vendors
        </button>
        <button
          onClick={() => setActiveTab("order")}
          className={`py-2 px-4 rounded-full ${
            activeTab === "order" ? "bg-blue-500 text-white" : "bg-gray-200"
          }`}
        >
          Orders
        </button>
      </div>

      {/* Notifications Grouping by Time */}
      <div>
        {/* Today */}
        <h2 className="font-bold text-lg mb-2">Today</h2>
        {groupedNotifications.today.length > 0 ? (
          groupedNotifications.today.map(renderNotificationItem)
        ) : (
          <p className="text-gray-500">No notifications today.</p>
        )}

        {/* This Week */}
        <h2 className="font-bold text-lg mt-4 mb-2">This Week</h2>
        {groupedNotifications.thisWeek.length > 0 ? (
          groupedNotifications.thisWeek.map(renderNotificationItem)
        ) : (
          <p className="text-gray-500">No notifications this week.</p>
        )}

        {/* This Month */}
        <h2 className="font-bold text-lg mt-4 mb-2">This Month</h2>
        {groupedNotifications.thisMonth.length > 0 ? (
          groupedNotifications.thisMonth.map(renderNotificationItem)
        ) : (
          <p className="text-gray-500">No notifications this month.</p>
        )}

        {/* Older */}
        <h2 className="font-bold text-lg mt-4 mb-2">Older</h2>
        {groupedNotifications.older.length > 0 ? (
          groupedNotifications.older.map(renderNotificationItem)
        ) : (
          <p className="text-gray-500">No older notifications.</p>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
