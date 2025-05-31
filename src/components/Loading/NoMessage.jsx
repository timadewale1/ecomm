import React from "react";
import Lottie from "lottie-react";
import message from "../../Animations/messages.json";

const NoMessage = () => {
  return (
    <div className="flex justify-center items-center w-screen">
      <Lottie
        className="w-24 h-24"
        animationData={message}
        loop={true}
        autoplay={true}
      />
    </div>
  );
};

export default NoMessage;
