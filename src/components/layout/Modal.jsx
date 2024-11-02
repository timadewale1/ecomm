import React, { useEffect, useRef } from "react";
import { LiaTimesSolid } from "react-icons/lia";
import { gsap } from "gsap";
import { GoChevronLeft } from "react-icons/go";

const Modal = ({ isOpen, onClose, children }) => {
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, y: 810 },
        { opacity: 1, y: 0, duration: 1, ease: "power2.out" }
      );
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex rounded-t-lg flex-col items-center justify-center w-full bg-gray-300 bg-opacity-70 modal">
      <div
        ref={modalRef}
        className="bg-white rounded-t-lg mx-1 px-2 py-4 flex flex-col items-center w-full md:w-3/4 lg:w-1/2 max-h-screen overflow-y-auto"
      >
        <div className="flex items-center justify-between w-full mb-2">
          <GoChevronLeft
            className="text-3xl cursor-pointer"
            onClick={onClose}
          />

          <h2 className="text-xl font-opensans text-center font-semibold text-black">
            Add Product
          </h2>

          <div className="w-3 h-3"></div>

        </div>

        <div className="w-full p-2">{children}</div>
      </div>
    </div>
    
  );
};

export default Modal;
