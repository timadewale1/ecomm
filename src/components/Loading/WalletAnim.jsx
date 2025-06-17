import React from "react";
import Lottie from "lottie-react";
import walletanimation from "../../Animations/wallet.json";
const WalletAnim = () => {
  return (
     <div className="flex w-24 h-28 -translate-y-60 justify-center items-center">
        <Lottie
          className="w-24 h-24 "
          animationData={walletanimation}
          loop={true}
          autoplay={true}
        />
      </div>
  )
}

export default WalletAnim


