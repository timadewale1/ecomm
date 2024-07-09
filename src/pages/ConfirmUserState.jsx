import React from 'react';
import { useNavigate } from 'react-router-dom';

const ConfirmUserState = () => {
  const navigate = useNavigate();

  const handleUserLogin = () => {
    navigate('/login'); 
  };

  const handleVendorLogin = () => {
    navigate('/admin'); 
  };

  return (
    <div className='p-3 bg-white translate-y-40 w-full h-screen'>
      <div className='flex justify-center text-center'>
        <h1 className='font-ubuntu text-5xl text-black'>
          How would you like to proceed?
        </h1>
      </div>
      <div className='translate-y-32'>
        <button
          onClick={handleUserLogin}
          className="w-full h-14 bg-customOrange text-white font-semibold rounded-full mb-4"
        >
          as a User
        </button>
        <button
          onClick={handleVendorLogin}
          className='w-full h-14 bg-customOrange text-white font-semibold rounded-full'
        >
          as a Vendor
        </button>
      </div>
    </div>
  );
};

export default ConfirmUserState;
