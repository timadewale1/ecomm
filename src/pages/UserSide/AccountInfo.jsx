import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../custom-hooks/useAuth";
import ProfileDetails from "./ProfileDetails";

const AccountInfo = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const query = new URLSearchParams(location.search);
  const highlightIncomplete =
    location.state?.highlightIncomplete === true ||
    query.get("incomplete") === "true";

  const handleBack = () => {
    const requestedDestination =
      location.state?.returnTo || location.state?.from || "/settings";
    const isValidDestination =
      (typeof requestedDestination === "string" &&
        requestedDestination.startsWith("/")) ||
      (requestedDestination &&
        typeof requestedDestination === "object" &&
        typeof requestedDestination.pathname === "string" &&
        requestedDestination.pathname.startsWith("/"));
    const destination = isValidDestination
      ? requestedDestination
      : "/settings";
    navigate(destination, {
      replace: true,
      state: location.state?.returnState || null,
    });
  };

  return (
    <ProfileDetails
      currentUser={currentUser}
      initialEditField={location.state?.editField || ""}
      highlightIncomplete={highlightIncomplete}
      onBack={handleBack}
    />
  );
};

export default AccountInfo;
