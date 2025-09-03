import React, { useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchFeaturedProducts } from "../../redux/reducers/featuredSlice";
import ProductCard from "./ProductCard";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

export default function FeaturedInfinite() {
  const dispatch = useDispatch();
  const { items, status, hasMore, hydrated } = useSelector(
    (s) => s.featured
  );

  // Prefetch before user hits the bottom
  const sentinelRef = useRef(null);

  // Initial load (only if not hydrated yet)
  useEffect(() => {
    if (!hydrated) {
      dispatch(fetchFeaturedProducts({ reset: true }));
    }
  }, [hydrated, dispatch]);

  // Infinite scroll with prefetch (rootMargin triggers early)
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (
          entry.isIntersecting &&
          status !== "loading" &&
          hasMore
        ) {
          dispatch(fetchFeaturedProducts());
        }
      },
      { root: null, rootMargin: "1200px 0px", threshold: 0 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [dispatch, status, hasMore]);

  const renderGrid = useCallback(() => {
    if (status === "loading" && items.length === 0) {
      // first-load skeletons
      return (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height={200} width="100%" />
          ))}
        </div>
      );
    }

    if (!items.length) {
      return (
        <div className="text-center mt-4 text-lg font-medium text-gray-500">
          No featured products right now.
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-4">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    );
  }, [status, items]);

  return (
    <section className="p-2 mt-4">
      <div className="flex items-center mb-6">
        <h1 className="text-xl font-semibold   font-opensans text-black">
          Featured Products ✨
        </h1>
        {/* optional star icon */}
      </div>

      {renderGrid()}

      {/* Loading indicator when fetching next page */}
      {status === "loading" && items.length > 0 && (
        <div className="flex justify-center py-4 text-xs text-gray-500 font-opensans">
          Loading more…
        </div>
      )}

      {/* Sentinel (prefetch trigger) */}
      <div ref={sentinelRef} className="h-4 w-full" />
    </section>
  );
}
