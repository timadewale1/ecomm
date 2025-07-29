import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { GoChevronLeft } from "react-icons/go";
import { IoTrashOutline } from "react-icons/io5";

const VendorProductModal = ({ isOpen, onClose, children, onDel }) => {
  const modalRef = useRef(null);

  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setTimeout(() => setVisible(true), 10);
  }, []);

  useEffect(() => {
    if (isOpen) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, y: 810 },
        { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }
      );
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-40 flex items-end justify-center modal1 transition-all duration-300 ${visible ? 'backdrop-blur-sm' : ''}`}>
      <div
        ref={modalRef}
        className="bg-white rounded-t-lg px-2 py-4 flex flex-col items-center w-full md:w-3/4 lg:w-1/2 max-h-screen overflow-y-auto scrollbar-hide"
      >
        <div className="flex items-center justify-between w-full mb-2 mt-6">
          <GoChevronLeft
            className="text-3xl cursor-pointer"
            onClick={onClose}
          />

          <h2 className="text-xl font-opensans text-center font-semibold text-black">
            Product Details
          </h2>

          <button onClick={onDel}>
            <IoTrashOutline className="h-8 w-8 p-1 text-customOrange" />
          </button>
        </div>

        <div className="w-full p-2">{children}</div>
      </div>
    </div>
    
  );
};

export default VendorProductModal;
