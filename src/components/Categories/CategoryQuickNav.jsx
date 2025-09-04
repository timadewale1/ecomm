import React from "react";
import { useNavigate } from "react-router-dom";

const CategoryQuickNav = () => {
  const navigate = useNavigate();
  const go = (slug) => navigate(`/category/${slug}`);

  const boxBase =
    "relative flex-none rounded-lg p-1 sm:p-2 w-full aspect-square flex items-center justify-center overflow-hidden border";

  const bgBox = (imgPath, extra) => ({
    className: `${boxBase} ${extra || ""}`,
    style: {
      backgroundImage: `url(${imgPath})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    },
  });

  const Pill = ({ children }) => (
    <div className="absolute inset-x-0 bottom-0">
      {/* subtle fade for readability */}
      <div className="h-12 bg-gradient-to-t from-black/50 to-transparent" />
      <div className="absolute left-1/2 -translate-x-1/2 bottom-2">
        <span className="px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold font-opensans text-white/95   ">
          {children}
        </span>
      </div>
    </div>
  );

  return (
    <div className="relative flex flex-wrap justify-center gap-2.5 px-2">
      {/* Mens */}
      <div
        className="relative flex flex-col items-center cursor-pointer w-[calc(25%-8px)]"
        onClick={() => go("mens")}
      >
        <div
          {...bgBox("/mencat.png", "from-customOrange/60 to-lighOrange border-lighOrange")}
        >
          <Pill>Men</Pill>
        </div>
                       
      </div>

      {/* Womens */}
      <div
        className="relative flex flex-col items-center cursor-pointer w-[calc(25%-8px)]"
        onClick={() => go("womens")}
      >
        <div
          {...bgBox("/womancat.png", "from-green-600/50 to-lightGreen border-lightGreen")}
        >
          <Pill>Women</Pill>
        </div>
       
      </div>

      {/* Kids */}
      <div
        className="relative flex flex-col items-center cursor-pointer w-[calc(25%-8px)]"
        onClick={() => go("kids")}
      >
        <div
          {...bgBox("/kidcat.png", "from-purple-600/50 to-lightPurple border-lightPurple")}
        >
          <Pill>Kids</Pill>
        </div>
       
      </div>

      {/* All */}
      <div
        className="relative flex flex-col items-center cursor-pointer w-[calc(25%-8px)]"
        onClick={() => go("all")}
      >
        <div
          {...bgBox("/allcart.png", "from-blue-600/50 to-blue-600/10 border-blue-300/40")}
        >
          <Pill>All</Pill>
        </div>
       
      </div>
    </div>
  );
};

export default CategoryQuickNav;
