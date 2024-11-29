// VendorSideLayout.jsx
import React from "react";
import { useLocation } from "react-router-dom";
import Routers from "../../routers/Routers";
import useAuth from "../../custom-hooks/useAuth";
import VendorBottomBar from "../BottomBar/VendorBottomBar";

const VendorSideLayout = () => {
  const location = useLocation();
  const { currentUser } = useAuth();

  // List of vendor-specific paths
  const vendorPaths = ["/vendorlogin", "/vendordashboard", "/vendor-signup", "/vendor-products", "/vendor-profile", "/vendor-orders", ];

  // Check if the current path is a vendor-specific path
  const isVendorPath = vendorPaths.some(path => location.pathname.startsWith(path));

  return (
    <>
      <div>
        <Routers />
      </div>
      {isVendorPath && currentUser && <VendorBottomBar />}
    </>
  );
};

export default VendorSideLayout;
