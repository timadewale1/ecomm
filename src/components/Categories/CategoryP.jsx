// components/Category/CategoryProducts.jsx
import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCategoryItems,
  resetCategoryItems,
} from "../../redux/reducers/categoryItemsSlice";
import { fetchCategoryProductTypes } from "../../redux/reducers/categoryTypesSlice";
import ProductCard from "../Products/ProductCard";
import { RotatingLines } from "react-loader-spinner";
import { GoChevronLeft } from "react-icons/go";
import { saveScroll, clearScroll } from "../../redux/reducers/scrollSlice";
import { LuListFilter } from "react-icons/lu";
import SEO from "../Helmet/SEO";

const canonical = (s) => {
  const v = String(s || "")
    .replace("-", " ")
    .trim()
    .toLowerCase();
  if (["men", "mens", "man"].includes(v)) return "Mens";
  if (["women", "womens", "lady", "ladies"].includes(v)) return "Womens";
  if (["kid", "kids", "children"].includes(v)) return "Kids";
  if (["all"].includes(v)) return "All";
  return s;
};

export default function CategoryProducts() {
  const { category: slug } = useParams();
  const category = canonical(slug);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const filterStorageKey = `cat:selectedType:${category}`;
  const [selectedType, setSelectedType] = useState(() => {
    return sessionStorage.getItem(filterStorageKey) || "All";
  });

  const scrollKey = `category:${category}:${selectedType}`;

  const savedY =
    useSelector((s) => s.scroll?.positions?.[scrollKey]) ??
    (typeof window !== "undefined"
      ? Number(sessionStorage.getItem(`scroll:${scrollKey}`) || 0)
      : 0);

  const { byCategory } = useSelector((s) => s.categoryItems);
  const bucket = byCategory[category] || {
    items: [],
    lastCursor: null,
    status: "idle",
    error: null,
  };

  const typesByCat =
    useSelector((s) => s.categoryTypes.byCategory[category]) || [];

  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState(null);
  const [noMore, setNoMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const BATCH_SIZE = 50;

  // guard flags for progressive restore
  const restoreRef = useRef({ trying: false, loadingMore: false });

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowFilterDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      const prev = window.history.scrollRestoration;
      window.history.scrollRestoration = "manual";
      return () => {
        window.history.scrollRestoration = prev;
      };
    }
  }, []);

  useEffect(() => {
    const persisted = sessionStorage.getItem(filterStorageKey) || "All";
    setSelectedType(persisted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  useEffect(() => {
    if (bucket.items.length === 0) {
      loadInitial();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, selectedType]);

  useEffect(() => {
    if (!typesByCat.length) {
      dispatch(fetchCategoryProductTypes({ category }));
    }
  }, [category, typesByCat.length, dispatch]);

  const loadInitial = async () => {
    setLoading(true);
    try {
      const res = await dispatch(
        fetchCategoryItems({
          category,
          productType: selectedType === "All" ? null : selectedType,
          lastCursor: null,
          pageSize: BATCH_SIZE,
        })
      ).unwrap();
      if (!res.lastCursor || res.items.length < BATCH_SIZE) setNoMore(true);
    } catch {
      // handled in slice
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (bucket.status === "loading" || noMore) return;
    if (!bucket.lastCursor) {
      setNoMore(true);
      return;
    }
    setLoading(true);
    try {
      const res = await dispatch(
        fetchCategoryItems({
          category,
          productType: selectedType === "All" ? null : selectedType,
          lastCursor: bucket.lastCursor,
          pageSize: BATCH_SIZE,
        })
      ).unwrap();
      if (!res.lastCursor || res.items.length < BATCH_SIZE) setNoMore(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const onScroll = () => {
      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 100
      ) {
        loadMore();
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket.lastCursor, bucket.status, noMore, selectedType]);

  // --- persist scroll on unmount + beforeunload + tab hide
  useEffect(() => {
    const persist = () => {
      const y = window.scrollY || 0;
      dispatch(saveScroll({ key: scrollKey, y }));
      sessionStorage.setItem(`scroll:${scrollKey}`, String(y));
    };
    const onBeforeUnload = () => persist();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") persist();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibility);
      persist();
    };
  }, [dispatch, scrollKey]);

  // --- progressive restore: keep trying until height is enough; auto loadMore as needed
  useEffect(() => {
    if (!savedY) return;
    if (restoreRef.current.trying) return;
    restoreRef.current.trying = true;

    let tries = 0;
    const maxTries = 40; // ~4s total at 100ms
    const tick = async () => {
      tries += 1;
      const doc = document.documentElement;
      const targetBottom = savedY + window.innerHeight - 20;
      const ready = doc.scrollHeight >= targetBottom;

      if (ready) {
        window.scrollTo(0, savedY);
        restoreRef.current.trying = false;
        return;
      }

      // Need more content; ask for next page (throttled)
      if (
        !noMore &&
        !restoreRef.current.loadingMore &&
        bucket.status !== "loading"
      ) {
        restoreRef.current.loadingMore = true;
        try {
          await loadMore();
        } finally {
          restoreRef.current.loadingMore = false;
        }
      }

      if (tries < maxTries) {
        setTimeout(tick, 100);
      } else {
        // give up politely
        restoreRef.current.trying = false;
      }
    };

    // start only when we have at least some items
    if (bucket.items.length) {
      setTimeout(tick, 0);
    } else {
      // wait for first items then start
      const startWhenItems = setInterval(() => {
        if (bucket.items.length) {
          clearInterval(startWhenItems);
          setTimeout(tick, 0);
        }
      }, 100);
      return () => clearInterval(startWhenItems);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedY, bucket.items.length, noMore, bucket.status]);

  const sortProducts = (dir) => {
    setSortOption(dir);
    setShowFilterDropdown(false);
  };

  const handleTypeSelect = async (type) => {
    setSelectedType(type);
    sessionStorage.setItem(filterStorageKey, type);

    setNoMore(false);
    dispatch(resetCategoryItems({ category }));

    const nextScrollKey = `category:${category}:${type}`;
    dispatch(clearScroll({ key: nextScrollKey }));
    sessionStorage.removeItem(`scroll:${nextScrollKey}`);
    window.scrollTo(0, 0);

    setLoading(true);
    try {
      const res = await dispatch(
        fetchCategoryItems({
          category,
          productType: type === "All" ? null : type,
          lastCursor: null,
          pageSize: BATCH_SIZE,
        })
      ).unwrap();
      if (!res.lastCursor || res.items.length < BATCH_SIZE) setNoMore(true);
    } finally {
      setLoading(false);
    }
  };

  const filtered = bucket.items
    .filter((p) =>
      (p.name || "").toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortOption === "high-to-low")
        return (+b.price || 0) - (+a.price || 0);
      if (sortOption === "low-to-high")
        return (+a.price || 0) - (+b.price || 0);
      return 0;
    });

  const productTypes = ["All", ...typesByCat];

  return (
    <>
      <SEO
        title={`${category} - My Thrift`}
        description={`Shop ${category} category on My Thrift`}
        url={`https://www.shopmythrift.store/category/${slug}`}
      />
      <div className="px-2 py-24">
        {/* Sticky top bar with back + sort */}
        <div className="fixed top-0 left-0 w-full bg-white z-50 px-2 pt-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <GoChevronLeft
                className="text-2xl cursor-pointer mr-2"
                onClick={() => navigate(-1)}
              />
              <h2 className="text-sm font-opensans font-semibold">
                {category} Items
              </h2>
            </div>
            <LuListFilter
              onClick={() => setShowFilterDropdown((v) => !v)}
              className="text-xl text-gray-600 cursor-pointer"
              title="Sort by price"
            />
            {showFilterDropdown && (
              <div
                ref={dropdownRef}
                className="absolute right-2 top-12 bg-white shadow-lg rounded-2xl w-40 p-3 z-50 font-opensans"
              >
                <span
                  className={`flex items-center justify-between text-xs cursor-pointer py-1 hover:text-customOrange ${
                    sortOption === "high-to-low"
                      ? "text-customOrange font-semibold"
                      : "text-gray-700"
                  }`}
                  onClick={() => sortProducts("high-to-low")}
                >
                  Price: High → Low
                  {sortOption === "high-to-low" && (
                    <span className="ml-2 text-customOrange">✓</span>
                  )}
                </span>
                <hr className="my-1 text-gray-200" />
                <span
                  className={`flex items-center justify-between text-xs cursor-pointer py-1 hover:text-customOrange ${
                    sortOption === "low-to-high"
                      ? "text-customOrange font-semibold"
                      : "text-gray-700"
                  }`}
                  onClick={() => sortProducts("low-to-high")}
                >
                  Price: Low → High
                  {sortOption === "low-to-high" && (
                    <span className="ml-2 text-customOrange">✓</span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* productType pills */}
          <div className="flex px-2 mb-2 w-full py-4 overflow-x-auto space-x-2 scrollbar-hide">
            {productTypes.map((type) => (
              <button
                key={type}
                onClick={() => handleTypeSelect(type)}
                className={`flex-shrink-0 h-12 px-4 text-xs font-semibold font-opensans rounded-full border transition-all duration-100 ${
                  selectedType === type
                    ? "bg-customOrange text-white"
                    : "bg-white text-black"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="pt-16 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>

        {/* Empty / Loading */}
        {!loading && bucket.status === "succeeded" && filtered.length === 0 && (
          <div className="text-center font-opensans text-xs text-gray-600 mt-4">
            No {category} products yet. Check back soon. 🧡
          </div>
        )}

        {loading && (
          <div className="flex justify-center my-4">
            <RotatingLines
              strokeColor="#f9531e"
              strokeWidth="5"
              animationDuration="0.75"
              width="20"
              visible
            />
          </div>
        )}
      </div>
    </>
  );
}
