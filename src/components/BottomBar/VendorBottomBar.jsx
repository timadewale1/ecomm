import React, { useEffect } from "react";
import { GoHome } from "react-icons/go";
import { HiOutlineUser } from "react-icons/hi2";
import { BsBoxSeam } from "react-icons/bs";
import { AiFillProduct, AiOutlineProduct } from "react-icons/ai";
import { useNavigate, useLocation } from "react-router-dom";
import { useVendorNavigation } from "../Context/VendorBottomBarCtxt"; // Updated import
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase.config";
import "../../styles/bottombar.css";

const VendorBottomBar = ({ isSearchFocused }) => {
  const { activeNav, setActiveNav } = useVendorNavigation();
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingOrdersCount, setPendingOrdersCount] = React.useState(0);

  const navItems = [
    {
      icon: GoHome,
      activeIcon: GoHome,
      label: "Dashboard",
      route: "/vendordashboard",
    },
    {
      icon: BsBoxSeam,
      activeIcon: BsBoxSeam,
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
      icon: HiOutlineUser,
      activeIcon: HiOutlineUser,
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

  useEffect(() => {
    // Fetch the count of pending orders
    const fetchPendingOrdersCount = () => {
      const ordersRef = collection(db, "orders");
      const q = query(ordersRef, where("progressStatus", "==", "Pending"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setPendingOrdersCount(snapshot.docs.length);
      });
      return () => unsubscribe();
    };

    fetchPendingOrdersCount();
  }, []);

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
            {/* Add badge for pending orders count */}
            {item.label === "Orders" && pendingOrdersCount > 0 && (
              <div className="badge">{pendingOrdersCount}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default VendorBottomBar;
