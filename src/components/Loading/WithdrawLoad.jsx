import React, { useEffect } from "react";
import Lottie from "lottie-react";
import withdraw from "../../Animations/withdrawal.json";
import { acquireScrollLock } from "../../services/scrollLock";

const WithdrawLoad = ({ message = "" }) => {
  useEffect(() => {
    return acquireScrollLock("WithdrawLoad", { blockTouch: true });
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 z-[4000] flex flex-col justify-center items-center select-none"
      role="status"
      aria-live="polite"
      aria-label={message || "Processing"}
      onTouchMove={(event) => event.preventDefault()}
    >
      <Lottie
        className="w-72 h-72"
        animationData={withdraw}
        loop
        autoplay
      />
      {message ? (
        <p className="-mt-10 px-8 text-center text-base font-medium text-white">
          {message}
        </p>
      ) : null}
    </div>
  );
};

export default WithdrawLoad;
