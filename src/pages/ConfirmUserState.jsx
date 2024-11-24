import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCheck } from 'react-icons/fa'; // Importing check icon
import logo from "../Images/logo.png";
import { GiClothes } from "react-icons/gi";
import { BsShop } from "react-icons/bs";

const ConfirmUserState = () => {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState(null); // State to track selected role

  const handleContinue = () => {
    if (selectedRole === 'vendor') {
      navigate('/vendorlogin'); 
    } else if (selectedRole === 'customer') {
      navigate('/login'); 
    }
  };

  return (
    <>
      <div className="flex px-3 py-2 mt-3 justify-between mb-3">
        <img src={logo} alt="Logo" />
      </div>

      <div className="p-3 bg-white w-full h-screen font-opensans pb-20">
        <div className="flex justify-center text-center mb-10">
          <h1 className="font-opensans text-2xl text-black font-semibold">
            Use <span className="text-customOrange">MyThrift</span> as a?
          </h1>
        </div>

        <div className="space-y-5">
          {/* Vendor Option */}
          <div
            className={`relative p-4 border-2 rounded-3xl ${
              selectedRole === 'vendor' ? 'border-customBrown' : 'border-gray-200'
            } cursor-pointer`}
            onClick={() => setSelectedRole('vendor')}
          >
            <div className="w-12 h-12 rounded-full bg-lighOrange flex-shrink-0 flex items-center justify-center">
            <BsShop  className='text-lg text-customBrown'/>
            </div>
            <div className="flex items-center">
              <div className=" mt-2">
                <h2 className="text-lg font-semibold text-black">As a Vendor</h2>
                <p className="text-gray-600">
                  Make more profit on <span className="text-customOrange">MyThrift</span> with secure transactions
                </p>
              </div>
            </div>
            {selectedRole === 'vendor' && (
              <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-customOrange flex items-center justify-center">
                <FaCheck className="text-white text-sm" />
              </div>
            )}
          </div>

          {/* Customer Option */}
          <div
            className={`relative p-4 border-2 rounded-3xl ${
              selectedRole === 'customer' ? 'border-customBrown' : 'border-gray-200'
            } cursor-pointer`}
            onClick={() => setSelectedRole('customer')}
          >
            <div className="w-12 h-12 rounded-full bg-lighOrange flex-shrink-0 flex items-center justify-center">
            <GiClothes className='text-lg text-customBrown' />
            </div>
            <div className="flex items-center">
              <div className="mt-2">
                <h2 className="text-lg font-semibold text-black">As a Customer</h2>
                <p className="text-gray-600">
                  Explore Local Markets from the Comfort of Your Home
                </p>
              </div>
            </div>
            {selectedRole === 'customer' && (
              <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-customOrange flex items-center justify-center">
                <FaCheck className="text-white text-sm" />
              </div>
            )}
          </div>
        </div>

        {/* Continue Button */}
        <div className="fixed bottom-0 left-0 right-0 flex justify-center p-3">
          <button
            onClick={handleContinue}
            className={`w-full h-14 text-white font-semibold rounded-full ${
              selectedRole ? 'bg-customOrange' : 'bg-gray-300 cursor-not-allowed'
            }`}
            disabled={!selectedRole}
          >
            Continue
          </button>
        </div>
      </div>
    </>
  );
};

export default ConfirmUserState;
