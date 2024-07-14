import React from 'react';
import { BsChevronCompactDown } from "react-icons/bs";

const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="inset-0 flex flex-col overflow-y-auto items-center justify-center w-full pt-32 modal bg-black bg-opacity-50">
      <div className="bg-white rounded-lg mx-1 mt-80 px-4 flex flex-col items-center justify-center">
        <button onClick={onClose}>
        <BsChevronCompactDown className='h-20 w-20 p-0 text-gray-400'/>
        </button>
        <div className="h-full overflow-y-auto p-4 pt-12">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
