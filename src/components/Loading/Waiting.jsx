import React from "react";
import Lottie from "lottie-react";
import Waiter from "../../Animations/waiting.json";
import Typewriter from "typewriter-effect";
const Waiting = () => {
  return (
    <div className="flex justify-center -translate-y-36 items-center h-screen w-screen">
      <Lottie
        className="w-96 h-80"
        animationData={Waiter}
        loop={true}
        autoplay={true}
      />
    <div className="flex transform text-customOrange -translate-y-15  justify-center">
        <Typewriter
          options={{
            strings: ["We are waiting for your first order!"],
            autoStart: true,
            loop: true,
          }}
        />
      </div>
      
    </div>
  );
};

export default Waiting;
