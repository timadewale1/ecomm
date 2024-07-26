import React from "react";
import Lottie from "lottie-react";
import Donimate from '../../Animations/donations.json';

const DonationsAnimate= () => {
  return (
    <div className="flex w-full h-full justify-center items-center">
      <Lottie
        className="w-full h-full"
        animationData={Donimate}
        loop={true}
        autoplay={true}
      />
    </div>
  );
};

export default DonationsAnimate;
