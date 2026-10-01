import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import Skeleton from "react-loading-skeleton";
import toast from "react-hot-toast";
import { FaStar } from "react-icons/fa";
import { RotatingLines } from "react-loader-spinner";
import {
  LuBadgeCheck,
  LuChevronDown,
  LuMoreVertical,
  LuInfo,
  LuSearch,
  LuShieldCheck,
  LuStar,
  LuSparkles,
  LuTrash2,
  LuX,
} from "react-icons/lu";
import ProductCard from "../Products/ProductCard";
import AppBackButton from "../layout/AppBackButton";
import AppBottomSheet from "../layout/AppBottomSheet";
import AppScrollToTopButton from "../layout/AppScrollToTopButton";
import NavigationHistorySheet from "../layout/NavigationHistorySheet";
import SearchFilterModal from "../Search/SearchFilterModal";
import SearchFilterBar from "../Search/SearchFilterBar";
import ReviewComposer from "../Reviews/ReviewComposer";
import {
  fetchEligibleReviewOrders,
  findRequestedReviewOrder,
} from "../Reviews/reviewOrders";
import {
  DEFAULT_VENDOR_CATALOG_FILTERS,
  fetchVendorReviews,
  removeVendorReview,
  setVendorCatalogFilters,
  setVendorCatalogQuery,
  setStoreTab,
} from "../../redux/reducers/storepageVendorsSlice";
import { appHaptics } from "../../services/haptics";
import { useProductJourneyHistory } from "../../custom-hooks/useProductJourney";
import { updateCurrentVendorJourneyLabel } from "../../services/productJourney";
import { deleteOwnedVendorReview } from "../../services/vendorReviews";
import { VENDOR_STORE_SEARCH_URL } from "../../services/vendorStoreSearch";
import { acquireScrollLock } from "../../services/scrollLock";
import "./vendor-store-experience.css";

const TABS = ["products", "reviews", "about"];

const FIGMA_ASSETS = "/figma-assets/vendor-store";
const HEADER_ICONS = {
  back: `${FIGMA_ASSETS}/arrow-left.svg`,
  search: `${FIGMA_ASSETS}/search.svg`,
  share: `${FIGMA_ASSETS}/share.svg`,
};
const ABOUT_ICONS = {
  description: `${FIGMA_ASSETS}/about-description.svg`,
  market: `${FIGMA_ASSETS}/about-market.svg`,
  categories: `${FIGMA_ASSETS}/about-categories.svg`,
  restock: `${FIGMA_ASSETS}/about-restock.svg`,
  stockpile: `${FIGMA_ASSETS}/about-stockpile.svg`,
  delivery: `${FIGMA_ASSETS}/about-delivery.svg`,
};

const BADGES = [
  {
    key: "newbie",
    label: "Newbie",
    asset: "/Newbie.svg",
    base: "#A2DB6E",
    ink: "#377400",
    modalBase: "#DCFCE7",
    modalGlow: "rgba(16, 185, 129, 0.22)",
    modalLabelBg: "rgba(255,255,255,0.75)",
    note: "A new My Thrift vendor beginning to build their selling history.",
  },
  {
    key: "rising",
    label: "Rising Seller",
    asset: "/Rising.svg",
    base: "#F9B39C",
    ink: "#8A3217",
    modalBase: "#FEE2E2",
    modalGlow: "rgba(239, 68, 68, 0.35)",
    modalLabelBg: "rgba(255,255,255,0.75)",
    note: "Building momentum with growing activity and completed orders.",
  },
  {
    key: "consistent",
    label: "Consistent Seller",
    asset: "/Consistent.svg",
    base: "#FFD6A6",
    ink: "#874600",
    modalBase: "#FFEDD5",
    modalGlow: "rgba(249, 115, 22, 0.35)",
    modalLabelBg: "rgba(255,255,255,0.75)",
    note: "Consistently active and regularly adding fresh products.",
  },
  {
    key: "speedy",
    label: "Steady Seller",
    asset: "/Speedy.svg",
    base: "#BCE8C6",
    ink: "#166534",
    modalBase: "#DCFCE7",
    modalGlow: "rgba(34, 197, 94, 0.35)",
    modalLabelBg: "rgba(255,255,255,0.75)",
    note: "Maintains steady order activity and dependable fulfilment.",
  },
  {
    key: "reliable",
    label: "Reliable Seller",
    asset: "/Reliable.svg",
    base: "#C8E7DF",
    ink: "#065F46",
    modalBase: "#D1FAE5",
    modalGlow: "rgba(16, 185, 129, 0.35)",
    modalLabelBg: "rgba(255,255,255,0.75)",
    note: "Trusted by buyers for dependable service and strong ratings.",
  },
  {
    key: "power",
    label: "Power Seller",
    asset: "/Power.svg",
    base: "#E4D2F3",
    ink: "#6B21A8",
    modalBase: "#E9D5FF",
    modalGlow: "rgba(168, 85, 247, 0.35)",
    modalLabelBg: "rgba(255,255,255,0.75)",
    note: "A high-volume seller with an established fulfilment record.",
  },
  {
    key: "og",
    label: "OG Seller",
    asset: "/OG.svg",
    base: "#F4E2AA",
    ink: "#7B5100",
    modalBase: "#FDECC8",
    modalGlow: "rgba(245, 158, 11, 0.35)",
    modalLabelBg: "rgba(255,255,255,0.75)",
    note: "A top-tier, long-standing vendor with a proven track record.",
  },
];

const clean = (value) => String(value || "").trim();
const lower = (value) => clean(value).toLowerCase();

const timestampToMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.toDate === "function") return value.toDate().getTime();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const badgeFor = (value) => {
  const badge = lower(value);
  if (badge.includes("og")) return BADGES[6];
  if (badge.includes("power")) return BADGES[5];
  if (badge.includes("reliable")) return BADGES[4];
  if (badge.includes("steady") || badge.includes("speedy")) return BADGES[3];
  if (badge.includes("consistent")) return BADGES[2];
  if (badge.includes("rising")) return BADGES[1];
  return BADGES[0];
};

const vendorImage = (vendor) =>
  vendor?.profileImageUrl || vendor?.photoURL || vendor?.coverImageUrl || "";

const reviewImages = (review) =>
  Array.from(
    new Set([
      ...(review?.reviewImageUrls || []),
      ...(review?.productSnapshots || [])
        .map((item) => item?.productImageUrl)
        .filter(Boolean),
    ]),
  );

const reviewDate = (review) => {
  const millis = review?.createdAtMs || timestampToMillis(review?.createdAt);
  if (!millis) return "Just now";
  const diff = Math.max(0, Date.now() - millis);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date(millis));
};

function StoreHeader({
  vendorName,
  quickMode,
  onBack,
  onBackLongPress,
  showHistoryHint,
  onHome,
  onShare,
  onSearch,
  checkoutCount,
  onCheckout,
}) {
  const [showVendorName, setShowVendorName] = useState(() =>
    typeof window !== "undefined" ? window.scrollY > 72 : false,
  );

  useEffect(() => {
    let frameId = 0;

    const updateTitle = () => {
      frameId = 0;
      const scrollTop = Math.max(
        window.scrollY || 0,
        document.documentElement?.scrollTop || 0,
      );
      setShowVendorName(scrollTop > 72);
    };

    const handleScroll = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(updateTitle);
    };

    updateTitle();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <header className="vendor-store-header">
      <div className="vendor-store-header-row">
        {quickMode ? (
          <button type="button" onClick={onHome} aria-label="Home">
            <img src="/newlogo.png" alt="My Thrift" />
          </button>
        ) : (
          <AppBackButton
            onClick={onBack}
            onLongPress={onBackLongPress}
            hintText={showHistoryHint ? "Hold to see browsing history" : ""}
            hintMaxShows={2}
            icon={<img src={HEADER_ICONS.back} alt="" />}
          />
        )}
        <p
          className={`vendor-store-header-title ${showVendorName ? "is-visible" : ""}`}
          aria-hidden={!showVendorName}
        >
          {vendorName || "Vendor"}
        </p>
        <div className="vendor-store-header-actions">
          <button type="button" onClick={onSearch} aria-label="Search this store"><img src={HEADER_ICONS.search} alt="" /></button>
          <button type="button" onClick={onShare} aria-label="Share this store"><img src={HEADER_ICONS.share} alt="" /></button>
          {quickMode && checkoutCount > 0 && (
            <button type="button" className="vendor-store-checkout" onClick={onCheckout}>
              Checkout ({checkoutCount})
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function StoreSearchHeader({ vendorName, value, onChange, onClose }) {
  const inputRef = useRef(null);
  useEffect(() => inputRef.current?.focus(), []);
  return (
    <header className="vendor-store-header vendor-store-search-header">
      <div className="vendor-store-header-row">
        <button type="button" onClick={onClose} aria-label="Close store search"><img src={HEADER_ICONS.back} alt="" /></button>
        <div className="vendor-store-search-field">
          <LuSearch aria-hidden="true" />
          <input
            ref={inputRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={`Search ${vendorName || "this store"}`}
          />
          {value && <button type="button" onClick={() => onChange("")} aria-label="Clear search"><LuX /></button>}
        </div>
      </div>
    </header>
  );
}

function StockpileArtwork() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="stockpile-basket" x1="8" y1="16" x2="31" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFB444" />
          <stop offset="1" stopColor="#F56B35" />
        </linearGradient>
      </defs>
      <path d="M12 19.5h16l-1.6 11H13.6L12 19.5Z" fill="url(#stockpile-basket)" />
      <path d="M15.5 20c.7-5.2 8.3-5.2 9 0" fill="none" stroke="#9A441F" strokeWidth="2" strokeLinecap="round" />
      <rect x="13" y="12" width="6" height="8" rx="2" fill="#8B7CFF" />
      <rect x="20" y="10" width="7" height="10" rx="2" fill="#42C9A5" />
      <path d="M16.5 23v4M20 23v4M23.5 23v4" stroke="#FFF4D9" strokeWidth="1.5" strokeLinecap="round" />
      <path d="m30.5 8 .8 1.8 1.8.8-1.8.8-.8 1.8-.8-1.8-1.8-.8 1.8-.8.8-1.8Z" fill="#FF9C45" />
    </svg>
  );
}

function DeliveryArtwork() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="delivery-van" x1="7" y1="14" x2="32" y2="29" gradientUnits="userSpaceOnUse">
          <stop stopColor="#45C8FF" />
          <stop offset="1" stopColor="#7A69F8" />
        </linearGradient>
      </defs>
      <path d="M7 29h26" stroke="#B7D9F4" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 14h14v13H9a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z" fill="url(#delivery-van)" />
      <path d="M23 18h5.2l4 4.5V27H23v-9Z" fill="#FF9E45" />
      <path d="M27 19.5h1l2.1 2.4H27v-2.4Z" fill="#FFF6DF" />
      <rect x="11" y="17" width="8" height="7" rx="1.5" fill="#FFE174" />
      <path d="M15 17v7" stroke="#E5A82E" strokeWidth="1.2" />
      <circle cx="13" cy="28" r="3" fill="#29345B" />
      <circle cx="28" cy="28" r="3" fill="#29345B" />
      <circle cx="13" cy="28" r="1.2" fill="#DCEBFF" />
      <circle cx="28" cy="28" r="1.2" fill="#DCEBFF" />
      <path d="M5.5 18H3M5.5 22H2" stroke="#68BFEA" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function StoreHighlightRotator({ vendor, onBadge }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const badge = badgeFor(vendor?.badge);
  const stockpileEnabled = vendor?.stockpile?.enabled === true;
  const stockpileDuration = Math.max(
    1,
    Number(vendor?.stockpile?.durationInWeeks) || 2,
  );
  const stockpileText = stockpileEnabled
    ? `${stockpileDuration}-week stockpile`
    : "Stockpiling unavailable";
  const deliveryText = clean(vendor?.deliveryMode) || "Delivery not specified";

  const highlights = [
    {
      key: "badge",
      text: badge.label,
      tone: "badge",
      icon: <img src={badge.asset} alt="" />,
      action: onBadge,
      color: badge.ink,
    },
    {
      key: "stockpile",
      text: stockpileText,
      tone: "stockpile",
      icon: <StockpileArtwork />,
    },
    {
      key: "delivery",
      text: deliveryText,
      tone: "delivery",
      icon: <DeliveryArtwork />,
    },
  ];

  useEffect(() => {
    setActiveIndex(0);
    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % highlights.length);
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, [vendor?.id, vendor?.uid]);

  const activeHighlight = highlights[activeIndex] || highlights[0];
  const content = (
    <>
      <span className="vendor-store-highlight-icon">{activeHighlight.icon}</span>
      <span
        className="vendor-store-highlight-text"
        style={activeHighlight.color ? { color: activeHighlight.color } : undefined}
      >
        {activeHighlight.text}
      </span>
    </>
  );

  return (
    <div
      className="vendor-store-highlight-rotator"
      aria-label={`Store highlight: ${activeHighlight.text}`}
    >
      {activeHighlight.action ? (
        <button
          key={activeHighlight.key}
          type="button"
          className={`vendor-store-highlight-pill is-${activeHighlight.tone}`}
          onClick={activeHighlight.action}
          aria-label={`Open ${activeHighlight.text} badge details`}
        >
          {content}
        </button>
      ) : (
        <div
          key={activeHighlight.key}
          className={`vendor-store-highlight-pill is-${activeHighlight.tone}`}
        >
          {content}
        </div>
      )}
    </div>
  );
}

function StoreSummary({ vendor, productCount, isFollowing, isFollowLoading, onFollow, onReviews, onBadge }) {
  const ratingCount = Number(vendor?.ratingCount || 0);
  const rating = ratingCount ? Number(vendor?.rating || 0) / ratingCount : 0;

  return (
    <section className="vendor-store-summary" aria-label="Vendor summary">
      <div className="vendor-store-identity">
        {vendorImage(vendor) ? (
          <img src={vendorImage(vendor)} alt={vendor?.shopName || "Vendor"} />
        ) : (
          <span>{clean(vendor?.shopName).slice(0, 1).toUpperCase() || "V"}</span>
        )}
        <div>
          <h1>{vendor?.shopName || "Vendor"}</h1>
          <StoreHighlightRotator vendor={vendor} onBadge={onBadge} />
        </div>
      </div>

      <div className="vendor-store-metrics">
        <button type="button" onClick={onReviews}>
          <strong>{rating.toFixed(1)} <FaStar className="vendor-rating-star" /></strong>
          <span>{ratingCount} reviews</span>
        </button>
        <i aria-hidden="true" />
        <div><strong>{Number(vendor?.followersCount || 0).toLocaleString()}</strong><span>Followers</span></div>
        <i aria-hidden="true" />
        <div><strong>{productCount}</strong><span>Items available</span></div>
      </div>

      <button
        type="button"
        className={`vendor-store-follow ${isFollowing ? "is-following" : ""}`}
        onClick={onFollow}
        disabled={isFollowLoading}
        aria-label={
          isFollowLoading
            ? "Updating follow status"
            : isFollowing
              ? "Unfollow vendor"
              : "Follow vendor"
        }
      >
        {isFollowLoading ? (
          <span aria-hidden="true">
            <RotatingLines
              strokeColor={isFollowing ? "#f9531e" : "#ffffff"}
              strokeWidth="4"
              animationDuration="0.75"
              width="20"
              visible
            />
          </span>
        ) : isFollowing ? (
          "Following"
        ) : (
          "Follow"
        )}
      </button>
    </section>
  );
}

export function VendorStoreSkeleton() {
  return (
    <main className="vendor-store-page vendor-store-page-skeleton" aria-busy="true" aria-label="Loading vendor store">
      <header className="vendor-store-header">
        <div className="vendor-store-header-row">
          <Skeleton circle width={24} height={24} />
          <div className="vendor-store-header-actions">
            <Skeleton circle width={24} height={24} />
            <Skeleton circle width={24} height={24} />
          </div>
        </div>
      </header>
      <section className="vendor-store-summary">
        <div className="vendor-store-identity">
          <Skeleton circle width={80} height={80} />
          <div className="vendor-store-summary-copy">
            <Skeleton width={168} height={25} />
            <Skeleton width={106} height={28} borderRadius={100} />
          </div>
        </div>
        <div className="vendor-store-metrics vendor-store-skeleton-metrics">
          {Array.from({ length: 3 }).map((_, index) => (
            <React.Fragment key={index}>
              {index > 0 && <i aria-hidden="true" />}
              <div><Skeleton width={38} height={20} /><Skeleton width={68} height={18} /></div>
            </React.Fragment>
          ))}
        </div>
        <Skeleton height={48} borderRadius={12} />
      </section>
      <nav className="vendor-store-tabs vendor-store-skeleton-tabs" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} width={62} height={20} />)}
      </nav>
      <section className="vendor-store-panel">
        <div className="vendor-store-filter-row" aria-hidden="true">
          {[44, 72, 94, 76, 92].map((width, index) => <Skeleton key={index} width={width} height={40} borderRadius={8} />)}
        </div>
        <div className="vendor-store-product-grid">
          {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} height={240} borderRadius={16} />)}
        </div>
      </section>
    </main>
  );
}

function StoreTabs({ activeTab, onChange }) {
  return (
    <nav className="vendor-store-tabs" aria-label="Vendor store sections">
      {TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          id={`vendor-${tab}-tab`}
          role="tab"
          aria-selected={activeTab === tab}
          aria-controls={`vendor-${tab}-panel`}
          onClick={() => onChange(tab)}
        >
          {tab[0].toUpperCase() + tab.slice(1)}
          {activeTab === tab && <span aria-hidden="true" />}
        </button>
      ))}
    </nav>
  );
}

function StoreProducts({
  vendorId,
  products,
  total,
  facets,
  loading,
  error,
  onRetry,
  favorites,
  onFavoriteToggle,
  onProduct,
  filters,
  setFilters,
  searchTerm,
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterSection, setFilterSection] = useState(null);
  const requestExtras = useMemo(() => ({ vendorId }), [vendorId]);
  const hasActiveFilters = Boolean(
    filters?.subTypes?.length ||
      filters?.sizes?.length ||
      filters?.category ||
      filters?.colors?.length ||
      filters?.conditions?.length ||
      filters?.priceMin ||
      filters?.priceMax,
  );
  const activeFilterCount = [
    filters?.sort && filters.sort !== "relevance",
    filters?.subTypes?.length,
    filters?.sizeType && filters?.sizes?.length,
    filters?.category,
    filters?.colors?.length,
    filters?.conditions?.length,
    filters?.priceMin || filters?.priceMax,
  ].filter(Boolean).length;

  const openFilter = (section) => {
    setFilterSection(section);
    setFilterOpen(true);
  };

  return (
    <section id="vendor-products-panel" role="tabpanel" aria-labelledby="vendor-products-tab" className="vendor-store-panel">
      <div className="vendor-store-catalog-filters">
        <SearchFilterBar
          appliedFilters={filters}
          activeFilterCount={activeFilterCount}
          onOpenFilter={openFilter}
        />
      </div>
      {loading ? (
        <div className="vendor-store-product-grid">
          {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} height={240} borderRadius={16} />)}
        </div>
      ) : error && products.length === 0 ? (
        <div className="vendor-store-empty">
          <LuSearch />
          <h2>Products could not be loaded</h2>
          <p>{error}</p>
          <button type="button" onClick={onRetry}>Try again</button>
        </div>
      ) : products.length ? (
        <div className="vendor-store-product-grid">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isFavorite={Boolean(favorites[product.id])}
              surface="vendor_store"
              onFavoriteToggle={onFavoriteToggle}
              onClick={() => onProduct(product.id)}
              showVendorName={false}
            />
          ))}
        </div>
      ) : (
        <div className="vendor-store-empty">
          <LuSearch />
          <h2>{searchTerm || hasActiveFilters ? "No matching items" : "No products yet"}</h2>
          <p>{searchTerm || hasActiveFilters ? "Try another word or remove a filter." : "Follow this vendor to hear when new items arrive."}</p>
        </div>
      )}
      <SearchFilterModal
        open={filterOpen}
        initialSection={filterSection}
        onClose={() => setFilterOpen(false)}
        query={searchTerm}
        searchUrl={VENDOR_STORE_SEARCH_URL}
        items={products}
        facets={facets}
        appliedFilters={filters}
        previewTotalOverride={total}
        allowEmptyQueryPreview
        sizeTypeRequiresSizes
        requestExtras={requestExtras}
        onApply={(next) => {
          setFilters(next);
          setFilterOpen(false);
        }}
      />
    </section>
  );
}

function RatingSummary({ vendor, breakdown, total }) {
  const average = total ? Number(vendor?.rating || 0) / Number(vendor?.ratingCount || total) : 0;
  const max = Math.max(1, ...Object.values(breakdown));
  return (
    <div className="vendor-review-summary">
      <div><strong>{average.toFixed(1)}</strong><span>{total} Reviews</span></div>
      <div className="vendor-review-breakdown">
        {[5, 4, 3, 2, 1].map((rating) => (
          <div key={rating}>
            <span><FaStar />{rating}</span>
            <i><b style={{ width: `${(breakdown[rating] / max) * 100}%` }} /></i>
            <em>({breakdown[rating]})</em>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewCard({ review, currentUserId, onOpen, onProduct, onDelete }) {
  const images = reviewImages(review);
  const canOpenReview = images.length > 0;
  const product = review?.productSnapshots?.find((item) => item?.productId);
  const text = clean(review?.reviewText);
  const isOwner = Boolean(currentUserId && (review?.userId || review?.uid) === currentUserId);
  const openReview = () => onOpen(review);
  return (
    <article className="vendor-review-card">
      <div
        className={`vendor-review-card-main ${canOpenReview ? "is-interactive" : "is-static"}`}
        role={canOpenReview ? "button" : undefined}
        tabIndex={canOpenReview ? 0 : undefined}
        onClick={canOpenReview ? openReview : undefined}
        onKeyDown={canOpenReview ? (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openReview();
          }
        } : undefined}
      >
        <div className="vendor-review-author">
          <div className="vendor-review-author-main">
            {review.userPhotoURL ? <img src={review.userPhotoURL} alt="" /> : <span>{clean(review.userName).slice(0, 1).toUpperCase() || "U"}</span>}
            <div><strong>{review.userName || "My Thrift shopper"}<small>{reviewDate(review)}</small></strong><span><FaStar />{Number(review.rating || 0).toFixed(1)}</span></div>
          </div>
          {isOwner && (
            <button
              type="button"
              className="vendor-review-menu"
              aria-label="Review options"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(review);
              }}
            >
              <LuMoreVertical />
            </button>
          )}
        </div>
        {text && <p className="vendor-review-text">{text}</p>}
        {images.length > 0 && (
          <div className="vendor-review-images">
            {images.slice(0, 3).map((url, index) => (
              <span key={`${url}-${index}`}><img src={url} alt={`Review ${index + 1}`} />{index === 2 && images.length > 3 && <b>+{images.length - 3}</b>}</span>
            ))}
          </div>
        )}
      </div>
      {product && (
        <button type="button" className="vendor-review-product" onClick={() => onProduct(product.productId)}>
          <span>Shop Similar Item</span><LuChevronDown />
        </button>
      )}
    </article>
  );
}

function ReviewCardSkeleton({ withImages = true }) {
  return (
    <article className="vendor-review-card vendor-review-card-skeleton" aria-hidden="true">
      <div className="vendor-review-skeleton-author">
        <Skeleton circle width={42} height={42} />
        <div><Skeleton width={126} height={18} /><Skeleton width={54} height={16} /></div>
      </div>
      <Skeleton width="92%" height={14} />
      <Skeleton width="68%" height={14} />
      {withImages && (
        <div className="vendor-review-skeleton-images">
          {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} width={120} height={150} borderRadius={8} />)}
        </div>
      )}
      <Skeleton height={48} borderRadius={12} />
    </article>
  );
}

function ReviewsSkeleton() {
  return (
    <div className="vendor-review-skeleton">
      <div className="vendor-review-skeleton-summary" aria-hidden="true">
        <div><Skeleton width={82} height={60} /><Skeleton width={70} height={18} /></div>
        <div>
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index}><Skeleton width={27} height={16} /><Skeleton height={8} borderRadius={100} /><Skeleton width={30} height={16} /></div>
          ))}
        </div>
      </div>
      <div className="vendor-review-skeleton-filters" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} width={64} height={40} borderRadius={8} />)}
      </div>
      <div className="vendor-review-skeleton-notice" aria-hidden="true"><Skeleton circle width={18} height={18} /><Skeleton width="82%" height={16} /></div>
      <ReviewCardSkeleton />
      <ReviewCardSkeleton withImages={false} />
    </div>
  );
}

function ReviewsPanel({ vendor, reviews, loading, selectedRating, currentUserId, onRating, onReview, onProduct, onDelete }) {
  const breakdown = useMemo(() => [1, 2, 3, 4, 5].reduce((result, rating) => {
    result[rating] = reviews.filter((review) => Number(review.rating) === rating).length;
    return result;
  }, {}), [reviews]);
  const shown = selectedRating === "all" ? reviews : reviews.filter((review) => Number(review.rating) === selectedRating);

  return (
    <section id="vendor-reviews-panel" role="tabpanel" aria-labelledby="vendor-reviews-tab" className="vendor-store-panel vendor-reviews-panel">
      {loading ? (
        <ReviewsSkeleton />
      ) : (
        <>
          <RatingSummary vendor={vendor} breakdown={breakdown} total={reviews.length} />
          <div className="vendor-review-filters">
            {["all", 5, 4, 3, 2, 1].map((rating) => (
              <button type="button" key={rating} className={selectedRating === rating ? "is-active" : ""} onClick={() => onRating(rating)}>
                {rating === "all" ? "All" : <><FaStar />{rating}</>}
              </button>
            ))}
          </div>
          <div className="vendor-review-verification"><LuBadgeCheck /><span>Reviews are added by verified buyers after completed orders.</span></div>
          <div className="vendor-review-list">
          {shown.length ? shown.map((review) => <ReviewCard key={review.id} review={review} currentUserId={currentUserId} onOpen={onReview} onProduct={onProduct} onDelete={onDelete} />) : (
            <div className="vendor-store-empty"><LuStar /><h2>No reviews yet</h2><p>Verified buyer reviews will appear here.</p></div>
          )}
          </div>
        </>
      )}
    </section>
  );
}

function ReviewDeleteSheet({ review, deleting, onClose, onConfirm }) {
  return (
    <AppBottomSheet
      open={Boolean(review)}
      onClose={deleting ? undefined : onClose}
      dismissible={!deleting}
      height="300px"
      ariaLabel="Delete review"
    >
      <div className="vendor-review-delete-sheet">
        <header>
          <div>
            <h2>Delete review?</h2>
            <p>This removes your review and lets you rate this order again.</p>
          </div>
          <button type="button" onClick={onClose} disabled={deleting} aria-label="Close"><LuX /></button>
        </header>
        <button type="button" className="vendor-review-delete-action" onClick={onConfirm} disabled={deleting}>
          <LuTrash2 />
          <span>{deleting ? "Deleting…" : "Delete review"}</span>
        </button>
        <button type="button" className="vendor-review-delete-cancel" onClick={onClose} disabled={deleting}>Cancel</button>
      </div>
    </AppBottomSheet>
  );
}

function AboutRow({ icon, iconClassName = "", title, children }) {
  const Icon = icon;
  return (
    <div className="vendor-about-row">
      {typeof icon === "string" ? <img src={icon} alt="" /> : <Icon className={iconClassName} />}
      <div><strong>{title}</strong><div>{children}</div></div>
    </div>
  );
}

function AboutPanel({ vendor, categories, onPolicy, onPlatformPolicy, onBadge }) {
  const sourcingMarket = Array.isArray(vendor?.sourcingMarket) ? vendor.sourcingMarket.join(", ") : vendor?.sourcingMarket;
  const categoryList = categories?.length ? categories : vendor?.categories || vendor?.productCategories || [];
  const stockpileWeeks = vendor?.stockpile?.enabled ? `${vendor.stockpile.durationInWeeks || 2} week(s)` : "Not available";
  return (
    <section id="vendor-about-panel" role="tabpanel" aria-labelledby="vendor-about-tab" className="vendor-store-panel vendor-about-panel">
      <AboutRow icon={ABOUT_ICONS.description} title="Description">{vendor?.description || "Not specified"}</AboutRow>
      <AboutRow icon={ABOUT_ICONS.market} title="Sourcing market">{sourcingMarket || "Not specified"}</AboutRow>
      <AboutRow icon={ABOUT_ICONS.categories} title="Categories">
        <div className="vendor-about-chips">{categoryList.length ? categoryList.map((category) => <span key={category}>{category}</span>) : "Not specified"}</div>
      </AboutRow>
      <AboutRow icon={ABOUT_ICONS.restock} title="Restock frequency">{vendor?.restockFrequency || "Not specified"}</AboutRow>
      <AboutRow icon={ABOUT_ICONS.stockpile} title="Stockpiling week(s)">{stockpileWeeks}</AboutRow>
      <AboutRow icon={ABOUT_ICONS.delivery} title="Delivery method">{vendor?.deliveryMode || "Not specified"}</AboutRow>
      <AboutRow icon={LuSparkles} iconClassName="vendor-about-light-icon" title="Wear-readiness rating">{vendor?.wearReadinessRating != null ? `${vendor.wearReadinessRating}/10` : "Not specified"}</AboutRow>
      <button type="button" className="vendor-about-action" onClick={onBadge}><LuBadgeCheck className="vendor-about-light-icon" /><span><strong>{badgeFor(vendor?.badge).label}</strong><small>View this vendor’s badge and badge rankings</small></span><LuChevronDown /></button>
      <button type="button" className="vendor-about-action" onClick={onPolicy}><img src={ABOUT_ICONS.delivery} alt="" /><span><strong>Return policy</strong><small>{vendor?.returnPolicy ? "View this vendor’s return policy" : "This vendor has not published a return policy"}</small></span><LuChevronDown /></button>
      <button type="button" className="vendor-about-action" onClick={onPlatformPolicy}><LuShieldCheck className="vendor-about-light-icon" /><span><strong>My Thrift buyer protection</strong><small>View the platform policy for damaged items and protected purchases</small></span><LuChevronDown /></button>
      <div className="vendor-about-verified"><LuBadgeCheck /><div><strong>Verified vendor</strong><p>Every My Thrift vendor completes our verification and vetting process.</p></div></div>
    </section>
  );
}

function BadgeSheet({ open, vendorBadge, message, onClose }) {
  const [showRankings, setShowRankings] = useState(false);
  const badge = badgeFor(vendorBadge);
  useEffect(() => { if (!open) setShowRankings(false); }, [open]);
  return (
    <AppBottomSheet
      open={open}
      onClose={onClose}
      height={showRankings ? "78dvh" : "calc(340px + var(--app-safe-bottom, env(safe-area-inset-bottom, 0px)))"}
      ariaLabel={showRankings ? "Vendor badge rankings" : "Vendor badge"}
      surfaceClassName={showRankings ? "vendor-badge-rankings-surface" : "vendor-badge-bottom-sheet"}
      surfaceStyle={showRankings ? undefined : {
        backgroundColor: badge.modalBase,
        backgroundImage: `radial-gradient(circle at 50% 10%, rgba(255,255,255,0.9), ${badge.modalBase}), repeating-conic-gradient(from 0deg, rgba(255,255,255,0.22) 0deg 10deg, rgba(255,255,255,0) 10deg 20deg)`,
      }}
      handleClassName={showRankings ? "bg-gray-300" : "bg-black/30"}
    >
      {showRankings ? (
        <div className="vendor-badge-rankings">
          <header><div><h2>Vendor badge rankings</h2><p>Badges show a vendor’s activity and reliability, from Newbie to OG Seller.</p></div><button type="button" onClick={onClose} aria-label="Close"><LuX /></button></header>
          <div className="vendor-badge-ranking-list">{BADGES.map((item) => <div key={item.key}><img src={item.asset} alt="" /><span><strong>{item.label}</strong><small>{item.note}</small></span></div>)}</div>
        </div>
      ) : (
        <div className="vendor-badge-sheet" style={{ "--badge-ink": badge.ink, "--badge-glow": badge.modalGlow, "--badge-label-bg": badge.modalLabelBg }}>
          <header><button type="button" onClick={() => setShowRankings(true)} aria-label="View badge rankings"><LuInfo /></button><h2>Vendor’s Badge</h2><button type="button" onClick={onClose} aria-label="Close"><LuX /></button></header>
          <div className="vendor-badge-sheet-art"><i aria-hidden="true" /><img src={badge.asset} alt="" /></div>
          <span className="vendor-badge-sheet-label">{badge.label}</span>
          {message && <p className="vendor-badge-sheet-message">{message}</p>}
        </div>
      )}
    </AppBottomSheet>
  );
}

function ReviewViewer({ review, onClose, onProduct }) {
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const images = reviewImages(review);
  const product = review?.productSnapshots?.find((item) => item?.productId);
  useEffect(() => {
    if (!review || images.length === 0) return undefined;
    const releaseScrollLock = acquireScrollLock("VendorReviewViewer");
    setIndex(0);
    setExpanded(false);
    return releaseScrollLock;
  }, [review, images.length]);
  if (!review || typeof document === "undefined" || images.length === 0) return null;
  const text = clean(review.reviewText);
  return createPortal(
    <div className="vendor-review-viewer" role="dialog" aria-modal="true" aria-label="Review photo">
      {images[index] && <img className="vendor-review-viewer-image" src={images[index]} alt="Review" />}
      {expanded && <div className="vendor-review-viewer-shade" />}
      <header><button type="button" onClick={onClose} aria-label="Close"><LuX /></button><strong>{images.length ? `${index + 1}/${images.length}` : "Review"}</strong><span /></header>
      <div className={`vendor-review-viewer-detail ${expanded ? "is-expanded" : ""}`}>
        <div className="vendor-review-author">
          <div className="vendor-review-author-main">{review.userPhotoURL ? <img src={review.userPhotoURL} alt="" /> : <span>{clean(review.userName).slice(0, 1).toUpperCase() || "U"}</span>}<div><strong>{review.userName || "My Thrift shopper"}<small>{reviewDate(review)}</small></strong><span><FaStar />{Number(review.rating || 0).toFixed(1)}</span></div></div>
        </div>
        {text && <button type="button" className="vendor-review-viewer-text" onClick={() => setExpanded((value) => !value)}><span>{text}</span>{!expanded && text.length > 88 && <b>more</b>}</button>}
      </div>
      {images.length > 1 && <><button type="button" className="vendor-review-prev" onClick={() => setIndex((value) => (value - 1 + images.length) % images.length)} aria-label="Previous photo"><LuChevronDown /></button><button type="button" className="vendor-review-next" onClick={() => setIndex((value) => (value + 1) % images.length)} aria-label="Next photo"><LuChevronDown /></button></>}
      {product && <button type="button" className="vendor-review-viewer-product" onClick={() => { onClose(); onProduct(product.productId); }}><span>Shop Similar Item</span><LuChevronDown /></button>}
    </div>,
    document.body,
  );
}

export default function VendorStoreExperience({
  vendor,
  vendorId,
  entry,
  products,
  categories,
  loadingProducts,
  onRetryProducts,
  favorites,
  onFavoriteToggle,
  isFollowing,
  isFollowLoading,
  onFollow,
  onShare,
  onPolicy,
  onPlatformPolicy,
  currentUser,
  currentUserData,
  quickMode,
  checkoutCount,
  onCheckout,
  flashSale,
  badgeMessage,
}) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    journeyOptions,
    historyFallbackOpen,
    closeHistoryFallback,
    openProductJourneyHistory,
    returnToJourneyOption,
  } = useProductJourneyHistory(location.pathname);
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const requestedTab = lower(params.get("tab"));
  const initialTab = TABS.includes(requestedTab) ? requestedTab : entry?.activeTab || "products";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searching, setSearching] = useState(false);
  const catalog = entry?.catalog || {};
  const searchTerm = catalog.query || "";
  const filters = catalog.filters || DEFAULT_VENDOR_CATALOG_FILTERS;
  const setSearchTerm = (query) => {
    dispatch(setVendorCatalogQuery({ vendorId, query }));
  };
  const setFilters = (nextFilters) => {
    dispatch(setVendorCatalogFilters({ vendorId, filters: nextFilters }));
  };
  const [selectedRating, setSelectedRating] = useState("all");
  const [badgeOpen, setBadgeOpen] = useState(false);
  const [openReview, setOpenReview] = useState(null);
  const [reviewToDelete, setReviewToDelete] = useState(null);
  const [deletingReview, setDeletingReview] = useState(false);
  const [reviewOrder, setReviewOrder] = useState(null);
  const reviewRequestHandled = useRef("");
  const reviewRequestInFlight = useRef("");
  const reviews = entry?.reviews || [];
  const reviewsLoading = Boolean(entry?.reviewsLoading);
  const reviewsLoaded = Boolean(entry?.reviewsLoaded);

  useEffect(() => {
    updateCurrentVendorJourneyLabel({
      pathname: location.pathname,
      vendorId,
      vendorName: vendor?.shopName,
    });
  }, [journeyOptions.length, location.pathname, vendor?.shopName, vendorId]);

  useEffect(() => {
    if (TABS.includes(requestedTab) && requestedTab !== activeTab) setActiveTab(requestedTab);
  }, [requestedTab, activeTab]);

  useEffect(() => {
    const hasReviewRequest = params.has("rateOrder") || params.has("rateStockpile");
    if ((activeTab === "reviews" || hasReviewRequest) && !reviewsLoaded && !reviewsLoading) {
      dispatch(fetchVendorReviews({ vendorId }));
    }
  }, [activeTab, dispatch, params, reviewsLoaded, reviewsLoading, vendorId]);

  useEffect(() => {
    const requestKey = params.get("rateStockpile")
      ? `stockpile:${params.get("rateStockpile")}`
      : params.get("rateOrder")
        ? `order:${params.get("rateOrder")}`
        : "";
    if (
      !requestKey ||
      reviewRequestHandled.current === requestKey ||
      reviewRequestInFlight.current === requestKey ||
      !reviewsLoaded ||
      !currentUser?.uid
    ) return;
    reviewRequestInFlight.current = requestKey;
    let active = true;
    fetchEligibleReviewOrders({ userId: currentUser.uid, vendorId, reviews })
      .then((orders) => {
        if (!active) return;
        const requested = findRequestedReviewOrder(orders, params);
        reviewRequestHandled.current = requestKey;
        if (requested) {
          setReviewOrder(requested);
        } else {
          toast("This order is not ready to rate or has already been rated.");
        }
      })
      .catch((error) => {
        if (!active) return;
        console.error("Could not verify the review order:", error);
        toast.error("This order could not be verified right now.");
      })
      .finally(() => {
        if (reviewRequestInFlight.current === requestKey) {
          reviewRequestInFlight.current = "";
        }
      });
    return () => {
      active = false;
      if (reviewRequestInFlight.current === requestKey) {
        reviewRequestInFlight.current = "";
      }
    };
  }, [currentUser?.uid, params, reviews, reviewsLoaded, vendorId]);

  const changeTab = (tab) => {
    appHaptics.light();
    if (tab === activeTab) return;
    setActiveTab(tab);
    dispatch(setStoreTab({ vendorId, tab }));
    const next = new URLSearchParams(location.search);
    next.set("tab", tab);
    navigate(`${location.pathname}?${next.toString()}`, { replace: true });
  };

  const openStoreSearch = () => {
    if (activeTab !== "products") changeTab("products");
    appHaptics.selection();
    // Store search always starts across the vendor's complete catalogue.
    // Product filters can be applied again after entering a search.
    setFilters(DEFAULT_VENDOR_CATALOG_FILTERS);
    setSearchTerm("");
    setSearching(true);
  };

  const closeComposer = () => {
    setReviewOrder(null);
    const next = new URLSearchParams(location.search);
    next.delete("rateOrder");
    next.delete("rateStockpile");
    next.delete("rating");
    next.set("tab", "reviews");
    navigate(`${location.pathname}?${next.toString()}`, { replace: true });
  };

  const deleteReview = async () => {
    if (!reviewToDelete || deletingReview || !currentUser?.uid) return;
    setDeletingReview(true);
    try {
      const result = await deleteOwnedVendorReview({
        vendorId,
        reviewId: reviewToDelete.id,
        userId: currentUser.uid,
        review: reviewToDelete,
      });
      dispatch(removeVendorReview({
        vendorId,
        reviewId: reviewToDelete.id,
        rating: result.rating,
        ratingCount: result.ratingCount,
      }));
      if (openReview?.id === reviewToDelete.id) setOpenReview(null);
      setReviewToDelete(null);
      appHaptics.success();
      toast.success("Review deleted");
    } catch (error) {
      console.error("[reviews] Could not delete review:", {
        vendorId,
        reviewId: reviewToDelete.id,
        code: error?.code,
        message: error?.message,
      });
      appHaptics.error();
      toast.error(
        error?.message === "review-delete-not-owner"
          ? "Only the person who posted this review can delete it."
          : "Your review could not be deleted. Please try again.",
      );
    } finally {
      setDeletingReview(false);
    }
  };

  return (
    <main className="vendor-store-page">
      {searching ? (
        <StoreSearchHeader vendorName={vendor.shopName} value={searchTerm} onChange={setSearchTerm} onClose={() => { setSearching(false); setSearchTerm(""); }} />
      ) : (
        <StoreHeader
          vendorName={vendor.shopName}
          quickMode={quickMode}
          onBack={() => navigate(-1)}
          onBackLongPress={
            journeyOptions.length ? openProductJourneyHistory : undefined
          }
          showHistoryHint={journeyOptions.length > 0}
          onHome={() => navigate("/")}
          onShare={onShare}
          onSearch={openStoreSearch}
          checkoutCount={checkoutCount}
          onCheckout={onCheckout}
        />
      )}
      <StoreSummary vendor={vendor} productCount={catalog.availableTotal != null ? catalog.availableTotal : (catalog.initialized ? catalog.total : products.length)} isFollowing={isFollowing} isFollowLoading={isFollowLoading} onFollow={onFollow} onReviews={() => changeTab("reviews")} onBadge={() => setBadgeOpen(true)} />
      <StoreTabs activeTab={activeTab} onChange={changeTab} />
      {activeTab === "products" && <>{flashSale}<StoreProducts vendorId={vendorId} products={products} total={catalog.total || 0} facets={catalog.facets} loading={loadingProducts} error={catalog.error} onRetry={onRetryProducts} favorites={favorites} onFavoriteToggle={onFavoriteToggle} onProduct={(id) => navigate(`/product/${id}`)} filters={filters} setFilters={setFilters} searchTerm={searchTerm} /></>}
      {activeTab === "reviews" && <ReviewsPanel vendor={vendor} reviews={reviews} loading={reviewsLoading && !reviewsLoaded} selectedRating={selectedRating} currentUserId={currentUser?.uid} onRating={(rating) => { appHaptics.selection(); setSelectedRating(rating); }} onReview={(review) => { appHaptics.selection(); setOpenReview(review); }} onProduct={(id) => navigate(`/product/${id}`)} onDelete={(review) => { appHaptics.selection(); setReviewToDelete(review); }} />}
      {activeTab === "about" && <AboutPanel vendor={vendor} categories={categories} onPolicy={onPolicy} onPlatformPolicy={onPlatformPolicy} onBadge={() => setBadgeOpen(true)} />}
      <AppScrollToTopButton />
      <BadgeSheet open={badgeOpen} vendorBadge={vendor.badge} message={badgeMessage} onClose={() => setBadgeOpen(false)} />
      <ReviewViewer review={openReview} onClose={() => setOpenReview(null)} onProduct={(id) => navigate(`/product/${id}`)} />
      <ReviewDeleteSheet review={reviewToDelete} deleting={deletingReview} onClose={() => setReviewToDelete(null)} onConfirm={deleteReview} />
      <NavigationHistorySheet
        open={historyFallbackOpen}
        options={journeyOptions}
        onClose={closeHistoryFallback}
        onSelect={returnToJourneyOption}
      />
      {reviewOrder && (
        <div className="vendor-review-composer-layer">
          <ReviewComposer
            vendor={{ id: vendorId, ...vendor }}
            order={reviewOrder}
            currentUser={{ ...currentUser, ...currentUserData }}
            isProfileComplete={Boolean(currentUserData?.displayName && currentUserData?.birthday)}
            initialRating={Number(params.get("rating") || 0)}
            onClose={closeComposer}
            onSuccess={() => {
              closeComposer();
              dispatch(fetchVendorReviews({ vendorId }));
            }}
          />
        </div>
      )}
    </main>
  );
}
