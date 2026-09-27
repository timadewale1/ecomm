import React, { useState } from "react";
import { signOut } from "firebase/auth";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import posthog from "posthog-js";
import { toast } from "react-hot-toast";
import { auth } from "../../firebase.config";
import { useAuth } from "../../custom-hooks/useAuth";
import { resetUserData } from "../../redux/actions/useractions";
import { exitStockpileMode } from "../../redux/reducers/stockpileSlice";
import { useTawk } from "../../components/Context/TawkProvider";
import SEO from "../../components/Helmet/SEO";
import AppPageHeader from "../../components/layout/AppPageHeader";
import AppBottomSheet from "../../components/layout/AppBottomSheet";
import "./settings.css";
import {
  clearGuestCartCache,
  flushCartWrites,
} from "../../services/cartPersistence";
import { useAppExperience } from "../../components/Context/AppExperienceContext";

const SettingsRow = ({ children, onClick }) => (
  <button type="button" className="settings-row" onClick={onClick}>
    <span>{children}</span>
    <ChevronRight aria-hidden="true" />
  </button>
);

const ConfirmationSheet = ({
  open,
  title,
  confirmLabel,
  busy,
  onClose,
  onConfirm,
}) => (
  <AppBottomSheet
    open={open}
    onClose={onClose}
    closeOnBackdrop={!busy}
    dismissible={!busy}
    height="220px"
    ariaLabel={title}
    ariaBusy={busy}
    zIndex={4200}
    compactTop
    surfaceClassName="settings-sheet"
    surfaceStyle={{
      paddingBottom:
        "calc(24px + var(--app-safe-bottom, env(safe-area-inset-bottom, 0px)))",
    }}
  >
    <div className="settings-sheet-titlebar settings-sheet-titlebar-simple">
      <h2>{title}</h2>
    </div>
    <div className="settings-sheet-actions">
      <button type="button" className="settings-sheet-cancel" onClick={onClose}>
        Cancel
      </button>
      <button
        type="button"
        className="settings-sheet-confirm"
        onClick={onConfirm}
        disabled={busy}
      >
        {busy ? "Please wait…" : confirmLabel}
      </button>
    </div>
  </AppBottomSheet>
);

const SettingsPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentUser } = useAuth();
  const { resetExperience } = useAppExperience();
  const { openChat, logoutChat } = useTawk();
  const [confirmation, setConfirmation] = useState(null);
  const [busy, setBusy] = useState(false);
  const hasSignedInAccount = Boolean(currentUser && !currentUser.isAnonymous);

  const handleSwitchAccounts = () => {
    if (hasSignedInAccount) {
      setConfirmation("switch");
      return;
    }
    void resetExperience().then(() => navigate("/confirm-state", { replace: true }));
  };

  const performLogout = async (destination, { clearExperience = false } = {}) => {
    try {
      setBusy(true);

      if (currentUser?.uid) {
        try {
          // Every mutation is already written through the cart sync queue.
          // Flush that queue, but never upload a potentially unhydrated empty
          // Redux value over a valid cloud cart during logout.
          await flushCartWrites(currentUser.uid);
        } catch (cartError) {
          // Cart persistence is best-effort and must never trap a user inside
          // an account when Firestore is offline or denies the write.
          console.warn("Cart backup skipped during logout:", cartError);
        }
      }

      await logoutChat();

      // Only an explicit customer logout should start the next signed-out
      // session with an empty device basket. Raw Firebase sign-outs (vendor
      // rejection, verification failure, deactivation) intentionally do not
      // clear guest state.
      clearGuestCartCache();
      await signOut(auth);
      posthog.reset();
      if (clearExperience) await resetExperience();
      // The auth-owned cart hook switches Redux to a fresh empty guest owner.
      // It leaves this account's Firestore cart intact for its next login.
      dispatch(resetUserData());
      dispatch(exitStockpileMode());
      setConfirmation(null);
      navigate(destination, { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("We couldn't log you out. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SEO
        title="Settings - My Thrift"
        description="Manage your My Thrift account settings."
        url="https://www.shopmythrift.store/settings"
      />

      <main className="settings-page">
        <AppPageHeader
          title="Settings"
          onBack={() => navigate("/profile", { replace: true })}
        />

        <div className="settings-groups">
          <section className="settings-group">
            <h2>Account</h2>
            <div>
              <SettingsRow onClick={() => navigate("/account-info")}>
                Account info
              </SettingsRow>
              <SettingsRow
                onClick={() =>
                  navigate("/account-info", { state: { editField: "address" } })
                }
              >
                Delivery address
              </SettingsRow>
              <SettingsRow onClick={handleSwitchAccounts}>
                Switch accounts
              </SettingsRow>
              {hasSignedInAccount && (
                <SettingsRow onClick={() => setConfirmation("signout")}>
                  Sign Out
                </SettingsRow>
              )}
            </div>
          </section>

          <section className="settings-group">
            <h2>Support</h2>
            <div>
              <SettingsRow onClick={() => navigate("/send-us-feedback")}>
                Send us feedback
              </SettingsRow>
              <SettingsRow
                onClick={() =>
                  openChat({
                    "support-entry": "settings",
                    screen: "settings",
                  })
                }
              >
                Contact support
              </SettingsRow>
            </div>
          </section>

          <section className="settings-group">
            <h2>Legal</h2>
            <div>
              <SettingsRow onClick={() => navigate("/terms-and-conditions")}>
                Terms &amp; Conditions
              </SettingsRow>
              <SettingsRow onClick={() => navigate("/privacy-policy")}>
                Privacy Policy
              </SettingsRow>
            </div>
          </section>
        </div>
      </main>

      <ConfirmationSheet
        open={Boolean(hasSignedInAccount && confirmation === "switch")}
        title="Switch accounts? You'll choose whether to shop or sell again."
        confirmLabel="Log out & choose"
        busy={busy}
        onClose={() => setConfirmation(null)}
        onConfirm={() =>
          performLogout("/confirm-state", { clearExperience: true })
        }
      />

      <ConfirmationSheet
        open={Boolean(hasSignedInAccount && confirmation === "signout")}
        title="Are you sure you want to sign out?"
        confirmLabel="Sign out"
        busy={busy}
        onClose={() => setConfirmation(null)}
        onConfirm={() => performLogout("/")}
      />
    </>
  );
};

export default SettingsPage;
