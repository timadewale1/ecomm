import React from "react";
import Lottie from "lottie-react";
import Productnotfund from "../../Animations/gift.json";
const Gift = () => {
  return (
    <div>
      <div className="flex w-full h-full justify-center items-center">
        <Lottie
          className="w-10 h-10"
          animationData={Productnotfund}
          loop={true}
          autoplay={true}
        />
      </div>
    </div>
  );
};

export default Gift;
