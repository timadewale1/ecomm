import React from 'react'
import Lottie from "lottie-react";
import loaddots from "../../Animations/loadingproducts.json";
const LoadProducts = () => {
  return (
    <div> <div className="flex justify-center items-center ">
    <Lottie
      className="w-12 h-12"
      animationData={loaddots}
      loop={true}
      autoplay={true}
    />
  </div></div>
  )
}

export default LoadProducts


