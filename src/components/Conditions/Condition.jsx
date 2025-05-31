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
    <div className="flex flex-wrap justify-center gap-2 sm:gap-4 py-3 px-2">
      {/* Brand New Container */}
      <div
        className="flex flex-col items-center cursor-pointer w-[calc(25%-8px)]"
        onClick={() => handleNavigate("brand-new")}
      >
        <div className="flex-none bg-lightOrange text-white border border rounded-lg p-1 sm:p-2 w-full aspect-square flex items-center justify-center">
          <div className="w-4/5 h-4/5 flex items-center justify-center">
            <BrandNewIcon />
          </div>
        </div>
        <p className="text-center text-xs font-medium text-black font-opensans mt-1 sm:mt-2 truncate w-full">
          Brand New
        </p>
      </div>

      {/* Thrifted Container */}
      <div
        className="flex flex-col items-center cursor-pointer w-[calc(25%-8px)]"
        onClick={() => handleNavigate("thrift")}
      >
        <div className="flex-none bg-lightGreen text-white border border rounded-lg p-1 sm:p-2 w-full aspect-square flex items-center justify-center">
          <div className="w-4/5 h-4/5 flex items-center justify-center">
            <ThriftIcon />
          </div>
        </div>
        <p className="text-center text-xs font-medium text-black font-opensans mt-1 sm:mt-2 truncate w-full">
          Thrifted
        </p>
      </div>

      {/* Defect Container */}
      <div
        className="flex flex-col items-center cursor-pointer w-[calc(25%-8px)]"
        onClick={() => handleNavigate("defect")}
      >
        <div className="flex-none bg-lightPurple text-white border  rounded-lg p-1 sm:p-2 w-full aspect-square flex items-center justify-center">
          <div className="w-4/5 h-4/5 flex items-center justify-center">
            <DefectsIcon />
          </div>
        </div>
        <p className="text-center text-xs font-medium text-black font-opensans mt-1 sm:mt-2 truncate w-full">
          Defect
        </p>
      </div>

      {/* What's New Container */}
      <div className="flex flex-col items-center cursor-pointer w-[calc(25%-8px)]">
        <div className="flex-none bg-lightPurple text-white border  rounded-lg p-1 sm:p-2 w-full aspect-square flex items-center justify-center">
          <div className="w-4/5 h-4/5 flex items-center justify-center">
            <WhatsNew />
          </div>
        </div>
        <p className="text-center text-xs font-medium text-black font-opensans mt-1 sm:mt-2 truncate w-full">
          What's New
        </p>
      </div>
    </div>
  );
};

export default Condition;
