import { siteUrls } from "../config/siteUrls.mjs";
import React, {
  useState,
  useEffect,
  useRef,
  useLayoutEffect,
  useCallback,
} from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { db, auth } from "../firebase.config";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchStoreVendor,
  saveStoreScroll,
  fetchVendorCategories,
  fetchVendorCatalogPage,
  fetchVendorReviews,
  setVendorFollowersCount,
  vendorCatalogRequestKey,
} from "../redux/reducers/storepageVendorsSlice";
import {
  getVendorFollowerCount,
  setVendorFollowState,
  subscribeVendorFollow,
} from "../services/vendorFollow";
import { onAuthStateChanged } from "firebase/auth";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { GoChevronLeft, GoDotFill } from "react-icons/go";
import AppBackButton from "../components/layout/AppBackButton";
import { FiChevronDown, FiChevronUp, FiSearch } from "react-icons/fi";
import {
  FaAngleLeft,
  FaPlus,
  FaCheck,
  FaRegHeart,
  FaSeedling,
  FaRocket,
  FaSyncAlt,
  FaChartLine,
  FaMapMarkerAlt,
  FaTshirt,
  FaTruck,
  FaCheckCircle,
  FaBolt,
  FaCrown,
  FaUndoAlt,
  FaShieldAlt,
} from "react-icons/fa";
import Productnotfund from "../Animations/productnotfound.json";
import toast from "react-hot-toast";
import { shareContent } from "../services/nativeLinks";
import ProductCard from "../components/Products/ProductCard";
import Loading from "../components/Loading/Loading";
import { useAuth } from "../custom-hooks/useAuth";
import { FaSpinner } from "react-icons/fa6";
import { CiLogin, CiSearch } from "react-icons/ci";
import Modal from "react-modal";
import moment from "moment";
import {
  MdClose,
  MdDeliveryDining,
  MdIosShare,
  MdOutlineDryCleaning,
  MdOutlineShowChart,
  MdSyncLock,
  MdVerified,
} from "react-icons/md";
import { LuListFilter } from "react-icons/lu";
import Lottie from "lottie-react";
import { LiaSeedlingSolid, LiaTimesSolid } from "react-icons/lia";
import { AiOutlineHome } from "react-icons/ai";
import SEO from "../components/Helmet/SEO";
import { BsBasket, BsFillBasketFill, BsShop } from "react-icons/bs";
import {
  enterStockpileMode,
  exitStockpileMode,
  fetchStockpileData,
} from "../redux/reducers/stockpileSlice";
import { RotatingLines } from "react-loader-spinner";
import { IoIosFlash } from "react-icons/io";
import { GiShop, GiStarsStack } from "react-icons/gi";
import { BiCategory, BiSolidCategory } from "react-icons/bi";
import {
  IoCheckmarkDoneCircleOutline,
  IoRocketOutline,
  IoSyncOutline,
} from "react-icons/io5";
import { TfiBolt } from "react-icons/tfi";
import { PiCrown, PiShoppingCartBold } from "react-icons/pi";
import { GrShare } from "react-icons/gr";
import { RiHeart3Fill, RiHeart3Line, RiSearchLine } from "react-icons/ri";
import PickupInfoModal from "../components/Location/PickupModal";
import StockpileInfoModal from "../components/StockpileModal";
import IframeModal from "../components/PwaModals/PushNotifsModal";
import VendorPolicyModal from "./Legal/VendorPolicyModal";
import BuyerProtectionModal from "./Legal/BuyerProtectionModal";
import StoreBasket from "../components/QuickMode/StoreBasket";
import VendorStoreExperience, { VendorStoreSkeleton } from "../components/VendorsData/VendorStoreExperience";
import AppBottomSheet from "../components/layout/AppBottomSheet";
import {
  activateQuickMode,
  deactivateQuickMode,
} from "../redux/reducers/quickModeSlice";
import QuickAuthModal from "../components/PwaModals/AuthModal";
import Badge from "../components/Badge/Badge";
import { track } from "../services/signals";
import { appHaptics } from "../services/haptics";
import { takeAuthIntent } from "../services/authIntent";
import useNativePageRefresh from "../custom-hooks/useNativePageRefresh";
Modal.setAppElement("#root"); // For accessibility

const FlipCountdown = ({ endTime }) => {
  // normalize to a JS Date
  const target =
    endTime && typeof endTime.toDate === "function"
      ? endTime.toDate()
      : new Date(endTime);

  const calc = () => {
    const diff = Math.max(0, target.getTime() - Date.now());
    const sec = Math.floor((diff / 1000) % 60);
    const min = Math.floor((diff / 1000 / 60) % 60);
    const hr = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const day = Math.floor(diff / (1000 * 60 * 60 * 24));
    return { day, hr, min, sec };
  };

  const [t, setT] = useState(calc());
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, [endTime]);

  const pad2 = (n) => String(n).padStart(2, "0");

  const Unit = ({ value, label }) => (
    <div className="flex flex-col items-center justify-center ">
      <div className="text-white text-3xl sm:text-5xl font-medium  tracking-tight">
        {pad2(value)}
      </div>
      <div className="text-gray-300 text-xs sm:text-sm mt-1">{label}</div>
    </div>
  );

  const Divider = () => (
    <div className="h-10 w-px bg-gray-50 bg-opacity-25  mx-2 " />
  );

  return (
    <div className="w-full flex items-center justify-between">
      <Unit value={t.day} label="Days" />
      <Divider />
      <Unit value={t.hr} label="Hours" />
      <Divider />
      <Unit value={t.min} label="Minutes" />
      <Divider />
      <Unit value={t.sec} label="Seconds" />
    </div>
  );
};

function VendorDetails({ vendor, vendorId }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [isOpen, setIsOpen] = useState(false);
  const [autoDone, setAutoDone] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [timeoutId, setTimeoutId] = useState(null);

  useEffect(() => {
    if (!inView || autoDone || hasInteracted) return;
    const seenKey = `vd_seen_${vendorId}`;
    if (sessionStorage.getItem(seenKey)) return;

    setIsOpen(true);
    setAutoDone(true);
    sessionStorage.setItem(seenKey, "1");

    const id = setTimeout(() => setIsOpen(false), 4000);
    setTimeoutId(id);

    return () => clearTimeout(id);
  }, [inView, autoDone, hasInteracted, vendorId]);

  useEffect(() => {
    return () => timeoutId && clearTimeout(timeoutId);
  }, [timeoutId]);

  const toggle = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setIsOpen((o) => !o);
    setHasInteracted(true); // Mark as user-interacted
  };
  const sourcingMarket = Array.isArray(vendor.sourcingMarket)
    ? vendor.sourcingMarket.join(", ")
    : vendor.sourcingMarket || "Not specified";
  const categories =
    Array.isArray(vendor.categories) && vendor.categories.length
      ? vendor.categories.join(", ")
      : "Not specified";
  const stockEnabled = vendor.stockpile?.enabled;
  const stockpileWeeks = stockEnabled
    ? `${vendor.stockpile.durationInWeeks} week(s)`
    : "Not available";
  const restock = vendor.restockFrequency || "Not specified";
  const delivery = vendor.deliveryMode || "Not specified";
  const wear =
    vendor.wearReadinessRating != null
      ? `${vendor.wearReadinessRating}/10`
      : "Not specified";

  const items = [
    { icon: <BsShop />, label: "Sourcing Market", value: sourcingMarket },
    { icon: <BiCategory />, label: "Categories", value: categories },
    {
      icon: <BsBasket />,
      label: "Stockpiling Week(s)",
      value: stockpileWeeks,
    },
    { icon: <IoSyncOutline />, label: "Restock Frequency", value: restock },
    {
      icon: <MdDeliveryDining />,
      label: "Delivery Methods",
      value: delivery,
    },
    {
      icon: <MdOutlineDryCleaning />,
      label: "Wear-Readiness Rating",
      value: wear,
    },
  ];

  return (
    <div ref={ref}>
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between "
      >
        <h2 className="text-base font-opensans font-semibold">
          More about this Vendor
        </h2>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 250, damping: 20 }}
        >
          {isOpen ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.ul
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="px-2 pt-0 pb-6 space-y-4"
          >
            {items.map(({ icon, label, value }, idx) => (
              <motion.li
                key={label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
                className="flex items-start mt-2"
              >
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: idx * 0.05 + 0.1, duration: 0.3 }}
                  className="text-2xl text-black mr-4 mt-1"
                >
                  {React.cloneElement(icon, { size: 24 })}
                </motion.div>
                <div>
                  <motion.p
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 + 0.15, duration: 0.3 }}
                    className="font-opensans font-semibold text-sm"
                  >
                    {label}
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 + 0.2, duration: 0.3 }}
                    className="text-xs text-gray-800 font-opensans"
                  >
                    {value}
                  </motion.p>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
function AdditionalDetails({
  vendor,
  vendorId,
  onPlatformPolicyClick,
  onVendorPolicyClick,
  badgeMessages,
  onLinkClick,
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [isOpen, setIsOpen] = useState(false);
  const [autoDone, setAutoDone] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [timeoutId, setTimeoutId] = useState(null);

  useEffect(() => {
    if (!inView || autoDone || hasInteracted) return;
    const seenKey = `ad_seen_${vendorId}`;
    if (sessionStorage.getItem(seenKey)) return;

    setIsOpen(true);
    setAutoDone(true);
    sessionStorage.setItem(seenKey, "1");

    const id = setTimeout(() => setIsOpen(false), 4000);
    setTimeoutId(id);

    return () => clearTimeout(id);
  }, [inView, autoDone, hasInteracted, vendorId]);

  useEffect(() => {
    return () => timeoutId && clearTimeout(timeoutId);
  }, [timeoutId]);

  const toggle = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setIsOpen((o) => !o);
    setHasInteracted(true); // Mark as user-interacted
  };

  return (
    <div ref={ref}>
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between mt-5"
      >
        <h2 className="text-base font-opensans font-semibold">
          Additional Details
        </h2>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 250, damping: 20 }}
        >
          {isOpen ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="additional"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-4 px-2 mt-6"
          >
            {/* Rating Card */}
            <div className="flex items-center rounded-xl">
              <GiStarsStack className="text-3xl mr-4 text-yellow-400" />
              <div>
                <h3 className="font-opensans font-semibold text-sm mb-1">
                  {vendor.badge || "Newbie"}
                </h3>
                <p className="text-xs text-gray-600 font-opensans">
                  {badgeMessages[vendor.badge] || badgeMessages.Newbie}
                </p>
              </div>
            </div>

            {/* Return Policy Card */}
            <div className="flex items-center rounded-xl">
              <FaUndoAlt className="text-5xl mr-4 text-red-500" />
              <div>
                <h3 className="font-opensans font-semibold text-sm mb-1">
                  Return Policy
                </h3>
                <p className="text-xs text-gray-600 font-opensans">
                  My Thrift has a platform-wide return policy that overrides
                  vendor rules in cases like{" "}
                  <span
                    onClick={() => onLinkClick("6")}
                    className="underline text-customOrange cursor-pointer"
                  >
                    damaged items
                  </span>
                  .{" "}
                  {vendor.returnPolicy ? (
                    <>
                      View this vendor’s own policy{" "}
                      <span
                        onClick={onVendorPolicyClick}
                        className="underline text-customOrange cursor-pointer"
                      >
                        here
                      </span>
                      .
                    </>
                  ) : (
                    "This vendor hasn’t published a policy yet."
                  )}
                </p>
              </div>
            </div>

            {/* Verification Card */}
            <div className="flex items-center rounded-xl">
              <MdVerified className="text-5xl mr-4 text-green-800" />
              <div>
                <h3 className="font-opensans font-semibold text-sm mb-1">
                  Verified Vendor
                </h3>
                <p className="text-xs text-gray-600 font-opensans">
                  All vendors on My Thrift are verified and undergo a strict
                  vetting process—shop with confidence, you won’t get scammed.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
// Put near other utils at top of StorePage.jsx
const isNetworkishError = (err) => {
  if (!err) return false;
  const code = err.code || err.name || "";
  const msg = (err.message || "").toLowerCase();

  // Firebase/Firestore common network codes
  if (
    code === "unavailable" ||
    code === "network-request-failed" ||
    code === "deadline-exceeded"
  ) {
    return true;
  }
  // Generic signals from various layers
  if (
    msg.includes("offline") ||
    msg.includes("network") ||
    msg.includes("failed to fetch")
  ) {
    return true;
  }
  return false;
};

function NetworkIssueNotice({ onRetry }) {
  return (
    <div className="flex flex-col px-6 justify-center items-center h-3/6 text-center">
      <img
        src="/network-issue.png"
        alt="Network issue"
        className="w-28 h-28 opacity-80 mb-3"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
      <h1 className="text-xl font-bold mt-24 font-opensans text-gray-800">
        Can’t reach My Thrift right now
      </h1>
      <p className="text-sm mt-2 text-gray-600 font-opensans">
        It looks like you’re offline or the connection is unstable. Please check
        your internet and try again Or this store isn't accessible right now,
        check back later.
      </p>
      <button
        className="mt-5 py-2 px-5 rounded-full font-medium font-opensans bg-customOrange text-white"
        onClick={onRetry}
      >
        Retry
      </button>
    </div>
  );
}
// --- Badge helpers (same as VendorSearchCard) ---
const cleanStr = (x) => (typeof x === "string" ? x.trim() : "");

function normalizeBadgeKey(badgeText = "") {
  const b = String(badgeText || "").trim().toLowerCase();

  if (b.includes("og")) return "og";
  if (b.includes("power")) return "power";
  if (b.includes("reliable")) return "reliable";
  if (b.includes("steady") || b.includes("speedy")) return "speedy";
  if (b.includes("consistent")) return "consistent";
  if (b.includes("rising")) return "rising";

  return "newbie";
}

// Badge styling configuration (re-using your existing assets)
const BADGE_STYLES = {
  og: {
    icon: "/OG.svg",
    pillBgClass: "bg-[#FDF6E3]",
    pillTextClass: "text-[#78350F]",
    modalBase: "#FDECC8",
    modalGlow: "rgba(245, 158, 11, 0.35)",
    modalLabelBg: "rgba(255,255,255,0.75)",
    modalLabelText: "#78350F",
  },
  reliable: {
    icon: "/Reliable.svg",
    pillBgClass: "bg-[#EFF6FF]",
    pillTextClass: "text-[#1E40AF]",
    modalBase: "#D1FAE5",
    modalGlow: "rgba(16, 185, 129, 0.35)",
    modalLabelBg: "rgba(255,255,255,0.75)",
    modalLabelText: "#065F46",
  },
  consistent: {
    icon: "/Consistent.svg",
    pillBgClass: "bg-[#FFF7ED]",
    pillTextClass: "text-[#9A3412]",
    modalBase: "#FFEDD5",
    modalGlow: "rgba(249, 115, 22, 0.35)",
    modalLabelBg: "rgba(255,255,255,0.75)",
    modalLabelText: "#9A3412",
  },
  rising: {
    icon: "/Rising.svg",
    pillBgClass: "bg-[#FEF2F2]",
    pillTextClass: "text-[#991B1B]",
    modalBase: "#FEE2E2",
    modalGlow: "rgba(239, 68, 68, 0.35)",
    modalLabelBg: "rgba(255,255,255,0.75)",
    modalLabelText: "#991B1B",
  },
  power: {
    icon: "/Power.svg",
    pillBgClass: "bg-[#F3E8FF]",
    pillTextClass: "text-[#6B21A8]",
    modalBase: "#E9D5FF",
    modalGlow: "rgba(168, 85, 247, 0.35)",
    modalLabelBg: "rgba(255,255,255,0.75)",
    modalLabelText: "#6B21A8",
  },
  speedy: {
    icon: "/Speedy.svg",
    pillBgClass: "bg-[#F0FDF4]",
    pillTextClass: "text-[#166534]",
    modalBase: "#DCFCE7",
    modalGlow: "rgba(34, 197, 94, 0.35)",
    modalLabelBg: "rgba(255,255,255,0.75)",
    modalLabelText: "#166534",
  },
  newbie: {
    icon: "/Newbie.svg",
    pillBgClass: "bg-[#DDF6D6]",
    pillTextClass: "text-[#374151]",
    modalBase: "#DCFCE7",
    modalGlow: "rgba(16, 185, 129, 0.22)",
    modalLabelBg: "rgba(255,255,255,0.75)",
    modalLabelText: "#14532D",
  },
};

// --- Clickable pill (same look as search page) ---
function VendorBadgePill({ badgeText, onClick }) {
  const key = normalizeBadgeKey(badgeText);
  const style = BADGE_STYLES[key] || BADGE_STYLES.newbie;

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative inline-flex items-center",
        "h-7 pl-8 pr-3 rounded-full",
        style.pillBgClass,
        "active:scale-[0.98] transition",
      ].join(" ")}
      aria-label="Open vendor badge details"
    >
      <img
        src={style.icon}
        alt=""
        className="absolute -left-2 top-1/2 -translate-y-1/2 w-9 h-9 drop-shadow-sm"
        draggable={false}
      />
      <span className={["text-sm font-opensans font-medium", style.pillTextClass].join(" ")}>
        {badgeText || "Newbie"}
      </span>
    </button>
  );
}

// --- Modal like your screenshot (rays + gradient + centered badge) ---
function VendorBadgeModal({ open, onClose, badgeText, message }) {
  const key = normalizeBadgeKey(badgeText);
  const style = BADGE_STYLES[key] || BADGE_STYLES.newbie;

  const bgStyle = {
    backgroundImage: `
      radial-gradient(circle at 50% 10%, rgba(255,255,255,0.9), ${style.modalBase}),
      repeating-conic-gradient(
        from 0deg,
        rgba(255,255,255,0.22) 0deg 10deg,
        rgba(255,255,255,0) 10deg 20deg
      )
    `,
  };

  return (
    <Modal
      isOpen={open}
      onRequestClose={onClose}
      closeTimeoutMS={180}
      // 👇 bottom sheet container
      className="
        fixed bottom-0 left-1/2 -translate-x-1/2
        w-full max-w-md
        outline-none
      "
      // 👇 overlay pinned bottom
      overlayClassName="
        fixed inset-0 z-[60] bg-black/40
        flex items-end justify-center
      "
    >
      {/* Sheet */}
      <div className="rounded-t-3xl overflow-hidden shadow-2xl">
        <div className="relative px-4 pt-3 pb-8" style={bgStyle}>
          {/* little handle */}
          <div className="flex justify-center">
            <div className="w-12 h-1.5 rounded-full bg-black/10" />
          </div>

          {/* top bar */}
          <div className="mt-2 flex items-center justify-between">
            <div className="w-8 h-8" />
            <p className="font-opensans font-semibold text-sm text-gray-800">
              Vendor&apos;s Badge
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/40 hover:bg-white/60 transition"
              aria-label="Close"
            >
              <MdClose className="text-gray-800 text-lg" />
            </button>
          </div>

          {/* center badge */}
          <div className="mt-6 flex flex-col items-center">
            <div className="relative">
              <div
                className="absolute inset-0 rounded-full blur-2xl"
                style={{ background: style.modalGlow }}
              />
              <img
                src={style.icon}
                alt=""
                className="relative w-24 h-24 drop-shadow-xl"
                draggable={false}
              />
            </div>

            <div
              className="mt-5 px-5 py-2 rounded-full text-xs font-opensans font-semibold shadow-md"
              style={{
                background: style.modalLabelBg,
                color: style.modalLabelText,
              }}
            >
              {badgeText || "Newbie"}
            </div>

            {!!message && (
              <p className="mt-3 text-center text-xs font-opensans text-gray-800/80 px-6 leading-relaxed">
                {message}
              </p>
            )}

            {/* optional bottom spacing so it breathes on iPhones */}
            <div className="h-3" />
          </div>
        </div>
      </div>
    </Modal>
  );
}


const StorePage = () => {
  const { id } = useParams();

  const [favorites, setFavorites] = useState({});
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(true);
  const followMutationRef = useRef(false);
  const { currentUser, currentUserData } = useAuth();
  const dispatch = useDispatch();
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showCountdownInHeader, setShowCountdownInHeader] = useState(false);
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [viewOptions, setViewOptions] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const {
    entities,
    loading: vendorLoading,
    error,
  } = useSelector((state) => state.storepageVendors);
const [badgeOpen, setBadgeOpen] = useState(false);

  // Convenience variables for the current vendor page
  const entry = entities[id] || {};
  const { vendor, scrollY } = entry;
  const catalog = entry.catalog || {};
  const products = catalog.items || [];
  const loadingMore = Boolean(catalog.loadingMore);
  const noMore = Boolean(catalog.initialized && !catalog.hasMore);
  const catalogQuery = catalog.query || "";
  const catalogFilters = catalog.filters || {};
  const desiredCatalogRequestKey = vendorCatalogRequestKey(
    catalogQuery,
    catalogFilters,
  );
  const catalogRequestRef = useRef(null);
  const storeRefreshRequestRef = useRef(null);
  const storeRefreshRef = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isShared = searchParams.has("shared");
  const quick = useSelector((s) => s.quickMode); // { isActive, vendorId }
  const quickForThisVendor = quick.isActive && quick.vendorId === id;
  const basketRef = useRef(null);
  const vendorCartProducts = useSelector((s) => s.cart?.[id]?.products || {});
  const checkoutCount = Object.values(vendorCartProducts).reduce(
    (sum, p) => sum + (p.quantity || 0),
    0,
  );
  const [isStockpileMode, setIsStockpileMode] = useState(false);
  const [showPileModal, setShowPileModal] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const prevScrollPos = useRef(0);
  const {
    isActive,
    vendorId: stockpileVendorId,
    pileOrders,
  stockpileExpiry,
    loading: stockpileLoading,
  } = useSelector((state) => state.stockpile);
  const [showVendorPolicy, setShowVendorPolicy] = useState(false);
  const [showBuyerProtection, setShowBuyerProtection] = useState(false);
  const isStockpileForThisVendor = isActive && stockpileVendorId === id;
  const lastScrollY = useRef(0);
  const [showStockpileIntro, setShowStockpileIntro] = useState(false);
  const [showSharedHeader, setShowSharedHeader] = useState(true);
  const [showPickupIntro, setShowPickupIntro] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsUrl, setTermsUrl] = useState("");
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  const refreshStore = useCallback(async () => {
    if (!id || storeRefreshRef.current) return;
    storeRefreshRef.current = true;

    try {
      catalogRequestRef.current?.abort?.();
      storeRefreshRequestRef.current?.abort?.();
      const catalogRequest = dispatch(
        fetchVendorCatalogPage({
          vendorId: id,
          loadMore: false,
          query: catalogQuery,
          filters: catalogFilters,
        }),
      );
      storeRefreshRequestRef.current = catalogRequest;

      const refreshes = [
        dispatch(fetchStoreVendor(id)).unwrap(),
        dispatch(fetchVendorCategories(id)).unwrap(),
        catalogRequest.unwrap(),
      ];
      if (entry.reviewsLoaded) {
        refreshes.push(dispatch(fetchVendorReviews({vendorId: id})).unwrap());
      }

      await Promise.all(refreshes);
    } finally {
      storeRefreshRequestRef.current = null;
      storeRefreshRef.current = false;
    }
  }, [
    catalogFilters,
    catalogQuery,
    dispatch,
    entry.reviewsLoaded,
    id,
  ]);

  useNativePageRefresh(refreshStore, {
    enabled: Boolean(id),
    verticalOffset: 116,
    minimumVisibleMs: 600,
  });

  useEffect(() => () => {
    storeRefreshRequestRef.current?.abort?.();
  }, []);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);
  useEffect(() => {
    if (!vendor) return;

    /* ---------- feature availability ---------- */
    const hasStockpile = vendor.stockpile?.enabled;
    const hasPickup =
      vendor.deliveryMode === "Pickup" ||
      vendor.deliveryMode === "Delivery & Pickup";

    /* ---------- session flags ---------- */
    const introDoneKey = `introDone_${vendor.id}`;
    const stockpileSeenKey = `introStockpile_${vendor.id}`;
    const pickupSeenKey = `introPickup_${vendor.id}`;

    if (sessionStorage.getItem(introDoneKey)) return; // already handled for this store
    if (hasPickup && !sessionStorage.getItem(pickupSeenKey)) {
      setShowPickupIntro(true);
      return;
    }

    if (hasStockpile && !sessionStorage.getItem(stockpileSeenKey)) {
      setShowStockpileIntro(true);
    }
  }, [vendor]);

  const sharedPrevScrollY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;

      setShowSharedHeader(currentY < sharedPrevScrollY.current);
      sharedPrevScrollY.current = currentY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const stockpileParam = params.get("stockpile");
    if (stockpileParam === "1" && currentUser) {
      dispatch(enterStockpileMode({ vendorId: id }));
      setIsStockpileMode(true);
    }
  }, [location.search, currentUser, dispatch, id]);

  useEffect(() => {
    if (!vendor) return;
    const saved = localStorage.getItem(`storeScroll_${id}`);
    if (saved != null) {
      dispatch(
        saveStoreScroll({
          vendorId: id,
          scrollY: parseFloat(saved),
        }),
      );
    }
  }, [vendor, id, dispatch]);
  useEffect(() => {
    // only log when vendor is actually loaded
    if (!vendor?.id) return;

    const surface = isShared ? "shared_link" : "vendor_store";

    // dedupe per session per vendor per surface
    const seenKey = `mt_vendor_view_${surface}_${vendor.id}`;
    if (sessionStorage.getItem(seenKey)) return;

    sessionStorage.setItem(seenKey, "1");

    track(
      "vendor_view",
      {
        vendorId: vendor.id,
        vendorSlug: vendor.slug || null,
        vendorName: vendor.shopName || null,
        isQuickMode: !!quickForThisVendor,
      },
      {
        surface,
        path: `${location.pathname}${location.search || ""}`,
      },
    );
  }, [
    vendor?.id,
    vendor?.slug,
    vendor?.shopName,
    isShared,
    quickForThisVendor,
    location.pathname,
    location.search,
  ]);

  useEffect(() => {
    if (!vendor) {
      dispatch(fetchStoreVendor(id));
    }
  }, [id, dispatch, vendor]);
  useEffect(() => {
    if (vendor && entry.categories === undefined) {
      console.log("[page] dispatch fetchVendorCategories()");
      dispatch(fetchVendorCategories(id));
    }
  }, [vendor, entry.categories, id, dispatch]);
  useEffect(() => {
    if (!vendor) return undefined;
    if (
      catalog.initialized &&
      catalog.loadedRequestKey === desiredCatalogRequestKey
    ) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      catalogRequestRef.current?.abort?.();
      catalogRequestRef.current = dispatch(
        fetchVendorCatalogPage({
          vendorId: id,
          loadMore: false,
          query: catalogQuery,
          filters: catalogFilters,
        }),
      );
    }, catalog.initialized ? 250 : 0);

    return () => {
      window.clearTimeout(timer);
      catalogRequestRef.current?.abort?.();
    };
  }, [
    vendor,
    id,
    dispatch,
    desiredCatalogRequestKey,
    catalog.initialized,
    catalog.loadedRequestKey,
    catalogQuery,
    catalogFilters,
  ]);
const openSearch = useCallback(() => {
  navigate("/search", { state: { autofocus: true } });
}, [navigate]);

  // Infinite scroll – load more when the user nears the bottom
  useEffect(() => {
    const onScroll = () => {
      const nearBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 150;

      if (
        vendor &&
        entry.activeTab === "products" &&
        nearBottom &&
        !loadingMore &&
        !noMore &&
        catalog.initialized &&
        !catalog.loadingInitial
      ) {
        dispatch(fetchVendorCatalogPage({ vendorId: id, loadMore: true }));
      }
    };

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [
    vendor,
    entry.activeTab,
    loadingMore,
    noMore,
    catalog.initialized,
    catalog.loadingInitial,
    id,
    dispatch,
  ]);

  const bannerShown = localStorage.getItem("headsUpBannerShown");
  useEffect(() => {
    if (!bannerShown) {
      setIsBannerVisible(true);

      const timer = setTimeout(() => {
        setIsBannerVisible(false);
        localStorage.setItem("headsUpBannerShown", "true");
      }, 20000);

      return () => clearTimeout(timer);
    }
  }, [bannerShown]);

  const handleClose = () => {
    setIsBannerVisible(false);
    localStorage.setItem("headsUpBannerShown", "true");
  };

  useEffect(() => {
    if (isShared) {
      sessionStorage.setItem(`quickMode_${id}`, "1");
    }
  }, [isShared, id]);
  useEffect(() => {
    const forced = sessionStorage.getItem(`quickMode_${id}`) === "1";
    if (forced) {
      dispatch(activateQuickMode(id));
    }
  }, [dispatch, id]);

  useEffect(() => {
    const userId = currentUser?.uid;
    const vendorId = vendor?.id;
    if (!userId || !vendorId) {
      setIsFollowing(false);
      setIsFollowLoading(false);
      return undefined;
    }

    setIsFollowLoading(true);
    return subscribeVendorFollow(
      userId, vendorId,
      (followed) => {
        setIsFollowing(followed);
        if (!followMutationRef.current) setIsFollowLoading(false);
      },
      (followError) => {
        console.error("Error listening to follow status:", followError);
        if (!followMutationRef.current) setIsFollowLoading(false);
      },
    );
  }, [currentUser?.uid, vendor?.id]);

  useEffect(() => {
    const vendorId = vendor?.id;
    if (!vendorId) return undefined;

    return onSnapshot(
      doc(db, "publicVendors", vendorId),
      (snapshot) => {
        const count = Number(snapshot.data()?.followersCount);
        if (Number.isFinite(count)) {
          dispatch(setVendorFollowersCount({ vendorId, count }));
        }
      },
      (countError) => {
        console.error("Error listening to follower count:", countError);
      },
    );
  }, [dispatch, vendor?.id]);

  useEffect(() => {
    const vendorId = vendor?.id;
    if (!vendorId) return undefined;

    let cancelled = false;
    getVendorFollowerCount(vendorId)
      .then((count) => {
        if (!cancelled) dispatch(setVendorFollowersCount({ vendorId, count }));
      })
      .catch((countError) => {
        console.error("Error loading exact follower count:", countError);
      });

    return () => {
      cancelled = true;
    };
  }, [dispatch, vendor?.id]);
  useEffect(() => {
    const handleScrollChange = () => {
      const currentScrollPosition = window.scrollY;
      setScrollPosition(currentScrollPosition);

      const threshold = 100000;
      setShowCountdownInHeader(currentScrollPosition > threshold);
    };

    window.addEventListener("scroll", handleScrollChange, { passive: true });
    return () => window.removeEventListener("scroll", handleScrollChange);
  }, []);

  const restored = useRef(false);
  let hasUserScrolledSinceRestore = false; // survives re-mounts
  useEffect(() => {
    const onScroll = () => {
      if (!hasUserScrolledSinceRestore) {
        hasUserScrolledSinceRestore = true; // first real user scroll
      }
      lastScrollY.current = window.scrollY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    return () => {
      if (hasUserScrolledSinceRestore) {
        dispatch(
          saveStoreScroll({ vendorId: id, scrollY: lastScrollY.current }),
        );
        localStorage.setItem(`storeScroll_${id}`, String(lastScrollY.current));
      }
    };
  }, [dispatch, id]);

  useLayoutEffect(() => {
    console.log(
      `🔍 trying to restore scroll to ${scrollY} (restored? ${restored.current})`,
    );
    if (
      !restored.current &&
      products.length > 0 &&
      !loadingMore &&
      scrollY != null
    ) {
      requestAnimationFrame(() => {
        console.log(`🚀 restoring scroll to ${scrollY}`);
        window.scrollTo(0, scrollY);
        restored.current = true;
        if (Number(scrollY) > 0) appHaptics.light();
      });
    }
  }, [products.length, loadingMore, scrollY]);
  const handleOpenPileModal = () => {
    setShowPileModal(true);

    if (currentUser) {
      dispatch(fetchStockpileData({ userId: currentUser.uid, vendorId: id }));
    }
  };
  const retryLoadVendor = useCallback(() => {
    dispatch(fetchStoreVendor(id));
    dispatch(fetchVendorCatalogPage({ vendorId: id, loadMore: false }));
  }, [dispatch, id]);

  useEffect(() => {
    const handleScroll = () => {
      const currentPos = window.scrollY;
      if (currentPos > prevScrollPos.current) {
        setShowHeader(false);
      } else {
        setShowHeader(true);
      }
      prevScrollPos.current = currentPos;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const badgeConfig = {
    Newbie: {
      icon: <LiaSeedlingSolid />,
      gradient: "from-gray-300 to-gray-500",
    },
    "Rising Seller": {
      icon: <IoRocketOutline />,
      gradient: "from-orange-300 to-orange-700",
    },
    "Consistent Seller": {
      icon: <MdSyncLock />,
      gradient: "from-blue-300 to-blue-700",
    },
    "Steady Mover": {
      icon: <MdOutlineShowChart />,
      gradient: "from-indigo-300 to-indigo-700",
    },
    "Reliable Vendor": {
      icon: <IoCheckmarkDoneCircleOutline />,
      gradient: "from-teal-300 to-teal-700",
    },
    "Power Seller": {
      icon: <TfiBolt />,
      gradient: "from-yellow-300 to-yellow-700",
    },
    "OG Seller": {
      icon: <PiCrown />,
      gradient: "from-purple-300 to-purple-700",
    },
  };

  const openDisclaimer = (path) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    const abs = `${window.location.origin}${path}`;
    setTermsUrl(abs);
    setShowTermsModal(true);
  };

  const closeStockpileIntro = () => {
    sessionStorage.setItem(`introStockpile_${vendor.id}`, "seen");
    sessionStorage.setItem(`introDone_${vendor.id}`, "yes");
    setShowStockpileIntro(false);
  };

  const closePickupIntro = () => {
    sessionStorage.setItem(`introPickup_${vendor.id}`, "seen");
    sessionStorage.setItem(`introDone_${vendor.id}`, "yes");
    setShowPickupIntro(false);
  };
  function VendorBadge({ badgeName }) {
    const { icon, gradient } = badgeConfig[badgeName] || badgeConfig.Newbie;
    return (
      <div
        className={`
        vendor-badge
        bg-gradient-to-r ${gradient}
        text-white
        px-6 py-2
        rounded-full
        flex items-center
        shadow-lg
      `}
      >
        {React.cloneElement(icon, { className: "mr-2", size: 24 })}

        <div className="text-xs font-bodoni font-semibold leading-tight text-center">
          {badgeName.split(" ").map((word, i) => (
            <span key={i} className="block">
              {word}
            </span>
          ))}
        </div>
      </div>
    );
  }

  const handleClosePileModal = () => {
    setShowPileModal(false);
  };

  const expiryString = stockpileExpiry
    ? moment(stockpileExpiry).format("ddd, MMM Do YYYY")
    : null;

  const performFollow = async (authUser) => {
    if (!authUser?.uid) {
      setAuthOpen(true);
      return;
    }

    if (!vendor?.id) {
      toast.error("Vendor ID missing");
      return;
    }

    if (isFollowLoading || followMutationRef.current) return;

    const prevState = isFollowing;
    followMutationRef.current = true;
    setIsFollowLoading(true);
    setIsFollowing(!prevState);
    appHaptics.medium();

    try {
      const result = await setVendorFollowState({
        userId: authUser.uid,
        vendorId: vendor.id,
        shouldFollow: !prevState,
      });
      setIsFollowing(result.followed);
      try {
        const count = await getVendorFollowerCount(vendor.id);
        dispatch(setVendorFollowersCount({ vendorId: vendor.id, count }));
      } catch (countError) {
        console.error("Follow changed but exact count refresh failed:", countError);
      }
    } catch (err) {
      console.error("Follow/unfollow failed:", err.message);
      setIsFollowing(prevState);
      appHaptics.error();
      toast.error(err.message || "Something went wrong.");
    } finally {
      followMutationRef.current = false;
      setIsFollowLoading(false);
    }
  };

  // Keep the DOM event separate from the authenticated action. Passing this
  // function directly to onClick previously treated React's click event as the
  // user object and incorrectly opened the sign-in sheet for signed-in users.
  const handleFollowClick = () => {
    void performFollow(currentUser);
  };

  useEffect(() => {
    if (!currentUser?.uid || !vendor?.id) return;
    const intent = takeAuthIntent({types: "follow-vendor", pathname: location.pathname});
    if (!intent || String(intent.payload?.vendorId || "") !== String(vendor.id)) return;
    void performFollow(currentUser);
  }, [currentUser?.uid, location.pathname, vendor?.id]);
  const hasFlashSale = vendor?.flashSale === true;
  const handleFavoriteToggle = (productId) => {
    setFavorites((prevFavorites) => {
      const isFavorited = prevFavorites[productId];
      if (isFavorited) {
        const { [productId]: removed, ...rest } = prevFavorites;
        return rest;
      } else {
        return { ...prevFavorites, [productId]: true };
      }
    });
  };

  const handleGoToCart = () => {
    navigate("/cart");
  };

  const handleRatingClick = () => {
    navigate(`/reviews/${id}`);
  };
  if ((vendorLoading && !vendor) || (!vendor && !error)) {
    return <VendorStoreSkeleton />;
  }

  // if (reduxLoading) {
  //   return <Loading />;
  // }

  if (!vendor) {
    const networkProblem = !isOnline || isNetworkishError(error);

    if (networkProblem) {
      return <NetworkIssueNotice onRetry={retryLoadVendor} />;
    }

    if (
      error &&
      (error.code === "not-found" ||
        /not[-\s]?found/i.test(error.message || ""))
    ) {
      return (
        <div className="flex flex-col px-6 justify-center items-center h-3/6">
          <Lottie
            className="w-full h-full"
            animationData={Productnotfund}
            loop
            autoplay
          />
          <h1 className="text-xl text-center font-bold font-opensans text-red-500">
            Vendor is not found. You entered a wrong link or the vendor is not
            available.
          </h1>
          <button
            className="mt-20 py-2 rounded-full font-medium flex items-center font-opensans px-5 justify-center transition-colors duration-200 bg-customOrange text-white"
            onClick={() => {
              if (currentUser) navigate("/");
              else navigate("/login", { state: { returnTo: location.pathname } });
            }}
          >
            Go Home
          </button>
        </div>
      );
    }
    return <NetworkIssueNotice onRetry={retryLoadVendor} />;
  }

  const handleShare = async () => {
    const storeUrl = siteUrls.storeShareUrl({ slug: vendor.slug, id });
    try {
      const result = await shareContent({
        title: vendor.shopName,
        text: `Check out ${vendor.shopName} on My Thrift!`,
        url: storeUrl,
      });
      if (result === "copied") {
        toast.success("Store link copied to clipboard!");
      }
    } catch (error) {
      console.error("Share failed:", error);
    }
  };
  const badgeMessages = {
    Newbie: "Just getting started on My Thrift excited to grow and serve you!",
    "Rising Seller":
      "Building momentum, check out their growing collection of unique finds!",
    "Consistent Seller":
      "Dependable and steady—regularly adding fresh products for you.",
    "Steady Mover":
      "On a roll! consistently delivering great products to happy customers.",
    "Reliable Vendor":
      "Trusted by many high ratings and dependable service every time.",
    "Power Seller":
      "High-volume seller—packed with variety and lightning-fast service.",
    "OG Seller":
      "Top-tier vendor—exceptional range, quality, and a proven track record.",
  };

  const FollowHeadsUp = () => {
    const bannerShown = localStorage.getItem("headsUpBannerShown");
    useEffect(() => {
      if (!bannerShown) {
        setIsBannerVisible(true);

        const timer = setTimeout(() => {
          setIsBannerVisible(false);
          localStorage.setItem("headsUpBannerShown", "true");
        }, 10000);

        return () => clearTimeout(timer);
      }
    }, [bannerShown]);

    const handleClose = () => {
      setIsBannerVisible(false);
      localStorage.setItem("headsUpBannerShown", "true");
    };

    return (
      <>
        <div
          className={`z-40 transform -translate-x-3  -translate-y-2 w-4 h-4 backdrop-blur-2xl  bg-gradient-to-tr from-transparent to-black/20 -rotate-45 transition-opacity duration-500 ${
            isBannerVisible ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        ></div>{" "}
        <div
          className={`z-50 w-72 bg-gradient-to-br -translate-y-[18px] from-black/5 to-black/30 backdrop-blur-lg shadow-md text-white px-2 py-2 rounded-lg flex flex-col items-start space-y-1 transform left-1/2 transition-opacity duration-500 ${
            isBannerVisible ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          style={{ maxWidth: "99%" }}
        >
          <span className="font-semibold font-opensans text-md">
            Click here to follow this vendor!
          </span>
          <span className="text-xs font-opensans">
            Like this vendor? Follow to get notified whenever they post new
            products and run sales✨
          </span>
          <button onClick={handleClose} className="absolute top-1 right-2">
            <MdClose className="text-white text-lg" />
          </button>
        </div>
      </>
    );
  };

  // The storefront presentation below is the Figma-aligned layer. All data,
  // pagination, cache, analytics, follow, stockpile and quick-checkout state
  // continues to be owned by StorePage so this redesign stays additive.
  return (
    <>
      <SEO
        title={`${vendor.shopName} - My Thrift`}
        description={`Shop ${vendor.shopName} on My Thrift`}
        image={`${vendor.coverImageUrl}`}
        url={`https://www.shopmythrift.store/store/${id}`}
      />

      <VendorStoreExperience
        vendor={vendor}
        vendorId={id}
        entry={entry}
        products={products}
        categories={entry.categories || []}
        loadingProducts={
          (Boolean(catalog.loadingInitial) && products.length === 0) ||
          !catalog.initialized
        }
        onRetryProducts={() =>
          dispatch(fetchVendorCatalogPage({ vendorId: id, loadMore: false }))
        }
        favorites={favorites}
        onFavoriteToggle={handleFavoriteToggle}
        isFollowing={isFollowing}
        isFollowLoading={isFollowLoading}
        onFollow={handleFollowClick}
        onShare={handleShare}
        onPolicy={() => setShowVendorPolicy(true)}
        onPlatformPolicy={() => setShowBuyerProtection(true)}
        currentUser={currentUser}
        currentUserData={currentUserData}
        quickMode={quickForThisVendor}
        checkoutCount={checkoutCount}
        onCheckout={() => basketRef.current?.openCheckoutAuth?.()}
        flashSale={
          hasFlashSale ? (
            <section className="vendor-store-flash-sale" aria-label="Flash sale countdown">
              <strong>First Drop in:</strong>
              <FlipCountdown endTime={vendor.flashSaleEndsAt} />
            </section>
          ) : null
        }
        badgeMessage={badgeMessages[vendor.badge] || badgeMessages.Newbie}
      />

      {loadingMore && products.length > 0 && (
        <div className="flex justify-center my-4" aria-label="Loading more products">
          <RotatingLines
            strokeColor="#f9531e"
            strokeWidth="4"
            animationDuration="0.75"
            width="16"
            visible
          />
        </div>
      )}

      {isActive && stockpileVendorId === id && (
        <button
          type="button"
          onClick={handleOpenPileModal}
          className="fixed bottom-6 right-3 z-50 w-14 h-14 rounded-full flex items-center justify-center bg-customOrange text-white shadow-xl"
          aria-label="Open your current stockpile"
        >
          <BsFillBasketFill size={24} />
        </button>
      )}

      <AppBottomSheet
        open={showPileModal}
        onClose={handleClosePileModal}
        height="70dvh"
        ariaLabel="Your current pile"
      >
        <div className="flex h-full flex-col px-4 pb-4 pt-6 font-satoshi">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <h2 className="text-xl font-medium text-gray-900">Your Current Pile</h2>
            <button type="button" onClick={handleClosePileModal} className="grid h-8 w-8 place-items-center" aria-label="Close">
              <MdClose className="text-2xl text-gray-700" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto pt-4">
            {stockpileLoading ? (
              <div className="flex h-40 items-center justify-center"><Loading /></div>
            ) : (
              <>
                {expiryString && (
                  <p className="mb-4 text-sm text-gray-500">
                    Your pile expires on <span className="font-medium text-customOrange">{expiryString}</span>
                  </p>
                )}
                {(pileOrders || []).length === 0 ? (
                  <p className="text-sm text-gray-500">No items found</p>
                ) : (
                  pileOrders.map((order, orderIndex) => {
                    const isAccepted = order.membershipStatus === "ready";
                    const isDeclined = order.membershipStatus === "declined";
                    const statusLabel = isAccepted
                      ? "Accepted"
                      : isDeclined
                        ? "Declined"
                        : "Pending";
                    const statusColor = isAccepted
                      ? "bg-emerald-500"
                      : isDeclined
                        ? "bg-red-500"
                        : "bg-amber-500";

                    return (
                      <section
                        key={order.id}
                        className={orderIndex > 0 ? "border-t border-gray-200 pt-3" : ""}
                      >
                        <div className="flex items-center justify-between gap-3 py-2">
                          <p className="min-w-0 truncate text-xs font-medium text-gray-500">
                            Order {order.orderId}
                          </p>
                          <span className="inline-flex shrink-0 items-center gap-2 text-xs font-medium text-gray-600">
                            <span
                              className={`h-2 w-2 rounded-full ${statusColor}`}
                              aria-hidden="true"
                            />
                            {statusLabel}
                          </span>
                        </div>

                        <div>
                          {(order.items || []).map((item, index) => (
                            <div
                              key={`${order.id}-${item.productKey || item.productId || index}`}
                              className="flex min-h-20 items-stretch gap-3 py-3"
                            >
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="h-20 w-20 shrink-0 rounded-lg object-cover"
                              />
                              <div className="min-w-0 self-center">
                                <p className="line-clamp-2 text-sm font-medium text-gray-950">
                                  {item.name}
                                </p>
                                {Number.isFinite(Number(item.unitPrice)) && (
                                  <p className="mt-1 text-sm font-semibold text-gray-950">
                                    ₦{Number(item.unitPrice).toLocaleString()}
                                  </p>
                                )}
                                {(item.selectedSize || item.selectedColor) && (
                                  <p className="mt-1 text-xs text-gray-500">
                                    {[item.selectedSize, item.selectedColor]
                                      .filter(Boolean)
                                      .join(" · ")}
                                  </p>
                                )}
                                <p className="mt-1 text-xs text-gray-500">
                                  Qty: {Number(item.quantity || 1)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    );
                  })
                )}
              </>
            )}
          </div>
        </div>
      </AppBottomSheet>

      <PickupInfoModal
        isOpen={showPickupIntro}
        vendor={vendor}
        onClose={closePickupIntro}
      />
      <StockpileInfoModal
        isOpen={showStockpileIntro}
        vendor={vendor}
        onClose={closeStockpileIntro}
      />

      {quickForThisVendor && (
        <StoreBasket vendorId={id} quickMode ref={basketRef} />
      )}

      <IframeModal
        show={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        url={termsUrl}
      />
      <VendorPolicyModal
        show={showVendorPolicy}
        onClose={() => setShowVendorPolicy(false)}
        policy={vendor.returnPolicy ?? { type: "NONE", notes: "" }}
      />
      <BuyerProtectionModal
        show={showBuyerProtection}
        onClose={() => setShowBuyerProtection(false)}
      />
      <QuickAuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        headerText="Let’s set you up to follow"
        onComplete={(user) => {
          setAuthOpen(false);
          void performFollow(user);
        }}
        openDisclaimer={openDisclaimer}
        authIntent={{
          type: "follow-vendor",
          returnTo: `${location.pathname}${location.search}`,
          payload: {vendorId: vendor?.id || id},
        }}
      />
    </>
  );

};

export default StorePage;
