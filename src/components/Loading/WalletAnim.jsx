import React from "react";
import Lottie from "lottie-react";
import walletanimation from "../../Animations/wallet.json";
const WalletAnim = () => {
  return (
     <div className="flex w-full h-full  justify-center items-center">
        <Lottie
          className="w-40 h-40 mb-20 "
          animationData={walletanimation}
          loop={true}
          autoplay={true}
        />
      </div>
  )
}

export default WalletAnim


