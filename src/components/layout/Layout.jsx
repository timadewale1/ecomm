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
import { messagingReady, functions } from "../../firebase.config";
import { getToken } from "firebase/messaging";
import { httpsCallable } from "firebase/functions";
const Layout = () => {
  const location = useLocation();
  const { currentUser, currentUserData } = useAuth();
  const [showInstallModal, setShowInstallModal] = useState(true);
  const [isPWA, setIsPWA] = useState(false);
  const [enabling, setEnabling] = useState(false);
  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    setIsPWA(standalone);
  }, []);
  // List of paths where BottomBar should not be rendered
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
    "/newcheckout/bookingfee",
    "/newcheckout/fulldelivery",
    "/user-dashboard",
    "/search",

    "/send-us-feedback",
    "/",
    "/vendor-reviews",
    "/vendor-wallet",
    "/share-profile",
    "/notifications",
    "/favorites",
    "/reset-password",
    "/market-vendors",
    "/online-vendors",
    "market-vendors",
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

  // Paths with dynamic segments
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
    "/pay/:token",
    "marketstorepage/:id",
    "/newcheckout/:vendorId",
  ];
  const showBanner =
    currentUser &&
    isPWA && // only in PWA
    currentUserData?.notificationAllowed !== true;
  // Function to check if the current path matches any dynamic paths
  const isDynamicPath = (pathname) => {
    return dynamicPaths.some((path) => matchPath(path, pathname));
  };
  const handleEnableNotifs = async () => {
    console.log("▶️ handleEnableNotifs started");
    setEnabling(true);

    try {
      // 1️⃣ Check current Notification permission
      console.log("Current Notification.permission:", Notification.permission);
      let perm = Notification.permission;

      // 2️⃣ Only prompt if they haven't decided yet
      if (perm === "default") {
        console.log("Requesting notification permission…");
        perm = await Notification.requestPermission();
        console.log("Notification.permission after request:", perm);
      }

      // 3️⃣ If not granted, abort
      if (perm !== "granted") {
        console.warn("User denied notifications, aborting token retrieval.");
        return;
      }

      // 4️⃣ Wait for Firebase Messaging support
      console.log("Waiting for messagingReady…");
      const messaging = await messagingReady;
      console.log("messagingReady returned:", messaging);
      if (!messaging) {
        console.warn("FCM not supported here");
        return;
      }

      // 5️⃣ Retrieve (or refresh) the FCM token
      console.log("Retrieving FCM token…");
      const vapidKey = import.meta.env.VITE_VAPID_KEY;
      console.log("Using VAPID key:", vapidKey);
      const fcmToken = await getToken(messaging, { vapidKey });
      console.log("getToken() returned:", fcmToken);
      if (!fcmToken) {
        console.error("No FCM token retrieved");
        return;
      }

      // 6️⃣ Send it up to your Cloud Function
      console.log("Calling saveFcmToken Cloud Function…");
      const saveToken = httpsCallable(functions, "saveFcmToken");
      const result = await saveToken({ token: fcmToken });
      console.log("saveFcmToken() result:", result.data);

      // Local patch: update currentUserData to immediately hide banner
      if (currentUserData) {
        currentUserData.notificationAllowed = true;
      }
    } catch (err) {
      console.error("❌ Error in handleEnableNotifs:", err);
    } finally {
      console.log("▶️ handleEnableNotifs finished");
      setEnabling(false);
    }
  };

  // Check if bottom bar should be hidden
  const hideBottomBar =
    noBottomBarPaths.some((path) =>
      matchPath({ path, end: true }, location.pathname)
    ) || // Exact match
    isDynamicPath(location.pathname) || // Match dynamic paths
    location.state?.fromProductDetail; // Hide when navigated from product detail

  // Get hideBottomBar from AccessContext
  const { hideBottomBar: hideBottomBarFromContext } = useContext(AccessContext);

  // Combine local and context hideBottomBar
  const shouldHideBottomBar = hideBottomBar || hideBottomBarFromContext;

  // List of vendor paths
  const vendorPaths = [
    "/vendordashboard",
    "/vendor-orders",
    "/vchats",
    "/store-reviews",
    "/vendor-profile",
    "/vendor-products",
  ];

  const isVendorPath = vendorPaths.includes(location.pathname);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 575);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 575);

    window.addEventListener("resize", handleResize);

    return () => {
      // Cleanup listener on unmount
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <NavigationProvider>
      <VendorNavigationProvider>
        {/* Render the PWAInstallModal if needed */}
        {showInstallModal && (
          <PWAInstallModal onClose={() => setShowInstallModal(false)} />
        )}
        {isMobile ? (
          <>
            {showBanner && (
              <NotificationPermissionBanner onEnable={handleEnableNotifs} />
            )}
            <div className="relative">
              {/* <SwipeToRefresh /> */}
              <ScrollToTop />
              <Routers />
            </div>
            {!shouldHideBottomBar &&
              (isVendorPath ? (
                <VendorBottomBar />
              ) : (
                <BottomBar isSearchFocused={false} />
              ))}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-96 mt-20">
            <Lottie
              className="w-full h-full"
              animationData={phoneTransition}
              loop={true}
              autoplay={true}
            />
            <div className="text-center text-xl font-opensans p-20">
              We're currently optimizing our website for this screen size. For
              the best experience, we recommend accessing it on your mobile
              device.😅✨
            </div>
          </div>
        )}
      </VendorNavigationProvider>
    </NavigationProvider>
  );
};

export default Layout;
