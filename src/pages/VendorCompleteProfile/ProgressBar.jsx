import React from 'react';

const ProgressBar = ({ step }) => {
  const totalSteps = 4;

  return (
    <div className="flex flex-col items-start space-y-4  w-full">
      <div className="flex justify-between space-x-2 w-full">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <div
            key={index}
            className={`h-1 flex-grow  rounded-full ${
              index < step ? 'bg-customOrange' : 'bg-gray-100'
            }`}
          ></div>
        ))}
      </div>
    </div>
  );
};

export default ProgressBar;
