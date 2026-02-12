import React from "react";
import { motion } from "framer-motion";

const ScanningEffect = () => {
  return (
    <div className="absolute inset-0 z-10 overflow-hidden rounded-xl">
      {/* 1. The Moving Scanner Line */}
      <motion.div
        className="absolute w-full h-1 bg-gradient-to-r from-transparent via-customOrange to-transparent shadow-[0_0_15px_rgba(249,83,30,0.8)]"
        initial={{ top: "0%" }}
        animate={{ top: "100%" }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "linear",
        }}
      />

      {/* 2. A Subtle "Grid/Tech" Overlay (Optional, adds sci-fi feel) */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
            backgroundImage: "linear-gradient(rgba(249, 83, 30, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(249, 83, 30, 0.1) 1px, transparent 1px)",
            backgroundSize: "20px 20px"
        }}
      />

      {/* 3. Text label that follows the line or stays center */}
      <motion.div 
        className="absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 0.5 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
      >
        <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full border border-customOrange/50 tracking-widest uppercase">
          Enhancing...
        </span>
      </motion.div>
    </div>
  );
};
export default ScanningEffect;