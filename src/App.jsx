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
