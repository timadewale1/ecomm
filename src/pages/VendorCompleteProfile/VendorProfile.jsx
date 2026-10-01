import React, { useContext, useEffect, useRef, useState } from "react";
import { siteUrls } from "../../config/siteUrls.mjs";
import { signOut } from "firebase/auth";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight,
  CircleHelp,
  FileText,
  LogOut,
  PlaySquare,
  Share2,
  ShieldCheck,
  Star,
  Store,
  UserRound,
  WalletCards,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { RotatingLines } from "react-loader-spinner";
import { auth } from "../../firebase.config";
import { clearOrders } from "../../redux/actions/orderaction";
import { setVendorProfile } from "../../redux/vendorProfileSlice";
import { VendorContext } from "../../components/Context/Vendorcontext";
import { useTawk } from "../../components/Context/TawkProvider";
import AppBottomSheet from "../../components/layout/AppBottomSheet";
import SEO from "../../components/Helmet/SEO";
import VendorTutorials from "../../components/Tutorials/VendorTutorials";
import { appHaptics } from "../../services/haptics";
import { shareContent } from "../../services/nativeLinks";
import VprofileDetails from "../vendor/VprofileDetails";
import ProfileView from "./profileView";
import "./vendor-profile.css";
import { useAppExperience } from "../../components/Context/AppExperienceContext";

const MenuRow = ({icon: Icon, label, detail, onClick, danger = false}) => (
  <button type="button" className="vendor-profile-row" onClick={onClick}>
    <span className="vendor-profile-row-main">
      <Icon aria-hidden="true" />
      <span>
        <span className={danger ? "vendor-profile-danger" : ""}>{label}</span>
        {detail && <small>{detail}</small>}
      </span>
    </span>
    {!danger && <ChevronRight aria-hidden="true" />}
  </button>
);

export default function VendorProfile() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const {vendorData, loading} = useContext(VendorContext);
  const {openChat, logoutChat} = useTawk();
  const {resetExperience} = useAppExperience();
  const logoutInFlightRef = useRef(false);
  const profileMenuScrollRef = useRef(0);
  const [showDetails, setShowDetails] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showTutorials, setShowTutorials] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [accountAction, setAccountAction] = useState(null);

  const uid = vendorData?.vendorId || vendorData?.uid || auth.currentUser?.uid || "";

  useEffect(() => {
    if (vendorData) dispatch(setVendorProfile({...vendorData}));
  }, [dispatch, vendorData]);

  const openProfileDetails = () => {
    profileMenuScrollRef.current = window.scrollY;
    window.scrollTo(0, 0);
    setShowDetails(true);
  };

  const closeProfileDetails = () => {
    setShowDetails(false);
    window.requestAnimationFrame(() => {
      window.scrollTo(0, profileMenuScrollRef.current);
    });
  };

  if (showDetails) {
    return <VprofileDetails onBack={closeProfileDetails} />;
  }

  const shopName = vendorData?.shopName || "Your store";
  const coverImage = vendorData?.coverImageUrl || "";
  const profileLink = siteUrls.storeShareUrl({ slug: vendorData?.slug, id: uid });
  const shareStore = async () => {
    try {
      const outcome = await shareContent({
        title: `${shopName} on My Thrift`,
        text: `Shop ${shopName} on My Thrift`,
        url: profileLink,
      });
      if (outcome !== "cancelled") void appHaptics.success();
    } catch (error) {
      if (error?.name !== "AbortError") toast.error("Store link could not be shared.");
    }
  };

  const handleLogout = async ({switchExperience = false} = {}) => {
    if (logoutInFlightRef.current) return;
    logoutInFlightRef.current = true;
    setLoggingOut(true);
    try {
      try {
        await logoutChat();
      } catch (supportError) {
        console.warn("Vendor support logout cleanup failed:", supportError);
      }
      await signOut(auth);
      if (switchExperience) await resetExperience();
      dispatch(clearOrders());
      void appHaptics.success();
      setAccountAction(null);
      toast.success(switchExperience ? "Choose how you want to use My Thrift." : "Successfully logged out");
      navigate(switchExperience ? "/confirm-state" : "/vendorlogin", {replace: true});
    } catch (error) {
      console.error("Vendor logout failed:", error);
      toast.error("We couldn’t log you out. Please try again.");
    } finally {
      setLoggingOut(false);
      logoutInFlightRef.current = false;
    }
  };

  return (
    <>
      <SEO
        title="Vendor profile - My Thrift"
        description="Manage your My Thrift store profile."
        url="https://www.shopmythrift.store/vendor-profile"
      />

      <main className="vendor-profile-page">
        <header className="vendor-profile-header">
          <button type="button" onClick={shareStore} aria-label="Share store">
            <Share2 aria-hidden="true" />
          </button>
        </header>

        <section className="vendor-profile-identity">
          <button
            type="button"
            className="vendor-profile-avatar"
            onClick={() => setShowPreview(true)}
            aria-label="Preview store profile"
          >
            {coverImage ? <img src={coverImage} alt="" /> : <Store aria-hidden="true" />}
          </button>
          <button
            type="button"
            className="vendor-profile-title"
            onClick={openProfileDetails}
          >
            <span>{loading ? "Loading store…" : shopName}</span>
            <small>Edit store profile</small>
            <ChevronRight aria-hidden="true" />
          </button>
        </section>

        {vendorData?.description && (
          <p className="vendor-profile-description">{vendorData.description}</p>
        )}

        <div className="vendor-profile-sections">
          <section>
            <h2>Store</h2>
            <MenuRow icon={UserRound} label="Profile details" onClick={openProfileDetails} />
            <MenuRow icon={WalletCards} label="Wallet" onClick={() => navigate("/vendor-wallet")} />
            <MenuRow icon={Star} label="Ratings and reviews" onClick={() => navigate("/store-reviews")} />
            <MenuRow icon={PlaySquare} label="Selling tutorials" onClick={() => setShowTutorials(true)} />
          </section>

          <section>
            <h2>Help and legal</h2>
            <MenuRow icon={CircleHelp} label="Contact support" onClick={() => openChat({
              "support-entry": "vendor-profile",
              screen: "vendor-profile",
              "vendor-id": uid,
            })} />
            <MenuRow icon={FileText} label="Terms and conditions" onClick={() => navigate("/terms-and-conditions")} />
            <MenuRow icon={ShieldCheck} label="Privacy policy" onClick={() => navigate("/privacy-policy")} />
          </section>

          <section>
            <MenuRow
              icon={UsersRound}
              label="Switch accounts"
              onClick={() => setAccountAction("switch")}
            />
            <MenuRow
              icon={LogOut}
              label={loggingOut ? "Signing out…" : "Sign out"}
              danger
              onClick={() => void handleLogout()}
            />
            {loggingOut && (
              <span className="vendor-profile-logout-spinner" aria-label="Signing out">
                <RotatingLines strokeColor="#f9531e" width="22" />
              </span>
            )}
          </section>
          <p className="vendor-profile-version">v.{import.meta.env.VITE_APP_VERSION || "0.1"}</p>
        </div>
      </main>

      <AppBottomSheet
        open={Boolean(accountAction)}
        onClose={() => !loggingOut && setAccountAction(null)}
        height="280px"
        compactTop
        dismissible={!loggingOut}
        ariaLabel="Switch accounts"
      >
        <div className="vendor-profile-account-action">
          <h2>Switch accounts?</h2>
          <p>
            You’ll be signed out, then you can choose whether to shop or sell.
          </p>
          <div>
            <button type="button" onClick={() => setAccountAction(null)} disabled={loggingOut}>Cancel</button>
            <button
              type="button"
              className="vendor-profile-account-confirm"
              disabled={loggingOut}
              onClick={() => void handleLogout({switchExperience: true})}
            >
              {loggingOut ? "Please wait…" : "Log out & continue"}
            </button>
          </div>
        </div>
      </AppBottomSheet>

      <AppBottomSheet
        open={showPreview}
        onClose={() => setShowPreview(false)}
        height="88dvh"
        compactTop
        ariaLabel="Store preview"
      >
        <div className="vendor-profile-sheet-head">
          <div><strong>Store preview</strong></div>
          <button type="button" onClick={() => setShowPreview(false)} aria-label="Close"><X /></button>
        </div>
        <div className="vendor-profile-sheet-scroll"><ProfileView /></div>
      </AppBottomSheet>

      <AppBottomSheet
        open={showTutorials}
        onClose={() => setShowTutorials(false)}
        height="88dvh"
        compactTop
        ariaLabel="Selling tutorials"
      >
        <div className="vendor-profile-sheet-head">
          <div><strong>Selling tutorials</strong></div>
          <button type="button" onClick={() => setShowTutorials(false)} aria-label="Close"><X /></button>
        </div>
        <div className="vendor-profile-sheet-scroll"><VendorTutorials /></div>
      </AppBottomSheet>
    </>
  );
}
