// import { useEffect, useState, useCallback } from "react";
// import { messagingReady, functions, db } from "../firebase.config";
// import { getToken, onMessage } from "firebase/messaging";
// import { httpsCallable } from "firebase/functions";
// import { doc, getDoc } from "firebase/firestore";
// import { debounce } from "lodash";
// import toast from "react-hot-toast";

// /* ------------------------------------------------------------------ */
// /* ⏰  How long (in hours) before we re-validate the token in Firestore */
// const CACHE_TTL_HOURS = 24;
// /* ------------------------------------------------------------------ */

// /** Read a “token cached” flag with ttl */
// function tokenCacheGet(uid, token) {
//   const raw = localStorage.getItem(`fcmToken_${uid}_${token}`);
//   if (!raw) return false;

//   try {
//     const { ok, expires } = JSON.parse(raw);
//     if (!ok || Date.now() > expires) {
//       localStorage.removeItem(`fcmToken_${uid}_${token}`); // stale → clear
//       return false;
//     }
//     return true;
//   } catch {
//     localStorage.removeItem(`fcmToken_${uid}_${token}`);
//     return false;
//   }
// }

// /** Persist the cache flag with a rolling ttl */
// function tokenCacheSet(uid, token) {
//   localStorage.setItem(
//     `fcmToken_${uid}_${token}`,
//     JSON.stringify({
//       ok: true,
//       expires: Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000,
//     })
//   );
// }

// export function useFCM(currentUser, currentUserData) {
//   const [showBanner, setShowBanner] = useState(false);
//   const [enabling, setEnabling] = useState(false);
//   const [hasToken, setHasToken] = useState(false);
//   const [isPWA, setIsPWA] = useState(
//     window.matchMedia("(display-mode: standalone)").matches ||
//       window.navigator.standalone === true
//   );

//   /* ───────────────────────── PWA detection listener ───────────────────── */
//   useEffect(() => {
//     const mq = window.matchMedia("(display-mode: standalone)");
//     const onChange = () =>
//       setIsPWA(mq.matches || window.navigator.standalone === true);
//     mq.addEventListener("change", onChange);
//     return () => mq.removeEventListener("change", onChange);
//   }, []);

//   /* ─────────────────────── Check token in Firestore (ttl) ──────────────── */
//   const checkTokenExists = useCallback(async (uid, token) => {
//     if (tokenCacheGet(uid, token)) return true; // ✅ fresh cache hit

//     try {
//       const snap = await getDoc(doc(db, "fcmTokens", uid));
//       if (snap.exists()) {
//         const exists = (snap.data().tokens || []).includes(token);
//         if (exists) tokenCacheSet(uid, token); // cache for next 24 h
//         return exists;
//       }
//       return false;
//     } catch (err) {
//       console.error("Error checking token existence:", err);
//       return false;
//     }
//   }, []);

//   /* ─────────────────────── saveFcmToken callable + cache ───────────────── */
//   const saveTokenToBackend = useCallback(
//     debounce(async (_msg, token) => {
//       try {
//         await httpsCallable(functions, "saveFcmToken")({ token });
//         setHasToken(true);
//         tokenCacheSet(currentUser?.uid, token);
//       } catch (err) {
//         console.error("Error saving FCM token:", err);
//       }
//     }, 1000),
//     [currentUser?.uid]
//   );

//   /* ───────────────────────────── SW registration ───────────────────────── */
//   const registerServiceWorker = useCallback(async () => {
//     if (
//       await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js")
//     ) {
//       console.log("FCM Service Worker already registered");
//       return true;
//     }
//     try {
//       const reg = await navigator.serviceWorker.register(
//         "/firebase-messaging-sw.js"
//       );
//       console.log("FCM Service Worker registered at", reg.scope);
//       return true;
//     } catch (err) {
//       console.warn("FCM SW registration failed:", err);
//       return false;
//     }
//   }, []);

//   /* ───────────────────── enable-notifications button ───────────────────── */
//   const handleEnableNotifs = useCallback(() => {
//     setShowBanner(false);
//     toast.success("Notifications enabled! You’re all set ✅");

//     (async () => {
//       setEnabling(true);
//       try {
//         let perm = Notification.permission;
//         if (perm === "default") perm = await Notification.requestPermission();
//         if (perm !== "granted") {
//           setShowBanner(isPWA);
//           return;
//         }

//         const messaging = await messagingReady;
//         if (!messaging || !(await registerServiceWorker())) {
//           setShowBanner(isPWA);
//           return;
//         }

//         const vapidKey = import.meta.env.VITE_VAPID_KEY;
//         const token = await getToken(messaging, { vapidKey });
//         if (!token) {
//           setShowBanner(isPWA);
//           return;
//         }

//         await saveTokenToBackend(messaging, token);
//       } catch (err) {
//         console.error("handleEnableNotifs error:", err);
//         setShowBanner(isPWA);
//       } finally {
//         setEnabling(false);
//       }
//     })();
//   }, [isPWA, registerServiceWorker, saveTokenToBackend]);

//   /* ─────────────────────── Initial setup for a user ────────────────────── */
//   useEffect(() => {
//     if (!currentUser) {
//       setShowBanner(false);
//       setHasToken(false);
//       return;
//     }

//     const bootstrap = async () => {
//       try {
//         if (Notification.permission !== "granted") {
//           setShowBanner(isPWA && !hasToken);
//           return;
//         }

//         const messaging = await messagingReady;
//         if (!messaging || !(await registerServiceWorker())) {
//           setShowBanner(isPWA && !hasToken);
//           return;
//         }

//         const vapidKey = import.meta.env.VITE_VAPID_KEY;
//         const token = await getToken(messaging, { vapidKey });
//         if (!token) {
//           setShowBanner(isPWA && !hasToken);
//           return;
//         }

//         if (await checkTokenExists(currentUser.uid, token)) {
//           setHasToken(true);
//           setShowBanner(false);
//         } else {
//           await saveTokenToBackend(messaging, token);
//           setHasToken(true);
//           setShowBanner(isPWA && !hasToken);
//         }

//         /* listen for token refresh */
//         const unsub = messaging.onTokenRefresh(async () => {
//           try {
//             const newTok = await getToken(messaging, { vapidKey });
//             if (newTok) await saveTokenToBackend(messaging, newTok);
//           } catch (e) {
//             console.error("Token refresh error:", e);
//           }
//         });

//         /* foreground push */
//         onMessage(messaging, (payload) => {
//           if (payload.data?.userId === currentUser.uid) {
//             new Notification(payload.notification.title, {
//               body: payload.notification.body,
//             });
//           }
//         });

//         return () => unsub();
//       } catch (err) {
//         console.error("Notifications setup error:", err);
//         setShowBanner(isPWA && !hasToken);
//       }
//     };

//     bootstrap();
//   }, [
//     currentUser,
//     hasToken,
//     isPWA,
//     checkTokenExists,
//     saveTokenToBackend,
//     registerServiceWorker,
//   ]);

//   /* ─────────────────── Permission revoked → clean tokens ───────────────── */
//   useEffect(() => {
//     if (!currentUser || !currentUserData?.notificationAllowed) return;
//     if (Notification.permission === "granted") return;

//     (async () => {
//       try {
//         await httpsCallable(functions, "removeFcmToken")();
//         setHasToken(false);
//         Object.keys(localStorage)
//           .filter((k) => k.startsWith(`fcmToken_${currentUser.uid}_`))
//           .forEach((k) => localStorage.removeItem(k));
//         setShowBanner(isPWA);
//       } catch (err) {
//         console.error("removeFcmToken error:", err);
//       }
//     })();
//   }, [currentUser, currentUserData, isPWA]);

//   /* ──────────────────────────────────────────────────────────────────────── */
//   return { showBanner, handleEnableNotifs, enabling, isPWA };
// }
import { useEffect, useState, useCallback } from "react";
import { messagingReady, functions, db } from "../firebase.config";
import { getToken, onMessage } from "firebase/messaging";
import { httpsCallable } from "firebase/functions";
import { doc, getDoc } from "firebase/firestore";
import { debounce } from "lodash";
import toast from "react-hot-toast";

/* ------------------------------------------------------------------ */
/* ⏰  How long (in hours) before we re-validate the token in Firestore */
const CACHE_TTL_HOURS = 24;
/* ------------------------------------------------------------------ */

/** Read a “token cached” flag with ttl */
function tokenCacheGet(uid, token) {
  const raw = localStorage.getItem(`fcmToken_${uid}_${token}`);
  if (!raw) return false;

  try {
    const { ok, expires } = JSON.parse(raw);
    if (!ok || Date.now() > expires) {
      localStorage.removeItem(`fcmToken_${uid}_${token}`); // stale → clear
      return false;
    }
    return true;
  } catch {
    localStorage.removeItem(`fcmToken_${uid}_${token}`);
    return false;
  }
}

/** Persist the cache flag with a rolling ttl */
function tokenCacheSet(uid, token) {
  localStorage.setItem(
    `fcmToken_${uid}_${token}`,
    JSON.stringify({
      ok: true,
      expires: Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000,
    })
  );
}

export function useFCM(currentUser, currentUserData) {
  const [showBanner, setShowBanner] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [isPWA, setIsPWA] = useState(
    window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
  );

  /* ───────────────────────── PWA detection listener ───────────────────── */
  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    const onChange = () =>
      setIsPWA(mq.matches || window.navigator.standalone === true);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  /* ─────────────────────── Check token in Firestore (ttl) ──────────────── */
  const checkTokenExists = useCallback(async (uid, token) => {
    if (tokenCacheGet(uid, token)) return true; // ✅ fresh cache hit

    try {
      const snap = await getDoc(doc(db, "fcmTokens", uid));
      if (snap.exists()) {
        const exists = (snap.data().tokens || []).includes(token);
        if (exists) tokenCacheSet(uid, token); // cache for next 24 h
        return exists;
      }
      return false;
    } catch (err) {
      console.error("Error checking token existence:", err);
      return false;
    }
  }, []);

  /* ─────────────────────── saveFcmToken callable + cache ───────────────── */
  const saveTokenToBackend = useCallback(
    debounce(async (_msg, token) => {
      try {
        await httpsCallable(functions, "saveFcmToken")({ token });
        setHasToken(true);
        tokenCacheSet(currentUser?.uid, token);
      } catch (err) {
        console.error("Error saving FCM token:", err);
      }
    }, 1000),
    [currentUser?.uid]
  );

  /* ───────────────────────────── SW registration ───────────────────────── */
  const registerServiceWorker = useCallback(async () => {
    const existing = await navigator.serviceWorker.getRegistration(
      "/firebase-messaging-sw.js"
    );
    if (existing) {
      console.log("FCM SW already registered");
      return existing;
    }
    const reg = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js"
    );
    console.log("FCM SW registered at", reg.scope);
    return reg;
  }, []);

  /* ───────────────────── enable-notifications button ───────────────────── */
  const handleEnableNotifs = useCallback(() => {
    setShowBanner(false);
    toast.success("Notifications enabled! You’re all set ✅");

    (async () => {
      setEnabling(true);
      try {
        let perm = Notification.permission;
        if (perm === "default") perm = await Notification.requestPermission();
        if (perm !== "granted") {
          setShowBanner(isPWA);
          return;
        }

        const messaging = await messagingReady;
        if (!messaging) {
          setShowBanner(isPWA);
          return;
        }

        const vapidKey = import.meta.env.VITE_VAPID_KEY;
        const reg = await registerServiceWorker();
        if (!reg) {
          setShowBanner(isPWA);
          return;
        }

        const token = await getToken(messaging, {
          vapidKey,
          serviceWorkerRegistration: reg,
        });
        if (!token) {
          setShowBanner(isPWA);
          return;
        }

        await saveTokenToBackend(messaging, token);
      } catch (err) {
        console.error("handleEnableNotifs error:", err);
        setShowBanner(isPWA);
      } finally {
        setEnabling(false);
      }
    })();
  }, [isPWA, registerServiceWorker, saveTokenToBackend]);

  /* ─────────────────────── Initial setup for a user ────────────────────── */
  useEffect(() => {
    if (!currentUser) {
      setShowBanner(false);
      setHasToken(false);
      return;
    }

    const bootstrap = async () => {
      try {
        if (Notification.permission !== "granted") {
          setShowBanner(isPWA && !hasToken);
          return;
        }

        const messaging = await messagingReady;
        if (!messaging) {
          setShowBanner(isPWA && !hasToken);
          return;
        }

        const reg = await registerServiceWorker();
        if (!reg) {
          setShowBanner(isPWA && !hasToken);
          return;
        }

        const vapidKey = import.meta.env.VITE_VAPID_KEY;
        const token = await getToken(messaging, {
          vapidKey,
          serviceWorkerRegistration: reg,
        });
        if (!token) {
          setShowBanner(isPWA && !hasToken);
          return;
        }

        if (await checkTokenExists(currentUser.uid, token)) {
          setHasToken(true);
          setShowBanner(false);
        } else {
          await saveTokenToBackend(messaging, token);
          setHasToken(true);
          setShowBanner(isPWA && !hasToken);
        }

        /* listen for token refresh */
        const unsub = messaging.onTokenRefresh(async () => {
          try {
            const newTok = await getToken(messaging, {
              vapidKey,
              serviceWorkerRegistration: reg,
            });
            if (newTok) await saveTokenToBackend(messaging, newTok);
          } catch (e) {
            console.error("Token refresh error:", e);
          }
        });

        /* foreground push */
        onMessage(messaging, (payload) => {
          if (payload.data?.userId === currentUser.uid) {
            new Notification(payload.notification.title, {
              body: payload.notification.body,
            });
          }
        });

        return () => unsub();
      } catch (err) {
        console.error("Notifications setup error:", err);
        setShowBanner(isPWA && !hasToken);
      }
    };

    bootstrap();
  }, [currentUser, hasToken, isPWA, checkTokenExists, saveTokenToBackend, registerServiceWorker]);

  /* ─────────────────── Permission revoked → clean tokens ───────────────── */
  useEffect(() => {
    if (!currentUser || !currentUserData?.notificationAllowed) return;
    if (Notification.permission === "granted") return;

    (async () => {
      try {
        await httpsCallable(functions, "removeFcmToken")();
        setHasToken(false);
        Object.keys(localStorage)
          .filter((k) => k.startsWith(`fcmToken_${currentUser.uid}_`))
          .forEach((k) => localStorage.removeItem(k));
        setShowBanner(isPWA);
      } catch (err) {
        console.error("removeFcmToken error:", err);
      }
    })();
  }, [currentUser, currentUserData, isPWA]);

  /* ──────────────────────────────────────────────────────────────────────── */
  return { showBanner, handleEnableNotifs, enabling, isPWA };
}
