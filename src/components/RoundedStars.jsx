import React from "react";

const RoundedStars = ({ filled }) => (
  <svg
    width="38"
    height="38"
    viewBox="0 0 24 24"
    fill={filled ? "#ffd700" : "#e0e0e0"} 
    xmlns="http://www.w3.org/2000/svg"
    style={{
        marginRight: '8px', 
        borderRadius: '4px',
      }}
  >
    <path
      d="M12 17.3L18.2 21L16.5 14L22 9.3L14.8 8.6L12 2L9.2 8.6L2 9.3L7.5 14L5.8 21L12 17.3Z"
      stroke="none" // Remove the border
      fillRule="evenodd"
    />
  </svg>
);

export default RoundedStars;
