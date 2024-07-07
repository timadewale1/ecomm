import React from 'react';
import { FaUser, FaRegUser } from 'react-icons/fa';
import { GoHome, GoHomeFill } from 'react-icons/go';
import { PiCompassFill, PiCompass } from 'react-icons/pi';
import { HiOutlineBuildingStorefront, HiBuildingStorefront } from "react-icons/hi2";
import { PiShoppingCartFill, PiShoppingCart } from "react-icons/pi";

import '../../styles/bottombar.css';

const BottomBar = ({ isSearchFocused }) => {
  const [value, setValue] = React.useState(0);

  const handleClick = (index) => {
    setValue(index);
  };

  return (
    <div className={`bottom-bar ${isSearchFocused ? 'under-keypad' : ''}`}>
      <div className={`bottom-nav-icon ${value === 0 ? 'active' : ''}`} onClick={() => handleClick(0)}>
        {value === 0 ? <GoHomeFill className='w-9 h-7' /> : <GoHome className='w-9 text-white opacity-50 h-7' />}
      </div>
      <div className={`bottom-nav-icon ${value === 1 ? 'active' : ''}`} onClick={() => handleClick(1)}>
        {value === 1 ? <PiCompassFill className='w-9 h-7' /> : <PiCompass className='w-9 text-white opacity-50 h-7' />}
      </div>
      <div className={`bottom-nav-icon ${value === 2 ? 'active' : ''}`} onClick={() => handleClick(2)}>
        {value === 2 ? <PiShoppingCartFill className='w-8  h-6' /> : <PiShoppingCart className='w-8 text-white opacity-50 h-6' />}
      </div>
      <div className={`bottom-nav-icon ${value === 3 ? 'active' : ''}`} onClick={() => handleClick(3)}>
        {value === 3 ? <HiBuildingStorefront className='w-8 h-6' /> : <HiOutlineBuildingStorefront className='w-8 text-white opacity-50 h-6' />}
      </div>
      <div className={`bottom-nav-icon ${value === 4 ? 'active' : ''}`} onClick={() => handleClick(4)}>
        {value === 4 ? <FaUser className='w-8 h-6' /> : <FaRegUser className='w-8 text-white opacity-50 h-6' />}
      </div>
    </div>
  );
};

export default BottomBar;
