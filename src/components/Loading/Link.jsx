import React from 'react'
import Lottie from "lottie-react";
import Linko from "../../Animations/link.json"
const Link = () => {
    return (
        <div className="fixed inset-0 z-50 flex justify-center items-center bg-white bg-opacity-20 backdrop-blur-sm">
          <Lottie
            className="w-80 h-96"
            animationData={Linko}
            loop={true}
            autoplay={true}
          />
        </div>
      );
      
}

export default Link
