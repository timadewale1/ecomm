import React, { useEffect, useState } from "react";
import useAuth from "../custom-hooks/useAuth";
import { Navigate, Outlet } from "react-router-dom";
import { getUserRole } from "../admin/getUserRole";

const ProtectedRoute = () => {
  const { currentUser } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkedAdminRole, setCheckedAdminRole] = useState(false);

  useEffect(() => {
    const checkAdminRole = async () => {
      try {
        if (currentUser) {
          const userRole = await getUserRole(currentUser.uid);
          setIsAdmin(userRole === "admin");
        }
        setCheckedAdminRole(true);
      } catch (error) {
        console.error("Error checking user role:", error);
        setCheckedAdminRole(true);
      }
    };

    checkAdminRole();
  }, [currentUser]);

  // Wait until the admin role check is completed before rendering the content
  if (!checkedAdminRole) {
    return <p>Loading...</p>; // You can replace this with a loading spinner or other UI
  }

  return currentUser && isAdmin ? <Outlet /> : <Navigate to="/dashboard" />;
};

export default ProtectedRoute;
