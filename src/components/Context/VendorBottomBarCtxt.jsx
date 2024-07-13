import React, { createContext, useState, useContext } from 'react';

const VendorNavigationContext = createContext();

export const VendorNavigationProvider = ({ children }) => {
  const [activeNav, setActiveNav] = useState(0);

  return (
    <VendorNavigationContext.Provider value={{ activeNav, setActiveNav }}>
      {children}
    </VendorNavigationContext.Provider>
  );
};

export const useVendorNavigation = () => {
  return useContext(VendorNavigationContext);
};
