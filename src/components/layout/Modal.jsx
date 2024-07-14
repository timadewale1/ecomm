import React from 'react';
import { FaTimes } from 'react-icons/fa';

const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-end bg-black bg-opacity-50 modal" onClick={onClose}>
      <div
        className="w-full h-4/5 bg-white rounded-t-lg shadow-md relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-2xl text-gray-600 hover:text-gray-800 focus:outline-none bg-white bg-opacity-75 p-2 rounded-full"
        >
          <FaTimes />
        </button>
        <div className="h-full overflow-y-auto p-4 pt-12">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
