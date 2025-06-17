import React from "react";
import Lottie from "lottie-react";
import Productnotfund from "../../Animations/productnotfound.json";
const FailedWithdraw = () => {
  return (
    <div>
      <div className="flex w-full h-full justify-center items-center">
        <Lottie
          className="w-40 h-40"
          animationData={Productnotfund}
          loop={true}
          autoplay={true}
        />
      </div>
    </div>
  );
};

export default FailedWithdraw;
