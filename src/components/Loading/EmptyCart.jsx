import React from "react";
import Lottie from "lottie-react";
import Emptycart from '../../Animations/emptycart.json';

const Loading = () => {
  return (
    <div className="flex justify-center items-center">
      <Lottie
        className="w-96 h-64"
        animationData={Emptycart}
        loop={true}
        autoplay={true}
      />
    </div>
  );
};

export default Loading;
