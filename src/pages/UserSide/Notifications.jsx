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
const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
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

  return (
    <div>
      <div>
        <GoChevronLeft
          className="text-3xl"
          onClick={() => navigate("/newhome")}
        />
        <h1 className="text-2xl font-semibold">Notifications</h1>
      </div>

      <ul className="space-y-4">
        {notifications.map((notification) => (
          <li
            key={notification.id}
            className={`p-4 rounded shadow-sm ${
              notification.seen ? "bg-gray-200" : "bg-white"
            }`}
          >
            <div className="flex justify-between items-center">
              <div>
                {notification.productImage && (
                  <img
                    src={notification.productImage}
                    alt="Product"
                    className="w-16 h-16 object-cover"
                  />
                )}
                <p>{notification.message}</p>
              </div>
              {!notification.seen && (
                <button
                  className="text-blue-500 hover:underline"
                  onClick={() => markAsRead(notification.id)}
                >
                  Mark as Read
                </button>
              )}
            </div>
            <span className="text-xs text-gray-500">
              {new Date(notification.createdAt.seconds * 1000).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NotificationsPage;
