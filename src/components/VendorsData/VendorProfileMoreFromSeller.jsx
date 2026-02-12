/* VendorProfileMoreFromSeller.jsx */
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  deleteDoc,
  updateDoc,
  increment,
  serverTimestamp,
  where,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import { db, auth } from "../../firebase.config";
import { handleUserActionLimit } from "../../services/userWriteHandler";
import { FaStar } from "react-icons/fa";
import { GoChevronRight } from "react-icons/go";
import QuickAuthModal from "../../components/PwaModals/AuthModal";
import SafeImg from "../../services/safeImg";
import ProductCard from "../../components/Products/ProductCard";
import { IoMdArrowBack, IoMdArrowForward } from "react-icons/io";

const norm = (v) => String(v || "").trim().toLowerCase();

const getLikes = (p) => Number(p?.wishCount ?? p?.likesCount ?? 0);

const toMs = (t) => {
  if (!t) return 0;
  if (typeof t?.toMillis === "function") return t.toMillis();
  if (typeof t?.toDate === "function") return t.toDate().getTime();
  // if it's already a number/date-ish
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
};

const NGN0 = (n) =>
  Number(n || 0).toLocaleString("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  });

/**
 * Sort inside a bucket:
 * - higher likes first
 * - closer price to current
 * - newer first
 */
function makeBucketSorter(currentProduct) {
  const basePrice = Number(currentProduct?.price || 0);

  return (a, b) => {
    const la = getLikes(a);
    const lb = getLikes(b);
    if (lb !== la) return lb - la;

    const pa = Number(a?.price || 0);
    const pb = Number(b?.price || 0);

    // price closeness (smaller diff first)
    if (basePrice > 0) {
      const da = Math.abs(pa - basePrice);
      const db = Math.abs(pb - basePrice);
      if (da !== db) return da - db;
    }

    // recency
    return toMs(b?.createdAt) - toMs(a?.createdAt);
  };
}

/**
 * Bucket ranking:
 * 1) same type + same subtype (if subtype exists)
 * 2) same type
 * 3) rest of vendor products
 */
function rankMoreFromSeller(allVendorProducts, currentProduct, maxItems) {
  if (!currentProduct) return allVendorProducts.slice(0, maxItems);

  const curType = norm(currentProduct?.productType);
  const curSub = norm(currentProduct?.subType || currentProduct?.subtype);

  const sorter = makeBucketSorter(currentProduct);

  const sameType = (p) => curType && norm(p?.productType) === curType;
  const sameSub = (p) =>
    curSub &&
    norm(p?.subType || p?.subtype) === curSub &&
    sameType(p); // subtype match only meaningful under same type

  const bucketA = [];
  const bucketB = [];
  const bucketC = [];

  for (const p of allVendorProducts) {
    if (sameSub(p)) bucketA.push(p);
    else if (sameType(p)) bucketB.push(p);
    else bucketC.push(p);
  }

  bucketA.sort(sorter);
  bucketB.sort(sorter);
  bucketC.sort(sorter);

  return [...bucketA, ...bucketB, ...bucketC].slice(0, maxItems);
}

export default function VendorProfileMoreFromSeller({
  vendorId,
  currentProduct, // pass `product`
  currentProductId, // pass `product.id`
  className = "",
  maxItems = 10,
  openDisclaimer,
}) {
  const navigate = useNavigate();

  const [vendor, setVendor] = useState(null);
  const [vendorLoading, setVendorLoading] = useState(true);

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [isFollowing, setIsFollowing] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  const uid = auth.currentUser?.uid || null;

  // quick mode (same pattern you used in RelatedProducts)
  const { isActive: quickActive = false, vendorId: quickVendorId = null } =
    useSelector((s) => s.quickMode ?? {});
  const quickForThisVendor = quickActive && quickVendorId && vendorId === quickVendorId;

  // ---- fetch vendor
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!vendorId) return;
      setVendorLoading(true);
      try {
        const snap = await getDoc(doc(db, "vendors", vendorId));
        if (!alive) return;
        setVendor(snap.exists() ? { id: vendorId, ...snap.data() } : null);
      } catch (e) {
        console.error("[VendorProfileMoreFromSeller] vendor fetch:", e);
        if (alive) setVendor(null);
      } finally {
        if (alive) setVendorLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [vendorId]);

  // ---- follow status (realtime, same follows doc style as StorePage)
  useEffect(() => {
    if (!uid || !vendorId) {
      setIsFollowing(false);
      return;
    }
    const followRef = doc(db, "follows", `${uid}_${vendorId}`);
    return onSnapshot(
      followRef,
      (snap) => setIsFollowing(snap.exists()),
      () => setIsFollowing(false)
    );
  }, [uid, vendorId]);

  // ---- fetch vendor products (match storepage rules: published + not deleted)
  useEffect(() => {
    let alive = true;

    (async () => {
      if (!vendorId) return;
      setLoadingProducts(true);

      try {
        const productsRef = collection(db, "products");

        // StorePage/RelatedProducts style filters
        const qy = query(
          productsRef,
          where("vendorId", "==", vendorId),
          where("published", "==", true),
          where("isDeleted", "==", false),
          orderBy("createdAt", "desc"),
          limit(80)
        );

        const snap = await getDocs(qy);
        if (!alive) return;

        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // exclude current product + basic cleanup
        const cleaned = rows
          .filter((p) => p?.id !== currentProductId)
          .filter((p) => p?.coverImageUrl); // keep consistent visuals

        setProducts(cleaned);
      } catch (e) {
        console.error("[VendorProfileMoreFromSeller] products fetch:", e);
        if (alive) setProducts([]);
      } finally {
        if (alive) setLoadingProducts(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [vendorId, currentProductId]);

  const ranked = useMemo(() => {
    return rankMoreFromSeller(products, currentProduct, maxItems);
  }, [products, currentProduct, maxItems]);

  const avgRating = useMemo(() => {
    const sum = Number(vendor?.rating || 0);
    const count = Number(vendor?.ratingCount || 0);
    if (!count) return null;
    return (sum / count).toFixed(1);
  }, [vendor]);

  const handleFollowClick = useCallback(async () => {
    if (!vendorId) return;

    if (!auth.currentUser) {
      setAuthOpen(true);
      return;
    }

    if (!vendor?.id) return;

    const prevState = isFollowing;
    setIsFollowing(!prevState);

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
        }
      );

      const followRef = doc(db, "follows", `${auth.currentUser.uid}_${vendor.id}`);
      const vendorRef = doc(db, "vendors", vendor.id);

      if (!prevState) {
        await setDoc(followRef, {
          userId: auth.currentUser.uid,
          vendorId: vendor.id,
          createdAt: serverTimestamp(),
        });

        await updateDoc(vendorRef, { followersCount: increment(1) });
      } else {
        await deleteDoc(followRef);
        // keep same behavior as StorePage (no decrement)
      }
    } catch (err) {
      console.error("Follow/unfollow failed:", err?.message);
      setIsFollowing(prevState);
    } finally {
      setIsFollowLoading(false);
    }
  }, [vendorId, vendor, isFollowing]);

  const goToStore = () => {
    if (!vendorId) return;
    navigate(`/store/${vendorId}`);
  };

  if (!vendorId) return null;

  return (
    <div className={`${className}`}>
      {/* Vendor header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goToStore}
          className="flex items-center gap-2 text-left"
        >
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100">
            {vendor?.profileImageUrl || vendor?.photoURL || vendor?.coverImageUrl ? (
              <SafeImg
                src={vendor?.profileImageUrl || vendor?.photoURL || vendor?.coverImageUrl}
                alt={`${vendor?.shopName || "Vendor"} avatar`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-gray-700">
                {(vendor?.shopName || "V").slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <p className="text-sm font-opensans font-semibold text-black truncate">
              {vendorLoading ? "Loading..." : vendor?.shopName || "Vendor"}
            </p>

            <div className="flex items-center gap-1 text-xs text-gray-600 font-opensans">
              {avgRating ? (
                <>
                  <FaStar className="text-yellow-500" />
                  <span className="text-black font-medium">{avgRating}</span>
                  <span className="text-gray-500">({vendor?.ratingCount || 0})</span>
                </>
              ) : (
                <span className="text-gray-500">No ratings yet</span>
              )}
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={handleFollowClick}
          disabled={isFollowLoading}
          className={`h-10 px-4 rounded-xl font-opensans text-xs font-semibold transition
            ${isFollowing ? "bg-gray-100 text-black" : "bg-customOrange text-white"}
            ${isFollowLoading ? "opacity-60" : ""}`}
        >
          {isFollowing ? "Following" : "Follow"}
        </button>
      </div>

      {/* If vendor has only the current product, don't show "More from seller" */}
      {!loadingProducts && ranked.length === 0 ? null : (
        <>
          {/* More from seller header */}
          <div className="mt-6 flex items-center justify-between">
            <p className="text-base font-opensans font-semibold text-black">
              More From Seller
            </p>
            <button
              type="button"
              onClick={goToStore}
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
              aria-label="Go to store"
            >
              <IoMdArrowForward className="text-xl text-gray-700" />
            </button>
          </div>

          {/* Products (use ProductCard) */}
          <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {loadingProducts ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="min-w-[170px] w-[170px] h-[260px] bg-gray-100 rounded-xl animate-pulse"
                />
              ))
            ) : (
              ranked.map((p) => (
                <div key={p.id} className="min-w-[170px] w-[170px]">
                  <ProductCard
                    product={p}
                    vendorId={p.vendorId}
                    quickForThisVendor={quickForThisVendor}
                    onClick={() => navigate(`/product/${p.id}`)}
                    showVendorName={false}
                  />
                  
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Auth modal */}
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
