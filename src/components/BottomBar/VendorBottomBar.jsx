import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";

// Icons - Using Outline versions for consistency
import { GoHome } from "react-icons/go";
import { HiOutlineUser } from "react-icons/hi2";
import { BsBoxSeam } from "react-icons/bs";
import { IoChatbubblesOutline } from "react-icons/io5";
import { AiOutlineProduct } from "react-icons/ai";

import { collection, query, where, onSnapshot, doc } from "firebase/firestore";
import { db } from "../../firebase.config";
import { useAuth } from "../../custom-hooks/useAuth";
import { useVendorNavigation } from "../Context/VendorBottomBarCtxt";
import Badge from "../Badge/Badge";

const VendorBottomBar = ({ isSearchFocused }) => {
  const { activeNav, setActiveNav } = useVendorNavigation();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  // --- State for Counts ---
  const [unreadOffersCount, setUnreadOffersCount] = useState(0);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [unreadChatsCount, setUnreadChatsCount] = useState(0);
  
  // --- State for Avatar ---
  const [avatarUrl, setAvatarUrl] = useState("");

  // --- Configuration: Nav Items ---
  const navItems = useMemo(
    () => [
      { key: "dashboard", icon: GoHome, label: "Dashboard", route: "/vendordashboard" },
      { key: "orders", icon: BsBoxSeam, label: "Orders", route: "/vendor-orders" },
      { key: "chats", icon: IoChatbubblesOutline, label: "Chats", route: "/vchats" },
      { key: "inventory", icon: AiOutlineProduct, label: "Inventory", route: "/vendor-products" },
      { key: "profile", icon: HiOutlineUser, label: "Profile", route: "/vendor-profile" },
    ],
    []
  );

  // --- Logic: Sync Active Tab with URL ---
  useEffect(() => {
    const currentPath = location.pathname;
    const activeIndex = navItems.findIndex((item) =>
      item.route === "/" 
        ? currentPath === "/" 
        : currentPath.startsWith(item.route)
    );
    if (activeIndex !== -1) {
      setActiveNav(activeIndex);
    }
  }, [location.pathname, setActiveNav, navItems]);

  // --- Logic: Listen for "Pending" orders count ---
  useEffect(() => {
    if (!currentUser?.uid) return;
    const ordersRef = collection(db, "orders");
    const q = query(
      ordersRef,
      where("progressStatus", "==", "Pending"),
      where("vendorId", "==", currentUser.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingOrdersCount(snapshot.docs.length);
    });
    return unsubscribe;
  }, [currentUser]);

  // --- Logic: Listen for "unread" inquiries (chats) ---
  useEffect(() => {
    if (!currentUser?.uid) return;
    const inquiriesRef = collection(db, "inquiries");
    const q = query(
      inquiriesRef,
      where("vendorId", "==", currentUser.uid),
      where("hasRead", "==", false)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadChatsCount(snapshot.docs.length);
    });
    return unsubscribe;
  }, [currentUser]);

  // --- Logic: Listen for unread offers ---
  useEffect(() => {
    if (!currentUser?.uid) return;
    const offersRef = collection(db, "offers");
    const q = query(offersRef, where("vendorId", "==", currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const threadMap = new Map();
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (!data.vendorRead) {
          const threadKey = `${data.buyerId}_${data.productId}`;
          threadMap.set(threadKey, true);
        }
      });
      setUnreadOffersCount(threadMap.size);
    });
    return unsubscribe;
  }, [currentUser]);

  // --- Logic: Live Avatar Listener ---
  useEffect(() => {
    if (!currentUser?.uid) {
      setAvatarUrl("");
      return;
    }
    const unsub = onSnapshot(
      doc(db, "users", currentUser.uid),
      (snap) => {
        setAvatarUrl(snap.data()?.photoURL || "");
      },
      (error) => console.log("Avatar listener error", error)
    );
    return () => unsub();
  }, [currentUser?.uid]);

  const handleClick = (index, route) => {
    setActiveNav(index);
    navigate(route);
  };

  // If search keyboard is up, hide the bar
  if (isSearchFocused) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[999] bg-white border-t border-gray-100 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.04)] font-opensans"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center w-full max-w-lg mx-auto px-4 py-2.5">
        {navItems.map((item, index) => {
          const isActive = activeNav === index;
          const Icon = item.icon;
          const isProfile = item.key === "profile";
          // Check if we have an avatar to show for the profile tab
          const showAvatar = isProfile && !!avatarUrl;

          return (
            <div
              key={index}
              onClick={() => handleClick(index, item.route)}
              className="flex flex-col items-center justify-center gap-0.5 w-16 group cursor-pointer"
            >
              {/* Icon Container (The Pill) */}
              <div
                className={`
                  relative flex items-center justify-center w-[60px] h-8 rounded-full transition-all duration-300
                  ${isActive ? "bg-[#FFF0EB]" : "bg-transparent"}
                `}
              >
                {/* Render Avatar OR Icon */}
                {showAvatar ? (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className={`w-7 h-7 rounded-full object-cover border transition-all ${
                      isActive ? "border-[#FF5A1F]" : "border-gray-200"
                    }`}
                  />
                ) : (
                  <Icon
                    className={`w-[24px] h-[24px] transition-colors duration-300 ${
                      isActive ? "text-[#FF5A1F]" : "text-gray-600"
                    }`}
                  />
                )}

                {/* Badge for Pending Orders */}
                {item.key === "orders" && pendingOrdersCount > 0 && !isActive && (
                  <div className="absolute top-1 right-3 scale-75">
                    <Badge count={pendingOrdersCount} />
                  </div>
                )}

                {/* Badge for Chats (Inquiries + Offers) */}
                {item.key === "chats" && (unreadChatsCount + unreadOffersCount > 0) && !isActive && (
                  <div className="absolute top-1 right-3 scale-75">
                     <Badge count={unreadChatsCount + unreadOffersCount} />
                  </div>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[12px] font-medium transition-colors duration-300 ${
                  isActive ? "text-[#FF5A1F]" : "text-gray-700"
                }`}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VendorBottomBar;