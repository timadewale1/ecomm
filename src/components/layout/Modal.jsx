import React, { useEffect, useRef } from 'react';
import { BsChevronCompactDown } from "react-icons/bs";
import { gsap } from 'gsap';

const Modal = ({ isOpen, onClose, children }) => {
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 1, ease: 'power2.out' }
      );
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center w-full bg-gray-300 bg-opacity-70 modal">
      <div ref={modalRef} className="bg-white rounded-lg mx-1 my-auto p-4 flex flex-col items-center w-full md:w-3/4 lg:w-1/2 max-h-screen overflow-y-auto">
        <button onClick={onClose} className="w-fit h-fit">
          <BsChevronCompactDown className='h-16 w-16 p-1 text-gray-400 hover:text-gray-600 transition' />
        </button>
        <div className="w-full p-2">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
