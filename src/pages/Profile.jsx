import React, { useCallback, useEffect, useState } from "react";
import { db } from "../firebase.config";
import { toast } from "react-hot-toast";
import {
  BadgePercent,
  Bell,
  ChevronRight,
  CircleHelp,
  Heart,
  HandHeart,
  Info,
  Package,
  Ruler,
  Search,
  Settings,
  Shirt,
  UserRound,
  WalletCards,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { useAuth } from "../custom-hooks/useAuth";
import { useDispatch, useSelector } from "react-redux";
import AvatarSelectorModal from "../components/Avatars/AvatarSelectorModal";
import QuickAuthModal from "../components/PwaModals/AuthModal";
import SEO from "../components/Helmet/SEO";
import { fetchAndMergeCart } from "../services/cartMerge";
import {
  setUserData,
  updateUserData,
} from "../redux/actions/useractions";
import { pauseAuthIntentForProfile } from "../services/authIntent";
import useAuthContinuation from "../custom-hooks/useAuthContinuation";
import "./profile.css";

const ProfileMenuRow = ({
  icon: Icon,
  label,
  description,
  onClick,
  comingSoon = false,
  unread = false,
}) => (
  <button
    type="button"
    className="you-menu-row"
    onClick={onClick}
    disabled={comingSoon}
  >
    <span className="you-menu-main">
      {Icon && <Icon className="you-menu-icon" aria-hidden="true" />}
      <span className="you-menu-copy">
        <span className="you-menu-label">{label}</span>
        {description && (
          <span className="you-menu-description">{description}</span>
        )}
      </span>
    </span>

    {comingSoon ? (
      <span className="you-coming-soon">
        Coming soon <Info aria-hidden="true" />
      </span>
    ) : (
      <span className="you-row-end">
        {unread && <span className="you-unread-dot" aria-label="Unread" />}
        <ChevronRight aria-hidden="true" />
      </span>
    )}
  </button>
);

const Profile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const dispatch = useDispatch();
  const userData = useSelector((state) => state.user.userData);
  const hasUnreadOffers = useSelector(
    (state) => state.buyerOffers.ids.some(
      (id) => state.buyerOffers.entities[id]?.buyerRead === false,
    ),
  );

  const [showQuickAuth, setShowQuickAuth] = useState(false);
  const [authReturnTo, setAuthReturnTo] = useState(null);
  const [profileAuthAction, setProfileAuthAction] = useState("account");
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const fetchUserData = async () => {
      if (userData) return;
      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) dispatch(setUserData(userDoc.data()));
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, [currentUser?.uid, dispatch, userData]);

  useEffect(() => {
    if (!currentUser?.uid) {
      setProfileComplete(false);
      return;
    }

    return onSnapshot(
      doc(db, "users", currentUser.uid),
      (snapshot) => {
        const data = snapshot.data() || {};
        setProfileComplete(data.profileComplete ?? false);
        dispatch(updateUserData(data));
      },
      (error) => console.error("Profile listener failed:", error)
    );
  }, [currentUser?.uid, dispatch]);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    if (queryParams.get("incomplete") !== "true" || !currentUser?.uid) return;

    navigate("/account-info", {
      replace: true,
      state: {
        highlightIncomplete: true,
        returnTo: location.state?.returnTo || "/profile",
      },
    });
  }, [currentUser?.uid, location.search, location.state, navigate]);

  const openQuickAuth = (returnTo = null, action = "account") => {
    setAuthReturnTo(returnTo);
    setProfileAuthAction(action);
    setShowQuickAuth(true);
  };

  const closeQuickAuth = () => {
    setShowQuickAuth(false);
    setAuthReturnTo(null);
    setProfileAuthAction("account");
  };

  const requireAccount = (action, returnTo = null) => {
    if (!currentUser) {
      openQuickAuth(returnTo);
      return;
    }
    action();
  };

  const openWallet = useCallback(async (authenticatedUser = null, stillCurrent = () => true) => {
    // QuickAuthModal completes before AuthProvider's onAuthStateChanged render
    // is guaranteed to reach this component. Use the user returned by the
    // successful auth operation so the resumed wallet action never evaluates
    // the previous signed-out render's profile state.
    const authenticatedUid = authenticatedUser?.uid || currentUser?.uid || null;
    let complete = profileComplete;
    if (authenticatedUid) {
      try {
        const snapshot = await getDoc(doc(db, "users", authenticatedUid));
        complete = snapshot.exists() && snapshot.data()?.profileComplete === true;
      } catch {
        // Fall back to the live profile state already rendered on this page.
      }
    }
    if (!stillCurrent()) return;
    if (!complete) {
      pauseAuthIntentForProfile(authenticatedUid);
      toast.error("Please complete your personal information first.");
      navigate("/account-info", {
        state: { highlightIncomplete: true, from: "/profile" },
      });
      return;
    }
    navigate("/your-wallet");
  }, [currentUser?.uid, navigate, profileComplete]);

  const handleWalletClick = () => {
    if (!currentUser) {
      openQuickAuth(null, "wallet");
      return;
    }
    void openWallet();
  };

  const resumeProfileAction = useCallback(async (
    action,
    destination,
    authenticatedUser = null,
    stillCurrent = () => true,
  ) => {
    // The main Profile sign-in entry is authentication-only. It must not
    // inherit the Account Information destination used by profile editing.
    if (action === "login") return;
    if (action === "avatar") {
      setIsAvatarModalOpen(true);
      return;
    }
    if (action === "wallet") {
      await openWallet(authenticatedUser, stillCurrent);
      return;
    }
    if (destination) navigate(destination);
  }, [navigate, openWallet]);

  useAuthContinuation({
    types: "profile-action",
    run: async (intent, user, stillCurrent) => {
      await resumeProfileAction(intent.payload?.action, intent.payload?.destination, user, stillCurrent);
      return true;
    },
  });

  const handleAvatarChange = (newAvatar) => {
    dispatch(updateUserData({ photoURL: newAvatar }));
  };

  const handleRemoveAvatar = async () => {
    if (!currentUser?.uid) return;
    try {
      await updateDoc(doc(db, "users", currentUser.uid), { photoURL: "" });
      dispatch(updateUserData({ photoURL: "" }));
      toast.success("Avatar removed successfully");
    } catch (error) {
      toast.error("Error removing avatar. Please try again.");
    }
  };

  const mergeCartAfterLogin = async (uid) => {
    try {
      return await fetchAndMergeCart(db, uid, dispatch);
    } catch (error) {
      // Authentication has succeeded at this point. A temporary cart sync
      // failure must not make the user appear signed out or block the profile.
      console.warn("Cart merge skipped after profile sign-in:", error);
      throw error;
    }
  };


  const displayName =
    userData?.username ||
    userData?.firstName ||
    currentUser?.displayName ||
    "Your profile";
  const profilePhoto = userData?.photoURL || currentUser?.photoURL || "";

  return (
    <>
      <SEO
        title="You - My Thrift"
        description="Manage your My Thrift profile and shopping activity."
        url="https://www.shopmythrift.store/profile"
      />

      <main className="you-page">
        <header className="you-header">
          <button
            type="button"
            onClick={() => navigate("/search")}
            aria-label="Search"
          >
            <Search aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => navigate("/notifications")}
            aria-label="Notifications"
          >
            <Bell aria-hidden="true" />
          </button>
        </header>

        <div className="you-profile-entry">
          <button
            type="button"
            className="you-avatar-button"
            aria-label={currentUser ? "Change profile avatar" : "Log in or sign up"}
            onClick={() =>
              currentUser
                ? setIsAvatarModalOpen(true)
                : openQuickAuth(null, "avatar")
            }
          >
            <span className="you-avatar">
              {profilePhoto ? (
                <img src={profilePhoto} alt="" />
              ) : (
                <UserRound aria-hidden="true" />
              )}
            </span>
          </button>

          <button
            type="button"
            className="you-profile-details"
            onClick={() =>
              currentUser
                ? navigate("/account-info", { state: { from: "/profile" } })
                : openQuickAuth(null, "login")
            }
          >
            <span className="you-profile-copy">
              <span className="you-profile-name">
                {currentUser ? displayName : "Log in/Sign up"}
              </span>
              {currentUser && (
                <span className="you-profile-subtitle">Edit profile</span>
              )}
            </span>
            <ChevronRight aria-hidden="true" />
          </button>
        </div>

        <div className="you-sections">
          <section className="you-section">
            <h1>Shopping</h1>
            <div className="you-menu">
              <ProfileMenuRow
                icon={Heart}
                label="Favourites"
                onClick={() => navigate("/favorites")}
              />
              <ProfileMenuRow
                icon={Package}
                label="Orders"
                onClick={() => navigate("/user-orders")}
              />
              <ProfileMenuRow
                icon={WalletCards}
                label="Wallet"
                onClick={handleWalletClick}
              />
              <ProfileMenuRow
                icon={BadgePercent}
                label="Offers"
                unread={hasUnreadOffers}
                onClick={() =>
                  requireAccount(() => navigate("/offers"), "/offers")
                }
              />
              <ProfileMenuRow
                icon={Ruler}
                label="My sizes"
                description="Save your sizes to shop what fits"
                onClick={() =>
                  requireAccount(() => navigate("/my-sizes"), "/my-sizes")
                }
              />
              <ProfileMenuRow icon={HandHeart} label="Donations" comingSoon />
              <ProfileMenuRow icon={Shirt} label="Declutter" comingSoon />
            </div>
          </section>

          <section className="you-section">
            <h1>More</h1>
            <div className="you-menu">
              <ProfileMenuRow
                icon={Settings}
                label="Settings"
                onClick={() => navigate("/settings")}
              />
              <ProfileMenuRow
                icon={CircleHelp}
                label="FAQs"
                onClick={() => navigate("/faqs")}
              />
            </div>
          </section>
        </div>
      </main>

      <QuickAuthModal
        open={showQuickAuth}
        onClose={closeQuickAuth}
        mergeCart={mergeCartAfterLogin}
        headerText="Let’s set up your account"
        returnTo={authReturnTo}
        authIntent={{
          type: "profile-action",
          returnTo: "/profile",
          payload: {
            action: profileAuthAction,
            destination: authReturnTo,
          },
        }}
      />

      {isAvatarModalOpen && currentUser && (
        <AvatarSelectorModal
          userId={currentUser.uid}
          onClose={() => setIsAvatarModalOpen(false)}
          onAvatarChange={handleAvatarChange}
          onRemoveAvatar={handleRemoveAvatar}
        />
      )}
    </>
  );
};

export default Profile;
