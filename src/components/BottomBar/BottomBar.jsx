import React, { useEffect, useMemo, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaUser, FaRegUser } from "react-icons/fa";
import { GoHome, GoHomeFill } from "react-icons/go";
import { PiCompassFill, PiCompass } from "react-icons/pi";
import { HiOutlineBuildingStorefront, HiBuildingStorefront } from "react-icons/hi2";
import { PiShoppingCartFill, PiShoppingCart } from "react-icons/pi";
import { useSelector } from "react-redux";
import { useNavigation } from "../Context/Bottombarcontext";
import Badge from "../Badge/Badge";
import "../../styles/bottombar.css";

const BottomBar = React.memo(({ isSearchFocused }) => {
  const { activeNav, setActiveNav } = useNavigation();
  const location = useLocation();
  const cart = useSelector((state) => state.cart);
  const cartItemCount = useMemo(() => Object.values(cart).reduce((acc, item) => acc + item.quantity, 0), [cart]);

  const navItems = useMemo(() => [
    { icon: GoHome, activeIcon: GoHomeFill, label: "Home", route: "/newhome" },
    { icon: PiCompass, activeIcon: PiCompassFill, label: "Explore", route: "/explore" },
    { icon: PiShoppingCart, activeIcon: PiShoppingCartFill, label: "Cart", route: "/latest-cart" },
    { icon: HiOutlineBuildingStorefront, activeIcon: HiBuildingStorefront, label: "Markets", route: "/browse-markets" },
    { icon: FaRegUser, activeIcon: FaUser, label: "Profile", route: "/profile" },
  ], []);

  useEffect(() => {
    const currentPath = location.pathname;
    const activeIndex = navItems.findIndex((item) => item.route === currentPath);
    if (activeIndex !== -1) {
      setActiveNav(activeIndex);
    }
  }, [location.pathname, setActiveNav, navItems]);

  const handleClick = useCallback((index) => {
    setActiveNav(index);
  }, [setActiveNav]);

  return (
    <div className={`bottom-bar ${isSearchFocused ? "under-keypad" : ""}`}>
      {navItems.map((item, index) => (
        <Link
          key={index}
          to={item.route}
          className={`bottom-nav-icon ${activeNav === index ? "active" : ""}`}
          onClick={() => handleClick(index)}
        >
          <div className="relative flex items-center">
            {activeNav === index ? (
              <>
                <item.activeIcon className="w-8 h-6" />
                <span className="nav-label">{item.label}</span>
              </>
            ) : (
              <>
                <item.icon className="w-8 text-white opacity-50 h-6" />
                {item.label === "Cart" && cartItemCount > 0 && <Badge count={cartItemCount} />}
              </>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
});

export default BottomBar;
