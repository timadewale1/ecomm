import React from "react";
import { PiSealWarning } from "react-icons/pi"; 
import "./NotApproved.css"; // Import the CSS for styling

const NotApproved = () => {
  return (
    <div className="relative not-approved-container mt-6">
      <div className="absolute -top-4 -left-2 mr-3 w-10 h-10 rounded-full bg-white flex justify-center items-center">
        <PiSealWarning className="w-7 h-7 text-customOrange" />
      </div>
      <div className=" px-4 font-medium">
        <p className="text-customRichBrown text-center text-sm leading-6">
          <span role="img" aria-label="hourglass">
            ⏳
          </span>{" "}
          Your account is being reviewed! Hang tight—verification typically
          takes 6-12 hours or less. Have a nice day!
        </p>
      </div>
    </div>
  );
};

export default NotApproved;
