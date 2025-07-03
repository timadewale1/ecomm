import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../custom-hooks/useAuth";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import toast from "react-hot-toast";

const ProtectedRoute = ({ requiredRole }) => {
  const { currentUser, currentUserData, loading } = useAuth();
  const location = useLocation();

  // Show skeleton placeholders while loading or while user data hasn't been fully fetched yet
  if (loading || (currentUser && !currentUserData)) {
    return (
      <div className="mb-40 mx-3 my-7 flex flex-col justify-center space-y-1 font-opensans">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div className="overflow-hidden w-11 h-11 rounded-full flex justify-center items-center mr-1">
              <Skeleton circle={true} height={44} width={44} />
            </div>
            <div className="ml-1 space-y-2">
              <Skeleton width={120} height={20} />
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center items-center mt-4">
          <div className="relative bg-customSoftGray w-full h-36 rounded-2xl flex flex-col justify-between px-4 py-2">
            <div className="flex flex-col justify-center items-center space-y-4">
              <Skeleton width={120} height={20} />
              <Skeleton width={100} height={30} />
            </div>
            <div>
              <Skeleton width={"80%"} height={20} />
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center mt-4">
          <p className="text-black text-lg text-start font-semibold mb-3">
            <Skeleton width={80} height={20} />
          </p>

          <div className="grid grid-cols-2 gap-2 justify-center">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="flex flex-col justify-between w-custVCard h-20 rounded-xl bg-customSoftGray p-2"
              >
                <div className="flex justify-between items-center">
                  <Skeleton width={30} height={30} />
                  <Skeleton width={100} height={15} />
                </div>
                <Skeleton width={40} height={20} />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-center mt-4">
          <div className="flex justify-between mb-3">
            <Skeleton width={100} height={20} />
            <Skeleton width={30} height={20} />
          </div>

          <div className="flex flex-col space-y-2 text-black">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="mb-2 bg-customSoftGray rounded-2xl px-4 py-2"
              >
                <div className="flex justify-between mb-2">
                  <Skeleton width={100} height={15} />
                  <Skeleton width={50} height={15} />
                </div>
                <Skeleton width={"90%"} height={15} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
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
      toast.error("You do not have access to this page.");
      return <Navigate to="/vendorlogin" />;
    } else if (currentUserData.role === "user") {
      toast.error("You do not have access to this page.");
      return <Navigate to="/login" />;
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
    "/share-profile",
  ];
  const dynamicRoutes = ["/reviews/",  "/newcheckout/:id"]; // Add dynamic base routes here

  // Check if the current route matches any of the static or dynamic routes
  const shouldExcludePadding =
    excludePaddingRoutes.includes(location.pathname) ||
    dynamicRoutes.some((route) => location.pathname.startsWith(route));

  return (
    <div className={shouldExcludePadding ? "" : "main-content"}>
      <Outlet />
    </div>
  );
};

export default ProtectedRoute;
