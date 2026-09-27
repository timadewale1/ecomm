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
import { getAnonymousIdV2 } from "../services/signals";
import { appHaptics } from "../services/haptics";
import {
  HOME_FEED_REFRESH_EVENT,
  nativeRefresh,
} from "../services/nativeRefresh";
import toast from "react-hot-toast";
import { selectHasUnreadNotifications } from "../redux/reducers/notificationsRealtimeSlice";

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
  import.meta.env.VITE_PUBLIC_FOR_YOU_FEED_V2_ENDPOINT ||
  "https://us-central1-ecommerce-ba520.cloudfunctions.net/getForYouFeedV2";
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

function attachFeedV2Attribution(items, data) {
  const feedRequestId =
    typeof data?.feedRequestId === "string" ? data.feedRequestId : "";

  const algorithmVersion =
    typeof data?.algorithmVersion === "string" ? data.algorithmVersion : "";

  return (Array.isArray(items) ? items : []).map((item, index) => ({
    ...item,
    feedRequestId,
    algorithmVersion,
    candidateSource: item?.candidateSource || "unknown",
    position: Number.isFinite(Number(item?.position))
      ? Number(item.position)
      : index,
  }));
}

const Homepage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const anonymousIdRef = useRef(getAnonymousIdV2());

  const navType =
    performance.getEntriesByType("navigation")[0]?.type || "navigate";
  const skipSnapshot = useSkipSnapshotOnceAfterHardReload();

  // Use selector, but do NOT put this object in useEffect dependencies
  const snapshot = useSelector((s) => s.homeFeedSnapshot?.snapshot);

  const auth0 = getAuth();
  const initialUid = auth0.currentUser?.uid || null;
  const [uid, setUid] = useState(() => initialUid || null);

  const [activeTab, setActiveTab] = useState(() => snapshot?.tab || "all");
  const guestKey = `guest:${anonymousIdRef.current}`;

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
  const hasUnreadNotifications = useSelector(selectHasUnreadNotifications);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [retryNonce, setRetryNonce] = useState(0);

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

  const prevUidRef = useRef(initialUid);
  const feedSeedRef = useRef(
    (!skipSnapshot && snapshot?.seed) ||
      `${Date.now().toString(36)}_${Math.random().toString(16).slice(2)}`,
  );

  const loadedKeyRef = useRef(canHydrate ? `${viewerKey}:${activeTab}` : null);

  // Shared request generation prevents an older pagination response from
  // mutating a newly refreshed feed.
  const feedGenerationRef = useRef(0);
  const loadMoreAbortRef = useRef(null);
  const refreshAbortRef = useRef(null);
  const refreshInFlightRef = useRef(false);
  const nativeRefreshHandlerRef = useRef(null);
  const refreshSessionExcludeIdsRef = useRef([]);

  const invalidateAsyncFeedWork = useCallback(() => {
    feedGenerationRef.current += 1;

    loadMoreAbortRef.current?.abort();
    refreshAbortRef.current?.abort();

    loadMoreAbortRef.current = null;
    refreshAbortRef.current = null;
    refreshInFlightRef.current = false;

    setLoadingMore(false);
    void nativeRefresh.endRefresh();
  }, []);

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
    const currentIds = (itemsRef.current || [])
      .map((x) => x?.productId || x?.id)
      .filter(Boolean);

    const combined = [
      ...(refreshSessionExcludeIdsRef.current || []),
      ...currentIds,
    ];

    return [...new Set(combined)].slice(-800);
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


  const buildFeedPayload = useCallback(
    ({ excludeIds, seed = feedSeedRef.current, tabKey = tabRef.current }) => {
      const tab = getTabByKey(tabKey);
      return {
        limit: PAGE_SIZE,
        anonymousId: anonymousIdRef.current,
        seed,
        excludeIds: Array.isArray(excludeIds) ? excludeIds : [],
        ...tab.payload,
      };
    },
    [],
  );

  const saveSnapshotNow = useCallback(() => {
    const it = itemsRef.current || [];
    if (it.length === 0) return;

    // Use current dynamic viewer key for saving
    const u = uidRef.current || snapshot?.uid || `guest:${anonymousIdRef.current}`;

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

      if (prevUidRef.current !== nextUid) {
        refreshSessionExcludeIdsRef.current = [];
        invalidateAsyncFeedWork();
      }

      setUid(nextUid);

      if (!nextUid && prevUidRef.current) {
        dispatch(clearHomeFeedSnapshot());
      }

      prevUidRef.current = nextUid;
    });
    return () => unsub();
  }, [dispatch, invalidateAsyncFeedWork]);

  // Tab click
  const onSelectTab = useCallback(
    (key) => {
      if (key === activeTab) return;

      invalidateAsyncFeedWork();
      refreshSessionExcludeIdsRef.current = [];
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
    [activeTab, invalidateAsyncFeedWork, saveSnapshotNow],
  );

  const retryFeed = useCallback(() => {
    invalidateAsyncFeedWork();
    setError("");
    setHasMore(true);
    setLoading(true);
    loadedKeyRef.current = null;
    setRetryNonce((value) => value + 1);
  }, [invalidateAsyncFeedWork]);

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

        const rawItems = Array.isArray(data?.items) ? data.items : [];
        const got = attachFeedV2Attribution(rawItems, data);

        console.log("[feed:v2]", {
          algorithmVersion: data?.algorithmVersion,
          feedRequestId: data?.feedRequestId,
          returned: got.length,
          hasMore: Boolean(data?.hasMore),
        });

        const nextHasMore = Boolean(data?.hasMore) && got.length > 0;

        itemsRef.current = got;
        hasMoreRef.current = nextHasMore;
        setItems(got);
        setHasMore(nextHasMore);
        succeeded = true;
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || "Feed failed");
        itemsRef.current = [];
        hasMoreRef.current = false;
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
  }, [
    viewerKey,
    activeTab,
    buildFeedPayload,
    skipSnapshot,
    snapshot?.uid,
    retryNonce,
  ]);

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

  // Native iOS pull-to-refresh. The visible feed remains in place until the
  // replacement V2 request succeeds.
  const refreshFeed = useCallback(async ({ triggerHaptic = true } = {}) => {
    if (refreshInFlightRef.current || loading) {
      await nativeRefresh.endRefresh();
      return;
    }

    const requestViewer = viewerKeyRef.current;
    const requestTab = tabRef.current;

    if (!requestViewer) {
      await nativeRefresh.endRefresh();
      return;
    }

    refreshInFlightRef.current = true;
    if (triggerHaptic) appHaptics.light();

    const generation = feedGenerationRef.current + 1;
    feedGenerationRef.current = generation;

    loadMoreAbortRef.current?.abort();
    loadMoreAbortRef.current = null;
    setLoadingMore(false);

    refreshAbortRef.current?.abort();
    const controller = new AbortController();
    refreshAbortRef.current = controller;

    const candidateSeed = `${Date.now().toString(36)}_${Math.random()
      .toString(16)
      .slice(2)}`;
    const excludeIds = getExcludeIds();

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      const authUidAtStart = user?.uid || null;
      const headers = { "Content-Type": "application/json" };

      if (user) {
        headers.Authorization = `Bearer ${await user.getIdToken()}`;
      }

      if (
        controller.signal.aborted ||
        feedGenerationRef.current !== generation
      ) {
        return;
      }

      const payload = buildFeedPayload({
        excludeIds,
        seed: candidateSeed,
        tabKey: requestTab,
      });

      const resp = await fetch(FEED_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || "Refresh failed");

      const authUidNow = getAuth().currentUser?.uid || null;
      if (
        controller.signal.aborted ||
        feedGenerationRef.current !== generation ||
        viewerKeyRef.current !== requestViewer ||
        tabRef.current !== requestTab ||
        authUidNow !== authUidAtStart
      ) {
        return;
      }

      const rawItems = Array.isArray(data?.items) ? data.items : [];
      const got = attachFeedV2Attribution(rawItems, data);

      if (!got.length) {
        toast("No new items right now.");
        return;
      }

      const nextHasMore = Boolean(data?.hasMore) && got.length > 0;

      // Keep the old visible IDs excluded for the rest of this seed session so
      // pagination does not immediately reintroduce refreshed-away products.
      refreshSessionExcludeIdsRef.current = excludeIds;
      feedSeedRef.current = candidateSeed;
      loadedKeyRef.current = `${requestViewer}:${requestTab}`;

      restoringRef.current = false;
      restoreScrollYRef.current = null;
      scrollYRef.current = 0;
      itemsRef.current = got;
      hasMoreRef.current = nextHasMore;

      setItems(got);
      setHasMore(nextHasMore);
      setError("");
      window.scrollTo(0, 0);

      dispatch(
        saveHomeFeedSnapshot({
          uid: requestViewer,
          tab: requestTab,
          items: got,
          seed: candidateSeed,
          hasMore: nextHasMore,
          scrollY: 0,
          savedAt: Date.now(),
        }),
      );

      console.log("[feed:v2] native refresh", {
        algorithmVersion: data?.algorithmVersion,
        feedRequestId: data?.feedRequestId,
        returned: got.length,
        excluded: excludeIds.length,
      });
    } catch (e) {
      if (e?.name !== "AbortError") {
        console.warn("[feed:v2] native refresh failed", e);
        toast.error("Couldn’t refresh your feed. Please try again.");
      }
    } finally {
      if (refreshAbortRef.current === controller) {
        refreshAbortRef.current = null;
      }

      refreshInFlightRef.current = false;
      await nativeRefresh.endRefresh();
    }
  }, [buildFeedPayload, dispatch, getExcludeIds, loading]);

  useEffect(() => {
    nativeRefreshHandlerRef.current = refreshFeed;
  }, [refreshFeed]);

  useEffect(() => {
    if (!nativeRefresh.isAvailable()) return undefined;

    let disposed = false;
    let listenerHandle = null;

    const setupNativeRefresh = async () => {
      listenerHandle = await nativeRefresh.addRefreshListener((event) => {
        if (!disposed) {
          void nativeRefreshHandlerRef.current?.({
            triggerHaptic: event?.source !== "home-tab",
          });
        }
      });

      if (disposed) {
        await listenerHandle?.remove?.();
        return;
      }

      await nativeRefresh.setEnabled({
        enabled: true,
        tintColor: "#f9531e",
        verticalOffset: 32,
      });

      // Handles a route change that occurs while setEnabled is crossing the
      // native bridge.
      if (disposed) {
        await nativeRefresh.setEnabled({ enabled: false });
      }
    };

    void setupNativeRefresh().catch((e) => {
      console.warn("[native-refresh] setup failed", e);
    });

    return () => {
      disposed = true;
      invalidateAsyncFeedWork();
      void listenerHandle?.remove?.();
      void nativeRefresh.setEnabled({ enabled: false });
    };
  }, [invalidateAsyncFeedWork]);

  // Fallback for a same-tab Home press if the native plugin is temporarily
  // unavailable while the route is mounting. It uses the exact same V2 flow.
  useEffect(() => {
    const onHomeTabRefresh = () => {
      void nativeRefreshHandlerRef.current?.({ triggerHaptic: false });
    };

    window.addEventListener(HOME_FEED_REFRESH_EVENT, onHomeTabRefresh);
    return () => {
      window.removeEventListener(HOME_FEED_REFRESH_EVENT, onHomeTabRefresh);
    };
  }, []);

  // Load more
  const loadMore = useCallback(async () => {
    const requestViewer = viewerKeyRef.current;
    if (!requestViewer) return;

    if (
      !hasMoreRef.current ||
      loadingMore ||
      loading ||
      refreshInFlightRef.current ||
      loadMoreAbortRef.current
    ) {
      return;
    }

    const generation = feedGenerationRef.current;
    const requestTab = tabRef.current;
    const requestSeed = feedSeedRef.current;
    const controller = new AbortController();
    loadMoreAbortRef.current = controller;

    try {
      setLoadingMore(true);

      const excludeIds = getExcludeIds();
      const payload = buildFeedPayload({
        excludeIds,
        seed: requestSeed,
        tabKey: requestTab,
      });

      const auth = getAuth();
      const user = auth.currentUser;
      const headers = { "Content-Type": "application/json" };
      if (user) {
        const token = await user.getIdToken();
        headers.Authorization = `Bearer ${token}`;
      }

      if (
        controller.signal.aborted ||
        feedGenerationRef.current !== generation
      ) {
        return;
      }

      const resp = await fetch(FEED_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || "Load more failed");

      if (
        controller.signal.aborted ||
        feedGenerationRef.current !== generation ||
        viewerKeyRef.current !== requestViewer ||
        tabRef.current !== requestTab ||
        feedSeedRef.current !== requestSeed
      ) {
        return;
      }

      const rawItems = Array.isArray(data?.items) ? data.items : [];
      const got = attachFeedV2Attribution(rawItems, data);

      const prevSet = new Set(
        (itemsRef.current || [])
          .map((x) => x?.productId || x?.id)
          .filter(Boolean),
      );
      const next = got.filter((x) => {
        const id = x?.productId || x?.id;
        return id && !prevSet.has(id);
      });

      if (next.length) {
        const merged = [...(itemsRef.current || []), ...next];
        itemsRef.current = merged;
        setItems(merged);
      }

      const nextHasMore =
        Boolean(data?.hasMore) && got.length > 0 && next.length > 0;
      hasMoreRef.current = nextHasMore;
      setHasMore(nextHasMore);
    } catch (e) {
      if (e?.name !== "AbortError") {
        console.warn("[feed:v2] load more failed", e);
        toast.error("Couldn’t load more products.");
      }
    } finally {
      if (loadMoreAbortRef.current === controller) {
        loadMoreAbortRef.current = null;
        setLoadingMore(false);
      }
    }
  }, [buildFeedPayload, getExcludeIds, loading, loadingMore]);

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
              onClick={retryFeed}
              type="button"
            >
              Try again
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
                  navigate("/login", { state: { returnTo: "/" } });
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
                    <ProductCard
                      product={product}
                      surface="home"
                      position={product.position}
                      requestId={product.feedRequestId}
                      algorithmVersion={product.algorithmVersion}
                      candidateSource={product.candidateSource}
                    />
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
