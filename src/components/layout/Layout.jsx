import React from "react";
import { useLocation } from "react-router-dom";
import Routers from "../../routers/Routers";
import BottomBar from "../BottomBar/BottomBar";
import VendorBottomBar from "../BottomBar/VendorBottomBar";
import useAuth from "../../custom-hooks/useAuth";
import { VendorNavigationProvider } from "../Context/VendorBottomBarCtxt"; // Import the provider

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

  const hideBottomBar = noBottomBarPaths.includes(location.pathname) || !currentUser;

  // List of vendor paths
  const vendorPaths = [
    "/vendordashboard",
    "/vendor-orders",
    "/vendor-products",
    "/vendor-profile",
  ];

  const isVendorPath = vendorPaths.includes(location.pathname);

  console.log("Current path:", location.pathname);
  console.log("Hide BottomBar:", hideBottomBar);
  console.log("Is Vendor Path:", isVendorPath);

  return (
    <VendorNavigationProvider>
      <div>
        <Routers />
      </div>
      {!hideBottomBar && (isVendorPath ? <VendorBottomBar /> : <BottomBar />)}
    </VendorNavigationProvider>
  );
};

export default Layout;
