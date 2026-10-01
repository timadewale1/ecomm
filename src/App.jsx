// src/App.jsx
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useAuth } from "./custom-hooks/useAuth";
import Layout from "./components/layout/Layout";
import {
  initializeOrderListener,
  removeOrderListener,
} from "./custom-hooks/orderListener";
import "./App.css";
import { AccessProvider } from "./components/Context/AccesContext";

import { useFCM } from "./custom-hooks/useFCM";
import { isNativeApp, nativePlatform } from "./services/platform";
import { Keyboard, KeyboardResize } from "@capacitor/keyboard";
import { installIOSKeyboardViewport } from "./services/iosKeyboardViewport.mjs";
import { StatusBar, Style } from "@capacitor/status-bar";
import { App as NativeApp } from "@capacitor/app";
import { installNativeLinkHandling } from "./services/nativeLinks";
import { consumeAndroidSurfaceBack } from "./services/androidBackButton";
import {
  startUserRealtimeSync,
  stopUserRealtimeSync,
} from "./services/realtime/userRealtimeSync";
import { mySizesOwnerChanged } from "./redux/reducers/mySizesSlice";
import useCartSync from "./custom-hooks/useCartSync";
import {
  startOfferConversationSync,
  stopOfferConversationSync,
} from "./services/realtime/offerConversationSync";
import OfferActivityToasts from "./components/Offers/OfferActivityToasts";
import { reconcileScrollLocks } from "./services/scrollLock";
import AppBootstrapGate from "./components/layout/AppBootstrapGate";
function App() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentUser, currentUserData, loading: authLoading } = useAuth();
  useCartSync({
    enabled:
      !currentUser ||
      currentUser.isAnonymous ||
      (!authLoading && currentUserData?.role === "user"),
  });
  useFCM(currentUser, currentUserData);

  useEffect(() => {
    const reconcileOnResume = () => {
      if (document.visibilityState === "visible") {
        reconcileScrollLocks();
      }
    };

    window.addEventListener("pageshow", reconcileScrollLocks);
    document.addEventListener("visibilitychange", reconcileOnResume);

    return () => {
      window.removeEventListener("pageshow", reconcileScrollLocks);
      document.removeEventListener("visibilitychange", reconcileOnResume);
    };
  }, []);

  // Initialize Order Listener
  useEffect(() => {
    if (!authLoading && currentUser?.uid && currentUserData?.role === "vendor") {
      console.log("Initializing order listener for:", currentUser.uid);
      initializeOrderListener(currentUser.uid);
    } else if (!authLoading) {
      removeOrderListener();
    }
    return () => {
      console.log("Removing order listener...");
      removeOrderListener({ clear: false });
    };
  }, [authLoading, currentUser?.uid, currentUserData?.role]);

  // Buyer live data must never start for a vendor principal. A UID-bound
  // cached profile makes this decision fast on cold launch while the server
  // validation completes in AuthProvider.
  useEffect(() => {
    if (!authLoading && currentUser?.uid && currentUserData?.role === "user") {
      return startUserRealtimeSync(currentUser.uid);
    }
    if (!authLoading) stopUserRealtimeSync();
    return undefined;
  }, [authLoading, currentUser?.uid, currentUserData?.role]);

  // Offer conversations are role-scoped and shared by the list screen and the
  // bottom-bar unread badge. Keeping one listener here prevents duplicate
  // subscriptions and preserves the cached list while navigating.
  useEffect(() => {
    if (authLoading) return undefined;
    if (!currentUser?.uid || !["user", "vendor"].includes(currentUserData?.role)) {
      stopOfferConversationSync();
      return undefined;
    }
    return startOfferConversationSync(currentUser.uid, currentUserData.role);
  }, [authLoading, currentUser?.uid, currentUserData?.role]);

  // Keep the persisted My Sizes cache bound to the authenticated Firebase UID.
  // Waiting for AuthProvider to finish avoids clearing a valid cache during
  // the brief cold-start period before Firebase restores its session.
  useEffect(() => {
    if (authLoading) return;
    dispatch(mySizesOwnerChanged(currentUser?.uid || null));
  }, [authLoading, currentUser?.uid, dispatch]);

  // Set Viewport Height
  const setVh = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty("--vh", `${vh}px`);
    console.log("Viewport height updated:", `${vh}px`);
  };

  // App.jsx
  useEffect(() => {
    if (isNativeApp) return;

    const ua = navigator.userAgent || "";
    const isInApp = /(FBAN|FBAV|FB_IAB|Instagram|Twitter)(?!.*Safari)/i.test(
      ua,
    );
    if (!("serviceWorker" in navigator) || isInApp) return;

    const onLoad = () => {
      navigator.serviceWorker
        .register("/service-worker.js")
        .then((r) => console.log("SW registered", r))
        .catch((err) => console.warn("SW registration skipped:", err?.message));
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  useEffect(() => {
    if (!isNativeApp) return;

    let showHandle;
    let hideHandle;
    let didShowHandle;
    let didHideHandle;
    let appStateHandle;
    let statusVisibilityHandle;
    const androidInsetTimers = new Set();
    // Install before asynchronous shell setup so an early input focus isn't missed.
    const stopIOSKeyboardViewport = nativePlatform === "ios"
      ? installIOSKeyboardViewport({ keyboard: Keyboard })
      : undefined;

    const syncAndroidSafeArea = async () => {
      if (nativePlatform !== "android") return;
      try {
        const info = await StatusBar.getInfo();
        const reportedHeight = Number(info?.height);
        // Some OEM WebViews (including MIUI) expose env(safe-area-inset-top)
        // as zero even while Android draws edge-to-edge. Capacitor reads the
        // real WindowInsets in native code, so use that value for every page.
        const topInset =
          Number.isFinite(reportedHeight) && reportedHeight > 0
            ? reportedHeight
            : info?.visible === false
              ? 0
              : 24;
        document.documentElement.style.setProperty(
          "--app-safe-top",
          `${topInset}px`,
        );
      } catch (error) {
        console.warn("Android status-bar inset unavailable:", error);
      }
    };

    const scheduleAndroidInsetSync = () => {
      if (nativePlatform !== "android") return;
      [0, 80, 300].forEach((delay) => {
        const timer = window.setTimeout(() => {
          androidInsetTimers.delete(timer);
          void syncAndroidSafeArea();
        }, delay);
        androidInsetTimers.add(timer);
      });
    };

    const keepFocusedFieldVisible = () => {
      requestAnimationFrame(() => {
        const activeElement = document.activeElement;
        const isEditable =
          activeElement instanceof HTMLInputElement ||
          activeElement instanceof HTMLTextAreaElement ||
          activeElement instanceof HTMLSelectElement ||
          activeElement?.isContentEditable;

        if (!isEditable) return;

        const visibleHeight =
          window.visualViewport?.height || window.innerHeight;
        const rect = activeElement.getBoundingClientRect();
        const topGuard = 16;
        const bottomGuard = 24;

        if (
          rect.top < topGuard ||
          rect.bottom > visibleHeight - bottomGuard
        ) {
          activeElement.scrollIntoView({
            block: "center",
            inline: "nearest",
            behavior: "smooth",
          });
        }
      });
    };

    const configureNativeShell = async () => {
      try {
        // Android screens use a white system-bar surface, so dark icons retain
        // contrast. Preserve the established iOS status-bar appearance.
        await StatusBar.setStyle({
          style: nativePlatform === "android" ? Style.Dark : Style.Light,
        });
        scheduleAndroidInsetSync();
      } catch (error) {
        console.warn("Native status bar setup skipped:", error);
      }

      if (nativePlatform === "android") {
        try {
          statusVisibilityHandle = await StatusBar.addListener(
            "statusBarVisibilityChanged",
            scheduleAndroidInsetSync,
          );
          appStateHandle = await NativeApp.addListener(
            "appStateChange",
            ({ isActive }) => {
              if (isActive) scheduleAndroidInsetSync();
            },
          );
          window.addEventListener("resize", scheduleAndroidInsetSync);
          window.addEventListener("orientationchange", scheduleAndroidInsetSync);
        } catch (error) {
          console.warn("Android inset listeners unavailable:", error);
        }
      }

      if (nativePlatform === "ios") {
        try {
          await Keyboard.setResizeMode({ mode: KeyboardResize.Native });
        } catch (error) {
          console.warn("Native keyboard resize setup skipped:", error);
        }
      }

      try {
        // iOS is handled centrally on willShow/viewport changes, without a
        // delayed smooth scroll. Preserve Android's existing keyboard behavior.
        if (nativePlatform === "ios") return;
        showHandle = await Keyboard.addListener("keyboardWillShow", () => {
          document.body.classList.add("native-keyboard-open");
        });
        didShowHandle = await Keyboard.addListener(
          "keyboardDidShow",
          keepFocusedFieldVisible,
        );
        hideHandle = await Keyboard.addListener("keyboardWillHide", () => {
          document.body.classList.remove("native-keyboard-open");
        });
        didHideHandle = await Keyboard.addListener("keyboardDidHide", () => {
          document.body.classList.remove("native-keyboard-open");
        });
      } catch (error) {
        console.warn("Native keyboard listeners unavailable:", error);
      }

      // AppBootstrapGate hides the native splash only after the experience,
      // Firebase session and first destination have resolved.
    };

    configureNativeShell();

    return () => {
      stopIOSKeyboardViewport?.();
      document.body.classList.remove("native-keyboard-open");
      showHandle?.remove();
      hideHandle?.remove();
      didShowHandle?.remove();
      didHideHandle?.remove();
      appStateHandle?.remove();
      statusVisibilityHandle?.remove();
      androidInsetTimers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("resize", scheduleAndroidInsetSync);
      window.removeEventListener("orientationchange", scheduleAndroidInsetSync);
      if (nativePlatform === "android") {
        document.documentElement.style.removeProperty("--app-safe-top");
      }
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("native-platform", isNativeApp);
    root.classList.toggle("native-ios", isNativeApp && nativePlatform === "ios");
    root.classList.toggle(
      "native-android",
      isNativeApp && nativePlatform === "android",
    );

    return () => {
      root.classList.remove("native-platform", "native-ios", "native-android");
    };
  }, []);

  useEffect(() => installNativeLinkHandling({ navigate }), [navigate]);

  useEffect(() => {
    if (!isNativeApp || nativePlatform !== "android") return undefined;

    let backHandle;
    let disposed = false;

    void NativeApp.addListener("backButton", ({ canGoBack }) => {
      if (consumeAndroidSurfaceBack()) return;

      const historyIndex = Number(window.history.state?.idx);
      const hasRouterHistory = Number.isFinite(historyIndex) && historyIndex > 0;
      const hasWebViewFallback = !Number.isFinite(historyIndex) && canGoBack;
      if (hasRouterHistory || hasWebViewFallback) {
        navigate(-1);
        return;
      }

      void NativeApp.exitApp();
    }).then((handle) => {
      if (disposed) void handle.remove();
      else backHandle = handle;
    });

    return () => {
      disposed = true;
      void backHandle?.remove();
    };
  }, [navigate]);

  // Apply initial viewport height
  useEffect(() => {
    setVh();
    window.addEventListener("resize", setVh);
    window.addEventListener("load", setVh);
    return () => {
      window.removeEventListener("resize", setVh);
      window.removeEventListener("load", setVh);
    };
  }, []);

  return (
    <>
      {/* Hidden sitemap for crawlers */}
      <nav className="sr-only" aria-label="Site map">
        <ul>
          <li>
            <a href="/">Shop Now</a>
          </li>
          <li>
            <a href="/explore">Explore</a>
          </li>
          <li>
            <a href="/producttype/Tops">Tops</a>
          </li>
          <li>
            <a
              href="https://blog.shopmythrift.store"
              target="_blank"
              rel="noopener noreferrer"
            >
              Check our Blog
            </a>
          </li>
        </ul>
      </nav>

      <AccessProvider>
        <AppBootstrapGate>
          <OfferActivityToasts />
          <Layout />
        </AppBootstrapGate>
      </AccessProvider>
    </>
  );
}

export default App;
