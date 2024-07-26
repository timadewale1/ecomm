import React from "react";
import Lottie from "lottie-react";
import PaySuccess from '../../Animations/Succesful.json';

const Paymentsuccess= () => {
  return (
    <div className="flex w-full h-full justify-center items-center">
      <Lottie
        className="w-full h-full"
        animationData={PaySuccess}
        loop={true}
        autoplay={true}
      />
    </div>
  );
};

export default Paymentsuccess;
