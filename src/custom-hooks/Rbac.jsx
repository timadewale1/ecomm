import React, { useContext, useEffect } from "react";
import { useAuth } from "../custom-hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { AccessContext } from "../components/Context/AccesContext";

const RoleBasedAccess = ({ allowedRoles, children }) => {
  const { currentUser, currentUserData } = useAuth();
  const { setHideBottomBar } = useContext(AccessContext);
  const navigate = useNavigate();
  useEffect(() => {
    if (currentUser && !allowedRoles.includes(currentUserData?.role)) {
      setHideBottomBar(true); // Hide BottomBar when access is denied
    } else {
      setHideBottomBar(false); // Show BottomBar when access is allowed
    }
    return () => {
      setHideBottomBar(false); // Reset hideBottomBar when component unmounts
    };
  }, [currentUser, currentUserData, allowedRoles, setHideBottomBar]);

  if (currentUser && !allowedRoles.includes(currentUserData?.role)) {
    return (
      <div className="flex justify-center flex-col translate-y-44 items-center">
        <p className="text-gray-800 font-opensans text-sm mb-4 text-center">
          You are logged in as a vendor. Please logout and try again.
        </p>
        <button
          className="bg-customOrange text-xs font-medium text-white py-2 px-2 rounded-lg"
          onClick={() => navigate("/vendor-dashboard")} // Navigate to vendor-dashboard on click
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

export default RoleBasedAccess;
