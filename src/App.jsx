import React, { useEffect } from "react";
import { useAuth } from "./custom-hooks/useAuth";
import Layout from "./components/layout/Layout";
import {
  initializeOrderListener,
  removeOrderListener,
} from "./custom-hooks/orderListener";
import "./App.css";
import { AccessProvider } from "./components/Context/AccesContext";

function App() {
  const { currentUser, currentUserData } = useAuth();

  // Initialize Order Listener
  useEffect(() => {
    if (currentUser?.uid) {
      console.log("Initializing order listener for:", currentUser.uid);
      initializeOrderListener(currentUser.uid);
    }

    return () => {
      console.log("Removing order listener...");
      removeOrderListener();
    };
  }, [currentUser?.uid]);

  // Set Viewport Height
  const setVh = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty("--vh", `${vh}px`);
    console.log("Viewport height updated:", `${vh}px`);
  };

  window.addEventListener("resize", setVh);
  window.addEventListener("load", setVh);

  // Safe service-worker registration (won’t crash IG/Snap/Telegram on iOS)
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const onLoad = () => {
      try {
        navigator.serviceWorker
          .register("/service-worker.js")
          .then((reg) => console.log("Service Worker registered:", reg))
          .catch((err) => {
            // WKWebView in Instagram/Snapchat/Telegram iOS throws “SecurityError”
            console.warn("SW registration skipped:", err.message);
          });
      } catch (err) {
        // Very old Safari can throw synchronously
        console.warn("SW register threw:", err.message);
      }
    };

    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []); 

  setVh(); // Set the initial viewport height

  // // HelpCrunch User Update
  useEffect(() => {
    const fetchSignatureAndUpdateUser = async (userDetails) => {
      try {
        // Fetch signature from backend
        const response = await fetch(
          "https://us-central1-ecommerce-ba520.cloudfunctions.net/generateHelpCrunchSignature",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userDetails),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to generate signature");
        }

        const { signature } = await response.json();

        console.log("HelpCrunch signature generated:", signature);

        // Update the user in HelpCrunch
        if (typeof window.HelpCrunch !== "undefined") {
          console.log("Updating HelpCrunch user...");
          window.HelpCrunch(
            "updateUser",
            {
              ...userDetails,
            },
            signature
          );

          console.log("HelpCrunch user updated successfully.");
        } else {
          console.error("HelpCrunch script not loaded.");
        }
      } catch (error) {
        console.error("Error in HelpCrunch integration:", error);
      }
    };

    if (currentUserData) {
      console.log("Current User Data in App.js:", currentUserData);

      const userDetails = {
        user_id: currentUserData?.uid || "guest", // Use uid for user_id
        name:
          currentUserData?.displayName ||
          currentUserData?.username ||
          currentUserData?.shopName ||
          "Anonymous User", // Map displayName to name
        email: currentUserData?.email || "guest@example.com",
        phone: currentUserData?.phoneNumber || "001",
        company: currentUserData?.role || "Guest Role",
      };

      console.log(
        "Preparing to fetch signature and update user in HelpCrunch:",
        userDetails
      );

      fetchSignatureAndUpdateUser(userDetails);
    }
  }, [currentUserData]);

  return (
    <>
      {/* Hidden sitemap for crawlers */}
      <nav className="sr-only" aria-label="Site map">
        <ul>
          <li>
            <a href="/newhome">Shop Now</a>
          </li>
          <li>
            <a href="/explore">Explore</a>
          </li>

          <li>
            <a href="/producttype/Tops">Tops</a>
          </li>
          <li>
            <a href="/browse-markets">Markets</a>
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
        <Layout />
      </AccessProvider>
    </>
  );
}

export default App;
