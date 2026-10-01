// RoleBasedAccess.jsx
import React, { useContext, useEffect } from "react";
import { useAuth } from "../custom-hooks/useAuth";
import { AccessContext } from "../components/Context/AccesContext";
import { Navigate, useLocation } from "react-router-dom";

const RoleBasedAccess = ({ allowedRoles = [], children }) => {
  const { currentUser, currentUserData, currentUserDataUid, loading } =
    useAuth();
  const location = useLocation();
  const { setHideBottomBar } = useContext(AccessContext);

  const roleBelongsToCurrentUser = Boolean(
    currentUser?.uid &&
      currentUserDataUid === currentUser.uid &&
      currentUserData?.role,
  );
  const roleResolutionPending = Boolean(
    currentUser && (loading || !roleBelongsToCurrentUser),
  );

  useEffect(() => {
    const authorized =
      allowedRoles.length === 0 ||
      (roleBelongsToCurrentUser &&
        allowedRoles.includes(currentUserData?.role));
    setHideBottomBar(
      Boolean(currentUser && !roleResolutionPending && !authorized),
    );
    return () => setHideBottomBar(false);
  }, [
    currentUser,
    currentUserData,
    allowedRoles,
    roleBelongsToCurrentUser,
    roleResolutionPending,
    setHideBottomBar,
  ]);

  // These routes already support signed-out visitors. Keep the existing page
  // mounted while Firebase resolves a newly signed-in account so an auth sheet
  // opened from that page is not destroyed mid-flow. Most importantly, an
  // unresolved role is no longer mislabeled as a vendor role.
  if (roleResolutionPending) return <>{children}</>;

  const authorized =
    allowedRoles.length === 0 ||
    (roleBelongsToCurrentUser && allowedRoles.includes(currentUserData?.role));

  if (currentUser && !authorized) {
    const destination =
      currentUserData?.role === "vendor"
        ? currentUserData?.profileComplete
          ? "/vendordashboard"
          : "/complete-profile"
        : "/";
    return <Navigate to={destination} replace state={{ from: location }} />;
  }

  return <>{children}</>;
};

export default RoleBasedAccess;
