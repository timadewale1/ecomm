import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import SEO from "../components/Helmet/SEO";
import { saveExploreUi } from "../redux/reducers/exploreUiSlice";
import { appHaptics } from "../services/haptics";
import { getCategoryBrowseTypes } from "../services/categoryBrowseTaxonomy";
import { getCategoryBrowseImage } from "../services/categoryBrowseImages";

const AUDIENCES = [
  { key: "womens", label: "Women" },
  { key: "mens", label: "Men" },
  { key: "everyday", label: "Everyday" },
];

const AUDIENCE_KEYS = new Set(AUDIENCES.map((audience) => audience.key));

function createBrowseParams({ audience, productType = null }) {
  const params = new URLSearchParams({
    tab: "items",
    browse: "categories",
    audience,
  });

  if (productType) {
    params.set("productType", productType);
  }

  return params;
}

export default function Categories() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const cachedUi = useSelector((state) => state.exploreUi || {});
  const cachedAudience = AUDIENCE_KEYS.has(cachedUi.activeAudience)
    ? cachedUi.activeAudience
    : "womens";
  const [activeAudience, setActiveAudience] = useState(cachedAudience);

  const visibleTypes = useMemo(
    () => getCategoryBrowseTypes(activeAudience),
    [activeAudience],
  );

  useLayoutEffect(() => {
    const savedY = Number(cachedUi.scrollY || 0);
    if (savedY <= 0) return;

    const frame = requestAnimationFrame(() => window.scrollTo(0, savedY));
    return () => cancelAnimationFrame(frame);
    // Restore only once when the Categories route mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => () => {
      dispatch(
        saveExploreUi({
          activeAudience,
          scrollY: window.scrollY || 0,
        }),
      );
    },
    [activeAudience, dispatch],
  );

  const selectAudience = (audience) => {
    if (audience === activeAudience) return;
    void appHaptics.selection();
    setActiveAudience(audience);
    window.scrollTo({ top: 0, behavior: "auto" });
    dispatch(saveExploreUi({ activeAudience: audience, scrollY: 0 }));
  };

  const openBrowseResults = (productType = null) => {
    void appHaptics.light();
    dispatch(
      saveExploreUi({
        activeAudience,
        scrollY: window.scrollY || 0,
      }),
    );

    const params = createBrowseParams({
      audience: activeAudience,
      productType,
    });
    navigate(`/search?${params.toString()}`);
  };

  return (
    <>
      <SEO
        title="Categories | My Thrift"
        description="Browse My Thrift by product type"
        url="https://www.shopmythrift.store/explore"
      />

      <main className="min-h-screen bg-white pb-[calc(112px+env(safe-area-inset-bottom,0px))] font-opensans text-[#111827]">
        <div className="sticky top-0 z-30 bg-white px-4 pb-0 pt-2">
          <button
            type="button"
            onClick={() =>
              navigate("/search", { state: { autofocus: true } })
            }
            className="flex h-12 w-full items-center gap-3 rounded-full bg-[#f7f7f7] px-4 text-left"
            aria-label="Search items and vendors"
          >
            <Search aria-hidden="true" className="h-5 w-5 text-[#4b5563]" strokeWidth={1.75} />
            <span className="text-base font-normal leading-5 text-[#4b5563]">
              Search items, vendors...
            </span>
          </button>

          <div
            className="mt-3 grid grid-cols-3 border-b border-[#e5e7eb]"
            role="tablist"
            aria-label="Category departments"
          >
            {AUDIENCES.map((audience) => {
              const active = activeAudience === audience.key;
              return (
                <button
                  key={audience.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => selectAudience(audience.key)}
                  className={`relative flex h-10 items-center justify-center px-2 text-base font-medium leading-5 ${
                    active ? "text-[#111827]" : "text-[#4b5563]"
                  }`}
                >
                  {audience.label}
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute -bottom-px h-1 w-full max-w-[76px] rounded-full bg-customOrange"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-4 pt-4">
          <button
            type="button"
            onClick={() => openBrowseResults()}
            className="flex h-14 w-full items-center justify-between rounded-lg bg-[#ededed] px-4 text-sm font-medium leading-[18px] text-black active:scale-[0.99]"
          >
            <span>Explore All</span>
            <ChevronRight aria-hidden="true" className="h-5 w-5" strokeWidth={1.75} />
          </button>

          <div className="mt-4 grid grid-cols-3 gap-x-2 gap-y-4">
            {visibleTypes.map((productType) => {
              const image = getCategoryBrowseImage(productType.type);

              return (
                <button
                  key={productType.type}
                  type="button"
                  onClick={() => openBrowseResults(productType.type)}
                  className={`flex aspect-square min-w-0 flex-col items-center rounded-lg border border-[#ededed] bg-white px-2 py-2 text-center text-sm font-normal leading-[18px] text-[#111827] active:bg-[#f7f7f7] ${
                    image ? "justify-between" : "justify-center"
                  }`}
                >
                  {image && (
                    <div className="flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden">
                      <img
                        src={image}
                        alt=""
                        aria-hidden="true"
                        draggable="false"
                        decoding="async"
                        className="h-full w-full select-none object-contain"
                      />
                    </div>
                  )}
                  <span className={`${image ? "mt-1 shrink-0" : ""} break-words`}>
                    {productType.type}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
}
