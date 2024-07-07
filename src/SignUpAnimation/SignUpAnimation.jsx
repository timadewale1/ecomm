import React from 'react'
import Lottie from 'lottie-react'
import SignUpAnimate from '../Animations/signupanimation.json'


const SignUpAnimation = () => {
    return (
        <div className="flex justify-center items-center ">
          <Lottie  className='w-auto mx-auto transform  h-64' animationData={SignUpAnimate} loop={true} autoplay={true} />
        </div>
      );
}

export default SignUpAnimation