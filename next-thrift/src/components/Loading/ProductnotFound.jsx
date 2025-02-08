import React, { useState, useEffect } from "react";
import Lottie from "lottie-react";

const ProductnotFound = () => {
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    // Fetch JSON dynamically from /public/animations/
    fetch("/animations/productnotfound.json")
      .then((res) => res.json())
      .then((data) => setAnimationData(data))
      .catch((error) =>
        console.error("Error loading productnotfound animation:", error)
      );
  }, []);

  if (!animationData) return null; // or return a loading spinner

  return (
    <div className="flex w-full h-full justify-center items-center">
      <Lottie
        className="w-full h-full"
        animationData={animationData}
        loop
        autoplay
      />
    </div>
  );
};

export default ProductnotFound;
