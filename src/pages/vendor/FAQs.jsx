// FAQs.jsx
import React from "react";
import { FaAngleLeft, FaAngleRight } from "react-icons/fa";

const FAQs = ({ setShowFAQs, handleFaqClick }) => {
  return (
    <div className="flex p-2 flex-col items-center">
      <FaAngleLeft
        className="text-2xl text-black cursor-pointer self-start"
        onClick={() => setShowFAQs(false)}
      />
      <h2 className="text-xl text-black font-ubuntu">FAQs</h2>
      <div className="w-full mt-4">
        <div className="flex flex-col items-center w-full">
          <hr className="w-full border-gray-600" />
          <div
            className="flex items-center justify-between w-full px-4 py-3 cursor-pointer"
            onClick={() => handleFaqClick("What is Booking Fee?")}
          >
            <p className="text-lg font-semibold capitalize w-full text-orange-500">
              What is Booking Fee?
            </p>
            <FaAngleRight className="text-black" />
          </div>
          <hr className="w-full border-gray-600" />
        </div>
        <div className="flex flex-col items-center w-full mt-2">
          <hr className="w-full border-gray-600" />
          <div
            className="flex items-center justify-between w-full px-4 py-3 cursor-pointer"
            onClick={() => handleFaqClick("How do I become a vendor?")}
          >
            <p className="text-lg font-semibold capitalize w-full text-orange-500">
              How do I become a vendor?
            </p>
            <FaAngleRight className="text-black" />
          </div>
          <hr className="w-full border-gray-600" />
        </div>
      </div>
    </div>
  );
};

export default FAQs;
