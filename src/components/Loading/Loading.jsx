import React from "react";
import Lottie from "lottie-react";
import LoadState from "../../Animations/loadinganimation.json";

const Loading = () => {
  return (
    <div className="flex justify-center items-center h-screen w-screen">
      <Lottie
        className="w-96 h-64"
        animationData={LoadState}
        loop={true}
        autoplay={true}
      />
    </div>
  );
};

export default Loading;
