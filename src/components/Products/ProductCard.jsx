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

// keep this cache OUTSIDE the component so it persists between renders
const offerCache = new Map();

const ProductCard = ({
  product,
  isLoading,
  showVendorName = true,
  showName = true,
  showCondition = true,
  quickForThisVendor = false,
}) => {
  const navigate = useNavigate();
  const [imgLoaded, setImgLoaded] = useState(false);
  // Auth state
  const { currentUser } = useAuth();
  const [metaIndex, setMetaIndex] = useState(0); // 0 = condition, 1 = subType
  const [wishCount, setWishCount] = useState(
    typeof product?.wishCount === "number" ? product.wishCount : 0
  );

  // Local Favorites Context
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();
  const favorite = isFavorite(product?.id);

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
    if (!isLoading && product?.stockQuantity > 0) {
      navigate(`/product/${product.id}`);
    }
  };

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

  // Optimistic UI: Toggle heart immediately, then do Firestore + rate-limit checks in background
  const handleFavoriteToggle = async (e) => {
    e.stopPropagation();

    const wasFavorite = favorite;

    if (favorite) {
      removeFavorite(product.id);
      toast.info(`Removed ${product.name} from favorites!`);
    } else {
      addFavorite(product);
      setWishCount((c) => c + 1);
      toast.success(`Added ${product.name} to favorites!`);
    }

    if (!currentUser) return;

    try {
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

      const favDocRef = doc(
        db,
        "users",
        currentUser.uid,
        "favorites",
        product.id
      );
      const vendorDocRef = doc(db, "vendors", product.vendorId);

      if (wasFavorite) {
        await deleteDoc(favDocRef);
      } else {
        await setDoc(favDocRef, {
          productId: product.id,
          vendorId: product.vendorId,
          name: product.name,
          price: product.price,
          createdAt: new Date(),
        });
        await updateDoc(vendorDocRef, { likesCount: increment(1) });
      }
    } catch (err) {
      console.error("Error updating favorites:", err);
      if (wasFavorite) {
        addFavorite(product);
        setWishCount((c) => c + 1);
      } else {
        removeFavorite(product.id);
      }
      toast.error(
        err.message || "Failed to update favorites. Please try again."
      );
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
                    <div className="bg-customPink text-customOrange text-xs px-2 py-1.5 font-opensans font-medium rounded">
                      {derivedPercent != null ? `-${derivedPercent}%` : "SALE"}
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
                      <span className="opacity-70 font-opensans">· {offerCountdown}</span>
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
                className="h-52 object-cover rounded-md w-full"
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

          {/* Favorite Icon */}
          <motion.div
            className="absolute bottom-2 right-2 cursor-pointer w-9 h-9 rounded-full bg-white border flex items-center justify-center shadow-md z-1"
            onClick={handleFavoriteToggle}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            animate={favorite ? "liked" : "unliked"}
            variants={{
              liked: {
                scale: [1, 1.3, 1],
                rotate: [0, -5, 5, 0],
                transition: { duration: 0.6, ease: "easeInOut" },
              },
              unliked: {
                scale: 1,
                rotate: 0,
                transition: { duration: 0.2, ease: "easeOut" },
              },
            }}
          >
            <motion.div
              animate={favorite ? "filled" : "empty"}
              variants={{
                filled: {
                  scale: [0.8, 1.2, 1],
                  transition: { duration: 0.4, ease: "backOut" },
                },
                empty: { scale: 1, transition: { duration: 0.2 } },
              }}
            >
              {favorite ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                >
                  <RiHeart3Fill className="text-red-500 text-2xl" />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <RiHeart3Line className="text-gray-700 text-2xl" />
                </motion.div>
              )}
            </motion.div>
          </motion.div>

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
        <div className="mt-2 ">
          {showCondition && (
            <div className="h-5 flex items-center overflow-hidden">
              {isLoading ? (
                <Skeleton width={120} height={14} />
              ) : (
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={metaIndex}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -10, opacity: 0 }}
                    transition={{ duration: 0.24 }}
                    className="text-xs font-opensans font-light leading-none [&_p]:m-0"
                  >
                    {metaIndex === 0 ? (
                      renderCondition(product?.condition)
                    ) : metaIndex === 1 ? (
                      product?.subType ? (
                        <span
                          className="
                            inline-flex items-center ml-0.5 gap-1 px-2 h-4
                            rounded-full bg-orange-50 text-orange-700
                            ring-1 ring-orange-200
                          "
                        >
                          <span className="text-[10px] -mt-[1px]">🏷️</span>
                          <span className="text-[10px] leading-none truncate max-w-[140px]">
                            {product.subType}
                          </span>
                        </span>
                      ) : null
                    ) : (
                      <span
                        className="
                          inline-flex items-center ml-0.5 gap-1 px-2 h-4
                          rounded-full bg-rose-50 text-rose-700
                          ring-1 ring-rose-200
                        "
                      >
                        <RiHeart3Fill className="text-[10px]" />
                        <span className="text-[10px] leading-none truncate max-w-[160px]">
                          {wishCount > 0
                            ? `${wishCount} wishlisted`
                            : `Be the first to wishlist`}
                        </span>
                      </span>
                    )}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          )}

          {showName && (
            <h3 className="text-sm font-opensans font-medium mt-1">
              {isLoading ? <Skeleton width={100} /> : product?.name}
            </h3>
          )}

          <div className="mt-1">
            {/* Price + flash sale on one line */}
            <div className="mt-1 relative">
              {/* Main price */}
              <p className="text-black text-lg font-opensans font-bold">
                {isLoading ? (
                  <Skeleton width={50} />
                ) : (
                  `₦${formatPrice(displayPrice)}`
                )}
              </p>

              {/* Flash badge */}
              {product?.flashSales && (
                <div className="absolute -top-2 right-2 w-9 h-9">
                  <Sales />
                </div>
              )}

              {/* Struck-out “was” price (no double slashing) */}
              {isLoading
                ? null
                : hasOfferActive
                ? listPriceForStrike > 0 &&
                  listPriceForStrike !== displayPrice && (
                    <p className="text-sm font-opensans text-gray-500 line-through mt-1">
                      ₦{formatPrice(listPriceForStrike)}
                    </p>
                  )
                : product?.discount?.initialPrice &&
                  product?.discount?.discountType !== "personal-freebies" && (
                    <p className="text-sm font-opensans text-gray-500 line-through mt-1">
                      ₦{formatPrice(product.discount.initialPrice)}
                    </p>
                  )}
            </div>
          </div>

          {showVendorName && product?.vendorName && (
            <p
              className="text-xs font-opensans font-light text-gray-600 underline cursor-pointer"
              onClick={handleVendorClick}
            >
              {product.vendorName}
            </p>
          )}
        </div>
      </div>
    </>
  );
};

export default ProductCard;
