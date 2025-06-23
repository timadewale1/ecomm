import { useEffect, useState, useCallback } from "react";
import { messagingReady, functions, db } from "../firebase.config";
import { getToken, onMessage } from "firebase/messaging";
import { httpsCallable } from "firebase/functions";
import { doc, getDoc } from "firebase/firestore";
import { debounce } from "lodash";
import toast from "react-hot-toast";

export function useFCM(currentUser, currentUserData) {
  const [showBanner, setShowBanner] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [isPWA, setIsPWA] = useState(
    window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleChange = () =>
      setIsPWA(mediaQuery.matches || window.navigator.standalone === true);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const checkTokenExists = useCallback(async (uid, token) => {
    const cacheKey = `fcmToken_${uid}_${token}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached === "true") return true;

    try {
      const tokenDoc = await getDoc(doc(db, "fcmTokens", uid));
      if (tokenDoc.exists()) {
        const tokens = tokenDoc.data().tokens || [];
        const exists = tokens.includes(token);
        if (exists) localStorage.setItem(cacheKey, "true");
        return exists;
      }
      return false;
    } catch (err) {
      console.error("Error checking token existence:", err);
      return false;
    }
  }, []);

  const saveTokenToBackend = useCallback(
    debounce(async (messaging, token) => {
      try {
        const saveToken = httpsCallable(functions, "saveFcmToken");
        const result = await saveToken({ token });
        console.log("saveFcmToken result:", result.data);
        setHasToken(true);
        localStorage.setItem(`fcmToken_${currentUser?.uid}_${token}`, "true");
      } catch (err) {
        console.error("Error saving FCM token:", err);
      }
    }, 1000),
    [currentUser?.uid]
  );

  const registerServiceWorker = useCallback(async () => {
    if (
      await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js")
    ) {
      console.log("FCM Service Worker already registered");
      return true;
    }
    try {
      const registration = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js"
      );
      console.log("FCM Service Worker registered at", registration.scope);
      return true;
    } catch (swErr) {
      console.warn("FCM SW registration failed:", swErr);
      return false;
    }
  }, []);

  const handleEnableNotifs = useCallback(() => {
    console.log("▶️ handleEnableNotifs started");
    // 1️⃣ Hide banner immediately
    setShowBanner(false);
    // 2️⃣ Show success toast immediately
    toast.success("Notifications enabled! You’re all set ✅");

    // 3️⃣ Do the real work in the background
    (async () => {
      setEnabling(true);
      try {
        let perm = Notification.permission;
        if (perm === "default") {
          console.log("Requesting notification permission…");
          perm = await Notification.requestPermission();
          console.log("Notification.permission after request:", perm);
        }

        if (perm !== "granted") {
          console.warn("User denied notifications, aborting token retrieval.");
          setShowBanner(isPWA);
          return;
        }

        const messaging = await messagingReady;
        if (!messaging) {
          console.warn("FCM not supported here");
          setShowBanner(isPWA);
          return;
        }

        if (!(await registerServiceWorker())) {
          setShowBanner(isPWA);
          return;
        }

        const vapidKey = import.meta.env.VITE_VAPID_KEY;
        const fcmToken = await getToken(messaging, { vapidKey });
        if (!fcmToken) {
          console.error("No FCM token retrieved");
          setShowBanner(isPWA);
          return;
        }

        await saveTokenToBackend(messaging, fcmToken);
        setHasToken(true);
      } catch (err) {
        console.error("❌ Error in handleEnableNotifs:", err);
        setShowBanner(isPWA);
      } finally {
        console.log("▶️ handleEnableNotifs finished");
        setEnabling(false);
      }
    })();
  }, [saveTokenToBackend, registerServiceWorker, isPWA]);

  useEffect(() => {
    if (!currentUser) {
      setShowBanner(false);
      setHasToken(false);
      return;
    }

    const setupNotifications = async () => {
      try {
        if (Notification.permission !== "granted") {
          console.log("Notifications not granted, skipping token setup.");
          setShowBanner(isPWA && !hasToken);
          return;
        }

        const messaging = await messagingReady;
        if (!messaging) {
          console.warn("FCM not supported here");
          setShowBanner(isPWA && !hasToken);
          return;
        }

        if (!(await registerServiceWorker())) {
          setShowBanner(isPWA && !hasToken);
          return;
        }

        const vapidKey = import.meta.env.VITE_VAPID_KEY;
        const fcmToken = await getToken(messaging, { vapidKey });
        if (!fcmToken) {
          console.error("No FCM token retrieved");
          setShowBanner(isPWA && !hasToken);
          return;
        }

        const tokenExists = await checkTokenExists(currentUser.uid, fcmToken);
        if (tokenExists) {
          setHasToken(true);
          setShowBanner(false);
          return;
        }

        await saveTokenToBackend(messaging, fcmToken);
        setHasToken(true);
        setShowBanner(isPWA && !hasToken);

        const unsubscribe = messaging.onTokenRefresh(async () => {
          try {
            const newToken = await getToken(messaging, { vapidKey });
            if (newToken) {
              await saveTokenToBackend(messaging, newToken);
            }
          } catch (err) {
            console.error("Error handling token refresh:", err);
          }
        });

        onMessage(messaging, (payload) => {
          if (payload.data?.userId === currentUser?.uid) {
            console.log("Foreground FCM message:", payload);
            new Notification(payload.notification.title, {
              body: payload.notification.body,
            });
          }
        });

        return () => unsubscribe && unsubscribe();
      } catch (err) {
        console.error("Error setting up notifications:", err);
        setShowBanner(isPWA && !hasToken);
      }
    };

    setupNotifications();
  }, [
    currentUser,
    checkTokenExists,
    saveTokenToBackend,
    registerServiceWorker,
    isPWA,
  ]);

  useEffect(() => {
    if (!currentUser || !currentUserData?.notificationAllowed) return;

    const checkPermissions = async () => {
      if (Notification.permission !== "granted") {
        try {
          const removeToken = httpsCallable(functions, "removeFcmToken");
          await removeToken();
          setHasToken(false);
          Object.keys(localStorage)
            .filter((key) => key.startsWith(`fcmToken_${currentUser.uid}_`))
            .forEach((key) => localStorage.removeItem(key));
          setShowBanner(isPWA);
        } catch (err) {
          console.error(
            "Error removing token after permission revocation:",
            err
          );
        }
      }
    };

    checkPermissions();
  }, [currentUser, currentUserData, isPWA]);

  return { showBanner, handleEnableNotifs, enabling, isPWA };
}
