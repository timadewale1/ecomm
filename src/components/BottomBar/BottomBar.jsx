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

  const navItems = [
    { icon: GoHome, activeIcon: GoHomeFill, label: 'Home' },
    { icon: PiCompass, activeIcon: PiCompassFill, label: 'Explore' },
    { icon: PiShoppingCart, activeIcon: PiShoppingCartFill, label: 'Cart' },
    { icon: HiOutlineBuildingStorefront, activeIcon: HiBuildingStorefront, label: 'Market' },
    { icon: FaRegUser, activeIcon: FaUser, label: 'Profile' },
  ];

  return (
    <div className={`bottom-bar ${isSearchFocused ? 'under-keypad' : ''}`}>
      {navItems.map((item, index) => (
        <div
          key={index}
          className={`bottom-nav-icon ${value === index ? 'active' : ''}`}
          onClick={() => handleClick(index)}
        >
          {value === index ? (
            <>
              <item.activeIcon className='w-8 h-6' />
              <span className="nav-label">{item.label}</span>
            </>
          ) : (
            <item.icon className='w-8 text-white opacity-50 h-6' />
          )}
        </div>
      ))}
    </div>
  );
};

export default BottomBar;
