import React from "react";
import Lottie from "lottie-react";
import ELinko from "../../Animations/expiredlink.json";
const ExpiredLink = () => {
  return (
    <div className="fixed inset-0 z-50 flex -translate-y-28 justify-center items-center bg-white bg-opacity-20 ">
      <Lottie
        className="w-60 h-96"
        animationData={ELinko}
        loop={true}
        autoplay={true}
      />
    </div>
  );
};

export default ExpiredLink;
