// src/Context/AccessContext.js
import React, { createContext, useState } from 'react';

export const AccessContext = createContext();

export const AccessProvider = ({ children }) => {
  const [hideBottomBar, setHideBottomBar] = useState(false);

  return (
    <AccessContext.Provider value={{ hideBottomBar, setHideBottomBar }}>
      {children}
    </AccessContext.Provider>
  );
};
