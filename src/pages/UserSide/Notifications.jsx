import React, { useState, useEffect } from "react";
import { db, auth } from "../../firebase.config";
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
import { GoChevronLeft } from "react-icons/go";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import Loading from "../../components/Loading/Loading";
import NotificationItem from "../../components/Notificationtab";
import notifspic from "../../Images/Notifs.svg";
import SEO from "../../components/Helmet/SEO";

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNotifications = async (userId) => {
      try {
        const notificationsRefDB = collection(db, "notifications");
        const q = query(notificationsRefDB, where("userId", "==", userId));
        const querySnapshot = await getDocs(q);

        const notificationsList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        notificationsList.sort(
          (a, b) => b.createdAt.seconds - a.createdAt.seconds
        );

        setNotifications(notificationsList);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setLoadingAuth(false); // Auth check completed
      if (user) {
        setCurrentUser(user);
        fetchNotifications(user.uid);
      } else {
        setCurrentUser(null);
        setLoading(false); // Stop loading when user is not logged in
      }
    });

    return () => unsubscribe();
  }, []);

  if (loadingAuth || loading) {
    return (
      <div>
        <Loading />
      </div>
    );
  }

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
      if (filter && notification.type !== filter) return;

      const createdAt = moment(notification.createdAt.seconds * 1000);

      if (createdAt.isSame(moment(), "day")) {
        todayNotifications.push(notification);
      } else if (createdAt.isSame(moment(), "week")) {
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
      : activeTab === "order"
      ? groupNotifications("order")
      : groupNotifications();

  const renderNotificationItem = (notification) => (
    <NotificationItem
      key={notification.id}
      notification={notification}
      markAsRead={markAsRead}
      deleteNotification={deleteNotification}
    />
  );

  const renderNotificationsSection = (title, notificationsList) => {
    return notificationsList.length > 0 ? (
      <>
        <h2 className="font-semibold text-sm font-opensans text-gray-500 mb-2">
          {title}
        </h2>
        <ul>{notificationsList.map(renderNotificationItem)}</ul>
      </>
    ) : null;
  };

  return (
    <>
    <SEO 
        title={`Notifications - My Thrift`} 
        description={`View your notifications on My Thrift`} 
        url={`https://www.shopmythrift.store/notifications`} 
      />
    <div className="relative">
      {/* Sticky Header Section */}
      <div className="sticky top-0 z-20 bg-white w-full">
        {/* Navigation Header */}
        <div className="px-2 py-3 bg-white">
          <div className="flex items-center mb-3 pb-2">
            <GoChevronLeft
              className="text-3xl cursor-pointer"
              onClick={() => navigate(-1)}
            />
            <h1 className="text-xl font-opensans ml-4 font-semibold">
              Notifications
            </h1>
          </div>
          <div className="border-b border-gray-300 w-full"></div>
        </div>

        {/* Tabs for All, Vendors, and Orders */}
        <div className="flex space-x-3 mt-2 mb-4 px-2 bg-white">
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
      </div>

      {/* Scrollable Notification List */}
      <div className="overflow-y-auto h-[calc(100vh-150px)] pb-16 px-2">
        {!currentUser ? (
          // User not logged in
          <div className="flex flex-col px-3 items-center justify-center h-full mt-20">
            <img
              src={notifspic}
              alt="Not logged in"
              className="w-36 h-32 mb-4"
            />
            <h2 className="text-lg font-opensans font-semibold">
              You are not logged in
            </h2>
            <p className="text-gray-500 text-xs font-opensans text-center mt-2">
             Hey there, we can see you are not logged in, so you can't view notifications from
              vendors you follow or check order status.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="mt-4 bg-customOrange text-white text-xs font-opensans py-2 px-4 rounded-full"
            >
              Login
            </button>
          </div>
        ) : notifications.length === 0 ? (
          // User is logged in but no notifications
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
              You’ll get important alerts about vendors <br /> you follow and
              your orders here and <br /> through your email.
            </p>
          </div>
        ) : (
          // User is logged in and has notifications
          <div>
            {renderNotificationsSection("Today", groupedNotifications.today)}
            {renderNotificationsSection(
              "This Week",
              groupedNotifications.thisWeek
            )}
            {renderNotificationsSection(
              "This Month",
              groupedNotifications.thisMonth
            )}
            {renderNotificationsSection("Older", groupedNotifications.older)}
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default NotificationsPage;
