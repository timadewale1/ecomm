import React from "react";
import Lottie from "lottie-react";

import stockpileanim from "../../Animations/stockpile.json";

const StockpileAnim = () => {
  return (
    <div className="flex justify-center items-center">
      <Lottie
        className="w-40 h-32"
        animationData={stockpileanim}
        loop={true}
        autoplay={true}
      />
    </div>
  );
};

export default StockpileAnim;
