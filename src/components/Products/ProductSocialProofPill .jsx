import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase.config";

const pluralize = (n, singular, plural = `${singular}s`) =>
  Number(n) === 1 ? singular : plural;

export default function ProductSocialProofPill({
  productId,
  className = "",
  intervalMs = 5000,
}) {
  const [stats, setStats] = useState(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!productId) return;

    const ref = doc(db, "product_stats", String(productId));

    const unsub = onSnapshot(
      ref,
      (snap) => setStats(snap.exists() ? snap.data() : null),
      (err) => {
        console.error("[ProductSocialProofPill] onSnapshot error:", err);
        setStats(null);
      }
    );

    return () => unsub();
  }, [productId]);

  // ✅ Match your DB setup (with safe fallbacks)
  const cartCount = Number(stats?.cartUserCount ?? stats?.cartCount ?? 0);
  const offerCount = Number(stats?.offerCount ?? stats?.activeOfferCount ?? 0);

  const items = useMemo(() => {
    const arr = [];

    if (cartCount >= 1) {
      arr.push({
        key: "cart",
        text: `In ${cartCount} ${pluralize(cartCount, "cart")}`,
      });
    }

    if (offerCount >= 1) {
      arr.push({
        key: "offers",
        text: `${offerCount} ${pluralize(offerCount, "offer")} sent`,
      });
    }

    return arr;
  }, [cartCount, offerCount]);

  const shouldShow = items.length > 0;

  useEffect(() => {
    if (!shouldShow) return;
    setIdx((i) => (i >= items.length ? 0 : i));
  }, [shouldShow, items.length]);

  useEffect(() => {
    if (!shouldShow || items.length < 2) return;

    const t = setInterval(() => {
      setIdx((i) => (i + 1) % items.length);
    }, intervalMs);

    return () => clearInterval(t);
  }, [shouldShow, items.length, intervalMs]);

  if (!shouldShow) return null;

  return (
    <div className={`absolute top-3 right-3 z-20 ${className}`}>
      <div className="px-3 py-1.5 rounded-full bg-customRed backdrop-blur-md shadow-sm overflow-hidden">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={items[idx]?.key || "pill"}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="flex items-center gap-2 text-white"
          >
            <span className="text-[13px] font-opensans whitespace-nowrap">
              {items[idx]?.text}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
