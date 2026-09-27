import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LuLightbulb } from "react-icons/lu";

const TIPS = [
  "Keep your stock accurate so customers never pay for an item that is no longer available.",
  "Clear, well-lit product photos help buyers decide faster and reduce questions before purchase.",
  "Reply to product questions and offer messages quickly to keep interested buyers engaged.",
  "When you accept a delivery order, prepare every listed item for the courier collection window.",
  "For pickup orders, add clear availability and directions so customers can collect without delays.",
  "Stockpile orders stay together until the buyer requests delivery or the pile reaches its closing stage.",
  "Share your store or product links to help more buyers discover your latest listings.",
];

export default function TipChat() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setIndex((current) => (current + 1) % TIPS.length);
    }, 6500);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="mt-4 mb-7 overflow-hidden rounded-2xl border border-[#ffe0d3] bg-gradient-to-br from-[#fff8f4] to-[#fff1ea] p-3.5 shadow-[0_8px_24px_rgba(249,83,30,0.07)]">
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <img
            src="https://api.dicebear.com/9.x/avataaars/svg?seed=Christian"
            alt="My Thrift store guide"
            className="h-11 w-11 rounded-full border-2 border-white bg-white object-cover shadow-sm"
          />
          <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-customOrange text-white ring-2 ring-white">
            <LuLightbulb className="h-3 w-3" aria-hidden="true" />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <p className="text-[12px] font-bold text-[#74260d]">Store tip</p>
            <p className="text-[10px] font-medium text-[#a66a56]">
              {index + 1}/{TIPS.length}
            </p>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={index}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.22 }}
              className="min-h-[42px] text-[12px] leading-[18px] text-[#4f3b35]"
            >
              {TIPS[index]}
            </motion.p>
          </AnimatePresence>
          <div className="mt-2 flex gap-1" aria-hidden="true">
            {TIPS.map((_, tipIndex) => (
              <span
                key={tipIndex}
                className={`h-1 rounded-full transition-all duration-200 ${
                  tipIndex === index
                    ? "w-4 bg-customOrange"
                    : "w-1 bg-[#f2bba5]"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
