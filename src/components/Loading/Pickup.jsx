import React from "react";
import Lottie from "lottie-react";

import pickupanimation from "../../Animations/pickup.json";
const Pickup = () => {
  return (
    <div className="flex justify-center items-center">
      <Lottie
        className="w-40 h-32"
        animationData={pickupanimation}
        loop={true}
        autoplay={true}
      />
    </div>
  );
};

export default Pickup;
