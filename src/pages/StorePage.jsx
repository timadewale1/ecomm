import React, {
  useState,
  useEffect,
  useRef,
  useLayoutEffect,
  useCallback,
} from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { handleUserActionLimit } from "../services/userWriteHandler";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { db, auth } from "../firebase.config";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchStoreVendor,
  saveStoreScroll,
  fetchVendorCategories,
  fetchVendorProductsBatch,
} from "../redux/reducers/storepageVendorsSlice";
import { onAuthStateChanged } from "firebase/auth";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { GoChevronLeft, GoDotFill } from "react-icons/go";
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
  FaCalendarWeek,
  FaTruck,
  FaCheckCircle,
  FaBolt,
  FaCrown,
  FaUndoAlt,
  FaShieldAlt,
} from "react-icons/fa";
import Productnotfund from "../Animations/productnotfound.json";
import toast from "react-hot-toast";
import ProductCard from "../components/Products/ProductCard";
import Loading from "../components/Loading/Loading";
import { useAuth } from "../custom-hooks/useAuth";
import { FaSpinner, FaStar } from "react-icons/fa6";
import { CiLogin, CiSearch } from "react-icons/ci";
import Modal from "react-modal";
import moment from "moment";
import {
  MdCancel,
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
import { PiCrown } from "react-icons/pi";
import { GrShare } from "react-icons/gr";
import { RiHeart3Fill, RiHeart3Line, RiSearchLine } from "react-icons/ri";
import PickupInfoModal from "../components/Location/PickupModal";
import StockpileInfoModal from "../components/StockpileModal";
import IframeModal from "../components/PwaModals/PushNotifsModal";
import VendorPolicyModal from "./Legal/VendorPolicyModal";
Modal.setAppElement("#root"); // For accessibility

const FlipCountdown = ({ endTime }) => {
  // normalize to a JS Date
  const target =
    typeof endTime.toDate === "function" ? endTime.toDate() : new Date(endTime);

  // compute difference
  const calc = () => {
    const diff = Math.max(0, target.getTime() - Date.now());
    const sec = Math.floor((diff / 1000) % 60);
    const min = Math.floor((diff / 1000 / 60) % 60);
    const hr = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const day = Math.floor(diff / (1000 * 60 * 60 * 24));
    return { day, hr, min, sec };
  };

  const [timeLeft, setTimeLeft] = useState(calc());

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(timer);
  }, []);

  const unitClass = "flex flex-col items-center mx-1";
  const digitClass =
    "bg-white text-customOrange px-2 py-1 rounded shadow flip-card";

  return (
    <div className="flex font-ubuntu text-sm items-center">
      {["day", "hr", "min", "sec"].map((u) => (
        <div key={u} className={unitClass}>
          <div className={digitClass}>
            {String(timeLeft[u]).padStart(2, "0")}
          </div>
          <span className="text-xs mt-0.5 uppercase">{u}</span>
        </div>
      ))}
    </div>
  );
};
function VendorDetails({ vendor }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [isOpen, setIsOpen] = useState(false);
  const [autoDone, setAutoDone] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [timeoutId, setTimeoutId] = useState(null);

  // Auto-open when it first comes into view, only if not interacted
  useEffect(() => {
    if (!inView || autoDone || hasInteracted) return;

    setIsOpen(true);
    setAutoDone(true);
    const id = setTimeout(() => {
      setIsOpen(false);
    }, 4000);
    setTimeoutId(id);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [inView, autoDone, hasInteracted, timeoutId]);

  // Cleanup timeout on unmount or state change
  useEffect(() => {
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
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

  // Auto-open when it first comes into view, only if not interacted
  useEffect(() => {
    if (!inView || autoDone || hasInteracted) return;

    setIsOpen(true);
    setAutoDone(true);
    const id = setTimeout(() => {
      setIsOpen(false);
    }, 4000);
    setTimeoutId(id);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [inView, autoDone, hasInteracted, timeoutId]);

  // Cleanup timeout on unmount or state change
  useEffect(() => {
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
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
const StorePage = () => {
  const { id } = useParams();
  // const [vendor, setVendor] = useState(null);
  // const [products, setProducts] = useState([]);
  const [favorites, setFavorites] = useState({});
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  // const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const { currentUser } = useAuth();
  // const [currentUser, setCurrentUser] = useState(null);
  const dispatch = useDispatch();
  const [selectedType, setSelectedType] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingAll, setLoadingAll] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showCountdownInHeader, setShowCountdownInHeader] = useState(false);
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [viewOptions, setViewOptions] = useState(false);
  // Add this line along with your other useState declarations
  const [sortOption, setSortOption] = useState(null); // 'priceAsc' or 'priceDesc'
  // Instead of local "vendor" and "products" state, we read from Redux
  // Get the slice
  const {
    entities,
    loading: vendorLoading,
    error,
  } = useSelector((state) => state.storepageVendors);

  // Convenience variables for the current vendor page
  const entry = entities[id] || {};
  const { vendor, products = [], loadingMore, noMore, scrollY } = entry;
  const hasFlashSale = products.some((p) => p.flashSales);
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isShared = searchParams.has("shared");
  const [isStockpileMode, setIsStockpileMode] = useState(false);
  const [showPileModal, setShowPileModal] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const prevScrollPos = useRef(0);
  const {
    isActive,
    vendorId: stockpileVendorId,
    pileItems,
    stockpileExpiry,
    loading: stockpileLoading,
  } = useSelector((state) => state.stockpile);
  const [showVendorPolicy, setShowVendorPolicy] = useState(false);
  const isStockpileForThisVendor = isActive && stockpileVendorId === id;
  const lastScrollY = useRef(0);
  const [showStockpileIntro, setShowStockpileIntro] = useState(false);
  const [showSharedHeader, setShowSharedHeader] = useState(true);
  const [showPickupIntro, setShowPickupIntro] = useState(false);
  const [userCoords, setUserCoords] = useState(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsUrl, setTermsUrl] = useState("");

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

    /* --- ① PICK‑UP gets first dibs ---------------------------------- */
    if (hasPickup && !sessionStorage.getItem(pickupSeenKey)) {
      // quietly request user location; don’t block if declined
      navigator.geolocation?.getCurrentPosition(
        (pos) =>
          setUserCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }),
        () => setUserCoords(null),
        { timeout: 8000 }
      );
      setShowPickupIntro(true);
      return; // ← don’t fall through
    }

    /* --- ② otherwise fall back to STOCKPILE ------------------------- */
    if (hasStockpile && !sessionStorage.getItem(stockpileSeenKey)) {
      setShowStockpileIntro(true);
      // no return needed; this is the last branch
    }
  }, [vendor]);

  const sharedPrevScrollY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;
      // if you’ve scrolled down, hide; if up, show
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
      dispatch(enterStockpileMode({ vendorId: id })); // ✅ good!
      setIsStockpileMode(true); // 🔴 HERE —> this is **key**
    }
  }, [location.search, currentUser, dispatch, id]);
  // ✅ hydrate scrollY once the vendor slice entry exists
  useEffect(() => {
    if (!vendor) return;
    const saved = localStorage.getItem(`storeScroll_${id}`);
    if (saved != null) {
      dispatch(
        saveStoreScroll({
          vendorId: id,
          scrollY: parseFloat(saved),
        })
      );
    }
  }, [vendor, id, dispatch]);

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
    if (vendor && products.length === 0) {
      dispatch(fetchVendorProductsBatch({ vendorId: id, loadMore: false }));
    }
  }, [vendor, products.length, id, dispatch]);
  const ensureAllProductsLoaded = useCallback(async () => {
    if (!vendor || entry.noMore) return; // already complete
    setLoadingAll(true);
    try {
      while (true) {
        const { noMore } = await dispatch(
          fetchVendorProductsBatch({ vendorId: id, loadMore: true })
        ).unwrap();
        if (noMore) break;
      }
    } finally {
      setLoadingAll(false);
    }
  }, [vendor, entry.noMore, dispatch, id]);
  const openSearch = useCallback(async () => {
    setIsSearching(true);
    await ensureAllProductsLoaded(); // pull the whole catalogue once
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [ensureAllProductsLoaded]);
  // Infinite scroll – load more when the user nears the bottom
  useEffect(() => {
    const onScroll = () => {
      const nearBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 150;

      if (vendor && nearBottom && !loadingMore && !noMore) {
        dispatch(fetchVendorProductsBatch({ vendorId: id, loadMore: true }));
      }
    };

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [vendor, loadingMore, noMore, id, dispatch]);

  useEffect(() => {
    setIsFollowing(false);

    const checkIfFollowing = async () => {
      if (currentUser && vendor) {
        try {
          const followRef = collection(db, "follows");
          const followDocRef = doc(
            followRef,
            `${currentUser.uid}_${vendor.id}`
          );
          const followSnapshot = await getDoc(followDocRef);

          if (followSnapshot.exists()) {
            setIsFollowing(true);
          } else {
            setIsFollowing(false);
          }
        } catch (error) {
          console.error("Error checking follow status:", error);
        }
      }
    };

    checkIfFollowing();
  }, [currentUser, vendor]);
  useEffect(() => {
    const handleScrollChange = () => {
      const currentScrollPosition = window.scrollY;
      setScrollPosition(currentScrollPosition);

      const threshold = 100000; // pixels
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
          saveStoreScroll({ vendorId: id, scrollY: lastScrollY.current })
        );
        localStorage.setItem(`storeScroll_${id}`, String(lastScrollY.current));
      }
    };
  }, [dispatch, id]);

  useLayoutEffect(() => {
    console.log(
      `🔍 trying to restore scroll to ${scrollY} (restored? ${restored.current})`
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
      });
    }
  }, [products.length, loadingMore, scrollY]);
  const handleOpenPileModal = () => {
    setShowPileModal(true);
    // dispatch the thunk
    if (currentUser) {
      dispatch(fetchStockpileData({ userId: currentUser.uid, vendorId: id }));
    }
  };
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
  // 👉 helper: normalises strings once
  const normal = (s = "") => s.toString().toLowerCase().trim();

  // 👉 helper: does the product match the query?
  const matches = (p, q) => {
    const qn = normal(q);
    return (
      normal(p.name).includes(qn) ||
      normal(p.productType).includes(qn) ||
      (Array.isArray(p.tags) && p.tags.some((t) => normal(t).includes(qn)))
    );
  };
  const stars = Array(5)
    .fill(0)
    .map((_, i) => (
      <FaStar key={i} className="text-yellow-400 mr-0.5" size={12} />
    ));
  // 👉 helper: true = we’re currently doing a “global” search
  const searchingUI = (isSearching, searchTerm) =>
    isSearching && normal(searchTerm) !== "";

  // Format the expiry date with moment
  const expiryString = stockpileExpiry
    ? moment(stockpileExpiry).format("ddd, MMM Do YYYY")
    : null;

  // ---- optimistic follow / unfollow ---------------------------
  const handleFollowClick = async () => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }

    if (!vendor?.id) {
      toast.error("Vendor ID missing");
      return;
    }

    // Optimistically flip the heart
    const prevState = isFollowing;
    setIsFollowing(!prevState);

    try {
      const followRef = doc(db, "follows", `${currentUser.uid}_${vendor.id}`);
      const vendorRef = doc(db, "vendors", vendor.id);

      // OPTIONAL: rate-limit check (keep if you still need it)
      await handleUserActionLimit(
        currentUser.uid,
        "follow",
        {},
        {
          collectionName: "usage_metadata",
          writeLimit: 50,
          minuteLimit: 8,
          hourLimit: 40,
        }
      );

      if (!prevState) {
        // follow
        await setDoc(followRef, {
          userId: currentUser.uid,
          vendorId: vendor.id,
          createdAt: serverTimestamp(),
        });
        await updateDoc(vendorRef, { followersCount: increment(1) });
        // toast.success("You’ll get updates from this vendor.");
      } else {
        // unfollow
        await deleteDoc(followRef);
        // toast.success("Unfollowed.");
      }
    } catch (err) {
      console.error("Follow/unfollow failed:", err.message);
      // revert UI
      setIsFollowing(prevState);
      toast.error(err.message || "Something went wrong.");
    }
  };

  useEffect(() => {
    if (isLoginModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isLoginModalOpen]);

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
  if (vendorLoading || (!vendor && !error)) {
    return (
      <div className="p-3 mb-24 animate-pulse">
        {/* Header skeleton */}
        <div className="fixed top-0 left-0 right-0 z-10 flex items-center justify-between p-4">
          <Skeleton circle width={40} height={40} />
          <div className="flex space-x-2">
            <Skeleton circle width={40} height={40} />
            <Skeleton circle width={40} height={40} />
            <Skeleton circle width={40} height={40} />
          </div>
        </div>
        <div className="pt-20">
          {/* Cover image skeleton */}
          <Skeleton height={320} />

          {/* Curved white section */}
          <div className="relative bg-white -mt-8 rounded-t-3xl pt-8 pb-6 px-6">
            {/* Flash sale banner */}
            <Skeleton className="mb-6 h-20 rounded-2xl" />

            {/* Store name */}
            <div className="flex justify-center mb-2">
              <Skeleton width={200} height={32} />
            </div>

            {/* Description */}
            <Skeleton count={2} />

            {/* Rating / badge / reviews row */}
            <div className="flex items-center justify-center space-x-6 mt-6">
              <Skeleton circle width={40} height={40} />
              <Skeleton width={120} height={40} />
              <Skeleton circle width={40} height={40} />
            </div>

            <hr className="mt-6 border-gray-100" />

            {/* More about this Vendor */}
            <Skeleton width={150} height={24} className="mt-6 mb-4" />
            <div className="space-y-4">
              <Skeleton height={60} />
              <Skeleton height={60} />
              <Skeleton height={60} />
            </div>

            <hr className="mt-6 border-gray-100" />

            {/* Additional Details */}
            <Skeleton width={180} height={24} className="mt-6 mb-4" />
            <div className="space-y-4">
              <Skeleton height={60} />
              <Skeleton height={60} />
              <Skeleton height={60} />
            </div>

            <hr className="mt-6 border-gray-100" />
          </div>

          {/* Products section */}
          <div className="mt-7">
            <div className="flex items-center justify-between mb-3">
              <Skeleton width={120} height={24} />
              <Skeleton width={100} height={24} />
            </div>
            <div className="flex mb-4 space-x-2 overflow-x-auto">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} width={80} height={40} />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} height={200} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleTypeSelect = async (type) => {
    setSelectedType(type);
    if (type !== "All") {
      await ensureAllProductsLoaded(); // make sure every product is present
    }
  };
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const filteredProducts = products
    .filter((p) => matches(p, searchTerm))
    .filter((p) => selectedType === "All" || p.productType === selectedType)
    .sort((a, b) => {
      if (sortOption === "priceAsc") return a.price - b.price;
      if (sortOption === "priceDesc") return b.price - a.price;
      return 0;
    });

  // if (reduxLoading) {
  //   return <Loading />;
  // }

  if (!vendor) {
    return (
      <div className="flex flex-col px-6 justify-center items-center h-3/6">
        <Lottie
          className="w-full h-full"
          animationData={Productnotfund}
          loop={true}
          autoplay={true}
        />
        <h1 className="text-xl text-center font-bold font-opensans text-red-500">
          Vendor is not found. You entered a wrong link or the vendor is not
          available.
        </h1>
        <button
          className={` mt-20  py-2 rounded-full  font-medium flex items-center font-opensans px-5 justify-center transition-colors duration-200 bg-customOrange text-white`}
          onClick={() => {
            if (currentUser) {
              navigate("/browse-markets");
            } else {
              navigate("/confirm-state");
            }
          }} // Disable button when loading
        >
          {" "}
          Go Home
        </button>
      </div>
    );
  }
  const handleClearSearch = () => {
    setSearchTerm("");
  };
  // Calculate the average rating
  const averageRating =
    vendor.ratingCount > 0 ? vendor.rating / vendor.ratingCount : 0;
  const productTypes = ["All", ...(entry.categories || [])];
  const handleShare = () => {
    const storeUrl = `https://mx.shopmythrift.store/store/${vendor.id}?shared=true`;
    if (navigator.share) {
      navigator
        .share({
          title: vendor.shopName,
          text: `Check out ${vendor.shopName} on My Thrift!`,
          url: storeUrl,
        })
        .catch((err) => {
          console.error("Share failed:", err);
        });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(storeUrl);
      toast.success("Store link copied to clipboard!");
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

  const uniqueFilteredProducts = filteredProducts.filter(
    (prod, idx, arr) => arr.findIndex((p) => p.id === prod.id) === idx
  );

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
          <span className="text-sm font-opensans">
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

  return (
    <>
      {isActive && stockpileVendorId === id && (
        <>
          <button
            onClick={handleOpenPileModal}
            className="fixed bottom-6 right-3 z-50 
                       w-14 h-14 rounded-full 
                       flex items-center justify-center
                       bg-customOrange text-white
                       shadow-xl"
          >
            <BsFillBasketFill size={24} />
          </button>

          {/* Our modal for showing the user's existing pile items */}
          <Modal
            isOpen={showPileModal}
            onRequestClose={handleClosePileModal}
            className="fixed bottom-0 left-1/2 transform -translate-x-1/2  w-full max-h-[80vh] rounded-t-3xl bg-white p-4 overflow-y-auto"
            overlayClassName="fixed z-50 inset-0 bg-black bg-opacity-50 flex justify-center items-end"
            closeTimeoutMS={200}
          >
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-opensans  font-semibold text-gray-800">
                  Your Current Pile
                </h2>
                <MdClose
                  onClick={handleClosePileModal}
                  className="text-xl text-gray-600"
                />
              </div>
              <div className="border-b border-gray-300 mb-3"></div>

              {stockpileLoading ? (
                <div className="flex justify-center items-center h-40">
                  <Loading />
                </div>
              ) : (
                <>
                  {/* Show expiry date if we have it */}
                  {expiryString && (
                    <p className="mb-4 text-sm font-opensans text-gray-500">
                      Your pile expires on{" "}
                      <span className="font-medium text-customOrange">
                        {expiryString}
                      </span>
                    </p>
                  )}

                  {pileItems.filter(
                    (item) => item.progressStatus !== "Declined"
                  ).length === 0 ? (
                    <p>No items found</p>
                  ) : (
                    pileItems
                      .filter((item) => item.progressStatus !== "Declined")
                      .map((item, idx) => (
                        <div key={idx} className="flex items-center mb-3">
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-16 h-16 object-cover rounded-md"
                          />
                          <div className="ml-3">
                            <p className="font-medium text-black font-opensans text-sm">
                              {item.name}
                            </p>
                          </div>
                        </div>
                      ))
                  )}
                </>
              )}
            </div>
          </Modal>
        </>
      )}
      <SEO
        title={`${vendor.shopName} - My Thrift`}
        description={`Shop ${vendor.shopName} on My Thrift`}
        image={`${vendor.coverImageUrl}`}
        url={`https://www.shopmythrift.store/store/${id}`}
      />
      <PickupInfoModal
        isOpen={showPickupIntro}
        vendor={vendor}
        onClose={closePickupIntro}
        currentUserCoords={userCoords}
      />
      <StockpileInfoModal
        isOpen={showStockpileIntro}
        vendor={vendor}
        onClose={closeStockpileIntro}
      />
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
      <div className="p-3 mb-24">
        <div className="">
          {/* Header - Different styles based on state */}
          {isSearching ? (
            <div
              className="fixed top-0 left-0 right-0 z-10
          flex items-center justify-between p-4 bg-gradient-to-b from-white to-transparent"
            >
              <div className="flex items-center w-full relative px-2">
                <FaAngleLeft
                  onClick={() => {
                    setIsSearching(false);
                    handleClearSearch();
                  }}
                  className="cursor-pointer text-2xl mr-2"
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder={"Search " + (vendor?.shopName || "") + "..."}
                  className="flex-1 border rounded-full font-opensans text-black text-base border-gray-300 px-3 py-2 font-medium shadow-xl focus:outline-none"
                />
                {searchTerm && (
                  <MdCancel
                    className="text-xl text-gray-500 cursor-pointer absolute right-4"
                    onClick={handleClearSearch}
                  />
                )}
              </div>
            </div>
          ) : isShared ? (
            <div
              className={`
      fixed inset-x-0 bg-white h-24 top-0 z-20 border-gray-300
      transform transition-transform duration-200
      ${showSharedHeader ? "translate-y-0" : "-translate-y-full"}
    `}
            >
              <div className="w-full py-4">
                <div className="flex items-center justify-between">
                  <img
                    src="/newlogo.png"
                    alt="Logo"
                    onClick={() => navigate("/newhome")}
                    className="h-8 w-16 object-contain cursor-pointer"
                  />
                  <div className="flex items-center mr-2 relative">
                    <CiSearch
                      className="text-black text-3xl cursor-pointer"
                      onClick={openSearch}
                    />
                  </div>
                </div>
                <div className="flex mt-4 justify-between -translate-y-2 px-4 gap-4 w-full items-center">
                  <button
                    onClick={() => navigate("/login")}
                    className="px-4 py-1 text-sm w-full font-opensans text-customRichBrown border border-customRichBrown rounded-full"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => navigate("/signup")}
                    className="px-4 py-1 w-full text-sm font-opensans text-white bg-customOrange rounded-full"
                  >
                    Sign Up
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Glassmorphism header over image */}
              <div
                className={`
          fixed top-0 left-0 right-0 z-10
          flex items-center justify-between p-4 bg-gradient-to-b from-white/40 to-transparent
        `}
              >
                {/* Back button */}
                <button
                  onClick={() => navigate(-1)}
                  className={`w-10 h-10 rounded-full bg-gradient-to-br from-transparent to-black/30 backdrop-blur-md flex items-center justify-center shadow-lg hover:bg-white/30 transition-opacity duration-300 border border-white/40
          ${showHeader ? "opacity-100" : "opacity-30"}`}
                >
                  <GoChevronLeft className="text-white text-xl" />
                </button>

                {/* Right side icons */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={openSearch}
                    className={`w-10 h-10 rounded-full bg-gradient-to-br from-transparent to-black/30 backdrop-blur-md flex items-center justify-center shadow-lg hover:bg-white/30 transition-opacity duration-300 border border-white/40
          ${showHeader ? "opacity-100" : "opacity-30"}`}
                  >
                    <RiSearchLine className="text-white text-xl" />
                  </button>
                  <button
                    onClick={handleShare}
                    className={`w-10 h-10 rounded-full bg-gradient-to-br from-transparent to-black/30 backdrop-blur-md flex items-center justify-center shadow-lg hover:bg-white/30 transition-opacity duration-300 border border-white/40
          ${showHeader ? "opacity-100" : "opacity-30"}`}
                  >
                    <GrShare className="text-white text-lg" />
                  </button>
                  <button
                    onClick={handleFollowClick}
                    disabled={isFollowLoading}
                    className={`w-10 h-10 rounded-full bg-gradient-to-br from-transparent to-black/30 backdrop-blur-md flex items-center justify-center shadow-md hover:bg-white/30 transition-opacity duration-300 border border-white/40
          ${showHeader ? "opacity-100" : "opacity-30"}`}
                  >
                    <motion.div
                      key={isFollowing ? "filled" : "outline"}
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1.1 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 15,
                      }}
                    >
                      {isFollowing ? (
                        <RiHeart3Fill className="text-red-500 text-lg" />
                      ) : (
                        <RiHeart3Line className="text-white text-lg" />
                      )}
                    </motion.div>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Follow heads up banner */}
          {!isShared && isBannerVisible && (
            <div
              className={`fixed w-full top-14 left-0 right-0 z-10 flex flex-col items-end justify-end p-4 pointer-events-auto`}
            >
              <FollowHeadsUp />
            </div>
          )}

          {!isSearching && !searchingUI(isSearching, searchTerm) && (
            <>
              {/* Store Cover Image */}
              <div className="relative w-full h-80 overflow-hidden">
                {vendorLoading ? (
                  <Skeleton height={320} />
                ) : vendor.coverImageUrl ? (
                  <img
                    className="w-full h-full object-cover"
                    src={vendor.coverImageUrl}
                    alt={vendor.shopName}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                    <span className="text-center  font-opensans font-bold text-gray-600">
                      {vendor.shopName}
                    </span>
                  </div>
                )}
              </div>

              {/* Curved White Section */}
              <div
                className="relative bg-white -mt-8 rounded-t-3xl pt-8 pb-6"
                style={{ boxShadow: "0 -4px 20px -10px rgba(0,0,0,0.08)" }}
              >
                {" "}
                {/* Flash Sale Banner */}
                {hasFlashSale && (
                  <div className="px-6">
                    <div className="w-full mb-6 flex flex-col items-center rounded-2xl px-6 py-4 bg-black/10 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.12)] relative overflow-hidden">
                      {/* Sparkle Effects */}
                      <div className="absolute inset-0 pointer-events-none">
                        <div
                          className="absolute top-4 left-8 w-2 h-2 bg-customOrange rounded-full animate-ping"
                          style={{
                            animationDelay: "0s",
                            animationDuration: "2s",
                          }}
                        ></div>
                        <div
                          className="absolute top-4 left-8 w-1 h-1 bg-white rounded-full animate-ping"
                          style={{
                            animationDelay: "0.5s",
                            animationDuration: "2s",
                          }}
                        ></div>
                        <div
                          className="absolute top-8 right-12 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-ping"
                          style={{
                            animationDelay: "1s",
                            animationDuration: "2.5s",
                          }}
                        ></div>
                        <div
                          className="absolute top-6 right-8 text-customOrange text-xs animate-pulse"
                          style={{
                            animationDelay: "0.5s",
                            animationDuration: "1.5s",
                          }}
                        >
                          ✨
                        </div>
                        <div
                          className="absolute bottom-4 left-6 text-yellow-400 text-xs animate-pulse"
                          style={{
                            animationDelay: "1.2s",
                            animationDuration: "1.8s",
                          }}
                        >
                          ✨
                        </div>
                      </div>

                      <h2
                        className="font-opensans uppercase text-sm font-semibold mb-2 text-customOrange relative z-10 drop-shadow-sm animate-pulse"
                        style={{ animationDuration: "2s" }}
                      >
                        {vendor.shopName} is running a sale 🎁
                      </h2>

                      <div className="relative z-10">
                        <FlipCountdown endTime={vendor.flashSaleEndsAt} />
                      </div>
                    </div>
                  </div>
                )}
                {/* Store Name */}
                <div className="flex items-center justify-center mb-2">
                  <h1 className="text-2xl font-semibold  text-center font-opensans">
                    {vendorLoading ? <Skeleton width={200} /> : vendor.shopName}
                  </h1>
                  {hasFlashSale && (
                    <IoIosFlash className="text-customOrange text-2xl ml-2" />
                  )}
                </div>
                {/* Ratings */}
                {/* Description */}
                <p className="text-gray-700 text-xs px-8 font-opensans text-center mb-6 leading-relaxed">
                  {vendorLoading ? <Skeleton count={2} /> : vendor.description}
                </p>
                {/* Top Rated Badge */}
                <div className="flex items-center justify-center">
                  {/* ─── Rating on the left ─── */}
                  <div
                    onClick={handleRatingClick}
                    className="flex flex-col items-center cursor-pointer"
                  >
                    {/* rating number */}
                    <span className="text-base font-ubuntu font-medium">
                      {averageRating.toFixed(1)}
                    </span>
                    <div className="flex">{stars}</div>
                  </div>

                  {/* vertical divider */}
                  <div className="h-6 border-l border-gray-300 mx-6" />

                  {/* ─── Center badge ─── */}
                  <VendorBadge badgeName={vendor.badge} />

                  {/* vertical divider */}
                  <div className="h-6 border-l border-gray-300 mx-6" />

                  {/* ─── Reviews count on the right ─── */}
                  <div
                    onClick={handleRatingClick}
                    className="flex flex-col items-center cursor-pointer"
                  >
                    {/* review count */}
                    <span className="text-base font-ubuntu font-medium">
                      {vendor.ratingCount || 0}
                    </span>
                    {/* “Reviews” label under the number */}
                    <span className="text-xs font-opensans font-medium text-gray-600 mt-1">
                      Reviews
                    </span>
                  </div>
                </div>
                <hr className="mt-6 border-gray-100" />
                {/* Additional Info Cards */}
              </div>

              {vendor && <VendorDetails vendor={vendor} />}
              <hr className="mt-6 border-gray-100" />

              {vendor && (
                <AdditionalDetails
                  vendor={vendor}
                  badgeMessages={badgeMessages}
                  onVendorPolicyClick={() => setShowVendorPolicy(true)}
                  onLinkClick={(fragment) => {
                    setTermsUrl(
                      `https://www.shopmythrift.store/terms-and-conditions#${fragment}`
                    );
                    setShowTermsModal(true);
                  }}
                />
              )}
              <hr className="mt-6 border-gray-100" />
            </>
          )}

          {/* Search UI */}
          {searchingUI(isSearching, searchTerm) && (
            <div className="p-4">{/* Search results content goes here */}</div>
          )}

          
        </div>
        <div className={`${isSearching ? "mt-16" : "mt-7"}`}>
          <div className="flex items-center mb-3 justify-between">
            <h1 className="font-opensans text-lg  font-semibold">Products</h1>
            <div className="relative">
              <AnimatePresence>
                {viewOptions && (
                  <motion.div
                    initial={{ x: 60, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 60, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="z-50 absolute bg-white w-44 h-20 rounded-2.5xl shadow-[0_0_10px_rgba(0,0,0,0.1)] -left-24 top-2 p-3 flex flex-col justify-between"
                  >
                    <span
                      className={`text-xs font-opensans ml-2 cursor-pointer ${
                        sortOption === "priceAsc"
                          ? "text-customOrange"
                          : "text-black"
                      }`}
                      onClick={() => {
                        setSortOption("priceAsc");
                        setViewOptions(!viewOptions);
                      }}
                    >
                      Low to High
                    </span>
                    <hr className="text-slate-300" />
                    <span
                      className={`text-xs font-opensans ml-2 cursor-pointer ${
                        sortOption === "priceDesc"
                          ? "text-customOrange"
                          : "text-black"
                      }`}
                      onClick={() => {
                        setSortOption("priceDesc");
                        setViewOptions(!viewOptions);
                      }}
                    >
                      High to Low
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
              <span className="flex text-xs font-opensans items-center">
                Sort by Price:{" "}
                <LuListFilter
                  className="text-customOrange cursor-pointer ml-1"
                  onClick={() => setViewOptions(!viewOptions)}
                />
              </span>
            </div>
          </div>
          {!searchingUI(isSearching, searchTerm) && (
            <div className="flex px-2 mb-4 w-full pt-2 pb-6 overflow-x-auto space-x-2 scrollbar-hide">
              {productTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => handleTypeSelect(type)}
                  className={`flex-shrink-0 h-12 px-4 text-xs font-semibold font-opensans text-black rounded-full backdrop-blur-md flex items-center justify-center transition-all duration-100 hover:bg-customOrange/50 border ${
                      selectedType === type
                        ? "bg-customOrange text-white"
                        : "bg-white"
                    }`}
                >
                  {type}
                </button>
              ))}
            </div>
          )}
          {vendorLoading || (loadingMore && filteredProducts.length === 0) ? (
            <div className="grid mt-2 grid-cols-2 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} height={200} width="100%" />
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <>
              <div className="grid mt-2 grid-cols-2 gap-2">
                {uniqueFilteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isFavorite={!!favorites[product.id]}
                    onFavoriteToggle={handleFavoriteToggle}
                    onClick={() => navigate(`/product/${product.id}`)}
                    showVendorName={false}
                  />
                ))}
              </div>

              {loadingMore && (
                <div className="flex justify-center my-4">
                  <RotatingLines
                    strokeColor="#f9531e"
                    strokeWidth="4"
                    animationDuration="0.75"
                    width="16"
                    visible
                  />
                </div>
              )}
              {/* {loadingAll && (
                <div className="flex justify-center my-4">
                  <RotatingLines
                    strokeColor="#f9531e"
                    strokeWidth="5"
                    animationDuration="0.75"
                    width="20"
                    visible
                  />
                </div>
              )} */}
            </>
          ) : (
            <div className="flex justify-center items-center w-full text-center">
              <p className="font-opensans text-gray-800 text-xs">
                📭 <span className="font-semibold">{vendor.shopName}</span>{" "}
                hasn’t added any products to their online store yet. Follow this
                vendor and you will be notified when they upload products!
              </p>
            </div>
          )}
        </div>

        {isLoginModalOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsLoginModalOpen(false);
              }
            }}
          >
            <div
              className="bg-white w-9/12 max-w-md rounded-lg px-3 py-4 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex space-x-4">
                  <div className="w-8 h-8 bg-rose-100 flex justify-center items-center rounded-full">
                    <CiLogin className="text-customRichBrown" />
                  </div>
                  <h2 className="text-lg font-opensans font-semibold">
                    Please Log In
                  </h2>
                </div>
                <LiaTimesSolid
                  onClick={() => setIsLoginModalOpen(false)}
                  className="text-black text-xl mb-6 cursor-pointer"
                />
              </div>
              <p className="mb-6 text-xs font-opensans text-gray-800 ">
                You need to be logged in to follow this vendor to recieve
                notifications. Please log in to your account, or create a new
                account if you don’t have one, to continue.
              </p>
              <div className="flex space-x-16">
                <button
                  onClick={() => {
                    navigate("/signup", { state: { from: location.pathname } });
                    setIsLoginModalOpen(false);
                  }}
                  className="flex-1 bg-transparent py-2 text-customRichBrown font-medium text-xs font-opensans border-customRichBrown border rounded-full"
                >
                  Sign Up
                </button>

                <button
                  onClick={() => {
                    navigate("/login", { state: { from: location.pathname } });
                    setIsLoginModalOpen(false);
                  }}
                  className="flex-1 bg-customOrange py-2 text-white text-xs font-opensans rounded-full"
                >
                  Login
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default StorePage;
