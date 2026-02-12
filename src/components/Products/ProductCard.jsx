import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Skeleton from "react-loading-skeleton";

import "react-loading-skeleton/dist/skeleton.css";
import { getImageKitUrl } from "../../services/imageKit";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../../firebase.config";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  increment,
  collection,
  query,
  where,
  getDocs,
  limit as qLimit,
} from "firebase/firestore";

import { RiHeart3Fill, RiHeart3Line } from "react-icons/ri";

import { useAuth } from "../../custom-hooks/useAuth";
import { useFavorites } from "../../components/Context/FavoritesContext";

import { handleUserActionLimit } from "../../services/userWriteHandler";
import IkImage from "../../services/IkImage";
import Sales from "../Loading/Sales";
import { useCardImpression } from "../../services/useCardImpression";
const toTitleCase = (str = "") =>
  String(str)
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const getSizeText = (product) => {
  if (!product) return "";

  // 1) If product.size exists (string like "S, UK 38, 47" OR "S: 32-45")
  if (product.size) {
    const parts = String(product.size)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!parts.length) return "";
    if (parts.length === 1) return parts[0];
    return `${parts[0]} - ${parts[parts.length - 1]}`;
  }

  // 2) Derive from variants
  if (Array.isArray(product.variants) && product.variants.length) {
    const sizes = Array.from(
      new Set(
        product.variants
          .map((v) => v?.size)
          .filter(Boolean)
          .map((s) => String(s).trim())
      )
    );

    if (!sizes.length) return "";
    if (sizes.length === 1) return sizes[0];
    return `${sizes[0]} - ${sizes[sizes.length - 1]}`;
  }

  return "";
};

// keep this cache OUTSIDE the component so it persists between renders
const offerCache = new Map();
const SIZE_SHORTHAND_RE = /^(x{0,4}(s|m|l)|xs|s|m|l|xl|xxl|xxxl|xxxxl)$/i;
const REGION_RE = /^(uk|us|eu)$/i;

function capFirstLowerRest(word = "") {
  const t = String(word).trim();
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

// Formats sizes like:
// "xxl" -> "XXL"
// "one size" -> "One Size"
// "ADJUSTABLE" -> "Adjustable"
// "uk 10" -> "UK 10"
function formatSizeText(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";

  // Support comma-separated sizes (e.g. "M, L")
  return s
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      // keep slash combos like "S/M"
      if (part.includes("/")) {
        return part
          .split("/")
          .map((w) => formatSizeWord(w))
          .filter(Boolean)
          .join("/");
      }

      return part
        .split(/\s+/)
        .map((w) => formatSizeWord(w))
        .filter(Boolean)
        .join(" ");
    })
    .join(", ");
}

function formatSizeWord(w) {
  const t = String(w ?? "").trim();
  if (!t) return "";

  // digits stay digits
  if (/^\d+$/.test(t)) return t;

  // UK/US/EU stay uppercase
  if (REGION_RE.test(t)) return t.toUpperCase();

  // true size shorthands become uppercase
  if (SIZE_SHORTHAND_RE.test(t)) return t.toUpperCase();

  // default: Capitalize first letter, lowercase rest
  return capFirstLowerRest(t);
}
const wishCountCache = new Map(); // productId -> number

const ProductCard = ({
  product,
  isLoading,
  showVendorName = true,
  showName = true,
  showCondition = true,
  quickForThisVendor = false,
   surface = "unknown",
}) => {
  const navigate = useNavigate();
  const [imgLoaded, setImgLoaded] = useState(false);
  // Auth state
const productId = product?.id || product?.productId;
  const { currentUser } = useAuth();
  const [metaIndex, setMetaIndex] = useState(0); // 0 = condition, 1 = subType

  // Local Favorites Context
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();
const favorite = isFavorite(productId);

const [burstKey, setBurstKey] = useState(0);


const [wishCount, setWishCount] = useState(() => {
  const base = typeof product?.wishCount === "number" ? product.wishCount : 0;
  return productId ? (wishCountCache.get(productId) ?? base) : base;
});

useEffect(() => {
  if (!productId) return;
  const base = typeof product?.wishCount === "number" ? product.wishCount : 0;
  const cached = wishCountCache.get(productId);
  setWishCount(cached ?? base);
}, [productId, product?.wishCount]);

  // State for vendor's marketplace type
  const [vendorMarketplaceType, setVendorMarketplaceType] = useState(null);

  // Fetch vendor's marketplace type from Firestore
  useEffect(() => {
    const fetchVendorMarketplaceType = async () => {
      if (!product?.vendorId) return;
      try {
        const vendorRef = doc(db, "vendors", product.vendorId);
        const vendorDoc = await getDoc(vendorRef);

        if (vendorDoc.exists()) {
          const vendorData = vendorDoc.data();
          setVendorMarketplaceType(vendorData.marketPlaceType);
        } else {
          console.error("Vendor not found");
        }
      } catch (error) {
        console.error("Error fetching vendor marketplace type:", error);
      }
    };
    fetchVendorMarketplaceType();
  }, [product?.vendorId]);

  useEffect(() => {
    if (typeof product?.wishCount === "number") setWishCount(product.wishCount);
  }, [product?.wishCount]);

  useEffect(() => {
    const id = setInterval(() => setMetaIndex((i) => (i + 1) % 3), 2500);
    return () => clearInterval(id);
  }, []);

 const handleCardClick = () => {
  if (isLoading) return;

  // block only if we KNOW it's sold out
  const soldOut =
    product?.inStock === false || Number(product?.stockQuantity ?? 1) <= 0;

  if (soldOut) return;

  const id = product?.id || product?.productId;
  if (!id) return;

navigate(`/product/${id}`, { state: { mtSurface: surface } });

};

  const impressionRef = useCardImpression({
    kind: "product",
    productId,
    vendorId: product?.vendorId,
    surface,          // "home" | "search" | "vendor_store"
    enabled: !isLoading && !!productId,
  });

  // ---- Offer helpers ----
  const parseTS = (ts) => (ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null);

  // embedded shapes your API might attach to the product
  const embeddedOffer =
    product?.userOffer || product?.offer || product?.priceLock || null;

  // if not embedded, try fetch user’s active lock for this product (once)
  const [lockFromDB, setLockFromDB] = useState(null);
  useEffect(() => {
    let alive = true;
    // only fetch if user is logged in, product id exists, and no embedded offer
    if (!currentUser?.uid || !product?.id || embeddedOffer) return;
    const key = `${currentUser.uid}:${product.id}`;
    const cached = offerCache.get(key);
    if (cached !== undefined) {
      setLockFromDB(cached);
      return;
    }
    (async () => {
      try {
        const q = query(
          collection(db, "priceLocks"),
          where("buyerId", "==", currentUser.uid),
          where("productId", "==", product.id),
          where("state", "==", "active"),
          qLimit(1)
        );
        const snap = await getDocs(q);
        if (!alive) return;
        if (!snap.empty) {
          const d = { id: snap.docs[0].id, ...snap.docs[0].data() };
          offerCache.set(key, d);
          setLockFromDB(d);
        } else {
          offerCache.set(key, null);
          setLockFromDB(null);
        }
      } catch (e) {
        console.error("[ProductCard] priceLock lookup failed:", e);
      }
    })();
    return () => {
      alive = false;
    };
  }, [currentUser?.uid, product?.id, embeddedOffer]);

  const effectiveOffer = embeddedOffer || lockFromDB;

  // pick the price (support common fields)
  const offerAmount =
    effectiveOffer?.effectivePrice ??
    effectiveOffer?.price ??
    effectiveOffer?.amount ??
    null;

  // prefer explicit expiry; otherwise assume a 6h lock window from createdAt
  const explicitExpiry =
    parseTS(
      effectiveOffer?.validUntil ??
        effectiveOffer?.expiresAt ??
        effectiveOffer?.endsAt
    ) || null;
  const createdAt = parseTS(
    effectiveOffer?.createdAt ?? effectiveOffer?.created_on
  );
  const fallbackExpiry =
    !explicitExpiry && createdAt
      ? new Date(
          createdAt.getTime() +
            (effectiveOffer?.offerWindowHours ?? 6) * 60 * 60 * 1000
        )
      : null;
  const offerExpiry = explicitExpiry || fallbackExpiry;

  // consider it active if it has a price and is not expired
  const hasOfferActive =
    offerAmount != null &&
    (!offerExpiry || offerExpiry.getTime() > Date.now()) &&
    !["expired", "revoked", "cancelled"].includes(
      String(
        effectiveOffer?.state || effectiveOffer?.status || ""
      ).toLowerCase()
    );

  // live countdown text like “2h 03m” or “12m 09s”
  const [offerCountdown, setOfferCountdown] = useState("");
  useEffect(() => {
    if (!hasOfferActive || !offerExpiry) {
      setOfferCountdown("");
      return;
    }
    const fmt = (ms) => {
      const s = Math.max(0, Math.floor(ms / 1000));
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
      return `${m}m ${sec.toString().padStart(2, "0")}s`;
    };
    const tick = () =>
      setOfferCountdown(fmt(offerExpiry.getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [hasOfferActive, offerExpiry]);

  // main price to render
  const displayPrice = hasOfferActive
    ? Number(offerAmount)
    : Number(product?.price || 0);

  // for the struck-out “was” price when offer is active
  const listPriceForStrike = Number(
    product?.discount?.initialPrice ?? product?.price ?? 0
  );
  const handleVendorClick = (e) => {
    e.stopPropagation();
    if (vendorMarketplaceType === "virtual") {
      navigate(
        quickForThisVendor
          ? `/store/${product.vendorId}?shared=true`
          : `/store/${product.vendorId}`
      );
    } else if (vendorMarketplaceType === "marketplace") {
      navigate(
        quickForThisVendor
          ? `/marketstorepage/${product.vendorId}?shared=true`
          : `/marketstorepage/${product.vendorId}`
      );
    } else {
      console.error("Unknown marketplace type or vendor not found");
    }
  };

const handleFavoriteToggle = async (e) => {
  e.stopPropagation();

  const productId = product?.id || product?.productId;
  if (!productId) return;

  const wasFavorite = isFavorite(productId);

  // helper to keep UI count consistent across route changes
  const setWish = (next) => {
    const v = Math.max(0, Number(next || 0));
    wishCountCache.set(productId, v);
    setWishCount(v);
  };

  // best-effort product wishCount update (adjust paths to match your DB)
  const tryUpdateProductWishCount = async (delta) => {
    const candidates = [
      // common patterns — keep the one that matches your schema
      doc(db, "products", productId),
      product?.vendorId ? doc(db, "vendors", product.vendorId, "products", productId) : null,
    ].filter(Boolean);

    for (const ref of candidates) {
      try {
        await updateDoc(ref, { wishCount: increment(delta) });
        return true;
      } catch (err) {
        // try next candidate
      }
    }
    return false;
  };

  // -------------------------
  // ✅ Optimistic UI
  // -------------------------
  try {
    if (wasFavorite) {
      removeFavorite(productId);
      setWish(Number(wishCount || 0) - 1);
      toast.info(`Removed ${product?.name || "item"} from favorites!`);
    } else {
      addFavorite({ ...product, id: productId }); // ensure id exists in your favorites store
      setWish(Number(wishCount || 0) + 1);
      setBurstKey((k) => k + 1); // splash only on like
      toast.success(`Added ${product?.name || "item"} to favorites!`);
    }

    // guest mode: keep it local only (cache will persist across pages in SPA)
    if (!currentUser?.uid) return;

    await handleUserActionLimit(
      currentUser.uid,
      "favorite",
      {},
      {
        collectionName: "usage_metadata",
        writeLimit: 50,
        minuteLimit: 10,
        hourLimit: 80,
        dayLimit: 120,
      }
    );

    const favDocRef = doc(db, "users", currentUser.uid, "favorites", productId);
    const vendorDocRef = product?.vendorId ? doc(db, "vendors", product.vendorId) : null;

    if (wasFavorite) {
      await deleteDoc(favDocRef);

      // OPTIONAL: keep vendor likes symmetrical
      // if (vendorDocRef) await updateDoc(vendorDocRef, { likesCount: increment(-1) });

      // OPTIONAL: persist wishCount globally
      // await tryUpdateProductWishCount(-1);
    } else {
      await setDoc(favDocRef, {
        productId,
        vendorId: product?.vendorId || null,
        name: product?.name || "",
        price: Number(product?.price || 0),
        createdAt: new Date(),
      });

      if (vendorDocRef) await updateDoc(vendorDocRef, { likesCount: increment(1) });

      // OPTIONAL: persist wishCount globally
      // await tryUpdateProductWishCount(1);
    }
  } catch (err) {
    console.error("Error updating favorites:", err);

    // -------------------------
    // ✅ Revert optimistic UI
    // -------------------------
    if (wasFavorite) {
      addFavorite({ ...product, id: productId });
      setWish(Number(wishCount || 0) + 1);
    } else {
      removeFavorite(productId);
      setWish(Number(wishCount || 0) - 1);
    }

    toast.error(err?.message || "Failed to update favorites. Please try again.");
  }
};


  // Utility to format price
  const formatPrice = (price) => {
    return Number(price || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Utility to display condition
  const renderCondition = (condition) => {
    if (!condition) return null;
    const lower = String(condition).toLowerCase();
    if (lower.includes("defect"))
      return <p className="text-xs text-red-500">{condition}</p>;
    if (lower.includes("brand new"))
      return <p className="text-xs text-green-500">Brand New</p>;
    if (lower.includes("thrift"))
      return <p className="text-xs text-yellow-500">Thrift</p>;
    return <p className="text-xs text-red-500">{condition}</p>;
  };

  // The product’s main image
  const firebaseImage = product?.productCoverImage || product?.coverImageUrl;
  const lowResImg = getImageKitUrl(firebaseImage, "w-60,q-20,bl-6");
  const highResImg = getImageKitUrl(firebaseImage);

  // Pick sub-product thumbs (first image of each subProduct)
  const subThumbs = Array.isArray(product?.subProducts)
    ? product.subProducts
        .map((sp) => (Array.isArray(sp.images) && sp.images[0]) || null)
        .filter(Boolean)
    : [];

  // Show up to 2 circles; if more, badge the last with +N
  const displayThumbs = subThumbs.slice(0, 2);
  const extraCount = Math.max(0, subThumbs.length - displayThumbs.length);

  // derive discount label (fallback if percentageCut missing)
  const derivedPercent =
    product?.discount?.percentageCut ??
    (product?.discount?.initialPrice && product?.price
      ? Math.round(
          (1 - Number(product.price) / Number(product.discount.initialPrice)) *
            100
        )
      : null);

  return (
    <>
      {/* --- MAIN CARD --- */}
      <div
        ref={impressionRef}
        className={`product-card relative mb-2 cursor-pointer ${
          product?.stockQuantity === 0 ? "opacity-50 pointer-events-none" : ""
        }`}
        onClick={handleCardClick}
        style={{ width: "100%", margin: "0" }}
      >
      <div className="relative">
          {isLoading ? (
            <Skeleton height={160} />
          ) : (
            <>
              {/* Top-right discount badge (hidden when an offer is active) */}
              {!hasOfferActive && !!product?.discount && (
                <div className="absolute top-2 right-2 z-10">
                  {product?.discount?.discountType?.startsWith(
                    "personal-freebies"
                  ) ? (
                    <div className="bg-customPink text-customOrange text-xs px-2 py-1.5 font-opensans font-medium rounded">
                      {product?.discount?.freebieText}
                    </div>
                  ) : (
                    <div >
                    
                    </div>
                  )}
                </div>
              )}

              {/* Offer badge (top-left) */}
              {hasOfferActive && (
                <div className="absolute top-2 left-2 z-1">
                  <div
                    className="
                      inline-flex items-center gap-1.5 px-2 py-1 rounded-full
                      bg-amber-50 text-amber-800 ring-1 ring-amber-200
                      shadow-[inset_0_0_0_1px_rgba(255,255,255,0.4)]
                      text-[11px] font-semibold
                    "
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>Offer</span>
                    {offerCountdown ? (
                      <span className="opacity-70 font-opensans">
                        · {offerCountdown}
                      </span>
                    ) : (
                      <span className="opacity-60 font-opensans">· active</span>
                    )}
                  </div>
                </div>
              )}

              {/* Optional ribbon (safe-guarded) */}
              {product?.discount?.discountType?.startsWith("inApp") && (
                <img
                  src="/Ribbon.svg"
                  alt="Discount Ribbon"
                  className="absolute top-0 left-0 w-12 h-12 z-10"
                />
              )}

              {/* main image */}
              <IkImage
                src={firebaseImage}
                alt={product?.name}
                className="h-52 object-cover rounded-[18px] w-full"
              />
            </>
          )}

          {/* Floating sub-product thumbs (bottom-left) */}
          {displayThumbs.length > 0 && (
            <motion.div
              className="absolute bottom-2 left-2 z-20 flex items-center pointer-events-none"
              initial={{ y: 0 }}
              animate={{ y: [0, -2, 0] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                repeatType: "mirror",
                ease: "easeInOut",
              }}
            >
              {displayThumbs.map((thumb, idx) => {
                const isLast = idx === displayThumbs.length - 1;
                return (
                  <motion.div
                    key={`${thumb}-${idx}`}
                    className={`relative ${idx > 0 ? "-ml-2" : ""}`}
                    initial={{ x: 0, y: 0, rotate: 0 }}
                    animate={{
                      y: [0, -1.5, 0],
                      x: [0, idx % 2 ? 1.5 : -1.5, 0],
                      rotate: [0, idx % 2 ? 0.6 : -0.6, 0],
                    }}
                    transition={{
                      duration: 2.4 + idx * 0.35,
                      repeat: Infinity,
                      repeatType: "mirror",
                      ease: "easeInOut",
                    }}
                  >
                    <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow-md">
                      <IkImage
                        src={thumb}
                        alt={`Variant ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Badge now sits OUTSIDE the circle */}
                    {isLast && extraCount > 0 && (
                      <div className="absolute -top-2 -right-2 bg-black/80 text-white text-[10px] leading-none px-1.5 py-[3px] rounded-full shadow">
                        +{extraCount}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          )}
{/* Favorite Pill (heart + optional count) */}
<motion.button
  type="button"
  onClick={handleFavoriteToggle}
  className="
    absolute bottom-2 right-2 z-20
    inline-flex items-center gap-2
    h-9 px-3 rounded-full
    bg-black/50 backdrop-blur
    shadow-md
  "
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
>
  {/* Splash burst (only on like) */}
  <AnimatePresence>
    {favorite && (
      <motion.span
        key={burstKey}
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {[
          { x: 0, y: -16 },
          { x: 12, y: -10 },
          { x: 16, y: 0 },
          { x: 12, y: 10 },
          { x: 0, y: 16 },
          { x: -12, y: 10 },
          { x: -16, y: 0 },
          { x: -12, y: -10 },
        ].map((p, i) => (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-red-500"
            initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
            animate={{
              x: p.x,
              y: p.y,
              scale: [0, 1, 0.6],
              opacity: [0, 1, 0],
            }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          />
        ))}
      </motion.span>
    )}
  </AnimatePresence>

  {/* Heart */}
  <motion.span
    animate={favorite ? { scale: [1, 1.18, 1] } : { scale: 1 }}
    transition={{ duration: 0.22 }}
    className="flex items-center justify-center"
  >
    {favorite ? (
      <RiHeart3Fill className="text-red-500 text-xl" />
    ) : (
      <RiHeart3Line className="text-white text-xl" />
    )}
  </motion.span>

  {/* Count (ONLY if > 0) */}
  {Number(wishCount || 0) > 0 && (
    <motion.span
      key={wishCount}
      initial={{ y: -3, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.18 }}
      className="text-sm font-roboto font-normal text-white tabular-nums"
    >
      {wishCount}
    </motion.span>
  )}
</motion.button>



          {/* Out of Stock Overlay */}
          {product?.stockQuantity === 0 && (
            <div className="absolute inset-0 bg-gray-900 bg-opacity-70 flex items-center justify-center rounded-lg z-10">
              <p className="text-red-700 font-semibold text-2xl animate-pulse">
                Sold Out!
              </p>
            </div>
          )}
        </div>

        {/* Product Info */}
   {/* Product Info */}
<div className="mt-2">
  {/* 1) Name first */}
  {showName && (
    <h3 className="text-base font-opensans font-medium text-gray-900 truncate">
      {isLoading ? <Skeleton width={120} /> : product?.name}
    </h3>
  )}

  {/* 2) Size range • Condition (if no size -> condition only) */}
  {(() => {
    if (isLoading) return <Skeleton width={140} height={12} className="mt-1" />;
// inside the "Size range • Condition" render IIFE

const rawSizeText = getSizeText(product);

// ✅ only shorthand sizes become ALL CAPS
const sizeText = rawSizeText ? formatSizeText(rawSizeText) : "";

// ✅ condition in Title Case (your existing logic is fine)
const conditionText = product?.condition
  ? toTitleCase(String(product.condition).replace(/:$/, ""))
  : "";

if (!sizeText && !conditionText) return null;

return (
  <div className="mt-1 flex items-center text-sm font-opensans text-gray-500 min-w-0">
    {sizeText && <span className="truncate">{sizeText}</span>}
    {sizeText && conditionText && <span className="mx-1 text-gray-300 shrink-0">•</span>}
    {conditionText && <span className="truncate">{conditionText}</span>}
  </div>
);

  })()}

  {/* 3) Price row */}
<div className="mt-1">
  {isLoading ? (
    <Skeleton width={90} height={18} />
  ) : (
    (() => {
      const isFreebie =
        !!product?.discount?.discountType?.startsWith("personal-freebies");

      const percentOff =
        derivedPercent != null ? Number(derivedPercent) : null;

      const hasNormalDiscount =
        !!product?.discount?.initialPrice && !isFreebie && !hasOfferActive;

      const oldPrice = Number(product?.discount?.initialPrice || 0);

      const showStrikeOld =
        (hasNormalDiscount && oldPrice > 0 && oldPrice !== displayPrice) ||
        (hasOfferActive &&
          listPriceForStrike > 0 &&
          listPriceForStrike !== displayPrice);

      const strikeValue = hasOfferActive ? listPriceForStrike : oldPrice;

      return (
        <div className="min-w-0">
          {/* Old price (top line) */}
          {showStrikeOld && (
            <div className="text-xs font-opensans text-gray-400 line-through truncate">
              ₦{formatPrice(strikeValue)}
            </div>
          )}

          {/* New price + percent/badge (bottom line) */}
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="text-base font-opensans font-semibold text-gray-900 truncate">
              ₦{formatPrice(displayPrice)}
            </span>

            {/* Percent off beside new price */}
            {hasNormalDiscount && percentOff != null && percentOff > 0 && (
              <span className="shrink-0 text-xs font-opensans font-medium text-customOrange">
                (-{percentOff}%)
              </span>
            )}

            {/* Freebie badge beside new price */}
            {isFreebie && product?.discount?.freebieText && (
              <span className="shrink-0 max-w-[8.5rem] truncate inline-flex items-center px-2 h-5 rounded-full bg-customPink text-customOrange text-xs font-opensans font-medium">
                {product.discount.freebieText}
              </span>
            )}
          </div>
        </div>
      );
    })()
  )}
</div>



 
</div>

      </div>
    </>
  );
};

export default ProductCard;
