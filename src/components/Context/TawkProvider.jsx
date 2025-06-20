import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "../../custom-hooks/useAuth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase.config";

const TawkContext = createContext({ openChat: () => {}, loaded: false });

export const TawkProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [role, setRole] = useState(null);
  const injected = useRef(false);

  const WIDGET_SRC = "https://embed.tawk.to/68541decea9e87190a96647e/1iu499p2k";

  // Inject Tawk.to script once on mount
  useEffect(() => {
    if (injected.current) return;
    injected.current = true;

    console.log("[Tawk] Injecting script");
    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();

    const script = document.createElement("script");
    script.async = true;
    script.src = WIDGET_SRC;
    script.charset = "UTF-8";
    script.crossOrigin = "anonymous";
    script.onload = () => {
      console.log("[Tawk] Script loaded — waiting for SDK");
      window.Tawk_API.onLoad = () => {
        console.log("[Tawk] Widget ready — hiding by default");
        window.Tawk_API.hideWidget(); // Hide initially
        setLoaded(true);
        if (currentUser && role) {
          pushAttrs(currentUser, role, "onLoad");
        } else {
          setGuestAttributes();
        }
      };
    };
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, []);

  // Fetch role and update attributes when user changes
  useEffect(() => {
    if (!loaded) return;

    const updateUserAttributes = async () => {
      if (currentUser) {
        console.log("[Tawk] Fetching user role …");
        try {
          let userRole = "user";

          // Check if the user has a vendor document first
          const vendorSnap = await getDoc(doc(db, "vendors", currentUser.uid));
          if (vendorSnap.exists()) {
            userRole = "vendor";
          } else {
            // If not a vendor, check the users collection
            const userSnap = await getDoc(doc(db, "users", currentUser.uid));
            if (userSnap.exists()) {
              userRole = userSnap.data().role || "user";
            }
          }

          setRole(userRole);
          await pushAttrs(currentUser, userRole, "auth-change");
        } catch (e) {
          console.error("[Tawk] Error fetching role", e);
          setGuestAttributes(); // Fallback to guest on error
        }
      } else {
        setRole(null);
        setGuestAttributes();
      }
    };

    updateUserAttributes();
  }, [currentUser, loaded]);

  // Set attributes for anonymous (guest) users
  const setGuestAttributes = () => {
    if (!loaded || !window.Tawk_API?.setAttributes) return;
    console.log("[Tawk] Setting guest attributes");
    const guestPayload = {
      name: "Guest",
      email: "",
      phone: "",
      jobTitle: "",
      uid: "",
      role: "",
    };
    window.Tawk_API.setAttributes(guestPayload, (err) =>
      err
        ? console.error("[Tawk] Guest attrs error", err)
        : console.log("[Tawk] ✓ Guest attrs set")
    );
    if (window.Tawk_API.hideWidget) window.Tawk_API.hideWidget();
  };

  // Push user attributes to Tawk.to
  const pushAttrs = async (user, userRole, tag) => {
    if (!loaded || !window.Tawk_API?.setAttributes) return;

    let friendlyName = user.displayName || user.email;
    if (userRole === "vendor") {
      try {
        const vendorSnap = await getDoc(doc(db, "vendors", user.uid));
        if (vendorSnap.exists() && vendorSnap.data().shopName) {
          friendlyName = vendorSnap.data().shopName; // Use shopName for vendors
        }
      } catch (e) {
        console.error("[Tawk] Error fetching shopName", e);
      }
    }

    const payload = {
      name: friendlyName,
      email: user.email || "",
      phone: user.phoneNumber || "",
      jobTitle: userRole, // e.g., "vendor" or "user"
      uid: user.uid,
      role: userRole, // Explicitly set role
    };

    console.log(`[Tawk] Sending attrs (${tag})`, payload);
    await new Promise((resolve) => {
      window.Tawk_API.setAttributes(payload, (err) => {
        if (err) {
          console.error("[Tawk] setAttributes error", err);
        } else {
          console.log("[Tawk] ✓ Attrs sent");
        }
        resolve();
      });
    });
  };

  // Open chat and ensure latest attributes are set
  const openChat = async () => {
    if (!loaded || !window.Tawk_API?.toggle) {
      console.warn("[Tawk] Widget not ready, retrying …");
      setTimeout(openChat, 300);
      return;
    }

    if (currentUser && role) {
      await pushAttrs(currentUser, role, "pre-open");
    } else {
      setGuestAttributes();
    }

    console.log("[Tawk] Toggling chat");
    window.Tawk_API.toggle();
  };

  return (
    <TawkContext.Provider value={{ openChat, loaded }}>
      {children}
    </TawkContext.Provider>
  );
};

export const useTawk = () => useContext(TawkContext);