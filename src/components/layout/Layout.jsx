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
    "/confirm-user-state",
    "/vendorlogin",
    "/vendor-signup",
    "/complete-profile",
  ];

  // Paths with dynamic segments
  const dynamicPaths = [
    "/product/:id",
    "/store/:id",
    "/marketstorepage/:id",
  ];

  // Function to check if the current path matches any dynamic paths
  const isDynamicPath = (pathname) => {
    return dynamicPaths.some((path) => matchPath(path, pathname));
  };

  const hideBottomBar =
    noBottomBarPaths.includes(location.pathname) ||
    isDynamicPath(location.pathname) ||
    !currentUser;

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
        {!hideBottomBar && (isVendorPath ? <VendorBottomBar /> : <BottomBar />)}
      </VendorNavigationProvider>
    </NavigationProvider>
  );
};

export default Layout;
