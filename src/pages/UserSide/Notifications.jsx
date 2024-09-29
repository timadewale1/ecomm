import React, { useState, useEffect } from "react";
import { db, auth } from "../../firebase.config"; // Adjust based on your setup
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { GoChevronLeft } from "react-icons/go";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import Loading from "../../components/Loading/Loading";
import NotificationItem from "../../components/Notificationtab";
import notifspic from "../../Images/Notifs.svg";
const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
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

  const deleteNotification = async (notificationId) => {
    try {
      const notificationRef = doc(db, "notifications", notificationId);
      await deleteDoc(notificationRef);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const groupNotifications = (filter = null) => {
    const todayNotifications = [];
    const thisWeekNotifications = [];
    const thisMonthNotifications = [];
    const olderNotifications = [];

    notifications.forEach((notification) => {
      if (filter === "vendor" && notification.type !== "vendor") return;

      const createdAt = moment(notification.createdAt.seconds * 1000);

      if (createdAt.isSame(moment(), "day")) {
        todayNotifications.push(notification);
      } else if (
        createdAt.isSame(moment().subtract(1, "day"), "day") ||
        createdAt.isSame(moment(), "week")
      ) {
        thisWeekNotifications.push(notification);
      } else if (createdAt.isSame(moment(), "month")) {
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

  const groupedNotifications =
    activeTab === "vendor"
      ? groupNotifications("vendor")
      : groupNotifications();

  const renderNotificationItem = (notification) => (
    <NotificationItem
      key={notification.id}
      notification={notification}
      markAsRead={markAsRead}
      deleteNotification={deleteNotification}
    />
  );

  const renderNotificationsSection = (title, notifications) => {
    return notifications.length > 0 ? (
      <>
        <h2 className="font-semibold text-sm font-opensans text-gray-500 mb-2">
          {title}
        </h2>
        {notifications.map(renderNotificationItem)}
      </>
    ) : null;
  };

  if (loading) {
    return (
      <div>
        <Loading />
      </div>
    );
  }

  return (
    <div className="p-2">
      {/* Navigation Header */}
      <div className="sticky -px-2 py-3 top-0 bg-white z-10">
        <div className="flex items-center mb-3 pb-2">
          <GoChevronLeft
            className="text-3xl cursor-pointer"
            onClick={() => navigate(-1)}
          />
          <h1 className="text-xl font-opensans ml-4 font-semibold">
            Notifications
          </h1>
        </div>
        <div className="border-b border-gray-300 w-screen translate-y-3 relative left-1/2 transform -translate-x-1/2"></div>
      </div>

      {/* Tabs for All, Vendors, and Orders */}
      <div className="flex space-x-3 mt-2 mb-4">
        <button
          onClick={() => setActiveTab("all")}
          className={`py-2.5 px-3 text-xs font-normal rounded-full ${
            activeTab === "all"
              ? "bg-customOrange text-white"
              : "bg-transparent border text-black font-opensans"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setActiveTab("vendor")}
          className={`py-2.5 px-3 text-xs font-normal rounded-full ${
            activeTab === "vendor"
              ? "bg-customOrange text-white"
              : "bg-transparent border text-black font-opensans"
          }`}
        >
          Vendors
        </button>
        <button
          onClick={() => setActiveTab("order")}
          className={`py-2.5 px-3 font-normal text-xs rounded-full ${
            activeTab === "order"
              ? "bg-customOrange text-white"
              : "bg-transparent border text-black font-opensans"
          }`}
        >
          Orders
        </button>
      </div>

      {/* No Notifications Section */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full mt-20">
          <img
            src={notifspic}
            alt="No notifications"
            className="w-36 h-32 mb-4"
          />
          <h2 className="text-lg font-opensans font-semibold">
            Your notifications will show here
          </h2>
          <p className="text-gray-500 text-xs font-opensans text-center mt-2">
            You’ll get important alerts about vendors <br /> you follow and your
            orders here and
            <br /> through your email.
          </p>
        </div>
      ) : (
        <div>
          {activeTab === "all" && (
            <>
              {groupedNotifications.today.length > 0
                ? renderNotificationsSection(
                    "Today",
                    groupedNotifications.today
                  )
                : groupedNotifications.thisWeek.length > 0
                ? renderNotificationsSection(
                    "This Week",
                    groupedNotifications.thisWeek
                  )
                : groupedNotifications.thisMonth.length > 0
                ? renderNotificationsSection(
                    "This Month",
                    groupedNotifications.thisMonth
                  )
                : groupedNotifications.older.length > 0
                ? renderNotificationsSection(
                    "Older",
                    groupedNotifications.older
                  )
                : null}
            </>
          )}

          {activeTab === "vendor" && (
            <>
              {groupedNotifications.today.length > 0 ? (
                renderNotificationsSection("Today", groupedNotifications.today)
              ) : groupedNotifications.thisWeek.length > 0 ? (
                renderNotificationsSection(
                  "This Week",
                  groupedNotifications.thisWeek
                )
              ) : groupedNotifications.thisMonth.length > 0 ? (
                renderNotificationsSection(
                  "This Month",
                  groupedNotifications.thisMonth
                )
              ) : groupedNotifications.older.length > 0 ? (
                renderNotificationsSection("Older", groupedNotifications.older)
              ) : (
                <p className="text-gray-500">No vendor notifications.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
