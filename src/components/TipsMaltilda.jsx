import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TIPS = [
  "🔗 Share your store and product links on social media let more customers discover your store!",
  "📍 Pick-up is now available!  Set your pick-up address to offer customers a cheaper alternative",
  "📸 Great images sell faster—ensure your product photos are clear, high-quality, and highlight clean, attractive items.",
  "🔔 Please install the app on your mobile device to enjoy better features and experience",
  "📦 Stockpiles ship only when customers request delivery or when the pile expires",
  "❤️ Encourage customers to follow your store. They’ll get notified whenever you drop new items, boosting engagement!",
  "🛋️ Got everyday items like cameras, furniture, or glassware? You can now list and sell these on your store!",
  "✨ The faster you ship, the happier your customers! Aim to ship within 24 hours of receiving an order.",
  "🚀 Keep your inventory updated regularly to prevent overselling and maintain customer trust.",
  "📲 Respond quickly to customer messages fast replies gives a higher chance of order completion and encourage repeat business!",
];

export default function TipChat() {
  const [index, setIndex] = useState(0);

  // Cycle tips every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % TIPS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mb-8 p-2  translate-y-3 bg-purple-50 rounded-xl flex items-start gap-4">
      <img
        src="https://api.dicebear.com/9.x/avataaars/svg?seed=Christian"
        alt="Bot avatar"
        className="w-10 h-10 rounded-full"
      />
      <div className="flex-1">
        <AnimatePresence exitBeforeEnter>
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5 }}
            className="bg-white p-3 rounded-lg shadow-md"
          >
            <p className="text-xs text-gray-800">{TIPS[index]}</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
