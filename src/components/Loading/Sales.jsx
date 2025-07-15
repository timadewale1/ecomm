import React from 'react'
import salesanim from "../../Animations/sale.json";
import Lottie from "lottie-react";
const Sales = () => {
  return (
    <div className="flex justify-center items-center">
      <Lottie
        className="h-9"
        animationData={salesanim}
        loop={true}
        autoplay={true}
      />
    </div>
  )
}

export default Sales