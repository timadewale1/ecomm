import React from "react";
import useAuth from "./custom-hooks/useAuth";
import Layout from "./components/layout/Layout";
import "./App.css";

function App() {
  const setVh = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };
  
  window.addEventListener('resize', setVh);
  window.addEventListener('load', setVh);
  
  setVh(); 
  useAuth(); // Initialize the auth state

  return <Layout />;
}

export default App;
