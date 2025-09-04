import React from "react";
import { useNavigate } from "react-router-dom";
import BrandNewIcon from "./icons/Brandnew";
import ThriftIcon from "./icons/ThriftIcon";
import DefectsIcon from "./icons/DefectsIcon";
import WhatsNew from "./icons/WhatsNew";
import CategoryQuickNav from "../Categories/CategoryQuickNav";

const Condition = () => {
  const navigate = useNavigate();

  const handleNavigate = (slug) => {
    navigate(`/products/condition/${slug}`);
  };

  const Pill = ({ children }) => (
    <div className="absolute inset-x-0 bottom-0">
      {/* subtle fade for readability */}
      <div className="h-12 bg-gradient-to-t from-black/50 to-transparent" />
      <div className="absolute inset-x-0 bottom-2 flex justify-center">
        <span className="py-1 rounded-full text-[10px] sm:text-xs font-medium font-opensans text-white/95 text-center">
          {children}
        </span>
      </div>
    </div>
  );

  return (
    <div className="relative flex flex-wrap justify-center gap-2.5 sm:gap-4 py-3 px-2">
      {/* Brand New */}
      <div
        className="flex flex-col items-center cursor-pointer w-[calc(25%-8px)]"
        onClick={() => handleNavigate("brand-new")}
      >
        <div className="relative flex-none bg-gradient-to-tl from-customOrange/60 to-lighOrange border border-lighOrange text-white rounded-lg p-1 sm:p-2 w-full aspect-square flex items-center justify-center overflow-hidden">
          <div className="w-4/5 h-4/5 flex items-center justify-center">
            <BrandNewIcon />
          </div>
          <Pill>Brand New</Pill>
        </div>
      </div>

      {/* Thrifted */}
      <div
        className="relative flex flex-col items-center cursor-pointer w-[calc(25%-8px)]"
        onClick={() => handleNavigate("thrift")}
      >
        <div className="relative flex-none bg-gradient-to-tl from-green-600/50 to-lightGreen border border-lightGreen text-white rounded-lg p-1 sm:p-2 w-full aspect-square flex items-center justify-center overflow-hidden">
          <div className="w-4/5 h-4/5 flex items-center justify-center">
            <ThriftIcon />
          </div>
          <Pill>Thrifted</Pill>
        </div>
      </div>

      {/* Defect */}
      <div
        className="relative flex flex-col items-center cursor-pointer w-[calc(25%-8px)]"
        onClick={() => handleNavigate("defect")}
      >
        <div className="relative flex-none bg-gradient-to-tl from-purple-600/50 to-lightPurple border border-lightPurple text-white rounded-lg p-1 sm:p-2 w-full aspect-square flex items-center justify-center overflow-hidden">
          <div className="w-4/5 h-4/5 flex items-center justify-center">
            <DefectsIcon />
          </div>
          <Pill>Defect</Pill>
        </div>
      </div>

      {/* What's New (kept without navigation like your original) */}
      <div className="relative flex flex-col items-center cursor-pointer w-[calc(25%-8px)]">
        <div className="relative flex-none bg-gradient-to-tl from-blue-600/50 to-blue-600/10 text-white rounded-lg p-1 sm:p-2 w-full aspect-square flex items-center justify-center overflow-hidden delay-[1500ms]">
          <div className="w-4/5 h-4/5 flex items-center justify-center">
            <WhatsNew />
          </div>
          <Pill> What's New</Pill>
        </div>
      </div>
    </div>
  );
};

export default Condition;
