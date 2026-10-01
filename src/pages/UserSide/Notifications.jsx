import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import { ChevronLeft, Search, X } from "lucide-react";
import moment from "moment";
import toast from "react-hot-toast";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { auth, db } from "../../firebase.config";
import notifspic from "../../Images/Notifs.svg";
import SEO from "../../components/Helmet/SEO";
import NotificationItem from "../../components/Notificationtab";
import AppBottomSheet from "../../components/layout/AppBottomSheet";
import AppPageHeader from "../../components/layout/AppPageHeader";
import { isNativeApp } from "../../services/platform";
import { useAuth } from "../../custom-hooks/useAuth";
import useNativePageRefresh from "../../custom-hooks/useNativePageRefresh";
import {
  notificationPatched,
  notificationRemoved,
  notificationRestored,
  selectNotifications,
  selectNotificationsStatus,
} from "../../redux/reducers/notificationsRealtimeSlice";
import { refreshNotificationsFromServer } from "../../services/realtime/userRealtimeSync";
import "./notifications.css";

const INITIAL_VISIBLE_NOTIFICATIONS = 32;
const VISIBLE_NOTIFICATIONS_BATCH = 32;
const EMPTY_NOTIFICATIONS = [];

const notificationDate = (createdAt) => {
  if (typeof createdAt?.toDate === "function") return createdAt.toDate();
  if (typeof createdAt?.seconds === "number") {
    return new Date(createdAt.seconds * 1000);
  }
  const parsed = createdAt instanceof Date ? createdAt : new Date(createdAt);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
};

const NotificationsSkeleton = () => (
  <div
    className="notifications-skeleton"
    aria-label="Loading notifications"
    aria-busy="true"
  >
    <span className="notifications-skeleton-heading" />
    {[0, 1, 2, 3, 4].map((item) => (
      <div className="notifications-skeleton-row" key={item}>
        <span className="notifications-skeleton-dot" />
        <span className="notifications-skeleton-avatar" />
        <span className="notifications-skeleton-copy">
          <span />
          <span />
          <span />
        </span>
        {item === 0 || item === 3 ? (
          <span className="notifications-skeleton-product" />
        ) : null}
        <span className="notifications-skeleton-menu" />
      </div>
    ))}
  </div>
);

const NotificationsPage = () => {
  const allNotifications = useSelector(selectNotifications);
  const cacheStatus = useSelector(selectNotificationsStatus);
  const cacheOwner = useSelector(state => state.notificationsRealtime.ownerUid);
  const [activeTab, setActiveTab] = useState("all");
  const [optionsNotification, setOptionsNotification] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [visibleCount, setVisibleCount] = useState(
    INITIAL_VISIBLE_NOTIFICATIONS,
  );
  const loadMoreRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { currentUser, loading: authLoading } = useAuth();
  const authenticatedUid = currentUser?.uid || null;
  const ownsCache = Boolean(authenticatedUid && cacheOwner === authenticatedUid);
  const notifications = ownsCache ? allNotifications : EMPTY_NOTIFICATIONS;
  const notificationsStatus = ownsCache ? cacheStatus : "connecting";

  useEffect(() => {setOptionsNotification(null); setDeleting(false);}, [authenticatedUid]);

  const refreshNotifications = useCallback(async () => {
    if (!authenticatedUid) return;
    await refreshNotificationsFromServer(authenticatedUid);
  }, [authenticatedUid]);

  useNativePageRefresh(refreshNotifications, {
    enabled: Boolean(authenticatedUid),
    verticalOffset: 112,
  });

  const markAsRead = useCallback(async (notificationId) => {
    const session = auth.currentUser;
    if (!authenticatedUid || session?.uid !== authenticatedUid || !notifications.some(item => item.id === notificationId)) return;
    dispatch(notificationPatched({ uid: authenticatedUid, id: notificationId, changes: { seen: true } }));

    try {
      await updateDoc(doc(db, "notifications", notificationId), { seen: true });
    } catch (error) {
      if (auth.currentUser === session) dispatch(notificationPatched({ uid: authenticatedUid, id: notificationId, changes: { seen: false } }));
      console.error("Error marking notification as read:", error);
    }
  }, [dispatch, authenticatedUid, notifications]);

  const deleteNotification = async (notificationId) => {
    const session = auth.currentUser;
    const previous = notifications.find((item) => item.id === notificationId);
    if (!previous || !authenticatedUid || session?.uid !== authenticatedUid) throw new Error("Please reopen your notifications.");
    dispatch(notificationRemoved({uid: authenticatedUid, id: notificationId}));
    try {
      await deleteDoc(doc(db, "notifications", notificationId));
    } catch (error) {
      if (previous && auth.currentUser === session) dispatch(notificationRestored({uid: authenticatedUid, notification: previous}));
      throw error;
    }
  };

  const filteredNotifications = useMemo(
    () =>
      activeTab === "all"
        ? notifications
        : notifications.filter(
            (notification) => notification.type === activeTab,
          ),
    [activeTab, notifications],
  );

  const visibleNotifications = useMemo(
    () => filteredNotifications.slice(0, visibleCount),
    [filteredNotifications, visibleCount],
  );

  const groupedNotifications = useMemo(() => {
    const grouped = {
      today: [],
      thisWeek: [],
      thisMonth: [],
      older: [],
    };
    const now = moment();

    visibleNotifications.forEach((notification) => {
      const createdAt = moment(notificationDate(notification.createdAt));
      if (createdAt.isSame(now, "day")) {
        grouped.today.push(notification);
      } else if (createdAt.isSame(now, "week")) {
        grouped.thisWeek.push(notification);
      } else if (createdAt.isSame(now, "month")) {
        grouped.thisMonth.push(notification);
      } else {
        grouped.older.push(notification);
      }
    });

    return grouped;
  }, [visibleNotifications]);

  const filteredCount = filteredNotifications.length;
  const hasMoreNotifications = visibleCount < filteredCount;

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_NOTIFICATIONS);
  }, [authenticatedUid]);

  const handleTabChange = useCallback((value) => {
    // Reset in the same React event as the filter change. Waiting for an
    // effect would briefly render the new tab with the previous tab's much
    // larger visible count.
    setVisibleCount(INITIAL_VISIBLE_NOTIFICATIONS);
    setActiveTab(value);
  }, []);

  useEffect(() => {
    if (!hasMoreNotifications) return undefined;

    const target = loadMoreRef.current;
    if (!target) return undefined;

    if (!("IntersectionObserver" in window)) {
      setVisibleCount(filteredCount);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setVisibleCount((currentCount) =>
          Math.min(
            currentCount + VISIBLE_NOTIFICATIONS_BATCH,
            filteredCount,
          ),
        );
      },
      { rootMargin: "320px 0px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [filteredCount, hasMoreNotifications]);

  const renderNotificationsSection = (title, notificationsList) =>
    notificationsList.length > 0 ? (
      <section className="notifications-group" aria-labelledby={`group-${title}`}>
        <h2 id={`group-${title}`}>{title}</h2>
        <ul>
          {notificationsList.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              markAsRead={markAsRead}
              onOpenOptions={setOptionsNotification}
            />
          ))}
        </ul>
      </section>
    ) : null;

  const handleDeleteSelected = async () => {
    if (!optionsNotification || deleting) return;
    const session = auth.currentUser;
    setDeleting(true);
    try {
      await deleteNotification(optionsNotification.id);
      if (auth.currentUser !== session) return;
      setOptionsNotification(null);
      toast.success("Notification deleted", { position: "bottom-center" });
    } catch (error) {
      if (auth.currentUser !== session) return;
      console.error("Error deleting notification:", error);
      toast.error("We couldn't delete this notification. Please try again.");
    } finally {
      if (auth.currentUser === session) setDeleting(false);
    }
  };

  const handleNotificationSettings = async () => {
    setOptionsNotification(null);

    if (isNativeApp) {
      toast("Manage notifications in your iPhone Settings.", {
        position: "bottom-center",
      });
      return;
    }

    if (typeof window.Notification === "undefined") {
      toast("Notification settings aren't available in this browser.");
      return;
    }

    if (window.Notification.permission === "default") {
      const permission = await window.Notification.requestPermission();
      toast(
        permission === "granted"
          ? "Notifications enabled"
          : "Enable notifications in your browser settings.",
      );
      return;
    }

    toast(
      window.Notification.permission === "granted"
        ? "Notifications are already enabled."
        : "Enable notifications in your browser settings.",
    );
  };

  const notificationStateResolved =
    notifications.length > 0 ||
    notificationsStatus === "ready" ||
    notificationsStatus === "refreshing" ||
    notificationsStatus === "error";
  const showSkeleton =
    !notificationStateResolved &&
    (authLoading ||
      (Boolean(authenticatedUid) &&
        (notificationsStatus === "idle" ||
          notificationsStatus === "connecting")));

  return (
    <>
      <SEO
        title="Notifications - My Thrift"
        description="View your notifications on My Thrift"
        url="https://www.shopmythrift.store/notifications"
      />

      <main className="notifications-page">
        <AppPageHeader
          title="Notifications"
          alignment="center"
          onBack={() => navigate(-1)}
          rightAction={
            <button
              type="button"
              aria-label="Search"
              onClick={() => navigate("/search")}
            >
              <Search aria-hidden="true" />
            </button>
          }
        >
          <nav className="notifications-tabs" aria-label="Notification filters">
            {[
              ["all", "All"],
              ["vendor", "Vendors"],
              ["order", "Orders"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={activeTab === value ? "is-active" : ""}
                aria-pressed={activeTab === value}
                onClick={() => handleTabChange(value)}
              >
                {label}
              </button>
            ))}
          </nav>
        </AppPageHeader>

        <div className="notifications-scroll">
          {showSkeleton ? (
            <NotificationsSkeleton />
          ) : !authenticatedUid ? (
            <div className="notifications-empty">
              <img src={notifspic} alt="" />
              <h2>You are not logged in</h2>
              <p>
                Log in to view notifications from vendors you follow and track
                your order updates.
              </p>
              <button
                type="button"
                onClick={() =>
                  navigate("/login", { state: { from: location.pathname } })
                }
              >
                Log in
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="notifications-empty">
              <img src={notifspic} alt="" />
              <h2>Your notifications will show here</h2>
              <p>
                You’ll get important alerts about vendors you follow and your
                orders here and through your email.
              </p>
            </div>
          ) : filteredCount === 0 ? (
            <div className="notifications-empty notifications-empty--filtered">
              <h2>No {activeTab === "vendor" ? "vendor" : "order"} notifications</h2>
              <p>New updates will show here.</p>
            </div>
          ) : (
            <div className="notifications-list">
              {renderNotificationsSection("Today", groupedNotifications.today)}
              {renderNotificationsSection(
                "This week",
                groupedNotifications.thisWeek,
              )}
              {renderNotificationsSection(
                "This month",
                groupedNotifications.thisMonth,
              )}
              {renderNotificationsSection("Older", groupedNotifications.older)}
              {hasMoreNotifications ? (
                <div
                  ref={loadMoreRef}
                  className="notifications-progressive-sentinel"
                  aria-hidden="true"
                />
              ) : null}
            </div>
          )}
        </div>
      </main>

      <AppBottomSheet
        open={Boolean(optionsNotification)}
        onClose={() => !deleting && setOptionsNotification(null)}
        height="206px"
        ariaLabel="Notification options"
        dismissible={!deleting}
      >
        <div className="notification-options-sheet">
          <div className="notification-options-header">
            <button
              type="button"
              aria-label="Close notification options"
              onClick={() => setOptionsNotification(null)}
              disabled={deleting}
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <h2>Options</h2>
            <button
              type="button"
              aria-label="Close notification options"
              onClick={() => setOptionsNotification(null)}
              disabled={deleting}
            >
              <X aria-hidden="true" />
            </button>
          </div>
          <button
            type="button"
            className="notification-options-action"
            onClick={handleDeleteSelected}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
          <button
            type="button"
            className="notification-options-action notification-options-action--bordered"
            onClick={handleNotificationSettings}
            disabled={deleting}
          >
            Notification settings
          </button>
        </div>
      </AppBottomSheet>
    </>
  );
};

export default NotificationsPage;
