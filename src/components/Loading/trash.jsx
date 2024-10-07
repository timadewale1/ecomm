import React from "react";
import Lottie from "lottie-react";
import trashs from "../../Animations/trash.json";
const trash = () => {
  return (
    <div className="flex justify-center items-center w-20 h-24">
      <Lottie
        className="w-full h-full"
        animationData={trashs}
        loop={true}
        autoplay={true}
      />
    </div>
  );
};

export default trash;
