import React from "react";
import { useLocation, matchPath } from "react-router-dom";
import Routers from "../../routers/Routers";
import BottomBar from "../BottomBar/BottomBar";
import VendorBottomBar from "../BottomBar/VendorBottomBar";
import useAuth from "../../custom-hooks/useAuth";
import { NavigationProvider } from "../Context/Bottombarcontext";
import { VendorNavigationProvider } from "../Context/VendorBottomBarCtxt";

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
    "/confirm-user-state",
    "/vendorlogin",
    "/vendor-signup",
    "/verify-otp",
    "/complete-profile",
    "/newcheckout/bookingfee",
    "/newcheckout/fulldelivery",
    "/user-dashboard",
    "/search",
    "/notifications",
    "/favorites",
    "/market-vendors",
    "/online-vendors",
    "market-vendors",
    "/payment-approve",
  ];

  // Paths with dynamic segments
  const dynamicPaths = [
    "/product/:id",
    "/reviews/:id",
    "/store/:id",
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
    noBottomBarPaths.includes(location.pathname) ||
    isDynamicPath(location.pathname) ||
    !currentUser ||
    location.state?.fromProductDetail;  // Check if navigating from ProductDetail

  // List of vendor paths
  const vendorPaths = [
    "/vendordashboard",
    "/vendor-orders",
    "/vendor-products",
    "/vendor-profile",
  ];

  const isVendorPath = vendorPaths.includes(location.pathname);

  return (
    <NavigationProvider>
      <VendorNavigationProvider>
        <div>
          <Routers />
        </div>
        {!hideBottomBar && (isVendorPath ? (
          <VendorBottomBar />
        ) : (
          <BottomBar isSearchFocused={false} />
        ))}
      </VendorNavigationProvider>
    </NavigationProvider>
  );
};

export default Layout;
