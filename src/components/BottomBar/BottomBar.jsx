import React, { useEffect, useMemo, useCallback, useState } from "react";
import { Link, useLocation } from "react-router-dom";
// Icons - Using only Outline versions as requested
import { GoHome } from "react-icons/go";
import { PiCompass, PiShoppingCart } from "react-icons/pi";
import { HiOutlineUser } from "react-icons/hi2";

// State & Context
import { useSelector } from "react-redux";
import { useNavigation } from "../Context/Bottombarcontext";
import { useAuth } from "../../custom-hooks/useAuth";
import { collection, query, where, onSnapshot, doc } from "firebase/firestore";
import { db } from "../../firebase.config";
import { BiHomeAlt } from "react-icons/bi";
import { HiOutlineShoppingCart } from "react-icons/hi";
import { TbCategory } from "react-icons/tb";
// Components
import Badge from "../Badge/Badge";

const BottomBar = React.memo(({ isSearchFocused }) => {
  const { activeNav, setActiveNav } = useNavigation();
  const location = useLocation();
  const { currentUser } = useAuth();

  const [unreadOffersCount, setUnreadOffersCount] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState("");

  const cart = useSelector((state) => state.cart);
  const userData = useSelector((state) => state.user?.userData);

  // --- Logic: Calculate Cart Count ---
  const cartItemCount = useMemo(() => {
    if (!cart || typeof cart !== "object") return 0;
    return Object.values(cart).reduce((vendorAcc, vendor) => {
      if (!vendor.products || typeof vendor.products !== "object") return vendorAcc;
      return (
        vendorAcc +
        Object.values(vendor.products).reduce((productAcc, product) => {
          return productAcc + (product.quantity || 0);
        }, 0)
      );
    }, 0);
  }, [cart]);

  // --- Configuration: Nav Items ---
  // Removed activeIcon property; using single icon with color change
  const navItems = useMemo(
    () => [
      { key: "home", icon: BiHomeAlt, label: "Home", route: "/" },
      { key: "categories", icon: TbCategory, label: "Categories", route: "/explore" },
      { key: "cart", icon: HiOutlineShoppingCart, label: "Cart", route: "/latest-cart" },
      { key: "profile", icon: HiOutlineUser, label: "You", route: "/profile" },
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
    if (activeIndex !== -1) setActiveNav(activeIndex);
  }, [location.pathname, setActiveNav, navItems]);

  const handleClick = useCallback(
    (event, index) => {
      event.stopPropagation();
      setActiveNav(index);
    },
    [setActiveNav]
  );

  // --- Logic: Unread Offers Listener ---
  useEffect(() => {
    if (!currentUser?.uid) {
      setUnreadOffersCount(0);
      return;
    }
    const offersRef = collection(db, "offers");
    const q = query(offersRef, where("buyerId", "==", currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const threadMap = new Map();
      snapshot.docs.forEach((d) => {
        const data = d.data();
        if (!data.buyerRead) {
          const threadKey = `${data.vendorId}_${data.productId}`;
          threadMap.set(threadKey, true);
        }
      });
      setUnreadOffersCount(threadMap.size);
    });
    return unsubscribe;
  }, [currentUser?.uid]);

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

  const profilePhoto = useMemo(() => {
    return userData?.photoURL || avatarUrl || currentUser?.photoURL || "";
  }, [userData?.photoURL, avatarUrl, currentUser?.photoURL]);

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
          const Icon = item.icon; // Same icon for both states
          const isProfile = item.key === "profile";
          const showAvatar = isProfile && !!profilePhoto;

          return (
            <Link
              key={item.key}
              to={item.route}
              onClick={(e) => handleClick(e, index)}
              // gap-0.5 reduces space between icon and text
              className="flex flex-col items-center justify-center gap-0.5 w-16 group"
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
                    src={profilePhoto}
                    alt="You"
                    className={`w-7 h-7 rounded-full object-cover border transition-all ${
                      isActive ? "border-[#FF5A1F]" : "border-gray-200"
                    }`}
                  />
                ) : (
                  <Icon
                    className={`w-[26px] h-[26px] transition-colors duration-300 ${
                      isActive ? "text-[#FF5A1F]" : "text-gray-500"
                    }`}
                  />
                )}

                {/* Badges - Positioned consistently at top-1 right-3 */}
                {item.key === "cart" && cartItemCount > 0 && !isActive && (
                  <div className="absolute top-1 right-3 scale-75">
                    <Badge count={cartItemCount} />
                  </div>
                )}
                {item.key === "profile" && unreadOffersCount > 0 && !isActive && (
                  <div className="absolute top-1 right-3 scale-75">
                    <Badge count={unreadOffersCount} />
                  </div>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[13px] font-medium transition-colors duration-300 ${
                  isActive ? "text-[#FF5A1F]" : "text-gray-700"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
});

export default BottomBar;