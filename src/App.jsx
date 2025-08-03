// src/App.jsx
import React, { useEffect } from "react";
import { useAuth } from "./custom-hooks/useAuth";
import Layout from "./components/layout/Layout";
import {
  initializeOrderListener,
  removeOrderListener,
} from "./custom-hooks/orderListener";
import "./App.css";
import { AccessProvider } from "./components/Context/AccesContext";

import { useFCM } from "./custom-hooks/useFCM";
function App() {
  const { currentUser, currentUserData } = useAuth();
  useFCM(currentUser, currentUserData);
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

  // App.jsx
  useEffect(() => {
    const ua = navigator.userAgent || "";
    const isInApp = /(FBAN|FBAV|FB_IAB|Instagram|Twitter)(?!.*Safari)/i.test(
      ua
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
