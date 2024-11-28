import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../custom-hooks/useAuth";
import Loading from "../components/Loading/Loading";
import toast from "react-hot-toast";

const ProtectedRoute = ({ requiredRole }) => {
  const { currentUser, currentUserData, loading } = useAuth();
  const location = useLocation();

  // Wait until loading is false and currentUserData is available
  if (loading || (currentUser && !currentUserData)) {
    return <Loading />; // Show loading indicator while auth state or user data is being determined
  }

  if (!currentUser) {
    // User is not authenticated
    if (requiredRole === "vendor") {
      return <Navigate to="/vendorlogin" state={{ from: location }} />;
    } else {
      // Default to user login
      return <Navigate to="/login" state={{ from: location }} />;
    }
  }

  if (requiredRole && currentUserData?.role !== requiredRole) {
    // User does not have the required role
    if (currentUserData.role === "vendor") {
      // If a vendor tries to access a user-only route
      toast.error("You do not have access to this page.");
      return <Navigate to="/vendordashboard" />;
    } else if (currentUserData.role === "user") {
      // If a user tries to access a vendor-only route
      toast.error("You do not have access to this page.");
      return <Navigate to="/newhome" />; // Redirect to user dashboard
    } else {
      // If role is undefined or unrecognized
      return <Navigate to="/login" />;
    }
  }

  // Determine if padding should be excluded based on the current route
  const excludePaddingRoutes = [
    "/user-dashboard",
    "/latest-cart",
    "/online-vendors",
    "/market-vendors",
  ];
  const dynamicRoutes = ["/reviews/"]; // Add dynamic base routes here

  // Check if the current route matches any of the static or dynamic routes
  const shouldExcludePadding =
    excludePaddingRoutes.includes(location.pathname) ||
    dynamicRoutes.some((route) => location.pathname.startsWith(route));

  // Proceed to the protected route with or without padding
  return (
    <div className={shouldExcludePadding ? "" : "main-content"}>
      <Outlet />
    </div>
  );
};

export default ProtectedRoute;
