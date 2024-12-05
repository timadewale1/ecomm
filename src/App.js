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
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser?.uid) {
      initializeOrderListener(currentUser.uid);
    }

    return () => {
      removeOrderListener();
    };
  }, [currentUser?.uid]);

  const setVh = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty("--vh", `${vh}px`);
  };

  window.addEventListener("resize", setVh);
  window.addEventListener("load", setVh);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/service-worker.js")
        .then((registration) => {
          console.log("Service Worker registered:", registration);
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });
    });
  }

  setVh(); // Set the initial viewport height

  return (
    <AccessProvider>
      <Layout />
    </AccessProvider>
  );
}

export default App;
