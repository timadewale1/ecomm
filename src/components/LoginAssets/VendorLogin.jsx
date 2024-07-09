import React from 'react'
import Vendor from '../../Animations/vendorlogin.json'
import Lottie from 'lottie-react';
const VendorLoginAnimation = () => {
  return (

    <div className="flex justify-center items-center ">
    <Lottie  className='w-auto mx-auto transform -translate-y-14 h-64' animationData={Vendor} loop={true} autoplay={true} />
  </div>
  )
}

export default VendorLoginAnimation