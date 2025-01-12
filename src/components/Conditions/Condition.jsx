import React from "react";
import { useNavigate } from "react-router-dom";
import BrandNewIcon from "./icons/Brandnew";
import ThriftIcon from "./icons/ThriftIcon";
import DefectsIcon from "./icons/DefectsIcon";
import WhatsNew from "./icons/WhatsNew";

const Condition = () => {
  const navigate = useNavigate();

  const handleNavigate = (slug) => {
    navigate(`/products/condition/${slug}`);
  };

  return (
    <div className="flex justify-center space-x-4 py-3 px-2">
      {/* Brand New Container */}
      <div
        className="flex flex-col items-center cursor-pointer"
        onClick={() => handleNavigate("brand-new")}
      >
        <div className="flex-none bg-lightOrange text-white border border-1 rounded-lg p-2 w-[78px] h-[70px] flex items-center justify-center">
          <BrandNewIcon />
        </div>
        <p className="text-center text-xs font-medium text-black font-opensans mt-2">
          Brand New
        </p>
      </div>

      {/* Thrifted Container */}
      <div
        className="flex flex-col items-center cursor-pointer"
        onClick={() => handleNavigate("thrift")}
      >
        <div className="flex-none bg-lightGreen text-white border border-1 rounded-lg p-2 w-[78px] h-[70px] flex items-center justify-center">
          <ThriftIcon />
        </div>
        <p className="text-center text-xs font-medium text-black font-opensans mt-2">
          Thrifted
        </p>
      </div>

      {/* Defect Container */}
      <div
        className="flex flex-col items-center cursor-pointer"
        onClick={() => handleNavigate("defect")}
      >
        <div className="flex-none bg-lightPurple text-white border border-1 rounded-lg p-2 w-[78px] h-[70px] flex items-center justify-center">
          <DefectsIcon />
        </div>
        <p className="text-center text-xs font-medium text-black font-opensans mt-2">
          Defect
        </p>
      </div>

      {/* What's New Container */}
      <div className="flex flex-col items-center cursor-pointer">
        <div className="flex-none bg-lightPurple text-white border border-1 rounded-lg p-2 w-[78px] h-[70px] flex items-center justify-center">
          <WhatsNew />
        </div>
        <p className="text-center text-xs font-medium text-black font-opensans mt-2">
          What's New
        </p>
      </div>
    </div>
  );
};

export default Condition;
