import React from "react";
import Lottie from "lottie-react";
import walletanimation from "../../Animations/wallet.json";
const WalletSetup = () => {
  return (
     <div className="flex w-full h-full  justify-center items-center">
        <Lottie
          className="  "
          animationData={walletanimation}
          loop={true}
          autoplay={true}
        />
      </div>
  )
}

export default WalletSetup

