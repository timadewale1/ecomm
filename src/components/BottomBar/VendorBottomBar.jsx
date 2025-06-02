// src/components/Chat/VendorBottomBar.jsx

import React, { useEffect, useState } from "react";
import { GoHome, GoHomeFill } from "react-icons/go";
import { HiOutlineUser, HiUser } from "react-icons/hi2";
import { BsBoxSeam, BsBoxSeamFill } from "react-icons/bs";
import { IoChatbubbles, IoChatbubblesOutline } from "react-icons/io5";
import { AiFillProduct, AiOutlineProduct } from "react-icons/ai";
import { useNavigate, useLocation } from "react-router-dom";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase.config";
import { useAuth } from "../../custom-hooks/useAuth";
import { useVendorNavigation } from "../Context/VendorBottomBarCtxt";
import "../../styles/bottombar.css";

const VendorBottomBar = ({ isSearchFocused }) => {
  const { activeNav, setActiveNav } = useVendorNavigation();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  // State for pending orders (existing)
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  // New: state for “unread chats” (inquiries that vendor hasn't marked as read)
  const [unreadChatsCount, setUnreadChatsCount] = useState(0);

  const navItems = [
    {
      icon: GoHome,
      activeIcon: GoHomeFill,
      label: "Dashboard",
      route: "/vendordashboard",
    },
    {
      icon: BsBoxSeam,
      activeIcon: BsBoxSeamFill,
      label: "Orders",
      route: "/vendor-orders",
    },
    {
      icon: IoChatbubblesOutline,
      activeIcon: IoChatbubbles,
      label: "Chats",
      route: "/vchats",
    },
    {
      icon: AiOutlineProduct,
      activeIcon: AiFillProduct,
      label: "Inventory",
      route: "/vendor-products",
    },
    {
      icon: HiOutlineUser,
      activeIcon: HiUser,
      label: "Profile",
      route: "/vendor-profile",
    },
  ];

  // Set `activeNav` based on current URL path
  useEffect(() => {
    const currentPath = location.pathname;
    const activeIndex = navItems.findIndex(
      (item) => item.route === currentPath
    );
    if (activeIndex !== -1) {
      setActiveNav(activeIndex);
    }
  }, [location.pathname, setActiveNav, navItems]);

  // Listen for “Pending” orders count
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

  // Listen for “unread” inquiries (chats) where hasRead == false for this vendor
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

  const handleClick = (index, route) => {
    setActiveNav(index);
    navigate(route);
  };

  return (
    <div className="bottom-bar-wrapper">
      <div className={`bottom-bar ${isSearchFocused ? "under-keypad" : ""}`}>
        {navItems.map((item, index) => (
          <div
            key={index}
            className={`bottom-nav-icon ${activeNav === index ? "active" : ""}`}
            onClick={() => handleClick(index, item.route)}
          >
            {activeNav === index ? (
              <>
                <item.activeIcon className="w-8 h-6" />
                <span className="nav-label">{item.label}</span>
              </>
            ) : (
              <item.icon className="w-8 text-white opacity-50 h-6" />
            )}

            {/* Badge for pending orders */}
            {item.label === "Orders" && pendingOrdersCount > 0 && (
              <div className="badge">{pendingOrdersCount}</div>
            )}

            {/* Badge for unread chats */}
            {item.label === "Chats" && unreadChatsCount > 0 && (
              <div className="badge">{unreadChatsCount}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default VendorBottomBar;
