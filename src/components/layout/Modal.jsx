// Modal.js
import React from 'react';

const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="inset-0 flex overflow-y-auto items-center justify-center modal bg-black bg-opacity-50">
      <div className="bg-white rounded-lg mx-1 mt-96 p-4 relative">
        <button onClick={onClose}>
          &times;
        </button>
        {children}
      </div>
    </div>
  );
};

export default Modal;
