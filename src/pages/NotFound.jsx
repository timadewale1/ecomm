import React from 'react';
import Productnotofund from '../components/Loading/Productnotofund';
import { useNavigate } from 'react-router-dom'; 
const NotFound = () => {
  const navigate = useNavigate(); 

  const handleBackToHome = () => {
    navigate('/confirm-user-state'); 
  };

  return (
    <div>
      <Productnotofund />
      <div className='px-24 flex flex-col justify-center items-center'>
        <p className='font-opensans font-medium mb-6 text-gray-800 text-center'>
          This page does not exist or has been removed. 🤦‍♀️
        </p>
        <button
          className='h-12 px-4 font-opensans bg-customOrange text-white rounded-lg'
          onClick={handleBackToHome}
        >
          Back to Home
        </button>
      </div>
    </div>
  );
};

export default NotFound;
