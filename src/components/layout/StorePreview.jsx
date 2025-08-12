import React, { useContext, useEffect, useRef, useState } from "react";
import { VendorContext } from "../Context/Vendorcontext";
import { LiaSeedlingSolid } from "react-icons/lia";
import { FaChevronDown, FaStar } from "react-icons/fa6";
import confetti from "canvas-confetti";

export default function StorePagePreview() {
  const { vendorData: vendor } = useContext(VendorContext);
  const canvasRef = useRef(null);
  const [celebrated, setCelebrated] = useState(false);

  // Only run confetti when shown in the celebration flow
  useEffect(() => {
    if (celebrated) return;
    // If you want to be extra safe, keep this check:
    const ready =
      vendor?.walletSetup === true && vendor?.introcelebration === false;
    if (!ready) return;

    setCelebrated(true);

    if (canvasRef.current) {
      const fire = confetti.create(canvasRef.current, {
        resize: true,
        useWorker: true,
      });
      fire({ particleCount: 500, spread: 100, origin: { y: 0.7 } });
    }
  }, [vendor, celebrated]);

  const badgeConfig = {
    Newbie: {
      icon: <LiaSeedlingSolid />,
      gradient: "from-gray-300 to-gray-500",
    },
  };

  const averageRating =
    vendor?.ratingCount > 0 ? vendor.rating / vendor.ratingCount : 0;
  const stars = Array(5)
    .fill(0)
    .map((_, i) => (
      <FaStar key={i} className="text-yellow-400 mr-0.5" size={12} />
    ));

  function VendorBadge({ badgeName }) {
    const { icon, gradient } = badgeConfig[badgeName] || badgeConfig.Newbie;
    return (
      <div
        className={`vendor-badge bg-gradient-to-r ${gradient} text-white px-3 py-2 rounded-full flex items-center shadow-lg`}
      >
        {React.cloneElement(icon, { className: "mr-2", size: 14 })}
        <div className="text-xs font-bodoni font-semibold leading-tight text-center">
          {badgeName.split(" ").map((w, i) => (
            <span key={i} className="block">
              {w}
            </span>
          ))}
        </div>
      </div>
    );
  }
  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          pointerEvents: "none",
          zIndex: 999999,
        }}
      />
      {/* Store Cover Image */}
      <div className="relative w-full h-48 overflow-hidden">
        {vendor?.coverImageUrl ? (
          <img
            className="w-full h-full object-cover"
            src={vendor.coverImageUrl}
            alt={vendor?.shopName}
          />
        ) : (
          <div className="w-full h-full bg-gray-300 flex items-center justify-center">
            <span className="text-center font-opensans font-bold text-gray-600">
              {vendor?.shopName}
            </span>
          </div>
        )}
      </div>

      {/* Curved White Section */}
      <div
        className="relative bg-white -mt-8 rounded-t-3xl pt-4 pb-6"
        style={{ boxShadow: "0 -4px 20px -10px rgba(0,0,0,0.08)" }}
      >
        <div className="flex items-center justify-center">
          <h1 className="text- font-semibold text-center font-opensans">
            {vendor?.shopName}
          </h1>
        </div>

        <p className="text-gray-700 text-[10px] px-3 font-opensans text-center mb-2 leading-relaxed">
          {vendor?.description}
        </p>

        <div className="flex items-center justify-center">
          <div className="flex flex-col items-center cursor-pointer">
            <span className="text-xs font-ubuntu font-medium">
              {averageRating.toFixed(1)}
            </span>
            <div className="flex text-xs">{stars}</div>
          </div>

          <div className="h-6 border-l border-gray-300 mx-3" />
          <VendorBadge badgeName={vendor?.badge || "Newbie"} />
          <div className="h-6 border-l border-gray-300 mx-3" />

          <div className="flex flex-col items-center cursor-pointer">
            <span className="text-xs font-ubuntu font-medium">
              {vendor?.ratingCount || 0}
            </span>
            <span className="text-xs font-opensans font-medium text-gray-600 mt-1">
              Reviews
            </span>
          </div>
        </div>

        <hr className="mt-3 border-gray-100" />
        <div className="flex px-2 items-center justify-between mt-3">
          <div className="text-xs font-opensans">More about this Vendor</div>
          <FaChevronDown className="text-xs" />
        </div>
        <hr className="mt-3 border-gray-100" />
        <div className="flex items-center px-2 font-opensans justify-between mt-3 ">
          <div className="text-xs">Additional Details</div>
          <FaChevronDown className="text-xs" />
        </div>
        <hr className="my-3 border-gray-100" />

        <div className="space-y-2 px-2">
          <h1 className="text-sm font-opensans text-start">Products</h1>
          <div className="flex-shrink-0 h-8 w-8 px-1 text-xs font-semibold font-opensans text-white rounded-full backdrop-blur-md flex items-center justify-center border bg-customOrange">
            All
          </div>
          <div className="flex justify-center items-center w-full text-center">
            <p className="font-opensans text-gray-800 text-xs">
              📭 <span className="font-semibold">{vendor?.shopName}</span>{" "}
              hasn’t added any products to their online store yet. Follow this
              vendor and you will be notified when they upload products!
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
