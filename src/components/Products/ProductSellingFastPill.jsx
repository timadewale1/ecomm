// ProductSellingFastPill.jsx
import React, { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase.config";
import { HiOutlineFire } from "react-icons/hi"; // or any flame icon you like
import { AiOutlineFire } from "react-icons/ai";

export default function ProductSellingFastPill({
  productId,
  className = "",
  minCart = 2,
  minOffers = 2,
  minLikes = 2,
}) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!productId) return;

    const ref = doc(db, "product_stats", String(productId));

    const unsub = onSnapshot(
      ref,
      (snap) => setStats(snap.exists() ? snap.data() : null),
      (err) => {
        console.error("[ProductSellingFastPill] onSnapshot error:", err);
        setStats(null);
      },
    );

    return () => unsub();
  }, [productId]);

  const cartCount = Number(stats?.cartUserCount ?? stats?.cartCount ?? 0);
  const offerCount = Number(stats?.offerCount ?? stats?.activeOfferCount ?? 0);

  // likes can live on product_stats OR on product doc; use whichever you have
  const likeCount = Number(
    stats?.wishCount ?? stats?.likeCount ?? stats?.likesCount ?? 0,
  );

  const shouldShow = useMemo(() => {
    return (
      cartCount >= minCart && offerCount >= minOffers  && likeCount >= minLikes
    );
  }, [cartCount, offerCount, likeCount, minCart, minOffers, minLikes]);

  if (!shouldShow) return null;

  return (
    <div className={`w-full ${className}`}>
      <div
        className=" mt-2
          inline-flex items-center gap-2
          rounded-full px-3 py-1
          bg-[#ffe6df] text-[#ff4d1a] border-orange-200 border
          shadow-sm
        "
      >
        <AiOutlineFire className="text-lg" />
        <span className="text-[13px] font-opensans font-semibold whitespace-nowrap">
          Popular item, selling fast
        </span>
      </div>
    </div>
  );
}
