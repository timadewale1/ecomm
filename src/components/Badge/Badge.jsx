import React from 'react';

const Badge = ({ count }) => {
  return (
    <div className="absolute w-5 h-5 -top-[5px] -right-[5px] rounded-full bg-gradient-to-br from-red-600/70 to-red-600 backdrop-blur-md flex items-center justify-center shadow-lg hover:bg-white/30 transition-opacity duration-300 border border-red-500/50 text-white text-sm"> 
      {count}
    </div>
  );
};

export default Badge;
