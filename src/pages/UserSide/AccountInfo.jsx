import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../custom-hooks/useAuth";
import ProfileDetails from "./ProfileDetails";
import { resumeAuthIntentAfterProfile, pendingAuthIntent, clearAuthIntent } from "../../services/authIntent";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebase.config";

const AccountInfo = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const query = new URLSearchParams(location.search);
  const highlightIncomplete =
    location.state?.highlightIncomplete === true ||
    query.get("incomplete") === "true";

  const handleBack = async () => {
    // Resume only on explicit return; the checkout guard revalidates the saved
    // profile. Editing one field must not interrupt the remaining form edits.
    const pending = pendingAuthIntent();
    if (pending?.uid === currentUser?.uid && pending.phase === "waiting-profile") {
      try {
        const snapshot = await getDoc(doc(db, "users", currentUser.uid));
        if (auth.currentUser?.uid !== currentUser.uid) return;
        const profile = snapshot.data();
        if (profile?.profileComplete && typeof profile.location?.lat === "number" && typeof profile.location?.lng === "number") {
          resumeAuthIntentAfterProfile(currentUser.uid);
        } else {
          // Back without completing details is cancellation, not a redirect loop.
          clearAuthIntent(pending.id);
        }
      } catch { clearAuthIntent(pending.id); }
    }
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
