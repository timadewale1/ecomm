/* eslint-disable jsx-a11y/img-redundant-alt */
import { siteUrls } from "../../config/siteUrls.mjs";
import {getProductForDetail} from "../../services/publicProducts";
import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  useParams,
  useNavigate,
  useNavigationType,
  useLocation,
} from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { addToCart, removeFromCart } from "../../redux/actions/action";
import {
  fetchProductFailure,
  fetchProductRequest,
  fetchProductSuccess,
} from "../../redux/actions/productaction";
import { fetchAndMergeCart } from "../../services/cartMerge";
import QuickAuthModal from "../../components/PwaModals/AuthModal";
import { useTawk } from "../../components/Context/TawkProvider";
import Loading from "../../components/Loading/Loading";
import { PiShoppingCartBold } from "react-icons/pi";
import { FaExclamationTriangle, FaStar } from "react-icons/fa";
import { CiCircleInfo } from "react-icons/ci";
import { TbInfoOctagon } from "react-icons/tb";
import { TbInfoTriangle } from "react-icons/tb";
import {
  getProductColorSwatches,
  getSwatchFromRawColor,
} from "../../services/colorutils";
import {
  getSwatchSelectionKey,
  getVariantSwatchSelectionKey,
  hasPurchasableVariantForSize,
  hasPurchasableVariantForSwatch,
  isVariantInStock,
  isVariantSizeHidden,
  resolvePurchasableVariantChoice,
  resolveSinglePurchasableVariant,
  resolveSinglePurchasableVariantForSwatch,
  resolveVariantByRawSelection,
  shouldInitializeProductVariantSelection,
} from "../../services/productVariantSelection";

import { getPublicVendor } from "../../services/publicVendors";
import LoadProducts from "../../components/Loading/LoadProducts";
import { GoChevronLeft, GoChevronRight, GoDotFill } from "react-icons/go";
import { LuCopyCheck, LuCopy } from "react-icons/lu";
import toast from "react-hot-toast";
import { shareContent } from "../../services/nativeLinks";
import { appHaptics } from "../../services/haptics";
import { takeAuthIntent } from "../../services/authIntent";
import { FiPlus } from "react-icons/fi";
import { buildCartKey } from "../../services/cartKey";
import { FiMinus } from "react-icons/fi";
import { TbSquareRoundedCheck } from "react-icons/tb";
import Badge from "../../components/Badge/Badge";
import {
  MdCancel,
  MdOutlineCancel,
  MdOutlineClose,
  MdOutlineReportProblem,
} from "react-icons/md";
import "swiper/css/free-mode";
import { TbFileDescription } from "react-icons/tb";
import "swiper/css/autoplay";
import { Swiper, SwiperSlide } from "swiper/react";
import Select from "react-select";
import "swiper/css";
import { Oval, RotatingLines } from "react-loader-spinner";
import StoreBasket from "../../components/QuickMode/StoreBasket";

import { IoFlagOutline, IoShareOutline } from "react-icons/io5";
import { BsThreeDotsVertical } from "react-icons/bs";
import { AnimatePresence, motion } from "framer-motion";
// import SwiperCore, { Pagination,  } from "swiper";
import { FreeMode, Autoplay } from "swiper/modules";
import {
  doc,
  getDoc,
  getFirestore,
  collection,
} from "firebase/firestore";
import {
  marketplaceActionErrorMessage,
} from "../../services/marketplaceActions";
import {
  createAuthenticatedProductQuestion,
  createClientQuestionId,
  getGuestQuestionDeviceId,
  requestGuestProductQuestion,
} from "../../services/productQuestions";
import {
  selectQuickMode,
  activateQuickMode,
  deactivateQuickMode,
} from "../../redux/reducers/quickModeSlice";
import { findVariant } from "../../services/getVariant";
import RelatedProducts from "./SimilarProducts";
import { usePriceLock } from "../../services/usePriceLock";
import Productnotofund from "../../components/Loading/Productnotofund";
import { decreaseQuantity, increaseQuantity } from "../../redux/actions/action";
import { AiOutlineHome } from "react-icons/ai";
import { db } from "../../firebase.config";
import { IoShareSocialOutline } from "react-icons/io5";
import IkImage from "../../services/IkImage";
import SEO from "../../components/Helmet/SEO";
import QuestionandA from "../../components/Loading/QuestionandA";
import { LiaHomeSolid, LiaShareSolid } from "react-icons/lia";
import SafeImg from "../../services/safeImg";
import AppBackButton from "../../components/layout/AppBackButton";
import { RiHeart3Fill, RiHeart3Line } from "react-icons/ri";
import { useProductFavorite } from "../../components/Context/FavoritesContext";
import { BsBadgeHdFill } from "react-icons/bs";
import { HiOutlineShoppingBag } from "react-icons/hi";
import { FcShop } from "react-icons/fc";
import { BiInfoCircle, BiSolidOffer } from "react-icons/bi";

import OfferSheet from "../../components/Offers/OfferModal";
import AskQuestionNudge from "../../components/Buttons/AskQuestion";
import AboutThisItem from "../../components/Products/AboutThisItem";
import ProductSocialProofPill from "../../components/Products/ProductSocialProofPill ";
import VendorProfileMoreFromSeller from "../../components/VendorsData/VendorProfileMoreFromSeller";
import AddToCartVariantSheet from "../../components/Cart/AddToCartVariantSheet";
import { toastAddedToCart } from "../../components/Toasts/AddtoCart";
import ProductSellingFastPill from "../../components/Products/ProductSellingFastPill";
import { toastOfferSent } from "../../components/Toasts/OfferSent";
import { flush, track } from "../../services/signals";
import ScanningEffect from "../../components/Products/ScanningEffect";
import ProductReportModal from "../../components/Reports/ProductReportModal";
import NavigationHistorySheet from "../../components/layout/NavigationHistorySheet";
import AppBottomSheet from "../../components/layout/AppBottomSheet";
import ProductConditionInfoSheet from "../../components/Products/ProductConditionInfoSheet";
import { useProductJourneyHistory } from "../../custom-hooks/useProductJourney";
import { updateCurrentProductJourneyLabel } from "../../services/productJourney";
import useProductDetailScrollRestoration from "../../custom-hooks/useProductDetailScrollRestoration";
import AppScrollToTopButton from "../../components/layout/AppScrollToTopButton";
import { isProductSoldOut } from "../../services/productAvailability";
import { useAuth } from "../../custom-hooks/useAuth";


const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func.apply(null, args);
    }, delay);
  };
};
export const useDoubleTap = (cb, delay = 300) => {
  const last = useRef(0);
  return () => {
    const now = Date.now();
    if (now - last.current < delay) cb();
    last.current = now;
  };
};

export const useHdLoader =
  (hdImages, loadedHd, setLoadedHd, loadingHd, setLoadingHd) => (idx) => {
    if (!hdImages[idx]) return Promise.reject(new Error("HD image unavailable"));
    if (loadedHd.has(idx)) return Promise.resolve("already-loaded");
    if (loadingHd.has(idx)) return Promise.resolve("already-loading");

    setLoadingHd((p) => new Set(p).add(idx));

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        setLoadedHd((p) => new Set(p).add(idx));
        setLoadingHd((p) => {
          const n = new Set(p);
          n.delete(idx);
          return n;
        });
        resolve("loaded");
      };
      img.onerror = () => {
        setLoadingHd((p) => {
          const n = new Set(p);
          n.delete(idx);
          return n;
        });
        reject(new Error("HD image failed to load"));
      };
      img.src = hdImages[idx];
    });
  };
const makeDoubleTap = (cb, delay = 300) => {
  let last = 0;
  return (e) => {
    const now = Date.now();
    if (now - last < delay) cb();
    last = now;
  };
};

const HD_HINT_KEY = "mythrift.product-hd-hint.v2";

const useHdHint = (productId) => {
  const [show, setShow] = useState(false);
  const recordedRef = useRef(false);

  /* ── decide WHEN the hint should appear ─────────────────────── */
  useEffect(() => {
    if (!productId || recordedRef.current) return;
    recordedRef.current = true;
    try {
      const totalShown = Math.max(
        0,
        Number(localStorage.getItem(HD_HINT_KEY) || 0),
      );
      if (totalShown >= 2) return;
      setShow(true);
      localStorage.setItem(HD_HINT_KEY, String(totalShown + 1));
    } catch {
      // Storage can be unavailable in private browsing. Showing the hint is
      // still better than breaking the product image interaction.
      setShow(true);
    }
  }, [productId]);

  /* ── auto‑hide after 4 s ─────────────────────────────────────── */
  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(() => setShow(false), 4000);
    return () => clearTimeout(timer); // cleanup if component unmounts
  }, [show]);

  return show;
};

/* 🌀  Animated overlay */
const HdHintOverlay = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.7 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0 }}
    transition={{ type: "spring", stiffness: 260, damping: 20 }}
    className="absolute inset-0 flex items-center justify-center pointer-events-none"
  >
    <motion.div
      animate={{ scale: [1, 1.2, 1] }}
      transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
      className="px-3 py-1.5 bg-black bg-opacity-60 rounded-full backdrop-blur text-xs font-opensans text-white tracking-wide"
    >
      Double-tap to view image in HD
    </motion.div>
  </motion.div>
);
// put this once (or update your existing one)
const AnimatedPriceSwap = ({
  items,
  interval = 1800,
  className = "",
  itemClassName = "",
}) => {
  const [idx, setIdx] = React.useState(0);

  React.useEffect(() => {
    if (!items?.length || items.length < 2) return;
    const t = setInterval(
      () => setIdx((i) => (i + 1) % items.length),
      interval,
    );
    return () => clearInterval(t);
  }, [items, interval]);

  if (!items?.length) return null;

  // 1 item: just render it with your styles, no animation
  if (items.length === 1) {
    return <span className={`${className} ${itemClassName}`}>{items[0]}</span>;
  }

  return (
    <span className={`relative overflow-hidden inline-flex ${className}`}>
      <AnimatePresence initial={false} mode="wait">
        <motion.span
          key={idx}
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -12, opacity: 0 }}
          transition={{ duration: 0.22 }}
          className={itemClassName}
        >
          {items[idx]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};
// ✅ keep one key across the whole app
function getSessionIdV1() {
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

function useProductViewQuality({
  enabled,
  product,
  vendorId,
  surface,
  isShared,
  displayPrice,
  effectivePrice,
  isFashion,
  hasVariants,
  track,
  flush,
}) {
  const viewKeyRef = useRef(""); // unique per product+surface+session
  const endSentRef = useRef(false);

  const qRef = useRef({
    startTs: 0, // Date.now() at start
    startPerf: 0, // performance.now() at start
    lastVisiblePerf: null,
    activeMs: 0,

    // engagement
    engaged: false,
    gallerySwipes: 0,
    hdLoads: 0,
    variantChanges: 0,
    openedOffer: false,
    openedAsk: false,

    // depth
    maxScrollY: 0,
  });

  // ✅ Keep the latest dynamic values here so finalizeAndSend uses fresh data
  const latestRef = useRef({
    surface,
    vendorId,
    isShared,
    displayPrice,
    effectivePrice,
    isFashion,
    hasVariants,
    productId: product?.id,
  });

  useEffect(() => {
    latestRef.current = {
      surface,
      vendorId,
      isShared,
      displayPrice,
      effectivePrice,
      isFashion,
      hasVariants,
      productId: product?.id,
    };
  }, [
    surface,
    vendorId,
    isShared,
    displayPrice,
    effectivePrice,
    isFashion,
    hasVariants,
    product?.id,
  ]);

  useEffect(() => {
    if (!enabled) return;
    if (!product?.id || !vendorId) return;

    const sessionId = getSessionIdV1();
    const viewKey = `${sessionId}:${product.id}:${surface}`;
    viewKeyRef.current = viewKey;

    // avoid double wiring if React strict-mode mounts twice in dev
    endSentRef.current = false;

    const q = qRef.current;
    q.startTs = Date.now();
    q.startPerf = performance.now();
    q.lastVisiblePerf =
      document.visibilityState === "visible" ? performance.now() : null;

    q.activeMs = 0;
    q.engaged = false;
    q.gallerySwipes = 0;
    q.hdLoads = 0;
    q.variantChanges = 0;
    q.openedOffer = false;
    q.openedAsk = false;
    q.maxScrollY = window.scrollY || 0;

    const onVis = () => {
      const now = performance.now();
      if (document.visibilityState === "hidden") {
        if (q.lastVisiblePerf != null) {
          q.activeMs += now - q.lastVisiblePerf;
          q.lastVisiblePerf = null;
        }
      } else {
        q.lastVisiblePerf = now;
      }
    };

    const onScroll = () => {
      const y = window.scrollY || 0;
      if (y > q.maxScrollY) q.maxScrollY = y;
    };

    const finalizeAndSend = () => {
      if (endSentRef.current) return;
      endSentRef.current = true;

      const nowPerf = performance.now();
      const nowTs = Date.now();

      // finalize activeMs (time actually visible)
      let activeMs = q.activeMs;
      if (document.visibilityState === "visible" && q.lastVisiblePerf != null) {
        activeMs += nowPerf - q.lastVisiblePerf;
      }

      const durationMs = Math.max(0, nowTs - q.startTs);
      const activeDurationMs = Math.max(0, Math.round(activeMs));

      // bounce heuristic: short + no real engagement + low scroll
      const isBounce =
        activeDurationMs < 2500 &&
        !q.engaged &&
        q.gallerySwipes === 0 &&
        q.variantChanges === 0 &&
        q.hdLoads === 0 &&
        q.maxScrollY < 120;

      // deep view heuristic: longer OR any meaningful engagement
      const isDeep =
        activeDurationMs >= 8000 ||
        q.engaged ||
        q.gallerySwipes >= 2 ||
        q.variantChanges > 0 ||
        q.openedOffer ||
        q.openedAsk ||
        q.maxScrollY >= 350;

      // ✅ Pull freshest values at the moment we send END
      const latest = latestRef.current;

      track(
        "product_view",
        {
          viewPhase: "end",

          // ✅ use latest surface/vendorId/shared/price flags
          surface: latest.surface,
          productId: latest.productId || product.id,
          vendorId: latest.vendorId || vendorId,

          isShared: !!latest.isShared,
          priceShown: Number(latest.displayPrice || 0),
          hasPriceLock: !!latest.effectivePrice,
          isFashion: !!latest.isFashion,
          hasVariants: !!latest.hasVariants,

          durationMs: Math.round(durationMs),
          activeMs: activeDurationMs,
          isBounce,
          isDeep,

          // engagement summary
          gallerySwipes: q.gallerySwipes,
          hdLoads: q.hdLoads,
          variantChanges: q.variantChanges,
          openedOffer: q.openedOffer,
          openedAsk: q.openedAsk,

          // depth
          maxScrollY: Math.round(q.maxScrollY),
        },
        { surface: latest.surface || surface },
      );

      // flush right away on exit
      flush?.();
    };

    // ✅ START event — ok to use current values at start
    track(
      "product_view",
      {
        viewPhase: "start",
        surface,
        productId: product.id,
        vendorId,
        isShared: !!isShared,
        priceShown: Number(displayPrice || 0),
        hasPriceLock: !!effectivePrice,
        isFashion: !!isFashion,
        hasVariants: !!hasVariants,
      },
      { surface },
    );
    // A product open is an all-time view. Flush the durable start event now;
    // the later end event still carries dwell/engagement quality for ranking.
    void flush?.({ reason: "product_view_start" });

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("scroll", onScroll, { passive: true });

    // pagehide catches iOS safari better than beforeunload
    window.addEventListener("pagehide", finalizeAndSend);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", finalizeAndSend);
      finalizeAndSend();
    };
    // IMPORTANT: product.id + surface changes should close previous view and start new one
  }, [enabled, product?.id, vendorId, surface, track, flush]);

  // expose tiny helpers to mark engagement from UI
  return {
    markGallerySwipe: () => {
      const q = qRef.current;
      q.gallerySwipes += 1;
      q.engaged = true;
    },
    markHdLoad: () => {
      const q = qRef.current;
      q.hdLoads += 1;
      q.engaged = true;
    },
    markVariantChange: () => {
      const q = qRef.current;
      q.variantChanges += 1;
      q.engaged = true;
    },
    markOfferOpen: () => {
      const q = qRef.current;
      q.openedOffer = true;
      q.engaged = true;
    },
    markAskOpen: () => {
      const q = qRef.current;
      q.openedAsk = true;
      q.engaged = true;
    },
  };
}

const ProductDetailPage = () => {
  const { id } = useParams();
  const showHdHint = useHdHint(id);

  const dispatch = useDispatch();
  const navigate = useNavigate();
const [reportOpen, setReportOpen] = useState(false);

  // Fetch product from Redux store
  const { product, loading, error } = useSelector((state) => state.product);
  const [initialImage, setInitialImage] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [mainImage, setMainImage] = useState("");
  const [isSticky, setIsSticky] = useState(false);
  const [isDisclaimerModalOpen, setIsDisclaimerModalOpen] = useState(false);
  const [vendorLoading, setVendorLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const location = useLocation();
  const navigationType = useNavigationType();
  const searchParams = new URLSearchParams(location.search);
  const isShared = searchParams.has("shared");
  const {
    journeyOptions,
    historyFallbackOpen,
    closeHistoryFallback,
    openProductJourneyHistory,
    returnToJourneyOption,
  } = useProductJourneyHistory(location.pathname);

  const productVendorId = product?.vendorId;
  const [subProducts, setSubProducts] = useState([]);
  const [selectedSubProduct, setSelectedSubProduct] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

const [variantSheetMode, setVariantSheetMode] = useState("add"); // "add" | "buy"
  const [animateCart, setAnimateCart] = useState(false);
  const [isAddedToCart, setIsAddedToCart] = useState(false);
  const [toastShown, setToastShown] = useState({
    stockError: false,
    success: false,
    fetchError: false,
    productNotFound: false,
  });
  const [toastCount, setToastCount] = useState(0);
  const [selectedImage, setSelectedImage] = useState("");
  const { isActive, vendorId } = useSelector((state) => state.stockpile);
  const [isSending, setIsSending] = useState(false);
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);

  const [isOfferInfoOpen, setOfferInfoOpen] = useState(false);

  const [vendor, setVendor] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [availableColors, setAvailableColors] = useState([]);
  const [availableSizes, setAvailableSizes] = useState([]);
  const [selectedVariantStock, setSelectedVariantStock] = useState(0);
  const [selectedSwatchKey, setSelectedSwatchKey] = useState(""); // UI ONLY

  const [allImages, setAllImages] = useState([]);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [showQuickAuth, setShowQuickAuth] = useState(false);
  const [quickAuthIntent, setQuickAuthIntent] = useState("offer");
  const pendingBuyNowRef = useRef(null);
  const authResumeHandledRef = useRef(false);
  const variantSelectionInitializedForRef = useRef(null);
  const { currentUser } = useAuth();
  const userData = useSelector((state) => state.user.userData);
  const [isAskModalOpen, setIsAskModalOpen] = useState(false);
  const [conditionInfoOpen, setConditionInfoOpen] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [guestQuestionEmail, setGuestQuestionEmail] = useState(() => {
    try {
      return localStorage.getItem("mythrift:guest-question-email:v1") || "";
    } catch {
      return "";
    }
  });
  // Inside your ProductDetailPage component
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [disclaimerUrl, setDisclaimerUrl] = useState("");
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [hdImages, setHdImages] = useState([]);
  const [loadedHd, setLoadedHd] = useState(new Set());
  const [loadingHd, setLoadingHd] = useState(new Set());
  const loadHd = useHdLoader(
    hdImages,
    loadedHd,
    setLoadedHd,
    loadingHd,
    setLoadingHd,
  );
  const handleOpenModal = () => setShowModal(true);
  const handleCloseModal = () => setShowModal(false);
  const db = getFirestore();

 // put near your other refs
const hdToastShownRef = useRef(new Set());
  const isGuestShared = isShared && !currentUser;
  const cart = useSelector((state) => state.cart || {});
  const [showHeader, setShowHeader] = useState(true);
  const prevScrollPos = useRef(0);
  // put with other constants
  const OFFER_SENT_ONCE_KEY = "mythrift_offer_sent_once_v1";

  const uid = currentUser?.uid ?? null;
  const priceLock = usePriceLock(db, uid, product?.id);

  const loadedProductId = product?.id || product?.productId;
  useProductDetailScrollRestoration({
    productId: id,
    locationKey: location.key,
    ready:
      !loading &&
      Boolean(loadedProductId) &&
      String(loadedProductId) === String(id),
    shouldRestore: navigationType === "POP",
  });

  // Derive the price to show
  const effectivePrice = priceLock?.effectivePrice
    ? Number(priceLock.effectivePrice)
    : null;
  const displayPrice = effectivePrice ?? Number(product?.price || 0);
  // ✅ Buy Now (quick flow) trigger
  const [pendingBuyNow, setPendingBuyNow] = useState(false);
const openVariantSheet = useCallback((mode) => {
  setVariantSheetMode(mode);
  setAddSheetOpen(true);
}, []);

  useEffect(() => {
    // Route changes must never inherit a selection or pending checkout from
    // the product that was previously mounted in the shared Redux slot.
    variantSelectionInitializedForRef.current = null;
    pendingBuyNowRef.current = null;
    setPendingBuyNow(false);
    setQuickAuthIntent("offer");
    setShowQuickAuth(false);
    setAddSheetOpen(false);
    setVariantSheetMode("add");
    setSelectedSubProduct(null);
    setSelectedSwatchKey("");
    setSelectedColor("");
    setSelectedSize("");
    setAvailableColors([]);
    setAvailableSizes([]);
    setSelectedVariantStock(0);
    setQuantity(1);
    authResumeHandledRef.current = false;
  }, [id]);

  // Local Favorites Context
  const { favorite, wishCount, toggleFavorite } = useProductFavorite(product);
  const { isActive: quickMode = false, vendorId: basketVendorId = null } =
    useSelector((state) => selectQuickMode(state) ?? {});
  const offerPriceFromState = location.state?.offerPrice;
  const offerActionFromState = location.state?.offerAction;

  // Offers can deep-link into the existing product actions. Consume the state
  // once so returning to, refreshing, or revisiting this product cannot reopen
  // a sheet unexpectedly.
  useEffect(() => {
    if (!product || String(product.id) !== String(id)) return;

    if (
      typeof offerPriceFromState === "number" &&
      !Number.isNaN(offerPriceFromState)
    ) {
      const priceText = Number(offerPriceFromState).toLocaleString("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0,
      });
      toast.success(`You can now buy this item for ${priceText}`);
    }

    if (offerActionFromState === "buy") openVariantSheet("buy");
    if (offerActionFromState === "offer") {
      setOfferModalOpen(true);
      viewSignals?.markOfferOpen?.();
    }

    if (offerActionFromState || offerPriceFromState != null) {
      const { offerAction, offerPrice, ...remainingState } = location.state || {};
      navigate(location.pathname + location.search, {
        replace: true,
        state: remainingState,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, id, offerActionFromState, offerPriceFromState]);
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

  useEffect(() => {
    let cancelled = false;
    const fetchProductDetails = async () => {
      dispatch(fetchProductRequest());
      setVendorLoading(true);
      try {
        const productSnap = await getProductForDetail(id);
        if (cancelled) return;

        if (productSnap.exists()) {
          const productData = productSnap.data();
          const vendorId = String(productData.vendorId || "").trim();
          const vendorSnap = vendorId && currentUser?.uid === vendorId
            ? await getDoc(doc(db, "vendors", vendorId))
            : null;
          // Only the vendor owner can read their private document for preview.
          const vendorData = vendorSnap?.exists() ? vendorSnap.data()
            : await getPublicVendor(vendorId);
          if (cancelled) return;
          const ownerPreview = Boolean(
            currentUser?.uid &&
              currentUser.uid === vendorId &&
              vendorData?.isDeactivated !== true,
          );
          const productStructurallyAvailable =
            productData.isDeleted !== true &&
            productData.isDeactivated !== true &&
            productData.deactivated !== true;
          const productPubliclyAvailable =
            productStructurallyAvailable &&
            productData.published === true &&
            productData.vendorEligible === true;
          const vendorAvailable =
            vendorData?.isApproved === true &&
            vendorData?.isDeactivated !== true;
          if (
            ownerPreview &&
            productStructurallyAvailable &&
            (!productPubliclyAvailable || !vendorAvailable)
          ) {
            setVendor({ id: vendorId, ...vendorData });
            dispatch(
              fetchProductSuccess({
                id: productSnap.id,
                ...productData,
                __ownerPreview: true,
              }),
            );
            return;
          }

          if (!productPubliclyAvailable || !vendorAvailable) {
            toast.dismiss();
            toast.error("This item is not currently available.");
            setVendor(null);
            dispatch(fetchProductFailure("This product is not available."));
          } else {
            setVendor({ id: vendorId, ...vendorData });
            dispatch(
              fetchProductSuccess({ id: productSnap.id, ...productData }),
            );
          }
        } else {
          dispatch(fetchProductFailure("No such product found!"));
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Error fetching product details:", err);
        dispatch(
          fetchProductFailure(err?.message || "Failed to load product details."),
        );
      } finally {
        if (!cancelled) setVendorLoading(false);
      }
    };

    fetchProductDetails();
    return () => { cancelled = true; };
  }, [id, dispatch, currentUser?.uid, db]);
  useEffect(() => {
    if (isGuestShared && productVendorId) {
      dispatch(activateQuickMode(productVendorId));
      // } else {
      //   dispatch(deactivateQuickMode());
    }
  }, [isGuestShared, productVendorId, dispatch]);
  useEffect(() => {
    const onDocClick = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setIsMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const isStockpileForThisVendor = useMemo(() => {
    return isActive && vendorId === product?.vendorId;
  }, [isActive, vendorId, product?.vendorId]);
 // (optional) return path so you can come back after profile completion
const returnTo = React.useMemo(
  () => `${location.pathname}${location.search || ""}`,
  [location.pathname, location.search],
);

// ✅ Same behaviour as Cart: block checkout if profile/location missing
const ensureProfileCompleteBeforeCheckout = React.useCallback(async (authUser = currentUser) => {
  // If not signed in, let your existing auth flow handle it (don’t block here)
  if (!authUser?.uid) return true;

  const canUseCurrentProfileState = authUser.uid === currentUser?.uid;
  let profileComplete = canUseCurrentProfileState
    ? userData?.profileComplete
    : undefined;
  let userLoc = canUseCurrentProfileState ? userData?.location : undefined;

  // If we don’t have it locally, fetch from Firestore like Cart does
  if (profileComplete === undefined || userLoc === undefined) {
    try {
      const userSnap = await getDoc(doc(db, "users", authUser.uid));
      if (userSnap.exists()) {
        const data = userSnap.data();
        profileComplete = data.profileComplete;
        userLoc = data.location;
      }
    } catch (err) {
      console.error("Error fetching user profile from Firestore:", err);
      toast.error("Unable to proceed with checkout at this time.");
      return false;
    }
  }

  if (!profileComplete) {
    toast.error("Please complete your profile before proceeding to checkout.");
    navigate("/account-info", {
      state: { highlightIncomplete: true, returnTo },
    });
    return false;
  }

  if (
    typeof userLoc?.lat !== "number" ||
    typeof userLoc?.lng !== "number"
  ) {
    toast.error("Please update your delivery address before checking out.");
    navigate("/account-info", {
      state: { highlightIncomplete: true, returnTo },
    });
    return false;
  }

  return true;
}, [currentUser, userData, db, navigate, returnTo]);
  const isFashion = product?.isFashion; // boolean – AddProduct already writes it
  const hasVariants = Boolean(
    isFashion &&
    Array.isArray(product?.variants) &&
    product.variants.length > 0,
  );
  const variants = React.useMemo(
    () => (Array.isArray(product?.variants) ? product.variants : []),
    [product],
  );
  const productSoldOut = isProductSoldOut(product);
  const hideVariantSize = isVariantSizeHidden(product);

  useEffect(() => {
    const routeProductId = String(id || "");
    const resolvedProductId = String(loadedProductId || "");

    if (
      !shouldInitializeProductVariantSelection({
        loading,
        routeProductId,
        loadedProductId: resolvedProductId,
        hasVariants,
        initializedProductId: variantSelectionInitializedForRef.current,
      })
    ) {
      return;
    }

    variantSelectionInitializedForRef.current = routeProductId;

    setAvailableColors(
      Array.from(
        new Set(variants.map((variant) => variant?.color).filter(Boolean)),
      ),
    );
    setAvailableSizes(
      Array.from(
        new Set(variants.map((variant) => variant?.size).filter(Boolean)),
      ),
    );

    const automatic = resolveSinglePurchasableVariant(variants);
    if (!automatic) return;

    setSelectedSwatchKey(automatic.swatchKey);
    setSelectedColor(automatic.color);
    setSelectedSize(automatic.size);
    setSelectedVariantStock(automatic.stock);
    setAvailableSizes(
      Array.from(
        new Set(
          variants
            .filter(
              (variant) =>
                getVariantSwatchSelectionKey(variant?.color) ===
                automatic.swatchKey,
            )
            .map((variant) => variant?.size)
            .filter(Boolean),
        ),
      ),
    );
  }, [hasVariants, id, loadedProductId, loading, variants]);
useEffect(() => {
  if (!product) return;

  const rawImages = (Array.isArray(product.imageUrls) ? product.imageUrls : [])
    .map((u) => String(u || "").trim())
    .filter(Boolean);

  const cover = String(product.coverImageUrl || "").trim();
  const images = rawImages.length ? rawImages : cover ? [cover] : [];

  const rawHd = Array.isArray(product.hdImageUrls) ? product.hdImageUrls : [];
  const singleHd = String(product.hdImageUrl || "").trim() || null;

  // ✅ Align HD to what you actually render
  const hd = images.map((_, i) => rawHd[i] || (i === 0 ? singleHd : null));

  setAllImages(images);
  setHdImages(hd);

  const first = images[0] || "";
  setCurrentImageIndex(0);
  setMainImage(first);
  setSelectedImage(first);
  setInitialImage(first);

  setLoadedHd(new Set());
  setLoadingHd(new Set());
}, [product]);


  useEffect(() => {
    // If product not ready, reset
    if (!product?.vendorId || !product?.id) {
      setIsAddedToCart(false);
      setAnimateCart(false);
      return;
    }

    const hasVariantsForKey = Boolean(isFashion && (variants || []).length);

    // ✅ KEY FIX: if this product has variants and no subProduct selected,
    // and selection is incomplete -> force isAddedToCart OFF (prevents “sticky checkout”)
    if (
      hasVariantsForKey &&
      !selectedSubProduct &&
      (!selectedSize || !selectedColor)
    ) {
      setIsAddedToCart(false);
      setAnimateCart(false);
      return;
    }

    // Build the key for the *current selection*
    const sizeForKey = selectedSubProduct?.size ?? selectedSize ?? "";
    const colorForKey = selectedSubProduct?.color ?? selectedColor ?? "";

    const productKey = buildCartKey({
      vendorId: product.vendorId,
      productId: product.id,
      isFashion,
      selectedSize: sizeForKey,
      selectedColor: colorForKey,
      subProductId: selectedSubProduct?.subProductId,
    });

    const existingCartItem = cart?.[product.vendorId]?.products?.[productKey];

    if (existingCartItem) {
      setIsAddedToCart(true);
      setQuantity(existingCartItem.quantity);
      setAnimateCart(true);
    } else {
      setIsAddedToCart(false);
      setAnimateCart(false);
      // optional: keep your original behaviour
      setQuantity(1);
    }
  }, [
    cart,
    product?.id,
    product?.vendorId,
    selectedSize,
    selectedColor,
    selectedSubProduct?.subProductId,
    selectedSubProduct?.size,
    selectedSubProduct?.color,
    variants,
    isFashion,
  ]);

  useEffect(() => {
    // Assuming sub-products are part of the product data
    if (product) {
      setSubProducts(product.subProducts || []);
      // Set the initial sub-product to the first one if available
      // if (product.subProducts && product.subProducts.length > 0) {
      //   setSelectedSubProduct(product.subProducts[0]);
      //   setSelectedColor(product.subProducts[0].color);
      //   setSelectedSize(product.subProducts[0].size);

      //   setMainImage(product.subProducts[0].images[0]);
      //   setSelectedVariantStock(product.subProducts[0].stock);
      // }
    }
  }, [product]);
  // // ── detect a *second* tap or click within 300 ms ──
  // const useDoubleTap = (callback, delay = 300) => {
  //   const last = useRef(0);
  //   return () => {
  //     const now = Date.now();
  //     if (now - last.current < delay) callback();
  //     last.current = now;
  //   };
  // };

  // ── load HD for a slide index if not already loaded ──
  // const useHdLoader =
  //   (hdImages, loadedHd, setLoadedHd, loadingHd, setLoadingHd) => (idx) => {
  //     if (!hdImages[idx] || loadedHd.has(idx) || loadingHd.has(idx)) return;

  //     setLoadingHd((p) => new Set(p).add(idx));

  //     const img = new Image();
  //     img.src = hdImages[idx];
  //     img.onload = () => {
  //       setLoadedHd((p) => new Set(p).add(idx));
  //       setLoadingHd((p) => {
  //         const n = new Set(p);
  //         n.delete(idx);
  //         return n;
  //       });
  //     };
  //     img.onerror = () =>
  //       setLoadingHd((p) => {
  //         const n = new Set(p);
  //         n.delete(idx);
  //         return n;
  //       });
  //   };

  // // fetch & cache HD for a given slide index
  // const fetchHd = (idx) => {
  //   if (!hdImages[idx] || loadedHd.has(idx) || loadingHd.has(idx)) return;

  //   setLoadingHd((p) => new Set(p).add(idx)); // show spinner

  //   const img = new Image();
  //   img.src = hdImages[idx];
  //   img.onload = () => {
  //     setLoadedHd((p) => new Set(p).add(idx)); // swap to HD
  //     setLoadingHd((p) => {
  //       const n = new Set(p);
  //       n.delete(idx);
  //       return n;
  //     });
  //   };
  //   img.onerror = () =>
  //     setLoadingHd((p) => {
  //       const n = new Set(p);
  //       n.delete(idx);
  //       return n;
  //     });
  // };

  const handleSubProductClick = (subProduct) => {
    swiperRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    setSelectedSubProduct(subProduct);
    setSelectedImage(subProduct.images[0]);
    setSelectedSwatchKey("");
    setSelectedColor(subProduct.color);
    setSelectedSize(subProduct.size);
    setAllImages(subProduct.images || []);
    setAvailableColors([subProduct.color]);
    setHdImages([]);
    setLoadedHd(new Set());
    setLoadingHd(new Set());
    setAvailableSizes([subProduct.size]);
    setCurrentImageIndex(0);
  };

const handleFavoriteToggle = (e) => {
  e?.stopPropagation?.();
  const liked = toggleFavorite({ surface: "product_detail", priceShown: Number(displayPrice || product?.price || 0) });
  if (liked !== null) appHaptics.favorite(liked);
};

  // ---- role guard (user only) ----
  const role =
    userData?.role ||
    (() => {
      try {
        return JSON.parse(localStorage.getItem("mythrift:userData"))?.role;
      } catch {
        return null;
      }
    })();

  const isUser = !!currentUser && role === "user";

  // ---- surface attribution for views ----
  const mtSurface = isShared
    ? "shared_link"
    : location.state?.mtSurface || "unknown";
  const surface = mtSurface === "unknown" ? "product_detail" : mtSurface;

  useEffect(() => {
    return () => {
      void flush({ reason: "component_unmount" });
    };
  }, []);

  const getShareUrl = () => {
    // use your existing canonical product link if you already have it
    return window.location.href;
  };
  const nativeShareProduct = async () => {
    const shareableLink = siteUrls.productShareUrl(id);

    // ✅ same message as your copy function
    const message = `Hey, check out this item I saw on ${
      vendor?.shopName || "this store"
    }'s store on My Thrift: ${shareableLink}`;

    try {
      const result = await shareContent({
        title: product?.name || "My Thrift product",
        text: message,
        url: shareableLink,
      });
      if (result === "copied") toast.success("Link copied!");
    } catch (err) {
      console.log("Share failed:", err);
      toast.error("Failed to share. Please try again.");
    }
  };

const handleTopLeftBack = () => {
    // If the link was shared, always go to Home (/)
    // Otherwise, go back in history (-1)
    if (isShared) {
      navigate("/");
    } else {
      navigate(-1);
    }
  };

  useEffect(() => {
    const loadedProductId = product?.id || product?.productId;
    if (!loadedProductId || String(loadedProductId) !== String(id)) return;

    updateCurrentProductJourneyLabel({
      pathname: location.pathname,
      productId: loadedProductId,
      productName: product?.name,
    });
  }, [id, location.pathname, product?.id, product?.name, product?.productId]);

  const handleMenuPrimaryAction = () => {
    setIsMenuOpen(false);

    if (isGuestShared) {
      if (productVendorId) navigate(`/store/${productVendorId}?shared=true`);
      return;
    }

    // normal view: go to cart (text option)
    navigate("/latest-cart", { state: { fromProductDetail: true } });
  };

  const basketRef = useRef(null);
  const vendorCartProducts = useSelector(
    (s) => s.cart?.[productVendorId]?.products || {},
  );
  const checkoutCount = useMemo(
    () =>
      Object.values(vendorCartProducts).reduce(
        (sum, p) => sum + (p.quantity || 0),
        0,
      ),
    [vendorCartProducts],
  );
  /* NGN currency with two decimals */
  const NGN = (n) =>
    Number(n || 0).toLocaleString("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // useEffect(() => {
  //   if (product && product.variants) {
  //     const uniqueSizes = Array.from(
  //       new Set(product.variants.map((v) => v.size)),
  //     );
  //     setAvailableSizes(uniqueSizes); // Show all sizes initially
  //   }
  // }, [product]);
  // useEffect(() => {
  //   if (product && product.variants) {
  //     const uniqueColors = Array.from(
  //       new Set(product.variants.map((v) => v.color)),
  //     );
  //     const uniqueSizes = Array.from(
  //       new Set(product.variants.map((v) => v.size)),
  //     );

  //     setAvailableColors(uniqueColors);
  //     setAvailableSizes(uniqueSizes);
  //     setSelectedColor("");
  //     setSelectedSize("");
  //   } else {
  //     setAvailableColors([]);
  //     setAvailableSizes([]);
  //     setSelectedColor("");
  //     setSelectedSize("");
  //   }
  // }, [product]);

  const norm = (v) =>
    String(v || "")
      .trim()
      .toLowerCase();

  // Automatically select color if only one is available
  const swiperInstanceRef = useRef(null);

  useEffect(() => {
    // Only run for products that really have variants
    if (!Array.isArray(product?.variants)) {
      setSelectedVariantStock(0);
      return;
    }

    if (selectedColor && selectedSize) {
      const variant = findVariant(product, selectedSize, selectedColor);
      setSelectedVariantStock(variant ? variant.stock : 0);
    }
  }, [product, selectedColor, selectedSize]);
useEffect(() => {
  if (!product) return;
  const first =
    (Array.isArray(product.imageUrls) && product.imageUrls.find(Boolean)) ||
    product.coverImageUrl ||
    "";
  setMainImage(first);
  setInitialImage(first);
}, [product]);

  // Dynamically generate meta tag data
  const metaTitle = product?.name
    ? `${product.name} - Buy Now on My Thrift`
    : "My Thrift Product Details";
  const metaDescription = product?.description
    ? product.description
    : "Discover amazing deals on My Thrift!";
  const metaImage = product?.coverImageUrl
    ? product.coverImageUrl
    : `${window.location.origin}/logo512.png`;
  const metaUrl = encodeURI(`${window.location.origin}/product/${id}`);

  const handleScroll = () => {
    if (window.scrollY > 50) {
      setIsSticky(true);
    } else {
      setIsSticky(false);
    }
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);
  const swiperRef = useRef(null);
useEffect(() => {
  if (!pendingBuyNow) return;
  if (!(quickMode && product?.vendorId === basketVendorId)) return;

  // wait until cart count is non-zero for this vendor
  if (checkoutCount <= 0) return;

  let cancelled = false;

  (async () => {
    const ok = await ensureProfileCompleteBeforeCheckout();
    if (cancelled) return;
    if (!ok) {
      setPendingBuyNow(false);
      return;
    }

    basketRef.current?.openCheckoutAuth?.();
    setPendingBuyNow(false);
  })();

  return () => {
    cancelled = true;
  };
}, [
  id,
  pendingBuyNow,
  quickMode,
  product?.vendorId,
  basketVendorId,
  checkoutCount,
  ensureProfileCompleteBeforeCheckout,
]);
  const handleAddToCart = useCallback(
    async (override = {}) => {
      // ✅ ADDED: allow modal (or any caller) to pass values immediately
      const finalSize = override.size ?? selectedSize;
      const finalColor = override.color ?? selectedColor;
      const finalQty = override.qty ?? quantity;

      console.log("Add to Cart Triggered");
      console.log("Product:", product);
      console.log("Selected Size:", finalSize);
      console.log("Selected Color:", finalColor);
      console.log("Selected Sub-Product:", selectedSubProduct);
      console.log("Quantity:", finalQty);

      if (!product) {
        console.error("Product is missing. Cannot add to cart.");
        return;
      }
      if (productSoldOut) {
        toast.error("This item has sold.");
        return;
      }

      // Ask for size / colour ONLY when it’s a fashion item
      if (isFashion) {
        if (hideVariantSize) {
          if (!finalColor) return toast.error("Please select a color first!");
          if (!finalSize) {
            return toast.error("This color option is not available.");
          }
        } else {
          if (!finalSize) return toast.error("Please select a size first!");
          if (!finalColor) return toast.error("Please select a color first!");
        }
      }

      if (!product.id || !product.vendorId) {
        toast.error("Product or Vendor ID is missing. Cannot add to cart!");
        console.error("Product or Vendor ID is missing:", product);
        return;
      }

      /* ---------- determine stock ---------- */
      let maxStock = 0;

      if (selectedSubProduct) {
        maxStock = selectedSubProduct.stock;
      } else if (isFashion) {
        // only check variants for true fashion items
        const matchingVariant = findVariant(
          { variants },
          finalSize,
          finalColor,
        );
        if (!matchingVariant) {
          toast.error("Selected variant is not available!");
          console.error(
            "Matching variant not found for selected size and color.",
          );
          return;
        }
        maxStock = matchingVariant.stock;
      } else {
        maxStock = Number(product.stockQuantity ?? product.stock ?? 1);
      }

      if (finalQty > maxStock) {
        toast.error("Selected quantity exceeds stock availability!");
        return;
      }
      /* ---------- /determine stock ---------- */

      const productToAdd = {
        ...product,
        quantity: finalQty,
        condition: product?.condition || "",
        selectedSize: finalSize,
        selectedColor: finalColor,
        selectedImageUrl: selectedImage,
        selectedSubProduct,
        subProductId: selectedSubProduct
          ? selectedSubProduct.subProductId
          : null,
      };

      const productKey = buildCartKey({
        vendorId: product.vendorId,
        productId: product.id,
        isFashion,
        selectedSize: finalSize,
        selectedColor: finalColor,
        subProductId: selectedSubProduct?.subProductId,
      });
      console.log("Generated productKey in add:", productKey);

      const existingCartItem = cart?.[product.vendorId]?.products?.[productKey];

      const syncPromise = existingCartItem
        ? dispatch(
            addToCart({ ...existingCartItem, quantity: finalQty }, true),
          )
        : dispatch(addToCart(productToAdd, true));

      appHaptics.addToCart();

      setIsAddedToCart(true);
      // ✅ PostHog: add_to_cart
      if (isUser) {
        track(
          "add_to_cart",
          {
            surface,
            productId: product.id,
            vendorId: product.vendorId,
            productKey,
            qty: finalQty,
            priceShown: Number(displayPrice || product?.price || 0),
            currency: "NGN",
            isFashion: !!isFashion,
            selectedSize: finalSize || null,
            selectedColor: finalColor || null,
            subProductId: selectedSubProduct?.subProductId || null,
            wasUpdate: !!existingCartItem,
            cartMode: isStockpileForThisVendor ? "stockpile" : "cart",
          },
          { surface },
        );
      }

      toastAddedToCart({
        imageUrl: selectedImage || product?.coverImageUrl,
        title: isStockpileForThisVendor ? "Added to Pile" : "Added to cart",
        name: product?.name || "",
        actionLabel: isStockpileForThisVendor ? "View Pile" : "View Cart",
        onAction: () => {
          // pick where you want to go
          navigate("/latest-cart", { state: { fromProductDetail: true } });
        },
      });
      const synced = await syncPromise;
      if (!synced) {
        console.warn(
          "Cart addition is queued locally and will retry in the background.",
        );
      }
      return synced;
    },
    [
      product,
      quantity,
      selectedSize,
      selectedColor,
      selectedSubProduct,
      dispatch,
      selectedImage,
      cart,
      navigate,
      variants, // ✅ ADDED dependency (you already use it inside)
      isFashion, // ✅ ADDED dependency (you use it inside)
      isStockpileForThisVendor, // ✅ ADDED dependency (you use it inside)
      isUser, // ✅
      surface, // ✅
      displayPrice, // ✅
      hideVariantSize,
      productSoldOut,
    ],
  );

  const handleOfferSubmitted = useCallback(() => {
    toastOfferSent({
      onAction: () => navigate("/offers"),
    });

    setOfferModalOpen(false);
  }, [navigate]);

  const handleSendQuestion = useCallback(async () => {
    const q = questionText.trim();
    if (!q) {
      return toast.error("Please enter a question.");
    }
    const email = String(
      currentUser?.email ||
        (currentUser?.uid ? userData?.email : "") ||
        guestQuestionEmail ||
        "",
    ).trim();
    if (!currentUser?.uid && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return toast.error("Enter a valid email so the vendor can answer you.");
    }

    setIsSending(true);
    try {
      const clientQuestionId = createClientQuestionId();
      if (currentUser?.uid) {
        const result = await createAuthenticatedProductQuestion({
          productId: id,
          vendorId: product.vendorId,
          question: q,
          clientQuestionId,
        });
        setQuestionText("");
        setIsAskModalOpen(false);
        appHaptics.success();
        const chatPath = `/offer-conversations/${result.conversationId}?focusQuestion=${encodeURIComponent(
          result.questionId || "",
        )}`;
        if (result.firstQuestionInConversation) {
          const chatListPath = "/offers?view=chats";
          // Replace the product entry with the chat list, then push the
          // conversation. Both the header back button and native iOS swipe-back
          // now reveal the list instead of bouncing between product and chat.
          navigate(chatListPath, {replace: true});
          window.setTimeout(() => {
            navigate(chatPath, {
              state: {returnTo: chatListPath, backMode: "pop"},
            });
          }, 0);
        } else {
          toast.custom(
            (record) => (
              <div className="flex w-[min(92vw,390px)] items-center gap-3 rounded-2xl bg-gray-950 px-4 py-3 font-satoshi text-white shadow-xl">
                <span className="min-w-0 flex-1">
                  <strong className="block text-sm font-semibold">Question sent</strong>
                  <span className="block truncate text-xs text-white/70">
                    The vendor will see it in your chat.
                  </span>
                </span>
                <button
                  type="button"
                  className="rounded-xl bg-customOrange px-3 py-2 text-xs font-semibold"
                  onClick={() => {
                    toast.dismiss(record.id);
                    navigate(chatPath);
                  }}
                >
                  View chat
                </button>
              </div>
            ),
            {duration: 3500, position: "top-center"},
          );
        }
      } else {
        await requestGuestProductQuestion({
          productId: id,
          vendorId: product.vendorId,
          question: q,
          email,
          clientQuestionId,
          deviceId: getGuestQuestionDeviceId(),
        });
        try {
          localStorage.setItem("mythrift:guest-question-email:v1", email);
        } catch {}
        setGuestQuestionEmail(email);
        setQuestionText("");
        setIsAskModalOpen(false);
        appHaptics.success();
        toast.success(
          "Check your email to verify and send your question to the vendor.",
        );
      }
    } catch (err) {
      appHaptics.error();
      toast.error(
        marketplaceActionErrorMessage(err, "Failed to send. Please try again."),
      );
    } finally {
      setIsSending(false);
    }
  }, [
    currentUser?.email,
    currentUser?.uid,
    guestQuestionEmail,
    id,
    location.pathname,
    location.search,
    navigate,
    product?.vendorId,
    questionText,
    userData?.email,
  ]);

  const viewLoggedRef = useRef(new Set());
  const viewSignals = useProductViewQuality({
    enabled:
      !!product?.id &&
      !!product?.vendorId &&
      currentUser?.uid !== product?.vendorId,
    product,
    vendorId: product?.vendorId,
    surface,
    isShared,
    displayPrice,
    effectivePrice,
    isFashion,
    hasVariants,
    track,
    flush,
  });

  const { openChat } = useTawk();
  const handleIncreaseQuantity = useCallback(async () => {
    console.log("Increase Quantity Triggered");
    console.log("Product:", product);
    console.log("Selected Size:", selectedSize);
    console.log("Selected Color:", selectedColor);
    console.log("Selected Sub-Product:", selectedSubProduct);
    console.log("Current Quantity:", quantity);

    if (!product) return console.error("Product not found.");

    // Size-hidden products still carry their internal variant size, but the
    // buyer should only be prompted for the visible colour choice.
    if (isFashion && (!selectedSize || !selectedColor)) {
      return toast.error(
        hideVariantSize
          ? selectedColor
            ? "This color option is not available."
            : "Please select a color before adjusting quantity."
          : "Please select a size and color before adjusting quantity.",
      );
    }

    /* ---------- figure out maxStock ---------- */
    let maxStock;

    if (selectedSubProduct) {
      maxStock = selectedSubProduct.stock;
    } else if (isFashion) {
      const matchingVariant = findVariant(
        { variants },
        selectedSize,
        selectedColor,
      );
      if (!matchingVariant) {
        toast.error("Selected variant is not available!");
        console.error(
          "Matching variant not found for selected size and color.",
        );
        return;
      }
      maxStock = matchingVariant.stock;
    } else {
      maxStock = Number(product.stockQuantity ?? product.stock ?? 1);
    }
    /* ---------- /figure out maxStock ---------- */

    if (quantity >= maxStock) {
      if (!toastShown.stockError) {
        toast.error("Cannot exceed available stock!");
        setToastShown((prev) => ({ ...prev, stockError: true }));
      }
      return;
    }

    const updatedQuantity = quantity + 1;

    const productKey = buildCartKey({
      vendorId: product.vendorId,
      productId: product.id,
      isFashion,
      selectedSize,
      selectedColor,
      subProductId: selectedSubProduct?.subProductId,
    });

    const existingCartItem = cart?.[product.vendorId]?.products?.[productKey];
    if (!existingCartItem) {
      console.error("Product not found in cart for productKey:", productKey);
      return toast.error("Product not found in cart");
    }

    const syncPromise = dispatch(
      increaseQuantity({ vendorId: product.vendorId, productKey }),
    );
    setQuantity(updatedQuantity);
    // Cart persistence retries silently; changing quantity should never expose
    // sync implementation details as a second notification.
    return await syncPromise;
  }, [
    product,
    quantity,
    selectedSize,
    selectedColor,
    dispatch,
    toastShown,
    cart,
    selectedSubProduct,
    isFashion,
    hideVariantSize,
    variants,
  ]);

  const handleDecreaseQuantity = useCallback(async () => {
    console.log("Decrease Quantity Triggered");
    console.log("Product:", product);
    console.log("Selected Size:", selectedSize);
    console.log("Selected Color:", selectedColor);
    console.log("Selected Sub-Product:", selectedSubProduct);
    console.log("Current Quantity:", quantity);

    if (!product) return console.error("Product not found.");

    if (isFashion && (!selectedSize || !selectedColor)) {
      return toast.error(
        hideVariantSize
          ? selectedColor
            ? "This color option is not available."
            : "Please select a color before adjusting quantity."
          : "Please select a size and color before adjusting quantity.",
      );
    }

    if (quantity <= 1) {
      console.warn("Quantity is already at 1. Cannot decrease further.");
      return toast.error("Quantity cannot be less than 1");
    }

    const updatedQuantity = quantity - 1;

    const productKey = buildCartKey({
      vendorId: product.vendorId,
      productId: product.id,
      isFashion,
      selectedSize,
      selectedColor,
      subProductId: selectedSubProduct?.subProductId,
    });

    const existingCartItem = cart?.[product.vendorId]?.products?.[productKey];
    if (!existingCartItem) {
      console.error("Product not found in cart for productKey:", productKey);
      return toast.error("Product not found in cart");
    }

    const syncPromise = dispatch(
      decreaseQuantity({ vendorId: product.vendorId, productKey }),
    );
    setQuantity(updatedQuantity);
    // Cart persistence retries silently; changing quantity should never expose
    // sync implementation details as a second notification.
    return await syncPromise;
  }, [
    product,
    quantity,
    selectedSize,
    selectedColor,
    dispatch,
    cart,
    selectedSubProduct,
    hideVariantSize,
  ]);

  // ✅ max stock for current selection (same rules used everywhere)
  const getMaxStockForSelection = useCallback(() => {
    if (!product) return 0;

    if (selectedSubProduct) return Number(selectedSubProduct.stock || 0);

    if (hasVariants) {
      if (!selectedSize || !selectedColor) return 0; // raw color is required
      const v = findVariant({ variants }, selectedSize, selectedColor);
      return Number(v?.stock || 0);
    }

    return Number(product?.stockQuantity ?? product?.stock ?? 0);
  }, [
    product,
    selectedSubProduct,
    hasVariants,
    selectedSize,
    selectedColor,
    variants,
  ]);

  const maxQty = useMemo(
    () => getMaxStockForSelection(),
    [getMaxStockForSelection],
  );

  // ✅ can user adjust quantity right now?
  const canAdjustQty = useMemo(() => {
    if (!product) return false;
    if (!isFashion) return true;
    if (selectedSubProduct) return true;
    return Boolean(selectedSize && selectedColor); // must have RAW color
  }, [product, isFashion, selectedSubProduct, selectedSize, selectedColor]);

  const decDisabled = !canAdjustQty || quantity <= 1;
  const incDisabled = !canAdjustQty || maxQty <= 0 || quantity >= maxQty;

  // ✅ single handlers used by the new UI
  const handleQtyDecrease = useCallback(() => {
    if (!canAdjustQty) {
      return toast.error(
        hideVariantSize
          ? selectedColor
            ? "This color option is not available."
            : "Please select a color first"
          : "Please select size and color first",
      );
    }
    if (decDisabled) return;

    // if already in cart -> update cart
    if (isAddedToCart) return handleDecreaseQuantity();

    // before adding -> local state only
    setQuantity((q) => Math.max(1, q - 1));
  }, [
    canAdjustQty,
    decDisabled,
    isAddedToCart,
    handleDecreaseQuantity,
    hideVariantSize,
    selectedColor,
  ]);

  const handleQtyIncrease = useCallback(() => {
    if (!canAdjustQty) {
      return toast.error(
        hideVariantSize
          ? selectedColor
            ? "This color option is not available."
            : "Please select a color first"
          : "Please select size and color first",
      );
    }
    if (incDisabled) return;

    if (isAddedToCart) return handleIncreaseQuantity();
    setQuantity((q) => q + 1);
  }, [
    canAdjustQty,
    incDisabled,
    isAddedToCart,
    handleIncreaseQuantity,
    hideVariantSize,
    selectedColor,
  ]);

  const handleThumbClick = (index) => {
    setCurrentImageIndex(index);
    const img = allImages[index];
    if (img) setSelectedImage(img); // important for cart selectedImageUrl
  };

  const formatPrice = (price) => {
    return price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const capitalizeFirstLetter = (color) => {
    return color.charAt(0).toUpperCase() + color.slice(1).toLowerCase();
  };

  // Check if a color is available for the selected size
  const isColorAvailableForSize = (color) => {
    return variants.some(
      (variant) => variant.size === selectedSize && variant.color === color,
    );
  };
  const cartItemCount = Object.values(cart || {}).reduce(
    (vendorAcc, vendor) => {
      if (!vendor.products) return vendorAcc;
      return (
        vendorAcc +
        Object.values(vendor.products).reduce((productAcc, product) => {
          return productAcc + (product.quantity || 0);
        }, 0)
      );
    },
    0,
  );
  // Handle color selection

  const updateSizes = (color) => {
    const uniqueSizesForColor = Array.from(
      new Set(
        product.variants
          .filter((variant) => variant.color === color)
          .map((variant) => variant.size),
      ),
    );
    setAvailableSizes(uniqueSizesForColor);
  };

  // Handle color selection and update sizes
  // Function to update sizes based on the selected color and set available sizes for that color
  const updateSizesForColor = (color) => {
    const sizesForColor = product.variants
      .filter((variant) => variant.color === color)
      .map((variant) => ({
        size: variant.size,
        stock: variant.stock,
      }));
    setAvailableSizes(sizesForColor);
  };

  const productCondition = (product?.condition || "").toLowerCase();
  const isThriftCondition = productCondition.includes("thrift");
  const isDefectCondition = productCondition.includes("defect");
  const isBrandNewCondition = productCondition.includes("brand new");
  const showMakeOffer = isThriftCondition || isDefectCondition;

  // Handle color selection and update sizes to show only available sizes for that color
  const handleColorClick = (color) => {
    if (selectedSubProduct) {
      // Prevent changing color if a sub-product is selected
      console.log("Sub-product selected; cannot change color.");
      return;
    }

    console.log("Color clicked:", color);

    if (selectedColor === color) {
      setSelectedColor("");
      setAvailableSizes(
        Array.from(new Set(product.variants.map((variant) => variant.size))),
      );
      setSelectedSize("");
      console.log("Color deselected. Available sizes reset.");
    } else {
      setSelectedColor(color);
      const sizesForColor = product.variants
        .filter((variant) => variant.color === color)
        .map((variant) => variant.size);
      const uniqueSizesForColor = Array.from(new Set(sizesForColor));
      setAvailableSizes(uniqueSizesForColor);
      setSelectedSize("");
      console.log("Color selected:", color);
      console.log("Available sizes for color:", uniqueSizesForColor);
    }
  };

  const getSizeValue = (s) => (typeof s === "object" && s ? s.size : s);

  const getSizesForSwatch = (swatchKey) =>
    Array.from(
      new Set(
        variants
          .filter(
            (variant) =>
              getVariantSwatchSelectionKey(variant?.color) === swatchKey,
          )
          .map((variant) => variant?.size)
          .filter(Boolean),
      ),
    );

  const handleVariantSwatchClick = (swatch) => {
    const nextSwatchKey = getSwatchSelectionKey(swatch);
    if (!nextSwatchKey) return;

    viewSignals?.markVariantChange?.();

    if (selectedSwatchKey === nextSwatchKey) {
      setSelectedSwatchKey("");
      setSelectedColor("");
      setSelectedSize("");
      setSelectedVariantStock(0);
      setAvailableSizes(
        Array.from(
          new Set(variants.map((variant) => variant?.size).filter(Boolean)),
        ),
      );
      return;
    }

    if (hideVariantSize) {
      const automatic = resolveSinglePurchasableVariantForSwatch(
        variants,
        nextSwatchKey,
      );
      if (!automatic) return;

      setSelectedSwatchKey(nextSwatchKey);
      setSelectedColor(automatic.color);
      setSelectedSize(automatic.size);
      setSelectedVariantStock(automatic.stock);
      setAvailableSizes(getSizesForSwatch(nextSwatchKey));
      setQuantity((current) =>
        Math.min(Math.max(1, current), automatic.stock),
      );
      return;
    }

    setSelectedSwatchKey(nextSwatchKey);
    setSelectedColor("");
    setSelectedSize("");
    setSelectedVariantStock(0);
    setAvailableSizes(getSizesForSwatch(nextSwatchKey));
  };

  const isVariantSwatchAvailable = (swatch) => {
    const swatchKey = getSwatchSelectionKey(swatch);
    if (!swatchKey) return false;

    return hideVariantSize
      ? Boolean(
          resolveSinglePurchasableVariantForSwatch(variants, swatchKey),
        )
      : hasPurchasableVariantForSwatch(variants, swatchKey);
  };

  const isSizeInStock = (sizeLike) => {
    const size = getSizeValue(sizeLike);

    if (!isFashion) return true;

    if (selectedSubProduct) {
      return (
        String(selectedSubProduct.size) === String(size) &&
        Number(selectedSubProduct.stock) > 0
      );
    }

    if (selectedSwatchKey) {
      return Boolean(
        resolvePurchasableVariantChoice(variants, {
          swatchKey: selectedSwatchKey,
          size,
        }),
      );
    }

    if (selectedColor) {
      const match = resolveVariantByRawSelection(variants, {
        color: selectedColor,
        size,
      });
      return Boolean(match && isVariantInStock(match.variant));
    }

    return hasPurchasableVariantForSize(variants, size);
  };

  const handleSizeClick = (size) => {
    if (!isSizeInStock(size)) return;
    viewSignals?.markVariantChange?.();
    if (Object.is(selectedSize, size)) {
      setSelectedSize("");
      // if main product swatch mode: clear raw color too
      if (!selectedSubProduct) {
        setSelectedColor("");
        setSelectedVariantStock(0);
      }
      return;
    }

    // If main product swatch is chosen, resolve RAW DB color from the variant row
    if (!selectedSubProduct && selectedSwatchKey) {
      const match = resolvePurchasableVariantChoice(variants, {
        swatchKey: selectedSwatchKey,
        size,
      });
      if (!match) return;

      setSelectedSize(match.size);
      setSelectedColor(match.color);
      setSelectedVariantStock(match.stock);
      setQuantity((current) => Math.min(Math.max(1, current), match.stock));
      return;
    }

    setSelectedSize(size);
  };

  // Check if size is available for the selected color
  const isSizeAvailableForColor = (size) => {
    if (selectedSubProduct) {
      // Check availability based on the selected sub-product only
      return selectedSubProduct.size === size;
    }

    // Fallback to the main product's variants if no sub-product is selected
    return variants.some(
      (variant) => variant.color === selectedColor && variant.size === size,
    );
  };

  // Helper function to parse the color string and return appropriate style
  const getColorStyle = (colorString) => {
    // Convert to lowercase and split by ',' or 'and'
    const colors = colorString
      .toLowerCase()
      .split(/(?:,|and)/) // Splits by ',' or 'and'
      .map((c) => c.trim())
      .filter((c) => c);

    if (colors.length === 2) {
      // Split the circle exactly in half with two colors
      return {
        background: `linear-gradient(to right, ${colors[0]} 50%, ${colors[1]} 50%)`,
      };
    } else if (colors.length === 1) {
      // Single color: solid background
      return {
        backgroundColor: colors[0],
      };
    } else {
      // No valid colors: fallback to a default or transparent
      return {
        backgroundColor: "#f0f0f0",
      };
    }
  };

  const handleRemoveFromCart = useCallback(async () => {
    console.log("Remove from Cart Triggered");
    console.log("Product:", product);
    console.log("Selected Size:", selectedSize);
    console.log("Selected Color:", selectedColor);
    console.log("Selected Sub-Product:", selectedSubProduct);

    if (!product || !product.id) return; // basic guard

    // Only gate on size/colour for fashion items
    if (isFashion && (!selectedSize || !selectedColor)) return;

    const productKey = buildCartKey({
      vendorId: product.vendorId,
      productId: product.id,
      isFashion,
      selectedSize,
      selectedColor,
      subProductId: selectedSubProduct?.subProductId,
    });

    const syncPromise = dispatch(
      removeFromCart({ vendorId: product.vendorId, productKey }),
    );
    appHaptics.removeFromCart();
    setIsAddedToCart(false);
    setQuantity(1);
    // ✅ PostHog: remove_from_cart
    if (isUser) {
      track(
        "remove_from_cart",
        {
          surface,
          productId: product.id,
          vendorId: product.vendorId,
          productKey,
          qty: quantity,
          isFashion: !!isFashion,
          selectedSize: selectedSize || null,
          selectedColor: selectedColor || null,
          subProductId: selectedSubProduct?.subProductId || null,
          cartMode: isStockpileForThisVendor ? "stockpile" : "cart",
        },
        { surface },
      );
    }

    toast.success(`${product.name} removed from cart!`);
    const synced = await syncPromise;
    return synced;
  }, [
    dispatch,
    product,
    selectedSize,
    selectedColor,
    selectedSubProduct,
    isFashion,
    isUser,
    surface,
    quantity,
    isStockpileForThisVendor,
  ]);

  const sizes =
    product && product.size
      ? product.size.split(",").map((size) => size.trim())
      : [];

  const colors =
    product && product.color
      ? product.color.split(",").map((color) => color.trim())
      : [];

  const hasSubProducts = Array.isArray(subProducts) && subProducts.length > 0;

  const copyProductLink = async () => {
    try {
      const shareableLink = siteUrls.productShareUrl(id);

      await navigator.clipboard.writeText(
        `Hey, check out this item I saw on ${vendor.shopName}'s store on My Thrift: ${shareableLink}`,
      );
      setIsLinkCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setIsLinkCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error("Failed to copy the link", err);
      toast.error("Failed to copy the link. Please try again.");
    }
  };
  const openDisclaimer = (path) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    const abs = `${window.location.origin}${path}`;
    setDisclaimerUrl(abs);
    setShowDisclaimerModal(true);
  };

const handleBuyNow = useCallback(async (override = {}, authUser = currentUser) => {
  if (!product) return;
  if (productSoldOut) return toast.error("This item has sold.");

  const finalSize = override.size ?? selectedSize;
  const finalColor = override.color ?? selectedColor;
  const finalQty = override.qty ?? quantity;
  const finalImage = override.imageUrl ?? selectedImage;

  // ✅ Require selection ONLY when variants exist (same as your UI)
  if (hasVariants && !selectedSubProduct) {
    if (hideVariantSize) {
      if (!finalColor) return toast.error("Please select a color first!");
      if (!finalSize) return toast.error("This color option is not available.");
    } else {
      if (!finalSize) return toast.error("Please select a size first!");
      if (!finalColor) return toast.error("Please select a color first!");
    }
  }

  // ✅ stock guard (compute from the FINAL selection, not maxQty)
  let stock = 0;

  if (selectedSubProduct) {
    stock = Number(selectedSubProduct.stock || 0);
  } else if (hasVariants) {
    const v = findVariant({ variants }, finalSize, finalColor);
    if (!v) return toast.error("Selected variant is not available!");
    stock = Number(v?.stock || 0);
  } else {
    stock = Number(product?.stockQuantity ?? product?.stock ?? 0);
  }

  if (stock <= 0) return toast.error("This item is out of stock.");
  if (finalQty > stock)
    return toast.error("Selected quantity exceeds stock availability!");

  // Keep the exact Buy Now selection while the user authenticates. Do this
  // before mutating the cart so the post-auth resume adds the item only once.
  if (!authUser?.uid) {
    pendingBuyNowRef.current = {
      productId: product.id,
      size: finalSize,
      color: finalColor,
      qty: finalQty,
      imageUrl: finalImage,
    };
    setQuickAuthIntent("checkout");
    setShowQuickAuth(true);
    return;
  }

  // ✅ build cart payload (same as Add to Cart)
  const productToAdd = {
    ...product,
    quantity: finalQty,
    selectedSize: finalSize,
    selectedColor: finalColor,
    selectedImageUrl: finalImage,
    selectedSubProduct,
    subProductId: selectedSubProduct ? selectedSubProduct.subProductId : null,
  };

  const productKey = buildCartKey({
    vendorId: product.vendorId,
    productId: product.id,
    isFashion,
    selectedSize: finalSize,
    selectedColor: finalColor,
    subProductId: selectedSubProduct?.subProductId,
  });

  const existingCartItem = cart?.[product.vendorId]?.products?.[productKey];

  const cartSyncPromise = existingCartItem
    ? dispatch(addToCart({ ...existingCartItem, quantity: finalQty }, true))
    : dispatch(addToCart(productToAdd, true));

  appHaptics.addToCart();

  setIsAddedToCart(true);

  track(
    "checkout_started",
    {
      surface: "product_detail",
      vendorId: product.vendorId,
      productId: product.id,
      qty: finalQty,
      intent: "buy_now",
    },
    { surface: "product_detail" },
  );

  // ✅ PROFILE COMPLETENESS GUARD (same as Cart)
  const ok = await ensureProfileCompleteBeforeCheckout(authUser);
  if (!ok) return;

  const cartSynced = await cartSyncPromise;
  if (!cartSynced) {
    console.warn(
      "Buy Now cart addition is queued locally and will retry in the background.",
    );
  }

  // ✅ QUICK MODE: use StoreBasket flow (auth + delivery)
  if (quickMode && product.vendorId === basketVendorId) {
    setPendingBuyNow(true);
    return;
  }

  // A Buy Now action must use the same cross-vendor repile guard as Cart.
  // Cart owns the warning and can safely resume checkout after the user chooses.
  if (isActive && vendorId !== product.vendorId) {
    navigate("/latest-cart", {
      state: {
        fromProductDetail: true,
        checkoutVendorId: product.vendorId,
      },
    });
    return;
  }

  // ✅ NORMAL MODE: go straight to vendor checkout
  navigate(`/newcheckout/${product.vendorId}`, {
    state: { fromProductDetail: true, buyNow: true },
  });
}, [
  product,
  quantity,
  selectedSize,
  selectedColor,
  selectedImage,
  selectedSubProduct,
  cart,
  dispatch,
  navigate,
  quickMode,
  basketVendorId,
  hasVariants,
  isFashion,
  variants,
  ensureProfileCompleteBeforeCheckout,
  currentUser,
  hideVariantSize,
  isActive,
  vendorId,
  productSoldOut,
]);

  useEffect(() => {
    if (!currentUser?.uid) {
      authResumeHandledRef.current = false;
      return;
    }
    if (authResumeHandledRef.current || !currentUser?.uid || !product?.id) return;
    const intent = takeAuthIntent({
      types: ["product-offer", "product-buy-now"],
      pathname: location.pathname,
    });
    if (!intent) return;
    if (String(intent.payload?.productId || "") !== String(product.id)) return;
    authResumeHandledRef.current = true;

    if (intent.type === "product-offer") {
      setOfferModalOpen(true);
      viewSignals?.markOfferOpen?.();
      return;
    }

    void handleBuyNow(
      {
        size: intent.payload?.size,
        color: intent.payload?.color,
        qty: intent.payload?.qty,
        imageUrl: intent.payload?.imageUrl,
      },
      currentUser,
    );
  }, [currentUser?.uid, handleBuyNow, location.pathname, product?.id, viewSignals]);

  if (loading) {
    return <Loading />;
  }
  const getAvailableStock = () => {
    if (selectedSubProduct) return Number(selectedSubProduct.stock || 0);

    if (hasVariants) {
      if (!selectedSize || !selectedColor) return 0;
      const v = findVariant({ variants }, selectedSize, selectedColor);
      return Number(v?.stock || 0);
    }

    return Number(product?.stockQuantity ?? product?.stock ?? 0);
  };

const requestHd = async (idx) => {
  const url = hdImages?.[idx];

  // 1) No HD available for this slide
  if (!url) {
    if (!hdToastShownRef.current.has(`nohd-${idx}`)) {
      hdToastShownRef.current.add(`nohd-${idx}`);
      toast("No HD image available for this photo.", { icon: "ℹ️" });
    }
    return;
  }

  if (loadedHd.has(idx) || loadingHd.has(idx)) return;

  try {
    viewSignals?.markHdLoad?.();
    appHaptics.light();

    const result = await loadHd(idx);
    if (result === "loaded") appHaptics.success();
  } catch (err) {
    console.error("HD load failed:", err);
    appHaptics.error();

    if (!hdToastShownRef.current.has(`err-${idx}`)) {
      hdToastShownRef.current.add(`err-${idx}`);
      toast.error(
        err?.message ||
          "Failed to load HD image. Please try again (or check your connection).",
      );
    }
  }
};


  const getSizeText = (product) => {
    if (!product) return "";
    if (isVariantSizeHidden(product)) return "";

    // 1) If product.size exists (string like "S, UK 38, 47")
    if (product.size) {
      const parts = String(product.size)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (!parts.length) return "";
      if (parts.length === 1) return parts[0];
      return `${parts[0]} - ${parts[parts.length - 1]}`;
    }

    // 2) If size is not on product, derive from variants (common in your setup)
    if (Array.isArray(product.variants) && product.variants.length) {
      const sizes = Array.from(
        new Set(
          product.variants
            .map((v) => v?.size)
            .filter(Boolean)
            .map((s) => String(s).trim()),
        ),
      );

      if (!sizes.length) return "";
      if (sizes.length === 1) return sizes[0];
      return `${sizes[0]} - ${sizes[sizes.length - 1]}`;
    }

    return "";
  };
  const toTitleCase = (str = "") =>
    String(str)
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  // usage where you build conditionText
  const conditionText = product?.condition
    ? toTitleCase(product.condition.replace(/:$/, ""))
    : "";

  const minOfferAmount = 1; // guard
  const maxOfferQty = Math.max(1, getAvailableStock());
  if (error || !product) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <Productnotofund />
        <div className="relative w-full bg-customOrange bg-opacity-40 border-2 border-customOrange rounded-lg p-4">
          <div className="absolute top-2 left-4 w-4 h-4 bg-black rounded-full"></div>
          <div className="absolute top-2 right-4 w-4 h-4 bg-black rounded-full"></div>

          {/* Text content */}
          <h1 className="text-2xl font-opensans mt-2 font-bold text-red-600 mb-2">
            Product Not Found
          </h1>
          <p className="text-lg text-gray-700 font-opensans mb-4">
            It looks like this product has been removed from the inventory by
            the vendor.
          </p>
          <p className="text-md font-opensans text-gray-500">
            Please continue shopping for other great deals!
          </p>
        </div>

        <button
          className="w-32 bg-customOrange font-opensans text-xs px-2 h-10 text-white rounded-lg mt-12"
          onClick={() => navigate("/")} // Navigate to / on click
        >
          Back Home
        </button>
      </div>
    );
  }
  if (!product?.published && !product?.__ownerPreview) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <Productnotofund />
        <h1 className="text-2xl font-opensans font-bold text-red-600 mb-2">
          Product Not Found
        </h1>
        <p className="text-lg text-gray-700 font-opensans mb-4">
          This item is not currently available.
        </p>
        <button
          className="w-32 bg-customOrange font-opensans text-xs px-2 h-10 text-white rounded-lg mt-12"
          onClick={() => navigate("/")} // Navigate to the homepage
        >
          Back Home
        </button>
      </div>
    );
  }

  const averageRating =
    vendor && vendor.ratingCount > 0
      ? (vendor.rating / vendor.ratingCount).toFixed(1)
      : "No ratings";

  return (
    <>
      <SEO
        title={product.name}
        description={product.description}
        image={product.coverImageUrl}
        url={`https://www.shopmythrift.store/product/${product.id}`}
      />
      <div className="relative px-2 pb-20">
        {product.__ownerPreview && (
          <div className="mb-2 rounded-xl bg-amber-50 px-3 py-2 text-center font-satoshi text-xs text-amber-900">
            {product.published === true
              ? "Private preview — customers cannot see or purchase this item until your store is approved."
              : "Private preview — customers cannot see or purchase this item until it is published."}
          </div>
        )}
        {/* --- IMAGE SWIPER SECTION --- */}

        <div
          ref={swiperRef}
          className="flex rounded-md justify-center mt-3 h-[500px] relative bg-gray-50"
        >
          {/* OVERLAY CONTROLS (Back Button) */}
         {/* OVERLAY CONTROLS (Back/Home Button) */}
          <AppBackButton
            onClick={handleTopLeftBack}
            onLongPress={
              journeyOptions.length ? openProductJourneyHistory : undefined
            }
            hintText={
              journeyOptions.length ? "Hold to see browsing history" : ""
            }
            hintMaxShows={2}
            label={isShared ? "Home" : "Back"}
            variant="overlay"
            fixed
            scrolled={isSticky}
            icon={isShared ? <LiaHomeSolid aria-hidden="true" /> : null}
          />

          <ProductSocialProofPill productId={id} />
          {/* SWIPER COMPONENT */}
          {allImages.length > 1 ? (
            <>
              <Swiper
                modules={[FreeMode, Autoplay]}
                autoplay={{
                  delay: 7500,
                  disableOnInteraction: false,
                }}
                className="product-images-swiper  w-full h-full"
                onSlideChange={(swiper) => {
                  setCurrentImageIndex(swiper.activeIndex);
                  viewSignals?.markGallerySwipe?.();
                }}
              >
                {allImages.map((image, index) => (
                <SwiperSlide key={index}>
  <div
    className="relative w-full h-full"
    onDoubleClick={() => requestHd(index)}
    onTouchEnd={makeDoubleTap(() => requestHd(index))}
  >
    <AnimatePresence mode="wait">
      <motion.div
        key={
          loadedHd.has(index) && hdImages[index]
            ? `hd-${hdImages[index]}`
            : `sd-${image}`
        }
        initial={{ filter: "blur(0px)", opacity: 0.8 }}
        animate={{
          filter: loadingHd.has(index) ? "blur(2px)" : "blur(0px)",
          opacity: 1,
        }}
        transition={{ duration: 0.5 }}
        className="w-full h-full"
      >
        <SafeImg
          src={loadedHd.has(index) && hdImages[index] ? hdImages[index] : image}
          alt={`${product.name} image ${index + 1}`}
          className="object-cover rounded-xl w-full h-full"
        />
      </motion.div>
    </AnimatePresence>

    {/* THE COOL LOADING EFFECT (same as single image fallback) */}
    <AnimatePresence>
      {loadingHd.has(index) && (
        <motion.div
          key={`scanner-${index}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.3 } }}
        >
          <ScanningEffect />
        </motion.div>
      )}
    </AnimatePresence>

    {/* Hint Overlay (First slide only) */}
    {showHdHint && index === 0 && <HdHintOverlay />}
  </div>
</SwiperSlide>
                ))}
              </Swiper>

              {/* Dot Indicators (Scaling Effect) */}
              <div className="absolute bottom-6 z-10 w-full flex justify-center items-center gap-1.5">
                {allImages.map((_, index) => {
                  const distance = Math.abs(currentImageIndex - index);

                  // Determine size and opacity based on distance from active index
                  let dotStyle = "w-1.5 h-1.5 bg-white/40"; // Default (Far away)

                  if (distance === 0) {
                    dotStyle =
                      "w-2.5 h-2.5 bg-white shadow-sm scale-110 opacity-100"; // Active
                  } else if (distance === 1) {
                    dotStyle = "w-2 h-2 bg-white/70"; // Neighbor
                  }

                  return (
                    <div
                      key={index}
                      onClick={() => {
                        const swiper = document.querySelector(
                          ".product-images-swiper",
                        ).swiper;
                        swiper.slideTo(index);
                      }}
                      className={`cursor-pointer rounded-full transition-all duration-300 ${dotStyle}`}
                    ></div>
                  );
                })}
              </div>
            </>
          ) : (
            // Single Image Fallback
<div
  className="relative w-full h-full overflow-hidden rounded-xl bg-gray-100" // Added bg-gray-100 and overflow-hidden
  onDoubleClick={() => requestHd(0)}
  onTouchEnd={makeDoubleTap(() => requestHd(0))}
>
  <AnimatePresence mode="wait">
    {/* We wrap the image in motion.div to handle the "Flash" effect when switching.
      Note: We check if it is HD to apply a 'sharp' look, otherwise 'blur' if loading.
    */}
    <motion.div
      key={loadedHd.has(0) && hdImages[0] ? `hd-${hdImages[0]}` : `sd-${allImages[0]}`}
      initial={{ filter: "blur(0px)", opacity: 0.8 }}
      animate={{ 
        filter: loadingHd.has(0) ? "blur(2px)" : "blur(0px)", 
        opacity: 1 
      }}
      transition={{ duration: 0.5 }}
      className="w-full h-full"
    >
      <SafeImg
        src={loadedHd.has(0) && hdImages[0] ? hdImages[0] : allImages[0]}
        alt={`${product.name} image`}
        className="object-cover w-full h-full"
      />
    </motion.div>
  </AnimatePresence>

  {/* THE COOL LOADING EFFECT */}
  <AnimatePresence>
    {loadingHd.has(0) && (
      <motion.div
        key="scanner"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.3 } }}
      >
        <ScanningEffect />
      </motion.div>
    )}
  </AnimatePresence>

  {/* Success Badge (Pop in animation) */}
 

  {showHdHint && <HdHintOverlay />}
</div>
          )}
          {productSoldOut && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-slate-900/45">
              <span className="rounded-full bg-black/75 px-5 py-2 font-satoshi text-base font-medium text-white">
                Sold
              </span>
            </div>
          )}
        </div>

        <div className="px-2 mt-2">
          <div className="w-full bg-white mt-3 mb-2">
            <div className="flex items-center gap-2  overflow-x-auto no-scrollbar pb-2">
              {/* Like Button */}
              <button
                onClick={handleFavoriteToggle}
                className="flex-shrink-0 flex items-center gap-1.5 bg-gray-100 px-4 py-2 rounded-full hover:bg-gray-200 transition-colors"
              >
                {favorite ? (
                  <RiHeart3Fill className="text-red-500 text-lg" />
                ) : (
                  <RiHeart3Line className="text-black text-lg" />
                )}
                <span className="text-sm font-opensans font-medium text-black">
                  {wishCount > 0 ? `${wishCount} ` : "Like"}
                </span>
              </button>

              {/* Share Button */}
              <button
                onClick={nativeShareProduct}
                className="flex-shrink-0 flex items-center gap-1.5 bg-gray-100 px-4 py-2 rounded-full hover:bg-gray-200 transition-colors"
              >
                <LiaShareSolid className="text-black text-lg" />
                <span className="text-sm font-opensans font-medium text-black">
                  Share
                </span>
              </button>

              {!product.__ownerPreview && (
                <>
                  <AskQuestionNudge
                    variant="inline"
                    onAskClick={() => {
                      setIsAskModalOpen(true);
                      viewSignals?.markAskOpen?.();
                    }}
                  />
                  <button
                    onClick={() => {
                      if (!currentUser) {
                        toast.error("Please sign in to report this product.");
                        return;
                      }
                      setReportOpen(true);
                    }}
                    className="flex-shrink-0 flex items-center gap-1.5 bg-gray-100 px-4 py-2 rounded-full hover:bg-gray-200 transition-colors"
                  >
                    <IoFlagOutline className="text-black text-lg" />
                    <span className="text-sm font-opensans font-medium text-black">
                      Report
                    </span>
                  </button>
                </>
              )}
              {/* Report Button */}
            </div>
          </div>
          <div className="flex mt-2 flex-col">
            <h1 className="text-base font-opensans  text-black font-normal ">
              {product.name}
            </h1>

            {(() => {
              const sizeText = getSizeText(product);
              const conditionText = product?.condition
                ? toTitleCase(product.condition.replace(/:$/, ""))
                : "";

              if (!sizeText && !conditionText) return null;

              return (
                <div className="flex items-center mt-0.5 text-sm font-opensans text-gray-500">
                  {sizeText && <span>{sizeText}</span>}

                  {sizeText && conditionText && (
                    <GoDotFill className="mx-1 dot-size text-gray-300" />
                  )}

                  {conditionText && (
                    <span className="inline-flex items-center gap-1">
                      <span>{conditionText}</span>
                      <button
                        type="button"
                        onClick={() => {
                          appHaptics.selection();
                          setConditionInfoOpen(true);
                        }}
                        className="inline-grid h-6 w-6 place-items-center p-0 text-gray-400"
                        aria-label={`About ${conditionText} condition`}
                      >
                        <CiCircleInfo className="text-base" />
                      </button>
                    </span>
                  )}
                </div>
              );
            })()}
          </div>
          {/* MAIN price */}
          <div className="flex items-baseline gap-2 font-satoshi">
            {/* 1. PREVIOUS PRICE (Strikethrough, Smaller, Grey) */}
            {(() => {
              const prevs = [];

              // when there’s a locked/accepted price
              if (effectivePrice) {
                prevs.push(NGN(Number(product.price || 0)));
              }

              // show discount initial price
              if (
                product?.discount &&
                product.discount.initialPrice &&
                product.discount.discountType !== "personal-freebies"
              ) {
                prevs.push(NGN(Number(product.discount.initialPrice)));
              }

              if (!prevs.length) return null;

              return (
                <AnimatedPriceSwap
                  items={prevs}
                  interval={1800}
                  // Removed "block" and added text sizing/color here
                  className="text-md text-gray-400 line-through"
                  itemClassName="text-md text-gray-400 line-through"
                />
              );
            })()}

            {/* 2. CURRENT PRICE (Larger, Bold, Black) */}
            <div className="flex items-center">
              <p className="text-2xl font-normal text-black">
                {NGN(displayPrice)}
              </p>

              {/* Info Icon for Effective Price */}
              {effectivePrice && (
                <button
                  type="button"
                  onClick={() => setOfferInfoOpen(true)}
                  className="ml-2 inline-flex items-center text-[9px] underline text-customOrange"
                >
                  <BiInfoCircle className="text-base" />
                </button>
              )}
            </div>

            {/* 3. DISCOUNT PERCENTAGE (Grey text in brackets) */}
            {product?.discount && (
              <span className="text-md text-gray-500 font-medium">
                (
                {product.discount.discountType.startsWith("personal-freebies")
                  ? product.discount.freebieText
                  : `-${product.discount.percentageCut}%`}
                )
              </span>
            )}
          </div>
          {/* Offer is active – info link */}

          {/* PREVIOUS price row (animated, same style as before) */}

          {/* {vendorLoading ? (
            <LoadProducts className="mr-20" />
          ) : vendor ? (
            <div className="flex align- items-center mt-1">
              <p className="text-sm font-opensans text-red-600 mr-2">
                {vendor.shopName}
              </p>
              {vendor.ratingCount > 0 && (
                <div className="flex items-center">
                  <span className="mr-1 text-black font-medium ratings-text">
                    {averageRating}
                  </span>
                  <FaStar className="text-yellow-500 ratings-text" />
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs font-opensans text-gray-500">
              Vendor information not available
            </p>
          )} */}
          <ProductSellingFastPill productId={id} className="mb-2" />
          {showMakeOffer && !product.__ownerPreview && !productSoldOut && (
            <div className="mt-4">
              <button
                onClick={() => {
                  if (!currentUser) {
                    setQuickAuthIntent("offer");
                    setShowQuickAuth(true);
                    return;
                  }
                  setOfferModalOpen(true);
                  viewSignals?.markOfferOpen?.();
                }}
                className="w-full px-8 h-12 rounded-xl bg-gray-100 text-black font-satoshi font-normal"
              >
                Make an Offer
              </button>
            </div>
          )}

          {isFashion && hasVariants && (
            <div className="mt-3">
              <label className="text-sm font-normal text-black font-satoshi  block">
                Colour
              </label>

              {/* ✅ If a subproduct is selected: show its color ONLY (read-only) */}
              {selectedSubProduct
                ? (() => {
                    const sw = getSwatchFromRawColor(selectedSubProduct?.color);
                    if (!sw) return null;

                    return (
                      <div className="flex gap-4 px-2 overflow-x-auto no-scrollbar py-1">
                        <div className="flex flex-col items-center shrink-0">
                          <div
                            className={[
                              "w-10 h-10 rounded-full",
                              sw.needsBorder ? "border border-gray-200" : "",
                              "ring-2 ring-black ring-offset-2", // always selected
                            ].join(" ")}
                            style={sw.style}
                          />
                          <span className="mt-1 text-xs font-satoshi text-gray-700 whitespace-nowrap">
                            {sw.label}
                          </span>
                        </div>
                      </div>
                    );
                  })()
                : /* ✅ Main product: show ONLY variant swatches */
                  (() => {
                    const swatches = getProductColorSwatches(product, {
                      source: "variants",
                    });
                    if (!swatches.length) return null;

                    return (
                      <div className="flex gap-4  overflow-x-auto no-scrollbar py-1">
                        {swatches.map((sw) => {
                          const swatchKey = getSwatchSelectionKey(sw);
                          const isSelected = selectedSwatchKey === swatchKey;
                          const inStock = isVariantSwatchAvailable(sw);

                          return (
                            <button
                              key={swatchKey}
                              type="button"
                              disabled={!inStock}
                              onClick={() => handleVariantSwatchClick(sw)}
                              className={`flex flex-col items-center shrink-0 ${
                                inStock
                                  ? ""
                                  : "cursor-not-allowed opacity-35"
                              }`}
                            >
                              <div
                                className={[
                                  "w-10 h-10 rounded-full",
                                  sw.needsBorder
                                    ? "border border-gray-200"
                                    : "",
                                  isSelected
                                    ? "ring-2 mx-1 ring-black ring-offset-2"
                                    : "",
                                ].join(" ")}
                                style={sw.style}
                              />
                              <span className="mt-1 text-xs font-satoshi text-gray-700 whitespace-nowrap">
                                {sw.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}
            </div>
          )}

          {/* Size Selection */}
          {isFashion && !hideVariantSize && (
            <div className="mt-3">
              <p className="text-sm font-normal text-black font-satoshi mb-2">
                Size
              </p>
              <div className="flex flex-wrap gap-2">
                {availableSizes.map((s, index) => {
                  const size = getSizeValue(s); // ✅ normalize to string/number
                  const inStock = isSizeInStock(s); // can pass s or size (see note below)
                  const isSelected =
                    String(selectedSize) === String(size) && inStock;

                  return (
                    <div
                      key={`${size}-${index}`}
                      onClick={() => {
                        if (inStock) handleSizeClick(size); // ✅ pass normalized
                      }}
                      className={`relative py-2 px-4 border rounded-lg ${
                        isSelected
                          ? "bg-customOrange text-white cursor-pointer"
                          : inStock
                            ? "bg-transparent text-black cursor-pointer"
                            : "bg-gray-200  text-black opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <span className="text-xs font-opensans font-semibold">
                        {size}
                      </span>

                      {!inStock && (
                        <span className="absolute inset-0 animate-pulse flex items-center justify-center bg-gray-800 bg-opacity-50 text-customOrange font-opensans font-semibold text-xs text-center rounded-lg pointer-events-none">
                          Out of Stock
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* Quantity (before add to cart) */}
          <div className="mt-4">
            <p className="text-sm font-normal text-black font-opensans mb-2">
              Quantity
            </p>

            <div className="inline-flex items-center bg-gray-100 rounded-lg px-3 py-2">
              <button
                type="button"
                onClick={handleQtyDecrease}
                disabled={decDisabled}
                className={`p-1 ${decDisabled ? "opacity-40 cursor-not-allowed" : ""}`}
                aria-label="Decrease quantity"
              >
                <GoChevronLeft className="text-xl" />
              </button>

              <span className="w-10 text-center font-opensans text-sm">
                {quantity}
              </span>

              <button
                type="button"
                onClick={handleQtyIncrease}
                disabled={incDisabled}
                className={`p-1 ${incDisabled ? "opacity-40 cursor-not-allowed" : ""}`}
                aria-label="Increase quantity"
              >
                <GoChevronRight className="text-xl" />
              </button>
            </div>
          </div>

          <AboutThisItem
            product={product}
            showSize={!hideVariantSize}
            onOpenDefect={handleOpenModal}
            onOpenCondition={() => {
              appHaptics.selection();
              setConditionInfoOpen(true);
            }}
          />

          <VendorProfileMoreFromSeller
            vendorId={product?.vendorId}
            currentProduct={product}
            currentProductId={product?.id}
          />
          {quickMode && product?.vendorId === basketVendorId && (
            <StoreBasket
              vendorId={basketVendorId}
              quickMode
              ref={basketRef}
            />
          )}

          <AppBottomSheet
            open={isAskModalOpen}
            onClose={() => !isSending && setIsAskModalOpen(false)}
            height="60dvh"
            ariaLabel="Ask about this item"
            zIndex={8100}
            backdropClassName="bg-black/80"
            compactTop
            dismissible={!isSending}
            keyboardAware
          >
            <div className="min-h-0 flex-1 overscroll-contain overflow-y-auto p-6 pt-5 font-satoshi">
              <div>
                <QuestionandA />
              </div>
              <h2 className="mb-2 text-xl font-semibold">
                Ask about this item
              </h2>
              <p id="question-help" className="mb-4 text-xs leading-5 text-gray-600">
                Ask the vendor anything you need to know before buying.
              </p>

              {!currentUser?.uid && (
                <>
                  <label
                    htmlFor="product-question-email"
                    className="mb-1 block text-xs font-medium text-gray-700"
                  >
                    Your email
                  </label>
                  <input
                    id="product-question-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={guestQuestionEmail}
                    onChange={(event) => setGuestQuestionEmail(event.target.value)}
                    aria-describedby="question-help"
                    className="mb-4 w-full rounded-xl border bg-white px-3 py-3 text-base outline-none focus:border-customOrange"
                  />
                </>
              )}

              <label
                htmlFor="product-question-text"
                className="mb-1 block text-xs font-medium text-gray-700"
              >
                Your question
              </label>
              <textarea
                id="product-question-text"
                rows={3}
                placeholder="What would you like to know?"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                maxLength={700}
                aria-describedby="question-help"
                className="mb-4 w-full resize-none rounded-xl border px-3 py-3 text-base outline-none focus:border-customOrange"
              />

              {!currentUser?.uid && (
                <p className="mb-4 rounded-xl bg-orange-50 px-3 py-2 text-xs leading-5 text-orange-900">
                  We’ll send a verification link to this email.
                </p>
              )}

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleSendQuestion}
                  disabled={isSending || !questionText.trim()}
                  className="flex min-h-12 w-full items-center justify-center rounded-xl bg-customOrange px-4 py-2 text-base font-semibold text-white disabled:opacity-50"
                >
                  {isSending ? (
                    <RotatingLines
                      width="24"
                      strokeColor="#fff"
                      strokeWidth="5"
                    />
                  ) : (
                    "Send"
                  )}
                </button>
              </div>
            </div>
          </AppBottomSheet>
        <AddToCartVariantSheet
  open={addSheetOpen}
  onClose={() => setAddSheetOpen(false)}
  product={product}
  variants={variants}
  imageUrl={product?.coverImageUrl || selectedImage}
  title={variantSheetMode === "buy" ? "Buy Now" : "Add to Cart"}
  confirmLabel={variantSheetMode === "buy" ? "Buy Now" : "Add to Cart"}
  priceText={NGN(displayPrice)}
  prevPriceText={
    product?.discount?.initialPrice &&
    product?.discount?.discountType !== "personal-freebies"
      ? NGN(Number(product.discount.initialPrice))
      : effectivePrice
        ? NGN(Number(product.price || 0))
        : ""
  }
  initialSwatchKey={selectedSwatchKey}
  initialSize={selectedSize}
  initialRawColor={selectedColor}
  initialQty={quantity}
  onConfirm={async ({ swatchKey, size, rawColor, qty }) => {
    // keep your UI in sync
    setSelectedSwatchKey(swatchKey);
    setSelectedSize(size);
    setSelectedColor(rawColor);
    setQuantity(qty);

    // close sheet immediately
    setAddSheetOpen(false);

    if (variantSheetMode === "buy") {
      // ✅ go through BUY NOW flow using overrides
      await handleBuyNow({ size, color: rawColor, qty, imageUrl: selectedImage });
    } else {
      // ✅ normal add to cart
      handleAddToCart({ size, color: rawColor, qty });
      setAnimateCart(true);
    }
  }}
/>

          <AppBottomSheet
            open={isOfferInfoOpen}
            onClose={() => setOfferInfoOpen(false)}
            height="50dvh"
            ariaLabel="About offers"
            zIndex={9000}
            backdropClassName="bg-black/20 backdrop-blur-md"
            compactTop
          >
            <div className="min-h-0 flex-1 overflow-y-auto p-3 pt-5 relative">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-rose-100 flex justify-center items-center rounded-full">
                    <BiSolidOffer className="text-customRichBrown" />
                  </div>
                  <h2 className="font-opensans text-base font-semibold">
                    About Offers
                  </h2>
                </div>
                <MdOutlineClose
                  onClick={() => setOfferInfoOpen(false)}
                  className="text-gray-600 hover:text-black text-xl leading-none"
                  aria-label="Close"
                />
              </div>

              {/* Body */}
              <div className="space-y-3">
                <p className="text-sm text-gray-800 font-opensans">
                  You’re seeing a special price because a seller <b>accepted</b>{" "}
                  your offer or sent a <b>counter-offer</b> you can buy at for a
                  limited time.
                </p>

                {/* Validity window */}
                <div className="bg-gray-50 border border-gray-200 rounded-md p-2.5">
                  <p className="text-xs font-opensans text-gray-700">
                    <b>How long is it valid?</b> Offers lock the price for up to{" "}
                    <span className="font-semibold">24 hours</span>.
                    {priceLock?.validUntil && (
                      <>
                        {" "}
                        This one is valid until{" "}
                        <span className="font-semibold">
                          {(() => {
                            // handle Firestore Timestamp or plain ISO/date
                            const vu = priceLock.validUntil?.toDate
                              ? priceLock.validUntil.toDate()
                              : new Date(priceLock.validUntil);
                            return vu.toLocaleString();
                          })()}
                        </span>
                        .
                      </>
                    )}
                  </p>
                </div>

                {/* Precedence note */}
                <p className="text-sm text-gray-800 font-opensans">
                  <b>Which price applies?</b> If both a discount and an offer
                  exist, the <b>offer price takes precedence</b> for you while
                  it’s active.
                </p>

                {/* Read more */}
                <p className="text-sm font-opensans text-gray-700">
                  <a
                    href="https://mythrift.tawk.help/article/sending-offers-on-my-thrift"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-customOrange underline"
                  >
                    Read more in our Help Center
                  </a>
                </p>
              </div>

              {/* Footer */}
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setOfferInfoOpen(false)}
                  className="px-4 py-2 bg-customOrange text-white font-opensans rounded-full"
                >
                  Got it
                </button>
              </div>
            </div>
          </AppBottomSheet>
        </div>
<ProductReportModal
  isOpen={reportOpen}
  onClose={() => setReportOpen(false)}
  product={product}
  vendor={vendor}
  currentUser={currentUser}
  context={{
    surface,
    isShared,
    url: window.location.href,
    selectedSize,
    selectedColor,
    subProductId: selectedSubProduct?.subProductId || null,
    selectedImageUrl: selectedImage || "",
  }}
/>

        <RelatedProducts product={product} />
        <AppBottomSheet
          open={showModal}
          onClose={handleCloseModal}
          height="auto"
          ariaLabel="Product defect details"
          zIndex={10000}
          compactTop
        >
          <div className="overflow-y-auto px-5 pb-5 pt-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 bg-red-100 flex justify-center items-center rounded-full">
                  <FaExclamationTriangle className="text-red-600" />
                </div>
                <h2 className="font-opensans text-base font-semibold">
                  Defect Details
                </h2>
              </div>
            </div>

            {/* Defect description */}
            <p className="text-sm text-gray-800 font-opensans mb-4">
              {product.defectDescription}
            </p>

            {/* Important Disclaimer */}
            <div className="bg-yellow-50 border-l-4 border-yellow-400 px-1 py-2 rounded-md shadow-sm">
              <h3 className="text-sm font-semibold font-opensans text-yellow-700 mb-1">
                Important Disclaimer
              </h3>
              <p className="text-xs text-yellow-800 font-opensans">
                By purchasing this product, you acknowledge the disclosed
                defects. By proceeding, you accept the product as-is.
              </p>
            </div>

            {/* Close button */}
            <div className="flex justify-end mt-6">
              <button
                onClick={handleCloseModal}
                className="bg-customOrange text-white font-opensans py-2 px-6 rounded-full"
              >
                Got it
              </button>
            </div>
          </div>
        </AppBottomSheet>
        <ProductConditionInfoSheet
          open={conditionInfoOpen}
          onClose={() => setConditionInfoOpen(false)}
          condition={product?.condition}
          defectDescription={product?.defectDescription}
        />
        <QuickAuthModal
          open={showQuickAuth}
          onClose={() => {
            pendingBuyNowRef.current = null;
            setPendingBuyNow(false);
            setQuickAuthIntent("offer");
            setShowQuickAuth(false);
          }}
          onComplete={async (user) => {
            const completedIntent = quickAuthIntent;
            const pendingSelection = pendingBuyNowRef.current || {};
            pendingBuyNowRef.current = null;
            setQuickAuthIntent("offer");
            setShowQuickAuth(false);
            if (completedIntent === "checkout") {
              if (
                !pendingSelection.productId ||
                String(pendingSelection.productId) !== String(id)
              ) {
                return;
              }
              await handleBuyNow(
                {
                  size: pendingSelection.size,
                  color: pendingSelection.color,
                  qty: pendingSelection.qty,
                  imageUrl: pendingSelection.imageUrl,
                },
                user,
              );
              return;
            }

            setOfferModalOpen(true);
          }}
          mergeCart={(uid) => fetchAndMergeCart(db, uid, dispatch)}
          openDisclaimer={openDisclaimer}
          headerText={
            quickAuthIntent === "checkout"
              ? "Let’s set up your order"
              : "Let’s set up your offer"
          }
          compactTop
          authIntent={{
            type:
              quickAuthIntent === "checkout"
                ? "product-buy-now"
                : "product-offer",
            returnTo: `${location.pathname}${location.search}`,
            payload: {
              productId: product?.id || id,
              ...(quickAuthIntent === "checkout"
                ? pendingBuyNowRef.current || {}
                : {}),
            },
          }}
        />
        <OfferSheet
          isOpen={offerModalOpen}
          onClose={() => setOfferModalOpen(false)}
          product={product}
          hasSubProducts={hasSubProducts}
          subProducts={subProducts}
          selectedSubProduct={selectedSubProduct}
          onSelectSubProduct={handleSubProductClick}
          hasVariants={hasVariants}
          selectedSize={selectedSize}
          selectedColor={selectedColor}
          currentUser={currentUser}
          onOfferSubmitted={handleOfferSubmitted}
          navigate={navigate}
          location={location}
        />
        <NavigationHistorySheet
          open={historyFallbackOpen}
          options={journeyOptions}
          onClose={closeHistoryFallback}
          onSelect={returnToJourneyOption}
        />

        <AppScrollToTopButton bottomOffset={88} zIndex={7800} />

        <div
          className="fixed bottom-0 left-0 right-0 z-[7900] bg-white border-t border-gray-100 p-4"
          onClick={(e) => e.stopPropagation()}
        >
          {product.__ownerPreview ? (
            <button
              type="button"
              disabled
              className="h-12 w-full rounded-lg bg-gray-100 font-satoshi font-medium text-gray-500"
            >
              Private preview
            </button>
          ) : productSoldOut ? (
            <button
              type="button"
              disabled
              className="h-12 w-full rounded-lg bg-gray-200 font-satoshi font-medium text-gray-600"
            >
              Sold
            </button>
          ) : (
          <div className="flex w-full gap-3">
            <button
              onClick={() => {
                // If already in cart -> checkout
                if (isAddedToCart) {
                  const routeState = isStockpileForThisVendor
                    ? {
                        fromProductDetail: true,
                        openPileVendorId: product.vendorId,
                      }
                    : { fromProductDetail: true };
                  return navigate("/latest-cart", {
                    state: routeState,
                  });
                }

                // If missing variant selection -> open modal (instead of toast)
                const needsModal =
                  hasVariants &&
                  !selectedSubProduct &&
                  (!selectedSize || !selectedColor);

                if (needsModal) return openVariantSheet("add");

                // Normal behaviour
                handleAddToCart();
                setAnimateCart(true);
              }}
              className="flex-1 h-12 rounded-lg bg-gray-100 text-gray-900 font-opensans font-medium shadow-sm active:scale-[0.98] transition-transform"
            >
              {isAddedToCart
                ? isStockpileForThisVendor
                  ? "View Pile"
                  : "View in Cart"
                : "Add to Cart"}
            </button>

            {/* Buy Now (UNCHANGED) */}
            <button
              onClick={() => {
                  const needsModal =
      hasVariants &&
      !selectedSubProduct &&
      (!selectedSize || !selectedColor);

    if (needsModal) return openVariantSheet("buy");

                handleBuyNow();
              }}
              className="flex-1 h-12 rounded-lg bg-customOrange text-white font-opensans font-medium shadow-sm active:scale-[0.98] transition-transform"
            >
              Buy Now
            </button>
          </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ProductDetailPage;
