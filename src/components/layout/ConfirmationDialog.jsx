import React, { useEffect, useState } from "react";
import { MdOutlineCancel } from "react-icons/md";
import { IoTrashOutline } from "react-icons/io5";
import Lottie from "lottie-react";
import LoadState from "../../Animations/loadinganimation.json";

const ConfirmationDialog = ({
  isOpen,
  title,
  icon,
  message,
  onClose,
  onConfirm,
  loading,
}) => {

  const [visible, setVisible] = useState(false);
    useEffect(() => {
      setTimeout(() => setVisible(true), 10);
    }, []);

  if (!isOpen) return null;

  return (
    <div className={`fixed font-opensans inset-0 bg-black bg-opacity-40 flex items-center justify-center modal2 transition-all duration-100 ${visible ? 'backdrop-blur-sm' : ''}`}>
     { /*  from-gray-300 via-customSoftGray to-gray-200 */}
      <div className={`space-y-4 flex flex-col justify-center transition-all duration-[50ms] ease-in-out bg-white ${
          visible
            ? "shadow-lg shadow-black/35 border border-white/10 backdrop-blur-md scale-100"
            : "shadow-lg shadow-black/35 scale-75"
        }
      p-4 rounded-xl shadow-lg shadow-black/30 w-[80%]`}>
        <div className="flex flex-col items-center text-center space-y-2">
          <h2 className="text-lg text-black font-semibold">{title}</h2>
          <p className="text-[14px] text-black">{message}</p>
        </div>

        <div className="w-full px-3 py-1 flex flex-col items-center rounded-2xl bg-gray-100 space-y-2">
          {title && (<><div
            className={`w-full items-center ${
              title === ("Delete Product" || "Delete Products")
                ? "text-red-600"
                : "text-customOrange"
            } text-sm flex justify-between py-2 focus:outline-none cursor-pointer`}
            onClick={onConfirm}
          >
            {title}

            {loading ? (
              <Lottie
                className="w-4 h-4"
                animationData={LoadState}
                loop={true}
                autoplay={true}
              />
            ) : (
              // 
              <div>{icon}</div>
            )}
          </div>
          <hr className="w-full text-slate-800" /></>)}
          <div
            className="w-full items-center text-sm flex justify-between py-2 cursor-pointer"
            onClick={onClose}
          >
            Cancel
            <MdOutlineCancel className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;
