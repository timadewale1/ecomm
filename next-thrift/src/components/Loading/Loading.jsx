import React, { useState, useEffect } from "react";
import Lottie from "lottie-react";

const Loading = () => {
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    // Fetch JSON dynamically from public folder
    fetch("/animations/loadinganimation.json")
      .then((response) => response.json())
      .then((data) => setAnimationData(data))
      .catch((error) => console.error("Error loading animation:", error));
  }, []);

  if (!animationData) return null; // Prevent render before animation loads

  return (
    <div className="flex justify-center items-center h-screen w-screen">
      <Lottie
        className="w-10 h-10"
        animationData={animationData}
        loop
        autoplay
      />
    </div>
  );
};

export default Loading;
