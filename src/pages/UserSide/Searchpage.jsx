import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { motion } from "framer-motion";
import Downshift from "downshift";
import { VscClose } from "react-icons/vsc";
import { VscHistory } from "react-icons/vsc";
import { useNavigate, useSearchParams } from "react-router-dom";
import { IoChevronBackOutline } from "react-icons/io5";
import { CiSearch } from "react-icons/ci";
import { MdCancel, MdOutlineArrowBack, MdTrendingUp } from "react-icons/md";
import SEO from "../../components/Helmet/SEO";
import { useDispatch, useSelector } from "react-redux";
import {
  saveSearchSnapshot,
  clearSearchSnapshot,
} from "../../redux/actions/searchSnapshot";

import { FiFilter } from "react-icons/fi";
import SearchFilterModal, {
  buildFiltersPayload,
} from "../../components/Search/SearchFilterModal";
import { MdHistory } from "react-icons/md"; // ✅ recent icon
import SearchFilterBar from "../../components/Search/SearchFilterBar"; // ✅ NEW
import { GoArrowLeft } from "react-icons/go";

import VendorSearchCard from "../../components/VendorsData/VendorSearchCard";
import { AiOutlineArrowLeft } from "react-icons/ai";
import ProductCard from "../../components/Products/ProductCard";
import Loading from "../../components/Loading/Loading";
import { RotatingLines } from "react-loader-spinner";
import VendorResultsBar from "../../components/VendorsData/VendorResultsBar";
const SUGGEST_URL =
  "https://us-central1-ecommerce-ba520.cloudfunctions.net/suggestV3";
const SEARCH_URL =
  "https://us-central1-ecommerce-ba520.cloudfunctions.net/searchV3";

const VENDOR_SEARCH_URL =
  "https://us-central1-ecommerce-ba520.cloudfunctions.net/vendorSearchV1";

const VENDOR_PAGE_SIZE = 20;

const PAGE_SIZE = 60;

const DEFAULT_FILTERS = {
  sort: "relevance",
  subTypes: [],

  sizeType: null,
  sizes: [],
  category: null,
  colors: [],
  priceMin: "",
  priceMax: "",
};

const DEFAULT_IMG =
  "https://images.saatchiart.com/saatchi/1750204/art/9767271/8830343-WUMLQQKS-7.jpg";

function cleanStr(x) {
  return typeof x === "string" ? x.trim() : "";
}

function debounce(fn, wait = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function NGN(value) {
  const n = Number(value || 0);
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `₦${n.toLocaleString()}`;
  }
}
function useROHeight(ref) {
  const [h, setH] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const next = Math.ceil(el.getBoundingClientRect().height || 0);
      setH((prev) => (prev === next ? prev : next));
    };

    update();

    // ResizeObserver is best; fallback to window resize
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return h;
}

function saveRecentSearch(q) {
  const normalized = cleanStr(q);
  if (!normalized) return;
  const key = "mythrift_recent_searches_v3";
  const prev = JSON.parse(localStorage.getItem(key) || "[]");
  const next = [normalized, ...prev.filter((x) => x !== normalized)].slice(
    0,
    12,
  );
  localStorage.setItem(key, JSON.stringify(next));
}

function readRecentSearches() {
  const key = "mythrift_recent_searches_v3";
  return JSON.parse(localStorage.getItem(key) || "[]");
}

function renderHighlighted(text, query) {
  const t = (text || "").toString();
  const q = (query || "").toString().trim();
  if (!q) return t;

  const lowerT = t.toLowerCase();
  const lowerQ = q.toLowerCase();
  const idx = lowerT.indexOf(lowerQ);

  if (idx === -1) return t;

  const before = t.slice(0, idx);
  const match = t.slice(idx, idx + q.length);
  const after = t.slice(idx + q.length);

  return (
    <span>
      {before}
      <span className="font-bold text-black">{match}</span>
      {after}
    </span>
  );
}

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQ = cleanStr(searchParams.get("q") || "");
  const urlVQ = cleanStr(searchParams.get("vq") || "");

  const [input, setInput] = useState(urlQ);
  const tabParam = cleanStr(searchParams.get("tab") || "");
  const initialTab =
    tabParam === "vendors"
      ? "vendors"
      : tabParam === "items"
        ? "items"
        : urlVQ
          ? "vendors"
          : "items";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [filterSection, setFilterSection] = useState(null); // "size"|"category"|"color"|"price"|null

  const openFilter = (sectionOrNull) => {
    setFilterSection(sectionOrNull || null);
    setIsFilterOpen(true);
  };
  const [vendorSuggestLoading, setVendorSuggestLoading] = useState(false);
  const [vendorSuggest, setVendorSuggest] = useState([]);

  const [vendorResultsLoading, setVendorResultsLoading] = useState(false);
  const [vendorResultsLoadingMore, setVendorResultsLoadingMore] =
    useState(false);
  const [vendors, setVendors] = useState([]);
  const [vendorTotal, setVendorTotal] = useState(0);
  const [vendorNextCursor, setVendorNextCursor] = useState(null);
  const [vendorHasMore, setVendorHasMore] = useState(false);

  const vendorSuggestAbortRef = useRef(null);
  const vendorSearchAbortRef = useRef(null);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const filtersKey = useMemo(
    () => JSON.stringify(appliedFilters),
    [appliedFilters],
  );

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (appliedFilters.sort && appliedFilters.sort !== "relevance") n += 1;
    if (appliedFilters.subTypes?.length) n += 1;
    if (appliedFilters.sizeType && appliedFilters.sizes?.length) n += 1;
    if (appliedFilters.category) n += 1;
    if (appliedFilters.colors?.length) n += 1;
    if (appliedFilters.priceMin || appliedFilters.priceMax) n += 1;
    return n;
  }, [appliedFilters]);

  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestQueries, setSuggestQueries] = useState([]);
  const [suggestProducts, setSuggestProducts] = useState([]);
  const [facets, setFacets] = useState(null);

  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsLoadingMore, setResultsLoadingMore] = useState(false);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  const [recent, setRecent] = useState(() => readRecentSearches());
  const [menuOpen, setMenuOpen] = useState(false);
  const dispatch = useDispatch();
  const snapshot = useSelector((s) => s.searchSnapshot?.snapshot);

  // chips row visibility (only matters on results view)
  const [chipsVisible, setChipsVisible] = useState(true);
  const chipsVisibleRef = useRef(true);
  useEffect(() => {
    chipsVisibleRef.current = chipsVisible;
  }, [chipsVisible]);

  // measure header rows
  const restoreScrollYRef = useRef(null);
  const restoringRef = useRef(false);

  const searchRowRef = useRef(null);
  const dockRowRef = useRef(null);
  function clearRecentSearches() {
    const key = "mythrift_recent_searches_v3";
    localStorage.removeItem(key);
    setRecent([]);
  }

  const searchRowH = useROHeight(searchRowRef); // search input row
  const dockRowH = useROHeight(dockRowRef); // tabs row OR chips row (same slot)
  const headerRef = useRef(null);
  const dockContentRef = useRef(null);

  const dockContentH = useROHeight(dockContentRef);

  // derived “mode” flags (usable in effects)
  const showAutocomplete = activeTab === "items" && Boolean(input) && menuOpen;
  const showResults =
    Boolean(urlQ) && !showAutocomplete && activeTab === "items";
  const showVendorResults = activeTab === "vendors" && Boolean(urlVQ);

  // what’s currently visible under the input?
  const visibleDockH = showResults ? (chipsVisible ? dockRowH : 0) : dockRowH;

  // used by recent/autocomplete panels
  const overlayTop = searchRowH + visibleDockH;

  // spacer keeps content from going under fixed header (stable height)

  useEffect(() => {
    setInput(activeTab === "items" ? urlQ : urlVQ);
  }, [urlQ, urlVQ, activeTab]);

  useEffect(() => {
    setChipsVisible(true);
  }, [urlQ]);
  useEffect(() => {
    if (!showResults) {
      setChipsVisible(true);
      return;
    }

    let raf = 0;
    const s = {
      lastY: window.scrollY || 0,
      dir: null, // "up" | "down"
      acc: 0, // accumulated movement in current direction
    };

    const MIN_DELTA = 4; // ignore micro scrolls
    const HIDE_AFTER_Y = 140; // don't hide immediately at top
    const HIDE_ACC = 48; // must scroll down “enough” to hide
    const SHOW_ACC = 72; // must scroll up “enough” to show
    const TOP_FORCE_SHOW = 60; // near top: always show

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;

        const y = window.scrollY || 0;
        const dy = y - s.lastY;
        s.lastY = y;

        if (Math.abs(dy) < MIN_DELTA) return;

        const dir = dy > 0 ? "down" : "up";
        if (dir !== s.dir) {
          s.dir = dir;
          s.acc = 0;
        }
        s.acc += Math.abs(dy);

        // always show close to top
        if (y < TOP_FORCE_SHOW) {
          if (!chipsVisibleRef.current) setChipsVisible(true);
          return;
        }

        // hide on clear downward intent
        if (dir === "down" && y > HIDE_AFTER_Y && s.acc > HIDE_ACC) {
          if (chipsVisibleRef.current) setChipsVisible(false);
          return;
        }

        // show only on clear upward intent
        if (dir === "up" && s.acc > SHOW_ACC) {
          if (!chipsVisibleRef.current) setChipsVisible(true);
        }
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [showResults]);
  useEffect(() => {
    if (!urlVQ) {
      setVendors([]);
      setVendorTotal(0);
      setVendorNextCursor(null);
      setVendorHasMore(false);
      return;
    }
    runVendorSearchFirstPage(urlVQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlVQ]);
  useEffect(() => {
    const el = vendorSentinelRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e.isIntersecting) runVendorSearchLoadMore();
      },
      { root: null, rootMargin: "800px", threshold: 0 },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [
    vendorHasMore,
    vendorNextCursor,
    vendorResultsLoading,
    vendorResultsLoadingMore,
    urlVQ,
  ]);
  useEffect(() => {
    const tab = cleanStr(searchParams.get("tab") || "");

    if (tab === "vendors") setActiveTab("vendors");
    else if (tab === "items") setActiveTab("items");
    else if (urlVQ)
      setActiveTab("vendors"); // fallback
    else setActiveTab("items");
  }, [searchParams, urlVQ]);

  const suggestAbortRef = useRef(null);
  const searchAbortRef = useRef(null);

  async function callSuggest(q) {
    if (activeTab !== "items") return;
    const query = cleanStr(q);
    if (query.length < 2) {
      setSuggestQueries([]);
      setSuggestProducts([]);
      return;
    }

    suggestAbortRef.current?.abort?.();
    const ac = new AbortController();
    suggestAbortRef.current = ac;

    setSuggestLoading(true);
    try {
      const res = await fetch(SUGGEST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ac.signal,
        body: JSON.stringify({ q: query, limit: 8 }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      setSuggestQueries(Array.isArray(data.queries) ? data.queries : []);
      setSuggestProducts(Array.isArray(data.products) ? data.products : []);
    } catch (e) {
      if (String(e?.name) !== "AbortError") console.error("suggest error:", e);
    } finally {
      setSuggestLoading(false);
    }
  }

  const debouncedSuggest = useMemo(() => debounce(callSuggest, 220), []);
  const vendorSentinelRef = useRef(null);

  async function runSearchFirstPage(q, filtersOverride) {
    if (activeTab !== "items") return;
    const query = cleanStr(q);
    if (!query) {
      setItems([]);
      setTotal(0);
      setNextCursor(null);
      setHasMore(false);
      setFacets(null);
      return;
    }

    const finalFilters = filtersOverride ?? appliedFilters;

    searchAbortRef.current?.abort?.();
    const ac = new AbortController();
    searchAbortRef.current = ac;

    setResultsLoading(true);
    setItems([]);
    setTotal(0);
    setNextCursor(null);
    setHasMore(false);
    setFacets(null);

    try {
      const res = await fetch(SEARCH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ac.signal,
        body: JSON.stringify({
          q: query,
          pageSize: PAGE_SIZE,
          page: 0,
          sort: finalFilters.sort || "relevance",
          filters: buildFiltersPayload(finalFilters),
          cursor: null,
          strictVariant: false,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      const got = Array.isArray(data.items) ? data.items : [];
      setItems(got);
      setTotal(Number(data.total || 0));
      setFacets(data.facets || null);
      const cursor = data.nextCursor || null;
      setNextCursor(cursor);
      setHasMore(Boolean(cursor) && got.length > 0);
    } catch (e) {
      if (String(e?.name) !== "AbortError") console.error("search error:", e);
    } finally {
      setResultsLoading(false);
    }
  }
  async function callVendorSuggest(q) {
    const query = cleanStr(q);
    if (query.length < 2) {
      setVendorSuggest([]);
      return;
    }

    vendorSuggestAbortRef.current?.abort?.();
    const ac = new AbortController();
    vendorSuggestAbortRef.current = ac;

    setVendorSuggestLoading(true);
    try {
      // simplest: reuse vendor search endpoint for "suggest", just smaller pageSize
      const res = await fetch(VENDOR_SEARCH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ac.signal,
        body: JSON.stringify({
          q: query,
          pageSize: 8,
          cursor: null,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      setVendorSuggest(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      if (String(e?.name) !== "AbortError")
        console.error("vendor suggest error:", e);
    } finally {
      setVendorSuggestLoading(false);
    }
  }

  const debouncedVendorSuggest = useMemo(
    () => debounce(callVendorSuggest, 220),
    [],
  );

  async function runVendorSearchFirstPage(q) {
    const query = cleanStr(q);
    if (!query) {
      setVendors([]);
      setVendorTotal(0);
      setVendorNextCursor(null);
      setVendorHasMore(false);
      return;
    }

    vendorSearchAbortRef.current?.abort?.();
    const ac = new AbortController();
    vendorSearchAbortRef.current = ac;

    setVendorResultsLoading(true);
    setVendors([]);
    setVendorTotal(0);
    setVendorNextCursor(null);
    setVendorHasMore(false);

    try {
      const res = await fetch(VENDOR_SEARCH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ac.signal,
        body: JSON.stringify({
          q: query,
          pageSize: VENDOR_PAGE_SIZE,
          cursor: null,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      const got = Array.isArray(data.items) ? data.items : [];
      setVendors(got);
      setVendorTotal(Number(data.total || 0));

      const next = data.nextCursor || null;
      setVendorNextCursor(next);
      setVendorHasMore(Boolean(next) && got.length > 0);
    } catch (e) {
      if (String(e?.name) !== "AbortError")
        console.error("vendor search error:", e);
    } finally {
      setVendorResultsLoading(false);
    }
  }

  async function runVendorSearchLoadMore() {
    if (!urlVQ) return;
    if (!vendorHasMore || vendorResultsLoadingMore || vendorResultsLoading)
      return;
    if (!vendorNextCursor) return;

    setVendorResultsLoadingMore(true);
    try {
      const res = await fetch(VENDOR_SEARCH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: urlVQ,
          pageSize: VENDOR_PAGE_SIZE,
          cursor: vendorNextCursor,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      const got = Array.isArray(data.items) ? data.items : [];
      setVendors((prev) => [...prev, ...got]);

      const next = data.nextCursor || null;
      setVendorNextCursor(next);
      setVendorHasMore(Boolean(next) && got.length > 0);
    } catch (e) {
      console.error("vendor load more error:", e);
    } finally {
      setVendorResultsLoadingMore(false);
    }
  }

  const onBackPress = (closeMenuFn) => {
    const hasTyped = Boolean(cleanStr(input));
    const hasQuery = Boolean(cleanStr(urlQ) || cleanStr(urlVQ));

    // FIRST TAP: clear input + exit results + show recents
    if (hasTyped || hasQuery) {
      closeMenuFn?.();
      setInput("");
      setSuggestQueries([]);
      setSuggestProducts([]);
      setChipsVisible(true);

      // remove q from url so results disappear and recent shows
      setSearchParams({});

      // refresh recent list immediately
      setRecent(readRecentSearches());
      return;
    }

    // SECOND TAP: actually leave page
    closeMenuFn?.();
    navigate("/newhome");
  };

  async function runSearchLoadMore() {
    if (activeTab !== "items") return;
    if (!urlQ) return;
    if (!hasMore || resultsLoadingMore || resultsLoading) return;
    if (!nextCursor) return;

    setResultsLoadingMore(true);
    try {
      const res = await fetch(SEARCH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: urlQ,
          pageSize: PAGE_SIZE,
          sort: appliedFilters.sort || "relevance",
          filters: buildFiltersPayload(appliedFilters),
          cursor: nextCursor,
          strictVariant: false,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      const got = Array.isArray(data.items) ? data.items : [];
      setItems((prev) => [...prev, ...got]);

      const cursor = data.nextCursor || null;
      setNextCursor(cursor);
      setHasMore(Boolean(cursor) && got.length > 0);
    } catch (e) {
      console.error("load more error:", e);
    } finally {
      setResultsLoadingMore(false);
    }
  }
  useEffect(() => {
    setRecent(readRecentSearches());

    const sameQ =
      snapshot && cleanStr(snapshot.q) === cleanStr(urlQ) && Boolean(urlQ);

    if (sameQ) {
      restoringRef.current = true;
      restoreScrollYRef.current = Number(snapshot.scrollY || 0);

      setAppliedFilters(snapshot.appliedFilters || DEFAULT_FILTERS);
      setItems(snapshot.items || []);
      setTotal(Number(snapshot.total || 0));
      setFacets(snapshot.facets || null);
      setNextCursor(snapshot.nextCursor || null);
      setHasMore(Boolean(snapshot.hasMore));

      // ✅ force filter bar visible on return (prevents “blank header space”)
      setChipsVisible(true);

      setInput(snapshot.input ?? urlQ);
      return;
    }

    // fresh search flow
    restoringRef.current = false;
    restoreScrollYRef.current = null;

    setAppliedFilters(DEFAULT_FILTERS);
    runSearchFirstPage(urlQ, DEFAULT_FILTERS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQ, snapshot]);

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
  }, [items.length, resultsLoading, resultsLoadingMore]);

  useEffect(() => {
    // when tab changes away, close suggestion menu-ish states
    if (activeTab !== "items") {
      setSuggestQueries([]);
      setSuggestProducts([]);
    }
  }, [activeTab]);
  const sentinelRef = useRef(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e.isIntersecting) runSearchLoadMore();
      },
      { root: null, rootMargin: "800px", threshold: 0 },
    );

    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sentinelRef.current,
    hasMore,
    nextCursor,
    resultsLoading,
    resultsLoadingMore,
    urlQ,
    filtersKey,
  ]);

  const downshiftItems = useMemo(() => {
    const qItems = (suggestQueries || []).map((q) => ({
      type: "query",
      id: `q:${q}`,
      label: q,
    }));

    const pItems = (suggestProducts || []).map((p) => ({
      type: "product",
      id: `p:${p.id || p.productId || ""}`,
      product: p,
    }));

    return [...qItems, ...pItems];
  }, [suggestQueries, suggestProducts]);

  function submitItemSearch(nextQ) {
    const q = cleanStr(nextQ);
    if (!q) return;
    saveRecentSearch(q);
    setRecent(readRecentSearches());

    setAppliedFilters(DEFAULT_FILTERS);
    setSearchParams({ q, tab: "items" });
  }

  function submitVendorSearch(nextQ) {
    const q = cleanStr(nextQ);
    if (!q) return;

    setSearchParams({ vq: q, tab: "vendors" });
  }

  return (
    <>
      <SEO
        title={`Search - My Thrift`}
        description={`Search products on My Thrift`}
        url={`https://www.shopmythrift.store/search`}
      />

      {/* ✅ NOT motion.div here (no transform ancestor) */}
      <div className="w-full min-h-screen bg-white">
        <Downshift
          items={downshiftItems}
          itemToString={(item) => {
            if (!item) return "";
            if (item.type === "query") return item.label || "";
            if (item.type === "product") return item.product?.name || "";
            return "";
          }}
          onStateChange={(changes) => {
            if (Object.prototype.hasOwnProperty.call(changes, "isOpen")) {
              setMenuOpen(Boolean(changes.isOpen));
            }
          }}
          onChange={(selected) => {
            if (!selected) return;

            if (selected.type === "query") {
              const q = selected.label || "";
              setInput(q);
              submitItemSearch(q);
              return;
            }

            if (selected.type === "product") {
              const p = selected.product;
              const id = p?.id || p?.productId;
              if (id) navigate(`/product/${id}`);
            }
          }}
        >
          {({
            getInputProps,
            getItemProps,
            getMenuProps,
            isOpen,
            openMenu,
            closeMenu,
            highlightedIndex,
          }) => {
            const showAutocomplete =
              activeTab === "items" && Boolean(input) && menuOpen; // use menuOpen for consistency
            const showResults =
              Boolean(urlQ) && !showAutocomplete && activeTab === "items";
            const DOCK_EXTRA = 0;

            const dockTargetH = showResults
              ? chipsVisible
                ? dockContentH + DOCK_EXTRA
                : 0
              : showVendorResults
                ? dockContentH + DOCK_EXTRA
                : dockContentH + DOCK_EXTRA;

            const overlayTop = 150;
            const spacerH = overlayTop;

            const safeSearchH = Number(searchRowH || 0);
            const safeDockH = Number(dockRowH || 0);

            const visibleDockH = showResults
              ? chipsVisible
                ? safeDockH
                : 0
              : safeDockH;

            const dockSlide = -(safeDockH || 92);

            return (
              <div className="relative">
                {resultsLoading && (
                  <div className="fixed inset-0 z-[9999] bg-white backdrop-blur-sm flex items-center justify-center">
                    <Loading />
                  </div>
                )}

                {/* ✅ FIXED HEADER (now truly fixed) */}
                <div
                  ref={headerRef}
                  className="fixed top-0 left-0 right-0 z-40 bg-white p-3"
                >
                  {/* Search bar */}
                  <div ref={searchRowRef} className="flex items-center gap-3">
                    <AiOutlineArrowLeft
                      className="text-2xl text-gray-500 cursor-pointer"
                      onClick={() => onBackPress(closeMenu)}
                    />

                    <div className="relative flex-1">
                      <input
                        {...getInputProps({
                          placeholder: "Search My Thrift",
                          onFocus: () => openMenu(),
                          onChange: (e) => {
                            const v = e.target.value;
                            setInput(v);
                            openMenu();
                            if (activeTab === "items") debouncedSuggest(v);
                            else debouncedVendorSuggest(v);
                          },
                          onKeyDown: (e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (activeTab === "items")
                                submitItemSearch(input);
                              else submitVendorSearch(input);

                              closeMenu();
                            }
                          },
                        })}
                        value={input}
                        className="w-full bg-gray-50 focus:outline-none focus:ring-0 font-opensans text-black text-lg rounded-full pl-12 pr-4 py-4 font-medium"
                      />

                      <CiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-2xl text-gray-700" />
                      {input && (
                        <VscClose
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl text-gray-600 cursor-pointer"
                          onClick={() => {
                            setInput("");
                            setSuggestQueries([]);
                            setSuggestProducts([]);
                            closeMenu();

                            if (activeTab === "vendors")
                              setSearchParams({ tab: "vendors" });
                            else setSearchParams({ tab: "items" });
                          }}
                        />
                      )}
                    </div>
                  </div>

                  <div
                    className="relative overflow-hidden"
                    style={{
                      height: dockTargetH,
                      transition: "height 220ms ease-out",
                    }}
                  >
                    <div
                      ref={dockContentRef}
                      className="pt-3 pb-2"
                      style={{
                        opacity: showResults ? (chipsVisible ? 1 : 0) : 1,
                        transition: "opacity 160ms ease-out",
                        pointerEvents:
                          showResults && !chipsVisible ? "none" : "auto",
                      }}
                    >
                      {!showResults && (
                        <div className=" w-full flex border-b border-gray-100">
                          {[
                            { key: "items", label: "Items" },
                            { key: "vendors", label: "Vendors" },
                          ].map((t) => {
                            const active = activeTab === t.key;
                            return (
                              <button
                                key={t.key}
                                type="button"
                                onClick={() => {
                                  setActiveTab(t.key);

                                  const next = new URLSearchParams(
                                    searchParams,
                                  );
                                  next.set("tab", t.key); // "items" or "vendors"
                                  setSearchParams(next, { replace: true });
                                }}
                                className="relative flex-1 py-3 flex justify-center items-center"
                              >
                                <span
                                  className={[
                                    "text-base font-opensans font-semibold transition-colors duration-200",
                                    active ? "text-gray-900" : "text-gray-400",
                                  ].join(" ")}
                                >
                                  {t.label}
                                </span>

                                {active && (
                                  <div
                                    className={[
                                      "absolute bottom-0 h-[5px] bg-customOrange rounded-t-full",
                                      t.key === "vendors" ? "w-16" : "w-10",
                                    ].join(" ")}
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* ITEMS results bar */}
                      {showResults && activeTab === "items" && (
                        <SearchFilterBar
                          appliedFilters={appliedFilters}
                          total={total}
                          resultsLoading={resultsLoading}
                          activeFilterCount={activeFilterCount}
                          onOpenFilter={openFilter}
                        />
                      )}

                      {/* VENDORS results text (under tabs, same dock area) */}
                      {activeTab === "vendors" && Boolean(urlVQ) && (
                        <VendorResultsBar
                          total={vendorTotal}
                          loading={vendorResultsLoading}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* ✅ Spacer */}
                <div
                  style={{
                    height: spacerH,
                    transition: "height 220ms ease-out",
                  }}
                />

                {/* Recent */}
                {activeTab === "items" && !input && (
                  <div
                    className="fixed left-0 right-0 bottom-0 z-[9998] bg-white overflow-y-auto"
                    style={{ top: overlayTop }}
                  >
                    {recent.length > 0 ? (
                      <div className="bg-white">
                        <div className="px-4 py-2 flex items-center justify-between">
                          <p className="text-xl font-opensans font-semibold text-black">
                            Recent searches
                          </p>

                          <button
                            type="button"
                            onClick={clearRecentSearches}
                            className="text-lg font-opensans font-normal text-customOrange"
                          >
                            Clear All
                          </button>
                        </div>

                        {recent.map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => {
                              submitItemSearch(q);
                              closeMenu();
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
                          >
                            <VscHistory className="text-2xl text-gray-500" />
                            <span className="font-opensans text-xl text-gray-900">
                              {q}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-6 text-sm font-opensans text-gray-500">
                        Start typing to search.
                      </div>
                    )}
                  </div>
                )}

                {/* Autocomplete */}
                <div
                  {...getMenuProps({
                    className: showAutocomplete
                      ? "fixed left-0 right-0 bottom-0 z-[9998] bg-white overflow-y-auto"
                      : "hidden",
                    style: showAutocomplete ? { top: overlayTop } : undefined,
                  })}
                >
                  <div className="mt-3 -mx-3 border-gray-100 bg-white">
                    {!suggestLoading && suggestQueries.length > 0 && (
                      <div className="py-2 ml-4">
                        {suggestQueries.map((qText, i) => {
                          const item = {
                            type: "query",
                            id: `q:${qText}`,
                            label: qText,
                          };

                          return (
                            <button
                              key={item.id}
                              type="button"
                              {...getItemProps({
                                item,
                                index: i,
                                onMouseDown: (e) => e.preventDefault(),
                              })}
                              className={[
                                "w-full flex items-center gap-3 px-4 py-3 text-left",
                                highlightedIndex === i
                                  ? "bg-gray-50"
                                  : "bg-white",
                              ].join(" ")}
                            >
                              <CiSearch className="text-2xl text-gray-600" />
                              <span className="font-opensans text-xl text-gray-900">
                                {renderHighlighted(qText, input)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* ✅ BODY: animate here if you still want slide-in */}
                <motion.div
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", stiffness: 100, damping: 20 }}
                  className=" pb-6"
                >
                  {activeTab === "vendors" ? (
                    urlVQ ? (
                      <div className="mt-12 space-y-3">
                        {vendors.length === 0 && !vendorResultsLoading ? (
                          <div className="py-10 text-center font-opensans text-gray-600">
                            ☹️ No vendors found.
                          </div>
                        ) : (
                          <>
                            {vendors.map((v) => (
                              <VendorSearchCard
                                key={v.vendorId || v.id}
                                vendor={v}
                              />
                            ))}

                            <div ref={vendorSentinelRef} className="h-10" />

                            {vendorResultsLoadingMore && (
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
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="mt-10 text-center text-sm font-opensans text-gray-500">
                        Search vendors by name.
                      </div>
                    )
                  ) : (
                    showResults && (
                      <div className="mt-4 px-3">
                        {items.length === 0 ? (
                          <div className="py-10 text-center font-opensans text-gray-600">
                            ☹️ No results found.
                          </div>
                        ) : (
                          <>
                            <div className="grid mt-16 grid-cols-2 gap-3">
                              {items.map((raw) => {
                                const id = raw?.id || raw?.productId;
                                const product = { ...raw, id };

                                return (
                                  <div
                                    key={id}
                                    onClickCapture={() => {
                                      dispatch(
                                        saveSearchSnapshot({
                                          q: urlQ,
                                          input,
                                          activeTab,
                                          appliedFilters,
                                          items,
                                          total,
                                          facets,
                                          nextCursor,
                                          hasMore,
                                          chipsVisible,
                                          scrollY: window.scrollY || 0,
                                        }),
                                      );
                                    }}
                                  >
                                    <ProductCard
                                      product={product}
                                      vendorId={product.vendorId}
                                      quickForThisVendor={false}
                                    />
                                  </div>
                                );
                              })}
                            </div>

                            <div ref={sentinelRef} className="h-10" />

                            {resultsLoadingMore && (
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
                          </>
                        )}
                      </div>
                    )
                  )}
                </motion.div>

                {/* Modal */}
                {activeTab === "items" && (
                  <SearchFilterModal
                    open={isFilterOpen}
                    initialSection={filterSection}
                    onClose={() => setIsFilterOpen(false)}
                    query={urlQ}
                    searchUrl={SEARCH_URL}
                    items={items}
                    facets={facets}
                    appliedFilters={appliedFilters}
                    onApply={(next) => {
                      setAppliedFilters(next);
                      setIsFilterOpen(false);
                      runSearchFirstPage(urlQ, next);
                    }}
                  />
                )}
              </div>
            );
          }}
        </Downshift>
      </div>
    </>
  );
}
