// src/components/Vendors/VendorSearchCard.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, onSnapshot, setDoc, deleteDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { FaStar } from "react-icons/fa";

import { db, auth } from "../../firebase.config";
import { handleUserActionLimit } from "../../services/userWriteHandler";
import QuickAuthModal from "../../components/PwaModals/AuthModal";
import SafeImg from "../../services/safeImg";

const cleanStr = (x) => (typeof x === "string" ? x.trim() : "");
const shortCount = (n) => {
  const x = Number(n || 0);
  if (x >= 1_000_000) return `${Math.round(x / 100_000) / 10}m`;
  if (x >= 1_000) return `${Math.round(x / 100) / 10}k`;
  return `${x}`;
};

function getAvgRating(vendor) {
  const sum = Number(vendor?.rating || 0);
  const count = Number(vendor?.ratingCount || 0);
  if (!count) return null;
  return (sum / count).toFixed(1);
}


// Normalize the badge text to a consistent key
function normalizeBadgeKey(badgeText = "") {
  const b = String(badgeText || "").trim().toLowerCase();

  if (b.includes("og")) return "og";
  if (b.includes("power")) return "power";
  if (b.includes("reliable")) return "reliable";
  if (b.includes("steady") || b.includes("speedy")) return "speedy";
  if (b.includes("consistent")) return "consistent";
  if (b.includes("rising")) return "rising";
  
  return "newbie";
}

// Badge styling configuration
// Using exact colors and icon paths based on your previous request
const BADGE_STYLES = {
  og: {
    icon: "/OG.svg",
    bgClass: "bg-[#FDF6E3]", // warm beige background
    textClass: "text-[#78350F]", // dark brown text
  },
  reliable: {
    icon: "/Reliable.svg",
    bgClass: "bg-[#EFF6FF]", // light blue
    textClass: "text-[#1E40AF]", // dark blue text
  },
  consistent: {
    icon: "/Consistent.svg",
    bgClass: "bg-[#FFF7ED]", // light orange/beige
    textClass: "text-[#9A3412]", // dark orange text
  },
  rising: {
    icon: "/Rising.svg",
    bgClass: "bg-[#FEF2F2]", // light red
    textClass: "text-[#991B1B]", // dark red text
  },
  power: {
    icon: "/Power.svg",
    bgClass: "bg-[#F3E8FF]", // light purple
    textClass: "text-[#6B21A8]", // dark purple text
  },
  speedy: {
    icon: "/Speedy.svg",
    bgClass: "bg-[#F0FDF4]", // light green
    textClass: "text-[#166534]", // dark green text
  },
  newbie: {
    icon: "/Newbie.svg",
    bgClass: "bg-[#DDF6D6]", // light gray
    textClass: "text-[#374151]", // dark gray text
  },
};
 function VendorBadgePill({ badgeText }) {
  const key = normalizeBadgeKey(badgeText);
  // Default to newbie if key not found
  const style = BADGE_STYLES[key] || BADGE_STYLES.newbie;

  return (
    <div
      className={`
        relative inline-flex mt-1 items-center 
        h-7 pl-8 pr-3 rounded-full 
        ${style.bgClass}
      `}
    >
      {/* Icon positioned absolutely to 'pop' off the left edge */}
      <img
        src={style.icon}
        alt=""
        className="absolute -left-2 top-1/2 -translate-y-1/2 w-9 h-9 drop-shadow-sm"
        draggable={false}
      />
      
      {/* Text Label */}
      <span className={`text-sm font-opensans font-medium ${style.textClass}`}>
        {badgeText || "Newbie"}
      </span>
    </div>
  );
}

export default function VendorSearchCard({
  vendor,
  className = "",
  openDisclaimer,
}) {
  const navigate = useNavigate();

  const vendorId =
    vendor?.vendorId || vendor?.id || vendor?.uid || vendor?._id || null;

  const uid = auth.currentUser?.uid || null;

  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  // realtime follow status (same pattern you already use)
  useEffect(() => {
    if (!uid || !vendorId) {
      setIsFollowing(false);
      return;
    }
    const followRef = doc(db, "follows", `${uid}_${vendorId}`);
    return onSnapshot(
      followRef,
      (snap) => setIsFollowing(snap.exists()),
      () => setIsFollowing(false),
    );
  }, [uid, vendorId]);

  const avgRating = useMemo(() => getAvgRating(vendor), [vendor]);
  const ratingCount = Number(vendor?.ratingCount || 0);

  const productCount =
    Number(
      vendor?.productCount ??
        vendor?.productsCount ??
        vendor?.products ??
        vendor?.totalProducts ??
        0,
    ) || 0;

  const badgeText = cleanStr(vendor?.badge) || "Newbie";

  const img =
    vendor?.coverImageUrl ||
    vendor?.profileImageUrl ||
    vendor?.photoURL ||
    "";

  const shopName = cleanStr(vendor?.shopName) || "Vendor";

  const goToStore = useCallback(() => {
    if (!vendorId) return;
    navigate(`/store/${vendorId}`);
  }, [navigate, vendorId]);

  const handleFollowClick = useCallback(async () => {
    if (!vendorId) return;

    if (!auth.currentUser) {
      setAuthOpen(true);
      return;
    }

    const prev = isFollowing;
    setIsFollowing(!prev);

    try {
      setIsFollowLoading(true);

      await handleUserActionLimit(
        auth.currentUser.uid,
        "follow",
        {},
        {
          collectionName: "usage_metadata",
          writeLimit: 50,
          minuteLimit: 8,
          hourLimit: 40,
        },
      );

      const followRef = doc(db, "follows", `${auth.currentUser.uid}_${vendorId}`);
      const vendorRef = doc(db, "vendors", vendorId);

      if (!prev) {
        await setDoc(followRef, {
          userId: auth.currentUser.uid,
          vendorId,
          createdAt: serverTimestamp(),
        });
        await updateDoc(vendorRef, { followersCount: increment(1) });
      } else {
        await deleteDoc(followRef);
        // keep your existing behavior: no decrement
      }
    } catch (e) {
      console.error("[VendorSearchCard] follow failed:", e?.message || e);
      setIsFollowing(prev);
    } finally {
      setIsFollowLoading(false);
    }
  }, [vendorId, isFollowing]);

  return (
    <div className={["bg-gray-50", "w-full"  ,  "p-4", className].join(" ")}>
      {/* Top row */}
      <div className="flex gap-3">
        <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 shrink-0">
          {img ? (
            <SafeImg src={img} alt={`${shopName} avatar`} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-700">
              {shopName.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 gap-0">
          <p className="text-xl font-opensans font-semibold text-gray-900 truncate">
            {shopName}
          </p>

          <div className="mt-1 flex items-center gap-1 text-base font-opensans text-gray-500">
            {avgRating ? (
              <>
                <FaStar className="text-yellow-500" />
                <span className="text-gray-800 font-medium">{avgRating}</span>
                <span className="text-gray-500">({ratingCount})</span>
              </>
            ) : (
              <span className="text-gray-400 text-sm">No ratings yet</span>
            )}

            <span className="mx-1 text-gray-300">•</span>

            <span className="text-gray-500">
              {shortCount(productCount)} items listed
            </span>
          </div>

        <div className="mt-1">
  <VendorBadgePill badgeText={badgeText} />
</div>

        </div>
      </div>

      {/* Buttons */}
      <div className="mt-5 flex gap-4">
        <button
          type="button"
          onClick={handleFollowClick}
          disabled={isFollowLoading}
          className={[
            "flex-1 h-12 rounded-2xl",
            "font-opensans font-semibold text-base",
            isFollowing ? "bg-orange-100 text-gray-900" : "bg-customOrange text-white",
            isFollowLoading ? "opacity-60" : "",
          ].join(" ")}
        >
          {isFollowing ? "Following" : "Follow"}
        </button>

        <button
          type="button"
          onClick={goToStore}
          className={[
            "flex-1 h-12 rounded-2xl",
            "border-2 border-gray-200 bg-transparent",
            "font-opensans font-semibold text-base text-gray-900",
          ].join(" ")}
        >
          View Store
        </button>
      </div>

      <QuickAuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        headerText="Continue to follow"
        onComplete={() => {
          setAuthOpen(false);
          setTimeout(() => handleFollowClick(), 0);
        }}
        openDisclaimer={openDisclaimer}
      />
    </div>
  );
}
