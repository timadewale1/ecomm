// Donations.jsx
import React from "react";
import { FaAngleLeft } from "react-icons/fa";

const Donations = ({ setShowDonations }) => {
  return (
    <div className="flex p-2 flex-col items-center">
      <FaAngleLeft
        className="text-2xl text-black cursor-pointer self-start"
        onClick={() => setShowDonations(false)}
      />
      <h2 className="text-xl text-black font-ubuntu">Donations</h2>
      <div className="w-full mt-4">
        <div className="flex flex-col items-center w-full">
          <hr className="w-full border-gray-600" />
          <p className="text-lg font-medium text-black w-full px-4 py-3">
            Donations will be available soon.
          </p>
          <hr className="w-full border-gray-600" />
        </div>
      </div>
    </div>
  );
};

export default Donations;
