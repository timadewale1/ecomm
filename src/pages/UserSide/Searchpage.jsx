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
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { IoChevronBackOutline } from "react-icons/io5";
import { CiSearch } from "react-icons/ci";
import { MdCancel, MdOutlineArrowBack, MdTrendingUp } from "react-icons/md";
import SEO from "../../components/Helmet/SEO";
import { useDispatch, useSelector } from "react-redux";
import {
  saveSearchSnapshot,
  clearSearchSnapshot,
} from "../../redux/actions/searchSnapshot";
import { track } from "../../services/signals";
import { FiFilter } from "react-icons/fi";
import SearchFilterModal, {
  buildFiltersPayload,
} from "../../components/Search/SearchFilterModal";
import { MdHistory } from "react-icons/md"; // ✅ recent icon
import SearchFilterBar from "../../components/Search/SearchFilterBar"; // ✅ NEW
import { GoArrowLeft } from "react-icons/go";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

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
function EmptySearchState({
  title = "No results found",
  subtitle = "Try a different keyword or check spelling.",
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center min-h-[40vh] px-20 py-20">
      <img
        src="/Search_empty.svg"
        alt="No results"
        className="w-24 h-24 object-contain"
      />
      <p className="mt-4 font-opensans text-base font-semibold text-gray-900">
        {title}
      </p>
      <p className="mt-1 font-opensans text-sm text-gray-500">{subtitle}</p>
    </div>
  );
}
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

function ProductGridSkeleton({ count = 10 }) {
  return (
    <div className="grid mt-4 grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
function VendorSearchCardSkeleton() {
  return (
    <div className="bg-gray-50 w-full p-4 rounded-xl">
      <div className="flex gap-3">
        <div className="w-24 h-24 shrink-0">
          <Skeleton circle width={96} height={96} />
        </div>

        <div className="min-w-0 flex-1">
          <Skeleton width="60%" height={18} />
          <div className="mt-2">
            <Skeleton width="85%" height={14} />
          </div>
          <div className="mt-2">
            <Skeleton width={110} height={18} borderRadius={999} />
          </div>
        </div>
      </div>

      <div className="mt-5 flex gap-4">
        <div className="flex-1">
          <Skeleton height={48} borderRadius={16} />
        </div>
        <div className="flex-1">
          <Skeleton height={48} borderRadius={16} />
        </div>
      </div>
    </div>
  );
}

function VendorListSkeleton({ count = 6 }) {
  return (
    <div className="mt-12 space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <VendorSearchCardSkeleton key={i} />
      ))}
    </div>
  );
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
function getSessionId() {
  const key = "mt_session_id";
  let v = sessionStorage.getItem(key);
  if (!v) {
    v =
      crypto?.randomUUID?.() ||
      `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    sessionStorage.setItem(key, v);
  }
  return v;
}

function redactQuery(q) {
  let s = cleanStr(q);
  // redact emails
  s = s.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]");
  // redact long numbers (phone-ish)
  s = s.replace(/\b\d{10,}\b/g, "[number]");
  return s;
}

function summarizeFilters(f) {
  return {
    sort: f?.sort || "relevance",
    category: f?.category || null,
    sizeType: f?.sizeType || null,
    subTypesCount: Array.isArray(f?.subTypes) ? f.subTypes.length : 0,
    colorsCount: Array.isArray(f?.colors) ? f.colors.length : 0,
    sizesCount: Array.isArray(f?.sizes) ? f.sizes.length : 0,
    hasPriceRange: Boolean(f?.priceMin || f?.priceMax),
  };
}

function priceBandFromRange(min, max) {
  const lo = Number(min || 0);
  const hi = Number(max || 0);

  // if you later add preset bands, you can map them here
  if (!lo && !hi) return null;
  return `${lo || 0}_${hi || "up"}`;
}

function buildIntentPayload({ query, filters, tab }) {
  const q = (query || "").trim().toLowerCase();
  const f = filters || {};

  return {
    tab,
    category: f.category || null,
    subTypes: Array.isArray(f.subTypes) ? f.subTypes : [],
    colors: Array.isArray(f.colors) ? f.colors : [],
    sizeType: f.sizeType || null,
    sizes: Array.isArray(f.sizes) ? f.sizes : [],
    priceMin: f.priceMin ? Number(f.priceMin) : null,
    priceMax: f.priceMax ? Number(f.priceMax) : null,
    priceBand: priceBandFromRange(f.priceMin, f.priceMax),
    vendorNameHint: tab === "vendors" ? q : null,
    confidence: 0.75, // filters-driven intent is usually strong
    version: "intentV1",
  };
}

function dedupe(arr) {
  return Array.from(new Set(arr));
}
function safeFocus(el) {
  if (!el) return false;

  try {
    // not supported everywhere
    el.focus({ preventScroll: true });
  } catch {
    try {
      el.focus();
    } catch {}
  }

  // optional: cursor at end (only if supported)
  try {
    const len = (el.value || "").length;
    el.setSelectionRange?.(len, len);
  } catch {}

  return document.activeElement === el;
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

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQ = cleanStr(searchParams.get("q") || "");
  const location = useLocation();
  const inputRef = useRef(null);

  const urlVQ = cleanStr(searchParams.get("vq") || "");
  const sessionId = useMemo(() => getSessionId(), []);
  const submitSourceRef = useRef("unknown");
  const lastLoggedRef = useRef(""); // prevent double logs

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
  const vendorSentinelRef = useRef(null);

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
  function logItemsImpression({ query, filters, got, offset, page }) {
    const searchSessionId = getSearchSessionId("items");
    const intent = buildIntentPayload({ query, filters, tab: "items" });

    track(
      "search_results_impression",
      {
        tab: "items",
        searchSessionId,
        intent,
        intentVersion: intent.version,
        query: redactQuery(query),
        page,
        resultsReturned: got.length,
        results: got.slice(0, 40).map((raw, i) => ({
          id: raw?.id || raw?.productId,
          vendorId: raw?.vendorId,
          position: offset + i + 1,
        })),
      },
      { surface: "search", sessionId },
    );
  }

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
  const openMenuRef = useRef(null);
  const lastAutofocusKeyRef = useRef(null);

  const wantsAutofocus = Boolean(location.state?.autofocus);

  useLayoutEffect(() => {
    if (!wantsAutofocus) return;

    // only once per navigation
    if (lastAutofocusKeyRef.current === location.key) return;
    lastAutofocusKeyRef.current = location.key;

    let raf = 0;
    let tries = 0;

    const tick = () => {
      const el = inputRef.current;

      if (el) {
        const ok = safeFocus(el);

        // open Downshift menu if you want (focus should trigger onFocus too, but this is explicit)
        openMenuRef.current?.();

        // quick debug
        console.log(
          "[autofocus] ok:",
          ok,
          "active:",
          document.activeElement === el,
        );
        return;
      }

      if (tries++ < 30) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => raf && cancelAnimationFrame(raf);
  }, [location.key, wantsAutofocus]);

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
  const searchSessionIdRef = useRef(null);
  const itemsPageRef = useRef(0);
  const vendorsPageRef = useRef(0);

  function newSearchSessionId() {
    return (
      crypto?.randomUUID?.() ||
      `${Date.now()}_${Math.random().toString(16).slice(2)}`
    );
  }

  function startNewSearchSession(kind = "items") {
    searchSessionIdRef.current = newSearchSessionId();
    if (kind === "items") itemsPageRef.current = 0;
    if (kind === "vendors") vendorsPageRef.current = 0;
    return searchSessionIdRef.current;
  }

  function getSearchSessionId(kind = "items") {
    // if user landed on /search?q=... directly, this ensures we still have an id
    return searchSessionIdRef.current || startNewSearchSession(kind);
  }

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
    getSearchSessionId("items");

    const finalFilters = filtersOverride ?? appliedFilters;
    const t0 = performance.now();
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
      itemsPageRef.current = 0;
      logItemsImpression({
        query,
        filters: finalFilters,
        got,
        offset: 0,
        page: 1,
      });

      setFacets(data.facets || null);
      const totalNum = Number(data.total || 0);
      setTotal(totalNum);
      const cursor = data.nextCursor || null;
      setNextCursor(cursor);
      setHasMore(Boolean(cursor) && got.length > 0);
      const searchSessionId = getSearchSessionId("items");
      const intent = buildIntentPayload({
        query,
        filters: finalFilters,
        tab: "items",
      });

      const logKey = `items|${searchSessionId}`; // per-search unique
      if (lastLoggedRef.current !== logKey) {
        lastLoggedRef.current = logKey;

        track(
          "search_submitted",
          {
            tab: "items",
            searchSessionId,
            intent,
            intentVersion: intent.version,
            query: redactQuery(query),
            queryLen: query.length,
            source: submitSourceRef.current || "unknown",
            filters: summarizeFilters(finalFilters),
            resultsTotal: totalNum,
            resultsReturned: got.length,
            hasResults: totalNum > 0,
            latencyMs: Math.round(performance.now() - t0),
            nextCursor: Boolean(cursor),
            searchVersion: "searchV3",
          },
          {
            surface: "search",
            path: `/search?q=${encodeURIComponent(query)}&tab=items`,
            sessionId,
          },
        );

        submitSourceRef.current = "unknown";
      }
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
    const t0 = performance.now();
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
      const totalNum = Number(data.total || 0);
      const next = data.nextCursor || null;
      setVendorNextCursor(next);
      setVendorHasMore(Boolean(next) && got.length > 0);
      const searchSessionId = getSearchSessionId("vendors");
      const logKey = `vendors|${searchSessionId}`;

      if (lastLoggedRef.current !== logKey) {
        lastLoggedRef.current = logKey;

        track(
          "search_submitted",
          {
            tab: "vendors",
            query: redactQuery(query),
            queryLen: query.length,
            source: submitSourceRef.current || "unknown",
            resultsTotal: totalNum,
            resultsReturned: got.length,
            hasResults: totalNum > 0,
            latencyMs: Math.round(performance.now() - t0),
            nextCursor: Boolean(next),
            searchVersion: "vendorSearchV1",
          },
          {
            surface: "search",
            path: `/search?vq=${encodeURIComponent(query)}&tab=vendors`,
            sessionId,
          },
        );

        submitSourceRef.current = "unknown";
      }
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

  // FIRST TAP: clear input + clear URL query (WITHOUT pushing history)
  if (hasTyped || hasQuery) {
    closeMenuFn?.();

    setInput("");
    setSuggestQueries([]);
    setSuggestProducts([]);
    setChipsVisible(true);

    // ✅ keep tab, just remove q/vq
    setSearchParams(
      { tab: activeTab === "vendors" ? "vendors" : "items" },
      { replace: true }
    );

    setRecent(readRecentSearches());
    return;
  }

  // SECOND TAP: actually leave Search
  closeMenuFn?.();

  const idx = window.history.state?.idx ?? 0;
  if (idx > 0) navigate(-1);
  else navigate("/", { replace: true }); // fallback if Search was the first page
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
      itemsPageRef.current += 1;
      logItemsImpression({
        query: urlQ,
        filters: appliedFilters,
        got,
        offset: items.length, // important: offset before append
        page: itemsPageRef.current + 1,
      });

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

  function submitItemSearch(nextQ, source = "enter") {
    const q = cleanStr(nextQ);
    if (!q) return;

    submitSourceRef.current = source;
    startNewSearchSession("items");
    saveRecentSearch(q);
    setRecent(readRecentSearches());

    setAppliedFilters(DEFAULT_FILTERS);
      setSearchParams({ q, tab: "items" }, { replace: true });
  }

  function submitVendorSearch(nextQ, source = "enter") {
    const q = cleanStr(nextQ);
    if (!q) return;

    submitSourceRef.current = source;
    startNewSearchSession("vendors");
    setSearchParams({ vq: q, tab: "vendors" }, { replace: true });
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
              submitItemSearch(q, "suggestion");
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
            openMenuRef.current = openMenu;

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
            const inputProps = getInputProps({
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
                  if (activeTab === "items") submitItemSearch(input, "enter");
                  else submitVendorSearch(input, "enter");
                  closeMenu();
                }
              },
            });

            const { ref: downshiftRef, ...restInputProps } = inputProps;
            return (
              <div className="relative">
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
                        {...restInputProps}
                        ref={(node) => {
                          // keep Downshift working
                          if (typeof downshiftRef === "function")
                            downshiftRef(node);
                          else if (downshiftRef) downshiftRef.current = node;

                          // your ref for autofocus
                          inputRef.current = node;
                        }}
                        value={input}
                        autoFocus={wantsAutofocus}
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

                            setSearchParams(
    { tab: activeTab === "vendors" ? "vendors" : "items" },
    { replace: true }
  );
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
                          <p className="text-lg font-opensans font-semibold text-black">
                            Recent searches
                          </p>

                          <button
                            type="button"
                            onClick={clearRecentSearches}
                            className="text-base font-opensans font-normal text-customOrange"
                          >
                            Clear All
                          </button>
                        </div>

                        {recent.map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => {
                              submitItemSearch(q, "recent");
                              closeMenu();
                            }}
                            className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-gray-50"
                          >
                            <VscHistory className="text-2xl text-gray-500" />
                            <span className="font-opensans text-base text-gray-900">
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
                  <div className=" -mx-3 border-gray-100 bg-white">
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
                                "w-full flex items-center gap-3 px-4 py-4 text-left",
                                highlightedIndex === i
                                  ? "bg-gray-50"
                                  : "bg-white",
                              ].join(" ")}
                            >
                              <CiSearch className="text-2xl text-gray-600" />
                              <span className="font-opensans text-base text-gray-900">
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
                        {vendorResultsLoading ? (
                          <VendorListSkeleton count={6} />
                        ) : vendors.length === 0 ? (
                          <EmptySearchState
                            title="No vendors found"
                            subtitle="Try searching the store name differently."
                          />
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
                        Search vendors on My Thrift.....
                      </div>
                    )
                  ) : (
                    showResults && (
                      <div className="mt-4 px-3">
                        {resultsLoading ? (
                          <ProductGridSkeleton count={10} />
                        ) : items.length === 0 ? (
                          <EmptySearchState
                            title="No items found"
                            subtitle="Try different keyords or remove search filters."
                          />
                        ) : (
                          <>
                            <div className="grid mt-10 grid-cols-2 gap-3">
                              {items.map((raw, idx) => {
                                const id = raw?.id || raw?.productId;
                               const product = normalizeProductForCard(raw);

                                return (
                                  <div
                                    key={id}
                                    onClickCapture={(e) => {
                                      if (
                                        e.target.closest(
                                          "button, a, input, textarea, select",
                                        )
                                      )
                                        return;

                                      const searchSessionId =
                                        getSearchSessionId("items");
                                      const intent = buildIntentPayload({
                                        query: urlQ,
                                        filters: appliedFilters,
                                        tab: "items",
                                      });

                                      track(
                                        "search_result_click",
                                        {
                                          tab: "items",
                                          searchSessionId,
                                          intent,
                                          intentVersion: intent.version,
                                          query: redactQuery(urlQ),
                                          productId: id,
                                          vendorId: product.vendorId,
                                          position: idx + 1,
                                        },
                                        { surface: "search", sessionId },
                                      );

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
                                      surface="search"
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
                      submitSourceRef.current = "filter_apply";
                      startNewSearchSession("items");
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
