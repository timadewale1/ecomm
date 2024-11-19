import React, { useEffect } from "react";
import useAuth from "./custom-hooks/useAuth";
import Layout from "./components/layout/Layout";
import { initializeOrderListener, removeOrderListener } from "./custom-hooks/orderListener";
import "./App.css";

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

  setVh(); // Set the initial viewport height

  return <Layout />;
}

export default App;
