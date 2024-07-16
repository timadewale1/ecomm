import React, { useEffect } from "react";
import { FaUser, FaRegUser } from "react-icons/fa";
import { GoHome, GoHomeFill } from "react-icons/go";
import { PiCompassFill, PiCompass } from "react-icons/pi";
import { HiOutlineBuildingStorefront, HiBuildingStorefront } from "react-icons/hi2";
import { PiShoppingCartFill, PiShoppingCart } from "react-icons/pi";
import { useNavigate, useLocation } from "react-router-dom";
import { useNavigation } from "../Context/Bottombarcontext.jsx";
import "../../styles/bottombar.css";

const BottomBar = ({ isSearchFocused }) => {
  const { activeNav, setActiveNav } = useNavigation();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: GoHome, activeIcon: GoHomeFill, label: "Home", route: "/newhome" },
    { icon: PiCompass, activeIcon: PiCompassFill, label: "Explore", route: "/explore" },
    { icon: PiShoppingCart, activeIcon: PiShoppingCartFill, label: "Cart", route: "/latest-cart" },
    { icon: HiOutlineBuildingStorefront, activeIcon: HiBuildingStorefront, label: "Market", route: "/browse-markets" },
    { icon: FaRegUser, activeIcon: FaUser, label: "Profile", route: "/profile" },
  ];

  useEffect(() => {
    const currentPath = location.pathname;
    const activeIndex = navItems.findIndex((item) => item.route === currentPath);
    if (activeIndex !== -1) {
      setActiveNav(activeIndex);
    }
  }, [location.pathname, setActiveNav, navItems]);

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

export default BottomBar;
