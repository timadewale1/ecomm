import React, { useEffect, useState, useContext } from "react";
import { useLocation, matchPath } from "react-router-dom";
import Routers from "../../routers/Routers";
import BottomBar from "../BottomBar/BottomBar";
import VendorBottomBar from "../BottomBar/VendorBottomBar";
import { useAuth } from "../../custom-hooks/useAuth";
import { NavigationProvider } from "../Context/Bottombarcontext";
import { VendorNavigationProvider } from "../Context/VendorBottomBarCtxt";
import phoneTransition from "../../Animations/PhoneTransitionScene.json";
import Lottie from "lottie-react";
import NotificationPermissionBanner from "./NotificationPermissionBanner";
import { AccessContext } from "../Context/AccesContext";
import ScrollToTop from "./ScrollToTop";
import PWAInstallModal from "./PwaInstallModal";
import { useFCM } from "../../custom-hooks/useFCM";

const Layout = () => {
  const location = useLocation();
  const { currentUser, currentUserData } = useAuth();
  const { showBanner, handleEnableNotifs, enabling, isPWA } = useFCM(
    currentUser,
    currentUserData
  );
  const [showInstallModal, setShowInstallModal] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 575);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 575);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const noBottomBarPaths = [
    "/login",
    "/signup",
    "/forgetpassword",
    "/admin",
    "/user-orders",
    "/confirm-state",
    "/vendorlogin",
    "/vendor-signup",
    "/complete-profile",
    "/confirm-user",
    "/newcheckout/bookingfee",
    "your-wallet",
    "/newcheckout/fulldelivery",
    "/user-dashboard",
    "/search",
    "/send-us-feedback",
    
    "/faqs",
    "/vendor-reviews",
    "/vendor-wallet",
    "/share-profile",
    "/notifications",
    "/favorites",
    "/reset-password",
    "/market-vendors",
    "/online-vendors",
    "market-vendors",
    "/offers",
    "/vendor-verify-otp",
    "/not-found",
    "/confirm-email",
    "network-error",
    "/payment-approve",
    "/terms-and-conditions",
    "/discounts-today",
    "/privacy-policy",
    "/store-reviews",
    "/call-guidelines",
    "/delivery-guidelines",
  ];

  const dynamicPaths = [
    "/product/:id",
    "/reviews/:id",
    "/producttype/:type",
    "/inapp-discounts/:discountName",
    "/products/condition/:condition",
    "/store/:id",
    "/vchats/:inquiryId",
    "/payment-approve/:reference",
    "category/:id",
    "/offers/:offerId",
    "/pay/:token",
    "marketstorepage/:id",
    "/newcheckout/:vendorId",
  ];

  const isDynamicPath = (pathname) => {
    return dynamicPaths.some((path) => matchPath(path, pathname));
  };

  const hideBottomBar =
    noBottomBarPaths.some((path) =>
      matchPath({ path, end: true }, location.pathname)
    ) ||
    isDynamicPath(location.pathname) ||
    location.state?.fromProductDetail;

  const { hideBottomBar: hideBottomBarFromContext } = useContext(AccessContext);
  const shouldHideBottomBar = hideBottomBar || hideBottomBarFromContext;

  const vendorPaths = [
    "/vendordashboard",
    "/vendor-orders",
    "/vchats",
    "/store-reviews",
    "/vendor-profile",
    "/vendor-products",
  ];

  const isVendorPath = vendorPaths.includes(location.pathname);

  // ... (keep your imports and logic same until the return)

  return (
    <NavigationProvider>
      <VendorNavigationProvider>
        {showInstallModal && isPWA && (
          <PWAInstallModal onClose={() => setShowInstallModal(false)} />
        )}

        {/* This wrapper creates the black background "padding" */}
        <div className="ipad-wrapper">
          {/* This wrapper constrains the app width */}
          <div className="app-container">
            {showBanner && (
              <NotificationPermissionBanner
                onEnable={handleEnableNotifs}
                enabling={enabling}
              />
            )}
            <div className="relative content-area">
              <ScrollToTop />
              <Routers />
            </div>
            {!shouldHideBottomBar &&
              (isVendorPath ? (
                <VendorBottomBar />
              ) : (
                <BottomBar isSearchFocused={false} />
              ))}
          </div>
        </div>
      </VendorNavigationProvider>
    </NavigationProvider>
  );
};

export default Layout;
