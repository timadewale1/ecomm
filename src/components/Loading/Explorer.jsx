import React from "react";
import Lottie from "lottie-react";
import Explorers from "../../Animations/loadingexplore.json";
// import Typewriter from "typewriter-effect";
const Explorer = () => {
  return (
    <div className="flex justify-center items-center h-screen w-screen">
      <Lottie
        className="w-96 h-80"
        animationData={Explorers}
        loop={true}
        autoplay={true}
      />
    {/* <div className="flex transform text-customOrange -translate-y-15  justify-center">
        <Typewriter
          options={{
            strings: ["We are cooking! Breatheee"],
            autoStart: true,
            loop: true,
          }}
        />
      </div>
       */}
    </div>
  );
};

export default Explorer;
