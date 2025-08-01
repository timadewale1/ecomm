import React, { useEffect, useMemo, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { GoHome, GoHomeFill } from "react-icons/go";
import { PiCompassFill, PiCompass } from "react-icons/pi";
import {
  HiOutlineBuildingStorefront,
  HiBuildingStorefront,
  HiOutlineUser,
  HiUser,
} from "react-icons/hi2";
import { PiShoppingCartFill, PiShoppingCart } from "react-icons/pi";
import { useSelector } from "react-redux";
import { useNavigation } from "../Context/Bottombarcontext";
import Badge from "../Badge/Badge";
import "../../styles/bottombar.css";

const BottomBar = React.memo(({ isSearchFocused }) => {
  const { activeNav, setActiveNav } = useNavigation();
  const location = useLocation();
  const cart = useSelector((state) => state.cart);
  const cartItemCount = useMemo(() => {
    if (!cart || typeof cart !== "object") return 0; // Handle undefined or null cart
    return Object.values(cart).reduce((vendorAcc, vendor) => {
      if (!vendor.products || typeof vendor.products !== "object")
        return vendorAcc;
      return (
        vendorAcc +
        Object.values(vendor.products).reduce((productAcc, product) => {
          return productAcc + (product.quantity || 0); // Ensure product.quantity is valid
        }, 0)
      );
    }, 0);
  }, [cart]);

  const navItems = useMemo(
    () => [
      {
        icon: GoHome,
        activeIcon: GoHomeFill,
        label: "Home",
        route: "/newhome",
      },
      {
        icon: PiCompass,
        activeIcon: PiCompassFill,
        label: "Explore",
        route: "/explore",
      },
      {
        icon: PiShoppingCart,
        activeIcon: PiShoppingCartFill,
        label: "Cart",
        route: "/latest-cart",
      },
      {
        icon: HiOutlineBuildingStorefront,
        activeIcon: HiBuildingStorefront,
        label: "Markets",
        route: "/browse-markets",
      },
      {
        icon: HiOutlineUser,
        activeIcon: HiUser,
        label: "Profile",
        route: "/profile",
      },
    ],
    []
  );

  useEffect(() => {
    const currentPath = location.pathname;
    const activeIndex = navItems.findIndex(
      (item) => item.route === currentPath
    );
    if (activeIndex !== -1) {
      setActiveNav(activeIndex);
    }
  }, [location.pathname, setActiveNav, navItems]);

  const handleClick = useCallback(
    (event, index) => {
      event.stopPropagation(); // Prevent click from propagating to elements behind
      setActiveNav(index);
    },
    [setActiveNav]
  );

  return (
    <div className="bottom-bar-wrapper" onClick={(e) => e.stopPropagation()}>
      <div className={`bottom-bar  ${isSearchFocused ? "under-keypad" : ""}`}>
        {navItems.map((item, index) => (
          <Link
            key={index}
            to={item.route}
            className={`bottom-nav-icon ${activeNav === index ? "active" : ""}`}
            onClick={(e) => handleClick(e, index)}
          >
            <div className="relative font-opensans  flex items-center">
              {activeNav === index ? (
                <>
                  <item.activeIcon className="w-8 h-6" />
                  <span className="nav-label text-sm">{item.label}</span>
                </>
              ) : (
                <>
                  <item.icon className="w-8 text-white opacity-50 h-[26px]" />
                  {item.label === "Cart" && cartItemCount > 0 && (
                    <Badge count={cartItemCount} />
                  )}
                </>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
});

export default BottomBar;
