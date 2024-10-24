import React from 'react';

const ProgressBar = ({ step }) => {
  const totalSteps = 4;

  return (
    <div className="flex flex-col items-start space-y-4">
      <div className="flex space-x-2">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <div
            key={index}
            className={`w-20 h-1 rounded-full ${
              index < step ? 'bg-customOrange' : 'bg-gray-300'
            }`}
          ></div>
        ))}
      </div>
    </div>
  );
};


export default ProgressBar;
