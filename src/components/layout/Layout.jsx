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

import { AccessContext } from "../Context/AccesContext";

import ScrollToTop from "./ScrollToTop";


const Layout = () => {
  const location = useLocation();
  const { currentUser } = useAuth(); // Custom hook to get the current user

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
    "/privacy-policy",
    "/store-reviews",
    "/call-guidelines",
    "/delivery-guidelines",
  ];

  // Paths with dynamic segments
  const dynamicPaths = [
    "/product/:id",
    "/reviews/:id",
    "/store/:id",
    "/payment-approve/:reference",
    "category/:id",
    "marketstorepage/:id",
    "/newcheckout/:vendorId",
  ];

  // Function to check if the current path matches any dynamic paths
  const isDynamicPath = (pathname) => {
    return dynamicPaths.some((path) => matchPath(path, pathname));
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
    "/store-reviews",
    "/vendor-profile",
    "/vendor-products"
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
        {isMobile ? (
          <>
           <div className="bg-customBrown text-white text-xs  font-semibold py-1 font-ubuntu px-1 text-center">
              <marquee behavior="scroll" direction="left">
                You are currently using My Thrift Beta Version V1 🚀
              </marquee>
            </div>
            <div className="pb-1">
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
              device.🤦‍♀️
            </div>
          </div>
        )}
      </VendorNavigationProvider>
    </NavigationProvider>
  );
};

export default Layout;
