import React from "react";
import Lottie from "lottie-react";
import Productnotfund from '../../Animations/productnotfound.json';
const Productnotofund = () => {
  return (
    <div>
      <div className="flex w-full h-full justify-center items-center">
        <Lottie
          className="w-full h-full"
          animationData={Productnotfund}
          loop={true}
          autoplay={true}
        />
      </div>
    </div>
  );
};

export default Productnotofund;
