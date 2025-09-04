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
import { useNavigate, useLocation } from "react-router-dom";
import moment from "moment";
import Loading from "../../components/Loading/Loading";
import NotificationItem from "../../components/Notificationtab";
import notifspic from "../../Images/Notifs.svg";
import SEO from "../../components/Helmet/SEO";
import posthog from "posthog-js";

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("all");

  const navigate = useNavigate();
  const location = useLocation();

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

        // Sort newest first, safely
        notificationsList.sort(
          (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
        );

        setNotifications(notificationsList);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setLoadingAuth(false);

      if (user) {
        setCurrentUser(user);

        // PostHog identify after we have the user
        posthog.identify(user.uid, {
          email: user.email,
          name: user.displayName || "Anonymous",
        });

        fetchNotifications(user.uid);

        // Track page view for logged in user
        posthog.capture("notifications_page_viewed", { userId: user.uid });
      } else {
        setCurrentUser(null);

        // Identify guest
        const guestId = "guest_" + Math.random().toString(36).substring(2, 10);
        posthog.identify(guestId, { guest: true });
        posthog.capture("notifications_page_viewed", { userId: guestId });

        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loadingAuth || loading) {
    return <Loading />;
  }

  const markAsRead = async (notificationId) => {
    try {
      const notificationRef = doc(db, "notifications", notificationId);
      await updateDoc(notificationRef, { seen: true });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, seen: true } : n))
      );

      posthog.capture("notification_marked_as_read", {
        notificationId,
        userId: currentUser?.uid || "guest",
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const notificationRef = doc(db, "notifications", notificationId);
      await deleteDoc(notificationRef);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

      posthog.capture("notification_deleted", {
        notificationId,
        userId: currentUser?.uid || "guest",
      });
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const groupNotifications = (filter = null) => {
    const today = [];
    const thisWeek = [];
    const thisMonth = [];
    const older = [];

    notifications.forEach((n) => {
      if (filter && n.type !== filter) return;

      const createdAt = moment(n.createdAt?.seconds * 1000);

      if (createdAt.isSame(moment(), "day")) today.push(n);
      else if (createdAt.isSame(moment(), "week")) thisWeek.push(n);
      else if (createdAt.isSame(moment(), "month")) thisMonth.push(n);
      else older.push(n);
    });

    return { today, thisWeek, thisMonth, older };
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

  const renderNotificationsSection = (title, list) =>
    list.length > 0 ? (
      <>
        <h2 className="font-semibold text-sm font-opensans text-gray-500 mb-2">
          {title}
        </h2>
        <ul>{list.map(renderNotificationItem)}</ul>
      </>
    ) : null;

  return (
    <>
      <SEO
        title={`Notifications - My Thrift`}
        description={`View your notifications on My Thrift`}
        url={`https://www.shopmythrift.store/notifications`}
      />
      <div className="relative">
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 bg-white w-full">
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

          {/* Tabs */}
          <div className="flex space-x-3 mt-2 mb-4 px-2 bg-white">
            {["all", "vendor", "order"].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  posthog.capture("notifications_tab_switched", {
                    tab,
                    userId: currentUser?.uid || "guest",
                  });
                }}
                className={`py-2.5 px-3 text-xs font-normal rounded-full ${
                  activeTab === tab
                    ? "bg-customOrange text-white"
                    : "bg-transparent border text-black font-opensans"
                }`}
              >
                {tab === "all"
                  ? "All"
                  : tab.charAt(0).toUpperCase() + tab.slice(1) + "s"}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable notifications */}
        <div className="overflow-y-auto h-[calc(100vh-150px)] pb-16 px-2">
          {!currentUser ? (
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
                Hey there, we can see you are not logged in, so you can't view
                notifications from vendors you follow or check order status.
              </p>
              <button
                onClick={() => {
                  posthog.capture("login_cta_clicked_from_notifications", {
                    from: location.pathname,
                  });
                  navigate("/login", { state: { from: location.pathname } });
                }}
                className="mt-4 bg-customOrange text-white text-xs font-opensans py-2 px-4 rounded-full"
              >
                Login
              </button>
            </div>
          ) : notifications.length === 0 ? (
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
