import React from "react";
import Lottie from "lottie-react";
import caughtup from "../../Animations/caughtup.json";

const CaughtUp = () => {
  return (
    <div className="flex justify-center items-center">
      <Lottie
        className="w-10 h-10"
        animationData={caughtup}
        autoplay
        loop={false}
      />
    </div>
  );
};

export default CaughtUp;
