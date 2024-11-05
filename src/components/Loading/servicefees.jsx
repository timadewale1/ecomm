import React from "react";
import Lottie from "lottie-react";
import servicefees from "../../Animations/servicefees.json";

const Serviceanimate = () => {
  return (
    <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
      <Lottie
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: "100%",
          height: "auto",
          minHeight: "100%",
        }}
        animationData={servicefees}
        loop={true}
        autoplay={true}
      />
    </div>
  );
};

export default Serviceanimate;
