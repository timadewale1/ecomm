import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaGlobeAmericas, FaSyncAlt } from "react-icons/fa";
import { MdDeliveryDining } from "react-icons/md";
import { BsStack } from "react-icons/bs";

const pillCls =
  "inline-flex items-center rounded-full bg-gradient-to-r from-gray-50 to-gray-100 " +
  "text-gray-700 leading-none space-x-2 px-1 py-1 text-[10px] font-medium " +
  "shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-200/60 " +
  "hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:border-gray-300/60 " +
  "transition-all duration-200 backdrop-blur-sm";

// OPTION 2: Clean Minimal Style
// const pillCls =
//   "inline-flex items-center rounded-full bg-white text-gray-700 " +
//   "leading-none space-x-2 px-3 py-1.5 text-xs font-medium " +
//   "shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 " +
//   "transition-all duration-200";

// OPTION 3: Dark Mode Style
// const pillCls =
//   "inline-flex items-center rounded-full bg-gray-800 text-white " +
//   "leading-none space-x-2 px-3 py-1.5 text-xs font-medium " +
//   "shadow-lg border border-gray-700 hover:bg-gray-700 " +
//   "transition-all duration-200";

// OPTION 4: Colorful Gradient Style
// const pillCls =
//   "inline-flex items-center rounded-full bg-gradient-to-r from-blue-500 to-purple-600 " +
//   "text-white leading-none space-x-2 px-3 py-1.5 text-xs font-medium " +
//   "shadow-lg hover:shadow-xl hover:from-blue-600 hover:to-purple-700 " +
//   "transition-all duration-200";

// const pillCls =
//   "inline-flex items-center rounded-full bg-white/20 backdrop-blur-md " +
//   "text-gray-800 leading-none space-x-2 px-3 py-1.5 text-xs font-medium " +
//   "shadow-[0_8px_32px_rgba(31,38,135,0.37)] border border-white/18 " +
//   "hover:bg-white/30 transition-all duration-200";

// OPTION 6: Original Simple Style
// const pillCls =
//   "inline-flex items-center rounded-full bg-gray-100 text-gray-700 " +
//   "leading-none space-x-1 px-2 py-0.5 text-[11px] font-medium " +
//   "shadow-sm border border-gray-200";

export default function VendorMetaTicker({ vendor }) {
  const items = useMemo(() => {
    const list = [];

    // only take the first sourcing market if it's an array
    if (vendor?.sourcingMarket) {
      let market = vendor.sourcingMarket;
      if (Array.isArray(market)) {
        market = market[0];
      }
      if (market) {
        list.push({
          label: market,
          icon: <FaGlobeAmericas className="text-blue-500 w-3 h-3" />,
        });
      }
    }

    if (vendor?.restockFrequency) {
      list.push({
        label: vendor.restockFrequency,
        icon: (
          <FaSyncAlt className="animate-spin-slow text-green-500 w-3 h-3" />
        ),
      });
    }

    if (vendor?.stockpile?.enabled) {
      list.push({
        label: `${vendor.stockpile.durationInWeeks}-week piling`,
        icon: <BsStack className="text-purple-500 w-3 h-3" />,
      });
    }

    if (vendor?.deliveryMode) {
      list.push({
        label: vendor.deliveryMode,
        icon: <MdDeliveryDining className="text-orange-500 w-3 h-3" />,
      });
    }

    return list;
  }, [vendor]);

  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (items.length <= 1) return;
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % items.length);
    }, 3500); // Slightly longer interval for better UX
    return () => clearInterval(id);
  }, [items]);

  if (!items.length) return null;

  const variants = {
    enter: {
      opacity: 0,
      y: 8,
      scale: 0.95,
      filter: "blur(2px)",
    },
    center: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
    },
    exit: {
      opacity: 0,
      y: -8,
      scale: 0.95,
      filter: "blur(2px)",
    },
  };

  return (
    <span className="ml-2 -translate-y-1 relative">
      {/* Subtle background glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-full blur-sm"></div>

      <AnimatePresence mode="wait">
        <motion.span
          key={idx}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            duration: 0.3,
            ease: [0.4, 0.0, 0.2, 1], // Custom easing for smooth feel
          }}
          className={pillCls}
          whileHover={{
            scale: 1.05,
            transition: { duration: 0.2 },
          }}
        >
          <span className="flex items-center justify-center w-4 h-4 bg-white rounded-full shadow-sm">
            {items[idx].icon}
          </span>
          <span className="font-medium text-gray-800 tracking-wide">
            {items[idx].label}
          </span>

          {/* Subtle indicator dots */}
          {items.length > 1 && (
            <div className="flex space-x-1 ml-1">
              {items.map((_, i) => (
                <div
                  key={i}
                  className={`w-1 h-1 rounded-full transition-all duration-300 ${
                    i === idx ? "bg-gray-600" : "bg-gray-300"
                  }`}
                />
              ))}
            </div>
          )}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
