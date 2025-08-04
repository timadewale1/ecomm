// RoleBasedAccess.jsx
import React, { useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "../custom-hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { AccessContext } from "../components/Context/AccesContext";
import { signOut } from "firebase/auth";
import { auth } from "../firebase.config";

const RoleBasedAccess = ({ allowedRoles = [], children }) => {
  const { currentUser, currentUserData } = useAuth();
  const { setHideBottomBar } = useContext(AccessContext);
  const navigate = useNavigate();
  const signingOutRef = useRef(false);
  const [forceLogoutPending, setForceLogoutPending] = useState(false);

  useEffect(() => {
    const authorized =
      allowedRoles.length === 0 ||
      (currentUser && allowedRoles.includes(currentUserData?.role));
    setHideBottomBar(currentUser && !authorized);
    return () => setHideBottomBar(false);
  }, [currentUser, currentUserData, allowedRoles, setHideBottomBar]);

  useEffect(() => {
    const pref = localStorage.getItem("mythrift_role");
    if (
      pref === "customer" &&
      currentUser &&
      currentUserData?.role === "vendor" &&
      !signingOutRef.current
    ) {
      signingOutRef.current = true;
      setForceLogoutPending(true);
      (async () => {
        try {
          await signOut(auth);
        } catch (e) {
          console.warn(
            "[RBAC] Auto sign-out on customer pref failed (non-blocking):",
            e
          );
        } finally {
          setForceLogoutPending(false);
          signingOutRef.current = false;
        }
      })();
    }
  }, [currentUser, currentUserData]);

  if (forceLogoutPending) return null;

  const authorized =
    allowedRoles.length === 0 ||
    (currentUser && allowedRoles.includes(currentUserData?.role));

  if (currentUser && !authorized) {
    return (
      <div className="flex justify-center flex-col translate-y-44 items-center">
        <p className="text-gray-800 font-opensans text-sm mb-4 text-center">
          You are logged in as a vendor. Please logout and try again.
        </p>

        {/* 🔁 Force full page reload to clear any stale state before going to vendor dashboard */}
        <button
          className="bg-customOrange text-xs font-medium text-white py-2 px-2 rounded-lg"
          onClick={() => window.location.replace("/vendordashboard")}
        >
          Back to Dashboard
        </button>

        
       
      </div>
    );
  }

  return <>{children}</>;
};

export default RoleBasedAccess;
