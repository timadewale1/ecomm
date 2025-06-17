import React from "react";
import Lottie from "lottie-react";
import withdraw from "../../Animations/withdrawal.json";

const WithdrawLoad = () => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-[4000] flex justify-center items-center">
      <Lottie
        className="w-72 h-72"
        animationData={withdraw}
        loop
        autoplay
      />
    </div>
  );
};

export default WithdrawLoad;
