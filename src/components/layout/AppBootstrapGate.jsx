import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SplashScreen } from "@capacitor/splash-screen";
import { useAuth } from "../../custom-hooks/useAuth";
import { useAppExperience } from "../Context/AppExperienceContext";
import {
  APP_EXPERIENCE,
  experienceForAccountRole,
} from "../../services/appExperience";
import { isNativeApp } from "../../services/platform";
import Loading from "../Loading/Loading";

const ENTRY_ROUTES = new Set([
  "/",
  "/confirm-state",
  "/confirm-user",
  "/login",
  "/vendorlogin",
]);

const EXPERIENCE_BYPASS_ROUTES = new Set([
  "/auth-action",
  "/confirm-email",
  "/verify-question",
  "/reset-password",
]);

const shouldBypassExperienceChoice = (pathname) =>
  EXPERIENCE_BYPASS_ROUTES.has(pathname) || pathname.startsWith("/pay/");

const vendorDestination = (profile) =>
  profile?.profileComplete ? "/vendordashboard" : "/complete-profile";

const waitForPaint = () =>
  new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });

const AppBootstrapGate = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    currentUser,
    currentUserData,
    loading: authLoading,
    profileResolution,
    refreshAuthProfile,
  } = useAuth();
  const { experience, ready: experienceReady, selectExperience } =
    useAppExperience();
  const [settled, setSettled] = useState(!isNativeApp);
  const hiddenSplashRef = useRef(false);

  const isAnonymous = Boolean(currentUser?.isAnonymous);
  const accountRole = !isAnonymous ? currentUserData?.role || null : null;
  const roleExperience = experienceForAccountRole(accountRole);

  const profileUnavailable = useMemo(
    () =>
      Boolean(
        currentUser &&
          !isAnonymous &&
          !currentUserData?.role &&
          ["offline", "missing"].includes(profileResolution),
      ),
    [
      currentUser,
      currentUserData?.role,
      isAnonymous,
      profileResolution,
    ],
  );

  useEffect(() => {
    if (!isNativeApp) return undefined;

    const safetyTimer = window.setTimeout(() => {
      if (!hiddenSplashRef.current) {
        hiddenSplashRef.current = true;
        SplashScreen.hide().catch(() => {});
      }
    }, 3500);

    return () => window.clearTimeout(safetyTimer);
  }, []);

  useEffect(() => {
    if (!isNativeApp || !experienceReady || authLoading) return;
    if (currentUser && !isAnonymous && !currentUserData?.role) {
      if (!profileUnavailable) return;
      setSettled(true);
      return;
    }

    let cancelled = false;

    const settleLaunch = async () => {
      if (roleExperience && roleExperience !== experience) {
        await selectExperience(roleExperience);
        if (cancelled) return;
      } else if (isAnonymous && experience !== APP_EXPERIENCE.CUSTOMER) {
        await selectExperience(APP_EXPERIENCE.CUSTOMER);
        if (cancelled) return;
      }

      const pathname = location.pathname;
      const isEntryRoute = ENTRY_ROUTES.has(pathname);
      let destination = null;
      let navigationState = location.state;

      // A first-install deep link must not be discarded. Capture it while the
      // user chooses an experience, then resume it after the appropriate auth
      // flow. Verification and payment callback routes bypass this choice so
      // time-sensitive account/payment processing is never interrupted.
      if (
        !accountRole &&
        !experience &&
        pathname !== "/confirm-state" &&
        !shouldBypassExperienceChoice(pathname)
      ) {
        destination = "/confirm-state";
        navigationState = {
          ...(location.state || {}),
          returnTo: `${pathname}${location.search}${location.hash}`,
        };
      }

      // After the first choice is known, never replace a product, store,
      // notification, order or conversation deep link with a role home page.
      if (!destination && isEntryRoute) {
        if (accountRole === "vendor") {
          destination = vendorDestination(currentUserData);
        } else if (accountRole === "user") {
          destination = "/";
        } else if (pathname === "/" || pathname === "/confirm-user") {
          if (experience === APP_EXPERIENCE.VENDOR) {
            destination = "/vendorlogin";
          } else if (!experience) {
            destination = "/confirm-state";
          } else {
            destination = "/";
          }
        } else if (pathname === "/confirm-state") {
          // An explicit reset clears the preference before navigating here.
          // A remembered choice should not make the selector flash on launch.
          if (experience === APP_EXPERIENCE.VENDOR) {
            destination = "/vendorlogin";
          } else if (experience === APP_EXPERIENCE.CUSTOMER) {
            destination = "/";
          }
        } else if (
          pathname === "/login" &&
          experience === APP_EXPERIENCE.VENDOR
        ) {
          destination = "/vendorlogin";
        } else if (
          pathname === "/vendorlogin" &&
          experience === APP_EXPERIENCE.CUSTOMER
        ) {
          destination = "/login";
        }
      }

      if (destination && destination !== pathname) {
        navigate(destination, {
          replace: true,
          state: navigationState,
        });
      }

      await waitForPaint();
      if (cancelled) return;
      setSettled(true);
      if (!hiddenSplashRef.current) {
        hiddenSplashRef.current = true;
        await SplashScreen.hide().catch(() => {});
      }
    };

    void settleLaunch();
    return () => {
      cancelled = true;
    };
  }, [
    accountRole,
    authLoading,
    currentUser,
    currentUserData,
    experience,
    experienceReady,
    isAnonymous,
    location.pathname,
    location.search,
    location.hash,
    location.state,
    navigate,
    profileUnavailable,
    roleExperience,
    selectExperience,
  ]);

  if (!isNativeApp) return children;

  if (profileUnavailable) {
    return (
      <main className="min-h-screen bg-white px-6 flex flex-col items-center justify-center text-center font-satoshi">
        <h1 className="text-xl font-semibold text-gray-950">
          We couldn’t finish loading your account
        </h1>
        <p className="mt-2 max-w-sm text-sm text-gray-500">
          Check your connection and try again. Your account and selected My
          Thrift experience are still saved.
        </p>
        <button
          type="button"
          onClick={refreshAuthProfile}
          className="mt-5 h-12 w-full max-w-sm rounded-md bg-customOrange px-5 font-semibold text-white"
        >
          Try again
        </button>
      </main>
    );
  }

  if (!settled || !experienceReady || authLoading) return <Loading />;

  return children;
};

export default AppBootstrapGate;
