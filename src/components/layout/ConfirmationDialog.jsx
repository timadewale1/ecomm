import React from "react";
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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50 confirmation">
      <div className="space-y-4 flex flex-col justify-center bg-white  px-4 py-2 rounded-xl shadow-lg w-80 h-48">
        <div className="flex flex-col items-center text-center space-y-2">
          <h2 className="text-sm text-customRichBrown">{title}</h2>
          <p className="text-[10px] text-customRichBrown">{message}</p>
        </div>

        <div className=" w-full h-24 px-3 py-1 flex flex-col items-center rounded-2xl bg-customSoftGray space-y-2">
          <div
            className={`w-full items-center ${
              title === "Delete Product" || "Delete Products"
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
          <hr className="w-full text-slate-800" />
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
