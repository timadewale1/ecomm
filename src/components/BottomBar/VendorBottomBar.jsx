import React, { useEffect } from "react";
import { FaUser, FaRegUser } from "react-icons/fa";
import {
  MdDashboardCustomize,
  MdOutlineDashboardCustomize,
} from "react-icons/md";
import { MdReorder } from "react-icons/md";
import { AiFillProduct } from "react-icons/ai";
import { AiOutlineProduct } from "react-icons/ai";
import { useNavigate, useLocation } from "react-router-dom";
import { useVendorNavigation } from "../Context/VendorBottomBarCtxt"; // Updated import
import "../../styles/bottombar.css";

const VendorBottomBar = ({ isSearchFocused }) => {
  const { activeNav, setActiveNav } = useVendorNavigation();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      icon: MdOutlineDashboardCustomize,
      activeIcon: MdDashboardCustomize,
      label: "Dashboard",
      route: "/vendordashboard",
    },
    {
      icon: MdReorder,
      activeIcon: MdReorder,
      label: "Orders",
      route: "/vendor-orders",
    },
    {
      icon: AiOutlineProduct,
      activeIcon: AiFillProduct,
      label: "Products",
      route: "/vendor-products",
    },

    {
      icon: FaRegUser,
      activeIcon: FaUser,
      label: "Profile",
      route: "/vendor-profile",
    },
  ];

  useEffect(() => {
    const currentPath = location.pathname;
    const activeIndex = navItems.findIndex(
      (item) => item.route === currentPath
    );
    if (activeIndex !== -1) {
      setActiveNav(activeIndex);
    }
  }, [location.pathname, setActiveNav]);

  const handleClick = (index, route) => {
    setActiveNav(index);
    navigate(route);
  };

  return (
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
        </div>
      ))}
    </div>
  );
};

export default VendorBottomBar;