import React from "react";
import Lottie from "lottie-react";
import Envelopes from "../../Animations/envelope.json";
const Envelope = () => {
  return (
    <div className="flex justify-center items-center w-20 h-24">
      <Lottie
        className="w-full h-full"
        animationData={Envelopes}
        loop={true}
        autoplay={true}
      />
    </div>
  );
};

export default Envelope;
