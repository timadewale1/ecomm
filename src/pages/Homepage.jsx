// src/pages/Homepage.jsx
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { CiSearch } from "react-icons/ci";

import { getAuth, onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase.config";

import { useDispatch, useSelector } from "react-redux";
import {
  saveHomeFeedSnapshot,
  clearHomeFeedSnapshot,
} from "../redux/actions/homeFeedSnapshot";
import { VscBell } from "react-icons/vsc";
import ProductCard from "../components/Products/ProductCard";
import SEO from "../components/Helmet/SEO";
import { RotatingLines } from "react-loader-spinner";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import CaughtUp from "../components/Loading/CaughtUp";
import LoginPrompt from "../components/LoginAssets/LoginPrompt";

const ProductCardSkeleton = () => {
  return (
    <div className="product-card relative mb-2">
      <div className="relative">
        <div className="h-44 w-full rounded-xl overflow-hidden relative z-0">
          <Skeleton
            height="100%"
            width="100%"
            borderRadius="0.75rem"
            className="h-full w-full block"
            style={{ display: "block" }}
          />
        </div>
        <div className="absolute top-2 right-2 z-10">
          <Skeleton width={52} height={22} borderRadius={6} />
        </div>
        <div className="absolute bottom-2 right-2 z-10">
          <Skeleton circle width={36} height={36} />
        </div>
        <div className="absolute bottom-2 left-2 z-10 flex items-center">
          <Skeleton circle width={36} height={36} />
          <div className="-ml-2">
            <Skeleton circle width={36} height={36} />
          </div>
        </div>
      </div>
      <div className="mt-2">
        <div className="h-5 flex items-center overflow-hidden">
          <Skeleton width={120} height={14} />
        </div>
        <div className="mt-2">
          <Skeleton width="80%" height={16} />
          <Skeleton width="40%" height={16} className="mt-1" />
        </div>
      </div>
    </div>
  );
};

const HomeFeedSkeleton = ({ count = 10 }) => {
  return (
    <div className="grid grid-cols-2 gap-3  mt-3">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
};

const FEED_URL =
  "https://us-central1-ecommerce-ba520.cloudfunctions.net/getForYouFeedV1";
const PAGE_SIZE = 60;

const FEED_TABS = [
  { key: "all", label: "All", payload: {} },
  { key: "mens", label: "Men", payload: { category: "mens" } },
  { key: "womens", label: "Women", payload: { category: "womens" } },
  { key: "kids", label: "Kids", payload: { category: "kids" } },
  { key: "unisex", label: "Unisex", payload: { category: "all" } },
  { key: "everyday", label: "Everyday items", payload: { onlyEveryday: true } },
];

function getTabByKey(key) {
  return FEED_TABS.find((t) => t.key === key) || FEED_TABS[0];
}
const GUEST_KEY = "mt_guest_id";

function getGuestId() {
  let id = localStorage.getItem(GUEST_KEY);
  if (!id) {
    id =
      crypto?.randomUUID?.() ||
      `${Date.now().toString(36)}_${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(GUEST_KEY, id);
  }
  return id;
}
function useSkipSnapshotOnceAfterHardReload() {
  const navType =
    performance.getEntriesByType("navigation")[0]?.type || "navigate";

  // changes on every real page load/reload
  const origin = String(performance.timeOrigin || Date.now());

  // key is unique per page-load; survives route changes, but not a reload (origin changes)
  const key = `mt_home_skip_snapshot_consumed:${origin}`;

  const [skip] = React.useState(() => {
    if (navType !== "reload") return false;
    return sessionStorage.getItem(key) !== "1";
  });

  React.useEffect(() => {
    if (skip) sessionStorage.setItem(key, "1");
  }, [skip, key]);

  return skip;
}
function normalizeProductForCard(raw) {
  const available = raw?.availableSizes;

  const sizeFromAvailable =
    typeof raw?.size === "string" && raw.size.trim()
      ? raw.size.trim()
      : typeof raw?.sizeText === "string" && raw.sizeText.trim()
        ? raw.sizeText.trim()
        : Array.isArray(available)
          ? available.filter(Boolean).join(", ")
          : typeof available === "string"
            ? available
            : "";

  return {
    ...raw,
    id: raw?.id || raw?.productId,
    // ✅ this makes ProductCard's getSizeText work
    size: sizeFromAvailable,

    // optional: sometimes different backends use different keys
    condition: raw?.condition || raw?.itemCondition || raw?.productCondition || "",
  };
}

const Homepage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const guestIdRef = useRef(getGuestId());

  const navType =
    performance.getEntriesByType("navigation")[0]?.type || "navigate";
  const skipSnapshot = useSkipSnapshotOnceAfterHardReload();

  // Use selector, but do NOT put this object in useEffect dependencies
  const snapshot = useSelector((s) => s.homeFeedSnapshot?.snapshot);

  const auth0 = getAuth();
  const initialUid = auth0.currentUser?.uid || null;
  const [uid, setUid] = useState(() => initialUid || null);

  const [activeTab, setActiveTab] = useState(() => snapshot?.tab || "all");
  const guestKey = `guest:${guestIdRef.current}`;

  // ---------------------------------------------------------
  // FIX #1: Dynamic Viewer Key (Do not lock this in a ref!)
  // We prioritize UID, but fallback to snapshot.uid so restoration happens
  // immediately while waiting for Auth to load.
  // ---------------------------------------------------------
  const viewerKey = uid || snapshot?.uid || guestKey;

  const viewerKeyRef = useRef(viewerKey);
  useEffect(() => {
    viewerKeyRef.current = viewerKey;
  }, [viewerKey]);

  // Can Hydrate Check
  const canHydrate =
    !skipSnapshot &&
    snapshot &&
    snapshot.tab === activeTab &&
    Array.isArray(snapshot.items) &&
    snapshot.items.length > 0 &&
    // Allow hydration if keys match OR if we are just waiting for auth
    (snapshot.uid === viewerKey || snapshot.uid === uid);

  const [items, setItems] = useState(() => (canHydrate ? snapshot.items : []));
  const [hasMore, setHasMore] = useState(() =>
    canHydrate ? Boolean(snapshot.hasMore) : true,
  );
  const [loading, setLoading] = useState(() => !canHydrate);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const sentinelRef = useRef(null);
  const uidRef = useRef(uid);
  const itemsRef = useRef(items);
  const hasMoreRef = useRef(hasMore);
  const scrollYRef = useRef(0);
  const tabRef = useRef(activeTab);

  const restoringRef = useRef(Boolean(canHydrate));
  const restoreScrollYRef = useRef(
    canHydrate ? Number(snapshot.scrollY || 0) : null,
  );

  const prevUidRef = useRef(null);
  const feedSeedRef = useRef(
    (!skipSnapshot && snapshot?.seed) ||
      `${Date.now().toString(36)}_${Math.random().toString(16).slice(2)}`,
  );

  const loadedKeyRef = useRef(canHydrate ? `${viewerKey}:${activeTab}` : null);

  // keep refs updated
  useEffect(() => {
    uidRef.current = uid;
  }, [uid]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);
  useEffect(() => {
    tabRef.current = activeTab;
  }, [activeTab]);

  // track scroll
  useEffect(() => {
    const onScroll = () => {
      scrollYRef.current = window.scrollY || 0;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const getExcludeIds = useCallback(() => {
    const arr = (itemsRef.current || [])
      .map((x) => x?.productId || x?.id)
      .filter(Boolean);
    return arr.slice(-800);
  }, []);

const normalizedItems = useMemo(() => {
  return (items || []).map((raw) => {
    const p = normalizeProductForCard(raw);
    return {
      ...p,
      productCoverImage: p.productCoverImage || p.coverImageUrl || "",
      coverImageUrl: p.coverImageUrl || p.productCoverImage || "",
    };
  });
}, [items]);


  const buildFeedPayload = useCallback(({ excludeIds }) => {
    const tab = getTabByKey(tabRef.current);
    return {
      limit: PAGE_SIZE,
      guestId: guestIdRef.current,
      seed: feedSeedRef.current,
      excludeIds: Array.isArray(excludeIds) ? excludeIds : [],
      ...tab.payload,
    };
  }, []);

  const saveSnapshotNow = useCallback(() => {
    const it = itemsRef.current || [];
    if (it.length === 0) return;

    // Use current dynamic viewer key for saving
    const u = uidRef.current || snapshot?.uid || `guest:${guestIdRef.current}`;

    dispatch(
      saveHomeFeedSnapshot({
        uid: u,
        tab: tabRef.current,
        items: it,
        seed: feedSeedRef.current,
        hasMore: Boolean(hasMoreRef.current),
        scrollY: Number(scrollYRef.current || 0),
        savedAt: Date.now(),
      }),
    );
  }, [dispatch, snapshot?.uid]); // Depend on UID string only

  // Auth
  useEffect(() => {
    const auth = getAuth();
    setUid(auth.currentUser?.uid || null);

    const unsub = onAuthStateChanged(auth, (user) => {
      const nextUid = user?.uid || null;
      setUid(nextUid);

      if (!nextUid && prevUidRef.current) {
        dispatch(clearHomeFeedSnapshot());
      }
      prevUidRef.current = nextUid;
    });
    return () => unsub();
  }, [dispatch]);

  // Notifications
  useEffect(() => {
    const fetchUnreadNotifications = async (userId) => {
      try {
        const notificationsRef = collection(db, "notifications");
        const q = query(
          notificationsRef,
          where("userId", "==", userId),
          where("seen", "==", false),
        );
        const snap = await getDocs(q);
        setHasUnreadNotifications(!snap.empty);
      } catch (err) {}
    };

    if (uid) fetchUnreadNotifications(uid);
  }, [uid]);

  // Tab click
  const onSelectTab = useCallback(
    (key) => {
      if (key === activeTab) return;
      saveSnapshotNow();
      setActiveTab(key);
      feedSeedRef.current = `${Date.now().toString(36)}_${Math.random().toString(16).slice(2)}`;

      setItems([]);
      setHasMore(true);
      setError("");
      setLoading(true);

      restoringRef.current = false;
      restoreScrollYRef.current = null;
      loadedKeyRef.current = null; // Reset loaded key so new tab can fetch

      window.scrollTo(0, 0);
    },
    [activeTab, saveSnapshotNow],
  );

  // ---------------------------------------------------------
  // FIX #2: Main Fetch Effect
  // ---------------------------------------------------------
  useEffect(() => {
    const auth = getAuth();
    let cancelled = false;

    const run = async () => {
      if (!viewerKey) return;

      const key = `${viewerKey}:${activeTab}`;

      // Stop Clause: If we already have items and the key matches, STOP.
      // This prevents the loop when you return from product details.
      if (items.length > 0 && loadedKeyRef.current === key) {
        return;
      }

      if (loadedKeyRef.current === key) return;

      setError("");

      // Logic to check if we can restore (Late check)
      const snapshotMatches =
        !skipSnapshot &&
        snapshot?.uid === viewerKey &&
        snapshot?.tab === activeTab &&
        Array.isArray(snapshot?.items) &&
        snapshot.items.length > 0;

      if (snapshotMatches) {
        if (snapshot?.seed) feedSeedRef.current = snapshot.seed;

        restoringRef.current = true;
        restoreScrollYRef.current = Number(snapshot.scrollY || 0);

        setItems(snapshot.items);
        setHasMore(Boolean(snapshot.hasMore));
        setLoading(false);

        loadedKeyRef.current = key;
        return;
      }

      // Fetch Fresh
      let succeeded = false;
      try {
        setLoading(true);

        const payload = buildFeedPayload({ excludeIds: [] });
        const user = auth.currentUser;
        const headers = { "Content-Type": "application/json" };
        if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`;

        const resp = await fetch(FEED_URL, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(data?.error || "Feed failed");

        if (cancelled) return;

        const got = Array.isArray(data?.items) ? data.items : [];
        console.log("[feed sample keys]", got?.[0] ? Object.keys(got[0]) : null);
console.log("[feed sample condition]", got?.[0]?.condition, got?.[0]?.itemCondition, got?.[0]?.productCondition);

        setItems(got);
        setHasMore(Boolean(data?.hasMore) && got.length > 0);
        succeeded = true;
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || "Feed failed");
        setItems([]);
        setHasMore(false);
      } finally {
        if (!cancelled) {
          setLoading(false);
          loadedKeyRef.current = succeeded ? key : null;
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };

    // 🔥 DEPENDENCIES:
    // 1. Removed 'snapshot' object (fixes the loop).
    // 2. Added 'snapshot?.uid' (fixes the auth mismatch).
    // 3. Removed 'cacheKey' (replaced with viewerKey).
  }, [viewerKey, activeTab, buildFeedPayload, skipSnapshot, snapshot?.uid]);

  // Restore scroll
  useLayoutEffect(() => {
    if (!restoringRef.current) return;
    const targetY = restoreScrollYRef.current;
    if (targetY == null) return;

    let tries = 0;
    const MAX_TRIES = 30;

    const tick = () => {
      const maxY = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const y = Math.min(targetY, maxY);

      window.scrollTo(0, y);

      const closeEnough = Math.abs(window.scrollY - y) < 2;
      const enoughHeight = maxY >= targetY - 2;

      tries += 1;
      if ((closeEnough && enoughHeight) || tries >= MAX_TRIES) {
        restoringRef.current = false;
        restoreScrollYRef.current = null;
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [items.length]);

  // Load more
  const loadMore = useCallback(async () => {
    const vk = viewerKeyRef.current;
    if (!vk) return;

    if (!hasMoreRef.current || loadingMore || loading) return;

    try {
      setLoadingMore(true);
      setError("");

      const excludeIds = getExcludeIds();
      const payload = buildFeedPayload({ excludeIds });

      const auth = getAuth();
      const user = auth.currentUser;
      const headers = { "Content-Type": "application/json" };
      if (user) {
        const token = await user.getIdToken();
        headers.Authorization = `Bearer ${token}`;
      }

      const resp = await fetch(FEED_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || "Load more failed");

      const got = Array.isArray(data?.items) ? data.items : [];

      const prevSet = new Set(
        (itemsRef.current || [])
          .map((x) => x?.productId || x?.id)
          .filter(Boolean),
      );
      const next = got.filter((x) => {
        const id = x?.productId || x?.id;
        return id && !prevSet.has(id);
      });

      if (next.length) setItems((prev) => [...prev, ...next]);

      setHasMore(Boolean(data?.hasMore) && got.length > 0 && next.length > 0);
    } catch (e) {
      setError(e?.message || "Load more failed");
    } finally {
      setLoadingMore(false);
    }
  }, [activeTab, buildFeedPayload, getExcludeIds, loading, loadingMore]);

  // Observer
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { root: null, rootMargin: "900px", threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  // Save on unmount
  useEffect(() => {
    return () => {
      saveSnapshotNow();
    };
  }, [saveSnapshotNow]);

  return (
    <>
      <SEO
        title="Home - My Thrift"
        description="Discover products picked for you on My Thrift"
        url="https://www.shopmythrift.store/"
      />
      <div className="sticky top-0 z-40 bg-white">
        {/* TOP BAR */}
        <div className="flex items-center gap-3 px-3 py-3 mt-2">
          <div
            className="flex-1 bg-gray-100 rounded-full px-3 py-2 flex items-center gap-2 cursor-pointer"
            onClick={() => {
              saveSnapshotNow();
              navigate("/search", { state: { autofocus: true } });
            }}
          >
            <CiSearch className="text-2xl text-gray-800" />
            <input
              className="w-full bg-transparent py-1.5 font-opensans outline-none text-sm text-gray-800 placeholder:text-gray-600"
              placeholder="Search items, vendors...."
              readOnly
              onPointerDown={() => {
                saveSnapshotNow();
                navigate("/search", { state: { autofocus: true } });
              }}
            />
          </div>

          <div className="relative">
            <VscBell
              onClick={() => {
                saveSnapshotNow();
                navigate("/notifications");
              }}
              className="text-2xl cursor-pointer"
            />
            {hasUnreadNotifications && (
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full ring-2 ring-white bg-red-500" />
            )}
          </div>
        </div>

        {/* FILTER BLOCKS */}
        <div className="px-3 pb-2">
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-">
            {FEED_TABS.map((t) => {
              const active = t.key === activeTab;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => onSelectTab(t.key)}
                  className={[
                    "shrink-0 px-4 py-2 rounded-xl text-sm font-opensans ",
                    active
                      ? "bg-orange-50 text-customOrange border border-customOrange"
                      : "bg-gray-100 text-gray-600 ",
                  ].join(" ")}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* FEED */}
      <div className="px-3  pb-24">
        {loading ? (
          <HomeFeedSkeleton />
        ) : error ? (
          <div className="mt-6">
            <p className="text-sm font-opensans text-red-600">
              Feed error: {error}
            </p>
            <button
              className="mt-3 px-4 py-2 font-opensans rounded-lg bg-black text-white text-sm"
              onClick={() => window.location.reload()}
              type="button"
            >
              Reload
            </button>
          </div>
        ) : normalizedItems.length === 0 ? (
          <p className="text-sm font-opensans text-gray-500 mt-6">
            No products returned yet.
          </p>
        ) : (
          <>
            {!uid && (
              <LoginPrompt
                onLogin={() => {
                  saveSnapshotNow();
                  navigate("/confirm-user", { state: { from: "/" } });
                }}
              />
            )}
            <div className="grid grid-cols-2 gap-3 mt-3">
              {normalizedItems.map((product) => {
                const id = product.id || product.productId;

                return (
                  <div
                    key={id}
                    onClickCapture={(e) => {
                      if (
                        e.target.closest("button, a, input, textarea, select")
                      )
                        return;
                      saveSnapshotNow();
                    }}
                  >
                    <ProductCard product={product} />
                  </div>
                );
              })}
            </div>

            <div ref={sentinelRef} className="h-10" />

            {loadingMore && (
              <div className="py-6 flex justify-center">
                <RotatingLines
                  visible
                  width="24"
                  strokeWidth="4"
                  animationDuration="0.9"
                  ariaLabel="loading-more"
                  strokeColor="#f9531e"
                />
              </div>
            )}

            {!hasMore && normalizedItems.length > 0 && (
              <div className="py-8 text-center ">
                <CaughtUp />
                <p className="text-sm mt-2 font-opensans font-medium text-customOrange">
                  You’re all caught up.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default Homepage;
