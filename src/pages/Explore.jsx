import React, { useEffect, useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { CiSearch } from "react-icons/ci";
import { ChevronRight, Percent, Sparkles, Zap, Award } from "lucide-react";
import SEO from "../components/Helmet/SEO";
import { setPromoImages, setPromoLoading } from "../redux/actions/promoaction";
import {
  fetchVendorSuggestions,
  resetVendorSuggestions,
} from "../redux/reducers/exploreSlice";
import Loading from "../components/Loading/Loading";
import { RiHeart3Fill } from "react-icons/ri";
import { motion, AnimatePresence } from "framer-motion";
import { AiOutlineRise } from "react-icons/ai";
/* ======================= helpers ======================= */

const formatNaira = (n) => `₦${Number(n || 0).toLocaleString()}`;

const abbr = (n = 0) => {
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${n}`;
};

// deterministic “random” tag per product
function pickOneTag(tags, seed) {
  if (!Array.isArray(tags) || tags.length === 0) return null;
  let h = 2166136261;
  const s = String(seed || "");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  const idx = Math.abs(h) % tags.length;
  return tags[idx];
}

const getDiscountPct = (p) =>
  typeof p?.discountPercent === "number"
    ? p.discountPercent
    : typeof p?.discount?.percentageCut === "number"
    ? Math.round(p.discount.percentageCut)
    : null;

function truncate(str, len) {
  if (!str) return "";
  return str.length > len ? str.slice(0, len - 1) + "…" : str;
}
const DAY_MS = 86_400_000;

function safeToDate(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === "function") return ts.toDate();
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isNewVendor(meta) {
  const d = safeToDate(meta?.createdSince);
  if (!d) return false;
  return Date.now() - d.getTime() < 14 * DAY_MS;
}

function isActiveFlash(meta) {
  if (!meta?.flashSale) return false;
  const ends = safeToDate(meta.flashSaleEndsAt);
  // If no end time, treat as active; otherwise require ends in the future
  return !ends || Date.now() < ends.getTime();
}

function getVendorBadge(meta) {
  // 1) Flash sale takes precedence
  if (isActiveFlash(meta)) {
    return {
      key: "flash",
      text: "Flash",
      ring: "ring-orange-500",
      pillBg: "bg-orange-500",
      Icon: Zap,
    };
  }

  // 2) New vendor (joined within 14 days)
  if (isNewVendor(meta)) {
    return {
      key: "new",
      text: "New",
      ring: "ring-emerald-500",
      pillBg: "bg-emerald-500",
      Icon: Sparkles,
    };
  }

  // 3) Fallback to vendor badge label
  const label = meta?.badge || "Vendor";
  return {
    key: "rank",
    text: label,
    ring: "ring-indigo-500",
    pillBg: "bg-indigo-500",
    Icon: Award,
  };
}
// Build rotating highlights from vendor data/meta
const buildHighlights = (vendor) => {
  const hl = [];

  // Stockpile weeks
  const weeks =
    (vendor?.stockpile?.enabled && vendor?.stockpile?.durationInWeeks) ||
    vendor?.stockpile?.durationInWeeks; // tolerate partial meta
  if (weeks)
    hl.push({
      key: "stock",
      text: `Stockpile ${weeks} week${weeks > 1 ? "s" : ""}`,
    });

  // Delivery / Pickup
  const mode = (vendor?.deliveryMode || "").toLowerCase();
  if (mode.includes("delivery") && mode.includes("pickup")) {
    hl.push({ key: "mode", text: "Delivery & Pickup available" });
  } else if (mode.includes("delivery")) {
    hl.push({ key: "mode", text: "Delivery available" });
  } else if (
    mode.includes("pickup") ||
    vendor?.offerPickupPrompt ||
    vendor?.pickupAddress
  ) {
    hl.push({ key: "mode", text: "Pickup available" });
  }

  // Sourcing market
  const markets = Array.isArray(vendor?.sourcingMarket)
    ? vendor.sourcingMarket
    : [];
  if (markets.length) {
    const first = markets[0];
    const extra = markets.length > 1 ? ` +${markets.length - 1}` : "";
    hl.push({ key: "market", text: `Sourcing: ${first}${extra}` });
  }

  // Follower surge (> 15)
  const fc =
    typeof vendor?.followersCount === "number" ? vendor.followersCount : 0;
  if (fc > 15)
    hl.push({ key: "followers", text: `Trending: ${abbr(fc)} followers` });

  return hl;
};

// Color classes per highlight type (we’ll keep your original text-orange-600 and override)
const HI_COLOR = {
  stock: "text-emerald-600",
  mode: "text-blue-600",
  market: "text-violet-600",
  followers: "text-pink-600",
};

/* ======================= page ======================= */

export default function Explore() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { promoImages } = useSelector((s) => s.promo);
  const {
    items: vendors,
    lastDoc,
    status,
    meta,
    productsMeta,
  } = useSelector((s) => s.vendorSuggestions);

  // promos (kept from your page)
  useEffect(() => {
    if (promoImages.length === 0) {
      const images = [
        "https://res.cloudinary.com/dtaqusjav/image/upload/v1751554023/Book_your_travels_with_posh_retreats_2_mkj6jg.png",
        "https://res.cloudinary.com/dtaqusjav/video/upload/v1751554144/Untitled_1000_x_490_px_1_nhy93v.mp4",
        "https://res.cloudinary.com/dtaqusjav/image/upload/v1751557578/Untitled_1000_x_490_px_5_i8ssvn.png",
      ];
      dispatch(setPromoLoading(true));
      setTimeout(() => {
        dispatch(setPromoImages(images));
        dispatch(setPromoLoading(false));
      }, 800);
    }
  }, [dispatch, promoImages]);

  // first load vendor_suggestions (+ slice will auto-hydrate meta)
  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchVendorSuggestions({ pageSize: 12 }));
    }
  }, [status, dispatch]);

  // infinite scroll
  const onScroll = useCallback(() => {
    const nearBottom =
      window.innerHeight + window.scrollY >=
      document.documentElement.scrollHeight - 120;
    if (nearBottom && status !== "loading" && lastDoc) {
      dispatch(fetchVendorSuggestions({ pageSize: 12, lastDoc }));
    }
  }, [dispatch, status, lastDoc]);

  useEffect(() => {
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  if (status === "idle" || (status === "loading" && vendors.length === 0)) {
    return <Loading />;
  }

  return (
    <>
      <SEO
        title="Explore - My Thrift"
        description="Discover vendors and curated picks on My Thrift"
        url="https://www.shopmythrift.store/explore"
      />
      <div className="pb-28 bg-gray-50">
        {/* Top Bar */}
        <div className="sticky top-0 left-0 w-full bg-white z-10 px-2 pt-6 pb-1">
          <div className="flex items-center justify-between pb-2">
            <h1 className="text-lg text-black font-semibold font-opensans">
              Explore
            </h1>
            <CiSearch
              className="text-3xl cursor-pointer"
              onClick={() => navigate("/search")}
            />
          </div>
        </div>

        {/* Vendor cards */}
        <div className="px-2 space-y-4">
          {vendors.map((v) => (
            <VendorCard
              key={v.id}
              v={v}
              meta={meta?.[v.id]} // shopName/profile/cover from vendors/{id}
              onOpen={() => navigate(`/store/${v.id}`)}
            />
          ))}

          {status === "loading" && (
            <div className="py-6 text-center text-gray-500">Loading more…</div>
          )}
          {!lastDoc && status === "succeeded" && (
            <div className="py-6 text-center text-gray-400 text-sm">
              You’re all caught up
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ======================= cards ======================= */

function VendorCard({ v, meta, onOpen, productsMeta }) {
  const displayName = meta?.shopName || v.shopName || v.vendorName || "Vendor";
  const avatarUrl =
    meta?.profileImageUrl ||
    v.profileImageUrl ||
    meta?.coverImageUrl ||
    v.coverImageUrl ||
    null;

  const badge = getVendorBadge(meta || v);

  return (
    <div className="rounded-2xl mt-8 bg-white shadow-sm overflow-hidden">
      {/* header with circular image */}
      <div className="px-3 pt-3 pb-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2">
            {/* avatar + ring + badge */}
            <div className="relative flex-shrink-0 mb-3">
              <div
                className={`w-10 h-10 rounded-full overflow-hidden bg-gray-100 ring-2 ring-offset-0 ring-offset-white ${badge.ring}`}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 grid place-items-center text-white font-semibold text-sm">
                    {displayName.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              {/* badge pill BELOW the circle */}
              <div className="absolute left-1/2 top-full font-satoshi font-bold -translate-x-1/2 -translate-y-3 mt-1">
                <div
                  className={`flex items-center gap-1 rounded-full ${badge.pillBg} text-white px-1.5 py-[1px] text-[7px] shadow-md`}
                >
                  {badge.Icon ? <badge.Icon className="w-2 h-2" /> : null}
                  <span className="leading-none">{badge.text}</span>
                </div>
              </div>
            </div>

            {/* text column aligned with avatar */}
            <div className="leading-tight mt-1">
              <div className="flex items-center gap-1 translate-y-2">
                <span className="font-semibold font-opensans text-gray-900">
                  {displayName}
                </span>
                <ChevronRight className="w-4 h-4 text-black" />
              </div>
              {(() => {
                // Use both meta + v so we don't need extra Redux calls
                const source = { ...(meta || {}), ...(v || {}) };
                const highlights = buildHighlights(source);
                const [hiIndex, setHiIndex] = React.useState(0);

                React.useEffect(() => {
                  setHiIndex(0);
                  if (highlights.length <= 1) return;
                  const id = setInterval(() => {
                    setHiIndex((i) => (i + 1) % highlights.length);
                  }, 2200);
                  return () => clearInterval(id);
                }, [highlights.map((h) => h.text).join("|")]);

                const current = highlights[hiIndex];
                const colorCls = current ? HI_COLOR[current.key] || "" : "";

                return (
                  <div className="mt-0.5 h-4 ml-0.5 overflow-hidden">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={
                          current ? `${current.key}-${current.text}` : "default"
                        }
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.22 }}
                        className={`text-[8px] text-orange-600 font-opensans font-medium inline-flex items-center gap-1 ${colorCls}`}
                      >
                        {current?.key === "followers" ? (
                          <AiOutlineRise className="w-3 h-3" />
                        ) : null}
                        {current
                          ? current.text
                          : v.subtext || "500K+ sold recently"}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* product tiles */}
      <div className="px-2 pb-3 flex gap-2">
        {(v.products || []).slice(0, 4).map((p, idx, arr) => (
          <ProductTile
            key={p.id}
            p={p}
            index={idx}
            isFirst={idx === 0}
            isLast={idx === arr.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

function ProductTile({ p, index, isFirst, isLast }) {
  const productsMeta = useSelector((s) => s.vendorSuggestions.productsMeta);

  const pct = getDiscountPct(p);
  const tag = pickOneTag(p.tags, p.id);
  const wish = typeof p.wishCount === "number" ? p.wishCount : null;

  // Only round the OUTER edges of the row (container already has overflow-hidden)
  const radius = isFirst
    ? "rounded-l-xl"
    : isLast
    ? "rounded-r-xl"
    : "rounded-none";

  // Build label text
  let label = null;
  let Icon = null;
  let reason = "random";

  if (p.reason === "discounted" && pct) {
    label = `${pct}% OFF`;
    Icon = Percent;
    reason = "discounted";
  } else if (p.reason === "tagged" && tag) {
    label = `#${truncate(tag, 18)}`;

    reason = "tagged";
  } else if (p.reason === "top_wished" && wish !== null) {
    label = `${abbr(wish)} wished`;
    Icon = RiHeart3Fill;
    reason = "top_wished";
  } else {
    // random/filler → subType (fallback productType) from doc or hydrated meta
    const meta = productsMeta?.[p.id] || {};
    const subtype =
      p.subType || meta.subType || p.productType || meta.productType || null;
    label = subtype ? truncate(subtype, 18) : "Picked";
    reason = "random";
  }

  // Text color + subtle glow (on text, bg remains white/transparent)
  const reasonToText = {
    discounted: { cls: "text-red-600", glow: "rgba(239,68,68,0.35)" }, // red-500
    tagged: { cls: "text-purple-600", glow: "rgba(147,51,234,0.35)" }, // purple-700-ish
    top_wished: { cls: "text-pink-600", glow: "rgba(236,72,153,0.35)" }, // pink-500
    random: { cls: "text-gray-800", glow: "rgba(0,0,0,0.20)" }, // subtle gray
  };
  const { cls: textCls, glow } = reasonToText[reason];

  return (
    <div className="w-[25%]">
      <div
        className={`relative aspect-[3/4] overflow-hidden bg-gray-50 ${radius}`}
      >
        <img
          src={p.coverImageUrl}
          alt={p.name}
          className="w-full h-full object-cover"
        />

        {/* full-width translucent bar with centered text */}
        {label && (
          <div className="absolute inset-x-0 bottom-0">
            <div className="w-full bg-white/75 backdrop-blur-[1px]">
              <div className="flex items-center justify-center gap-1 px-2 py-0.5">
                {Icon ? <Icon className={`w-3 h-3 ${textCls}`} /> : null}
                <span
                  className={`text-[7px]  font-opensans font-medium ${textCls}`}
                  style={{ textShadow: `0 0 6px ${glow}, 0 0 2px ${glow}` }}
                >
                  {label}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* centered price */}
      <div className="mt-1 text-[12px] font-opensans font-semibold text-gray-900 text-center">
        {formatNaira(p.price)}
      </div>
    </div>
  );
}
