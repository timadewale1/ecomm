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
    <div className="relative flex flex-wrap justify-center gap-2 sm:gap-4 py-3 px-2">
      {/* Brand New Container */}
      <div
        className="flex flex-col items-center cursor-pointer w-[calc(25%-8px)]"
        onClick={() => handleNavigate("brand-new")}
      >
        <div className="flex-none bg-gradient-to-tl from-customOrange/50 to-lighOrange border border-lighOrange text-white rounded-lg p-1 sm:p-2 w-full aspect-square flex items-center justify-center">
          <div className="w-4/5 h-4/5 flex items-center justify-center">
            <BrandNewIcon />
          </div>
        </div>
        <p className="text-center text-xs font-medium text-black font-opensans mt-1 sm:mt-2 truncate w-full">
          Brand New
        </p>
        <div
          className="absolute inset-0 bg-gradient-to-l from-transparent via-white/70 to-transparent"
          style={{
            backgroundSize: "200% 200%",
            animation: "shimmer 4s infinite ease-in-out reverse",
          }}
        />
      </div>

      {/* Thrifted Container */}
      <div
        className="relative flex flex-col items-center cursor-pointer w-[calc(25%-8px)]"
        onClick={() => handleNavigate("thrift")}
      >
        <div className="flex-none bg-gradient-to-tl from-green-600/50 to-lightGreen border border-lightGreen text-white rounded-lg p-1 sm:p-2 w-full aspect-square flex items-center justify-center">
          <div className="w-4/5 h-4/5 flex items-center justify-center">
            <ThriftIcon />
          </div>
        </div>
        <p className="text-center text-xs font-medium text-black font-opensans mt-1 sm:mt-2 truncate w-full">
          Thrifted
        </p>
        <div
          className="absolute inset-0 bg-gradient-to-l from-transparent via-white/70 to-transparent"
          style={{
            backgroundSize: "200% 200%",
            animation: "shimmer 4s infinite ease-in-out reverse",
          }}
        />
      </div>

      {/* Defect Container */}
      <div
        className="relative flex flex-col items-center cursor-pointer w-[calc(25%-8px)]"
        onClick={() => handleNavigate("defect")}
      >
        <div className="flex-none bg-gradient-to-tl from-purple-600/50 to-lightPurple border border-lightPurple text-white rounded-lg p-1 sm:p-2 w-full aspect-square flex items-center justify-center">
          <div className="w-4/5 h-4/5 flex items-center justify-center">
            <DefectsIcon />
          </div>
        </div>
        <p className="text-center text-xs font-medium text-black font-opensans mt-1 sm:mt-2 truncate w-full">
          Defect
        </p>
        <div
          className="absolute inset-0 bg-gradient-to-l from-transparent via-white/50 to-transparent"
          style={{
            backgroundSize: "200% 200%",
            animation: "shimmer 4s infinite ease-in-out reverse",
          }}
        />
      </div>

      {/* What's New Container */}
      <div className="relative flex flex-col items-center cursor-pointer w-[calc(25%-8px)]">
        <div className="flex-none bg-gradient-to-tl from-blue-600/50 to-blue-600/10 text-white rounded-lg p-1 sm:p-2 w-full aspect-square flex items-center justify-center delay-[1500ms]">
          <div className="w-4/5 h-4/5 flex items-center justify-center">
            <WhatsNew />
          </div>
        </div>
        <p className="text-center text-xs font-medium text-black font-opensans mt-1 sm:mt-2 truncate w-full">
          What's New
        </p>
        <div
          className="absolute inset-0 bg-gradient-to-l from-transparent via-white/50 to-transparent"
          style={{
            backgroundSize: "200% 200%",
            animation: "shimmer 4s infinite ease-in-out reverse",}
          }
        />
      </div>
    </div>
  );
};

export default Condition;
