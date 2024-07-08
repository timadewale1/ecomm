import React, { useEffect, useState } from "react";
import useAuth from "../custom-hooks/useAuth";
import { Navigate, Outlet } from "react-router-dom";
import { getUserRole } from "../admin/getUserRole";
import Loading from "../components/Loading/Loading";

const ProtectedRoute = ({ requireAdmin }) => {
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

    if (requireAdmin) {
      checkAdminRole();
    } else {
      setCheckedAdminRole(true); // If admin check is not required, mark it as checked
    }
  }, [currentUser, requireAdmin]);

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  if (requireAdmin && !checkedAdminRole) {
    return <Loading/> 
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
