// src/components/RotatingCategoryPill.jsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function RotatingCategoryPill({ categories }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (categories.length <= 1) return;
    const id = setInterval(() => setIdx(i => (i + 1) % categories.length), 2000);
    return () => clearInterval(id);
  }, [categories]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={idx}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.25 }}
        className="px-3 py-0.5 text-[11px] rounded-full bg-white bg-opacity-20 backdrop-blur-md border border-white border-opacity-30 font-opensans font-medium text-black shadow-sm"
      >
        {categories[idx]}
      </motion.div>
    </AnimatePresence>
  );
}
