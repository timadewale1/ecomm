import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { getDoc, doc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuth } from "../../custom-hooks/useAuth";
import { db } from "../../firebase.config";

const TawkContext = createContext({ openChat: () => {}, loaded: false });
const EMBED_SRC = "https://embed.tawk.to/68541decea9e87190a96647e/1iu499p2k";

export const TawkProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [hash, setHash] = useState(null);
  const [role, setRole] = useState("user");
  const [loaded, setLoaded] = useState(false);
  const injected = useRef(false);
  const loggedInOnce = useRef(false);

  /** 1️⃣ Get the Base64 HMAC from your Cloud Function */
  useEffect(() => {
    console.log("🔄 [Tawk] fetch hash effect — currentUser:", currentUser);
    if (!currentUser) {
      setHash(null);
      return;
    }
    (async () => {
      try {
        console.log("[Tawk] ▶ Calling generateTawkHash");
        const fn = httpsCallable(getFunctions(), "generateTawkHash");
        const { data } = await fn({ uid: currentUser.uid });
        console.log("🔑 [Tawk] received hash →", data.hash);
        setHash(data.hash);
      } catch (err) {
        console.error("⛔ [Tawk] generateTawkHash failed:", err);
      }
    })();
  }, [currentUser]);

  /** 2️⃣ Look up whether this is a “vendor” or just a “user” */
  useEffect(() => {
    if (!currentUser) {
      setRole("user");
      return;
    }
    (async () => {
      console.log("[Tawk] ▶ looking up role for", currentUser.uid);
      try {
        const vSnap = await getDoc(doc(db, "vendors", currentUser.uid));
        if (vSnap.exists()) {
          setRole("vendor");
        } else {
          const uSnap = await getDoc(doc(db, "users", currentUser.uid));
          setRole(uSnap.exists() ? uSnap.data().role || "user" : "user");
        }
        console.log("👤 [Tawk] role →", role);
      } catch (e) {
        console.error("⛔ [Tawk] role lookup failed:", e);
      }
    })();
  }, [currentUser]);

  /** 3️⃣ Inject widget once we have either (no-user) or (user+hash) */
  useEffect(() => {
    const ready = !injected.current && (currentUser ? !!hash : true);
    console.log(
      "[Tawk] ▶ inject check — injected?",
      injected.current,
      "ready?",
      ready
    );
    if (!ready) return;
    injected.current = true;
    console.log("📦 [Tawk] injecting widget script…");

    // Set up the global API stubs
    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();

    // Fire when the actual Tawk embed has loaded
    window.Tawk_API.onLoad = () => {
      console.log("✅ [Tawk] SDK onLoad");
      setLoaded(true);

      if (currentUser && hash && !loggedInOnce.current) {
        loggedInOnce.current = true;
        const loginPayload = {
          id: currentUser.uid, // <- must be `id`, not `userId`
          hash, // base64 HMAC
          name: currentUser.displayName || currentUser.email,
          email: currentUser.email || "",
        };
        console.log("📝 [Tawk] login()", loginPayload);
        window.Tawk_API.login(loginPayload, (err) => {
          err
            ? console.error("⛔ [Tawk] login error:", err)
            : console.log("👍 [Tawk] login OK");
        });
      } else if (!currentUser) {
        console.log("👤 [Tawk] Guest login");
        window.Tawk_API.login({ name: "Guest" }, () => {});
      }
    };

    // Actually append the script tag
    const s = document.createElement("script");
    s.async = true;
    s.src = EMBED_SRC;
    s.charset = "UTF-8";
    s.crossOrigin = "anonymous";
    s.onload = () => console.log("📥 [Tawk] script tag loaded");
    s.onerror = () => console.error("⛔ [Tawk] script failed to load");
    document.head.appendChild(s);

    return () => {
      document.head.removeChild(s);
      console.log("📦 [Tawk] widget script removed");
    };
  }, [currentUser, hash]);

  /** 4️⃣ Once logged in, push any extra attributes */
  useEffect(() => {
    if (!loaded || !currentUser) return;
    (async () => {
      console.log("[Tawk] ▶ setting extra attributes");
      let display = currentUser.displayName || currentUser.email;
      if (role === "vendor") {
        try {
          const vSnap = await getDoc(doc(db, "vendors", currentUser.uid));
          if (vSnap.exists() && vSnap.data().shopName) {
            display = vSnap.data().shopName;
          }
        } catch {
          /* ignore */
        }
      }

      const attrs = {
        name: display,
        phone: currentUser.phoneNumber || "",
        jobTitle: role,
      };
      console.log("📤 [Tawk] setAttributes()", attrs);
      window.Tawk_API.setAttributes(attrs, (err) =>
        err
          ? console.error("⛔ [Tawk] setAttributes error:", err)
          : console.log("👍 [Tawk] attrs OK")
      );
    })();
  }, [loaded, role, currentUser]);

  /** 5️⃣ Utility for any part of your app to open the chat */
  const openChat = () => {
    if (!loaded) {
      console.warn("⌛ [Tawk] not ready — retrying…");
      return setTimeout(openChat, 300);
    }
    if (!window.Tawk_API.maximize) {
      console.error("⛔ [Tawk] maximize() missing!");
      return;
    }
    console.log("💬 [Tawk] maximize chat");
    window.Tawk_API.maximize();
  };

  return (
    <TawkContext.Provider value={{ openChat, loaded }}>
      {children}
    </TawkContext.Provider>
  );
};

export const useTawk = () => useContext(TawkContext);
