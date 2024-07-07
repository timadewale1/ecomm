import React from 'react'

import Lottie from 'lottie-react';
import FallingClothes from '../../Animations/fallingclothes.json';
const LoginAnimation = () => {
    return (
        <div className="flex justify-center items-center ">
          <Lottie  className='w-auto mx-auto transform -translate-y-5 h-64' animationData={FallingClothes} loop={true} autoplay={true} />
        </div>
      );
}

export default LoginAnimation