import React, { useEffect } from 'react';
import Paymentsuccess from '../components/Loading/PaymentSuccess';
import chachingSound from '../Audio/cha-ching-sound-effect-download-128-ytshorts.savetube.me.mp3';

const PaymentApprove = () => {
  useEffect(() => {
    // Play sound
    const audio = new Audio(chachingSound);
    audio.play().catch((error) => console.log("Error playing audio:", error));

    // Trigger haptic feedback if supported
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]); // Vibration pattern
    }
  }, []);

  return (
    <div className='flex justify-center translate-y-48 w-full h-full'>
      <Paymentsuccess />
    </div>
  );
};

export default PaymentApprove;
