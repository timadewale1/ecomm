/* eslint-disable jsx-a11y/img-redundant-alt */
import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { addToCart, removeFromCart } from "../../redux/actions/action";
import { fetchProduct } from "../../redux/actions/productaction";
import { mergeCarts } from "../../services/cartMerge";
import QuickAuthModal from "../../components/PwaModals/AuthModal";
import { useTawk } from "../../components/Context/TawkProvider";
import Loading from "../../components/Loading/Loading";
import { PiShoppingCartBold } from "react-icons/pi";
import { FaExclamationTriangle, FaSmileBeam, FaStar } from "react-icons/fa";
import { CiCircleInfo } from "react-icons/ci";
import { IoMdArrowBack } from "react-icons/io";
import { TbInfoOctagon } from "react-icons/tb";
import { TbInfoTriangle } from "react-icons/tb";
import {
  getProductColorSwatches,
  getSwatchFromRawColor,
  normalizeColorKeyForSwatch,
} from "../../services/colorutils";

import LoadProducts from "../../components/Loading/LoadProducts";
import { GoChevronLeft, GoChevronRight, GoDotFill } from "react-icons/go";
import { LuCopyCheck, LuCopy } from "react-icons/lu";
import toast from "react-hot-toast";
import Modal from "react-modal";
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
import { useLocation } from "react-router-dom";
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
  serverTimestamp,
  addDoc,
  updateDoc,
  runTransaction,
  deleteDoc,
  setDoc,
  increment,
} from "firebase/firestore";
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
import { auth, db } from "../../firebase.config";
import { IoShareSocialOutline } from "react-icons/io5";
import IkImage from "../../services/IkImage";
import SEO from "../../components/Helmet/SEO";
import QuestionandA from "../../components/Loading/QuestionandA";
import { LiaHomeSolid, LiaShareSolid, LiaTimesSolid } from "react-icons/lia";
import { handleUserActionLimit } from "../../services/userWriteHandler";
import SafeImg from "../../services/safeImg";
import { RiHeart3Fill, RiHeart3Line } from "react-icons/ri";
import { useFavorites } from "../../components/Context/FavoritesContext";
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

Modal.setAppElement("#root");

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
    if (!hdImages[idx] || loadedHd.has(idx) || loadingHd.has(idx)) return;

    setLoadingHd((p) => new Set(p).add(idx));

    const img = new Image();
    img.src = hdImages[idx];
    img.onload = () => {
      setLoadedHd((p) => new Set(p).add(idx));
      setLoadingHd((p) => {
        const n = new Set(p);
        n.delete(idx);
        return n;
      });
    };
    img.onerror = () =>
      setLoadingHd((p) => {
        const n = new Set(p);
        n.delete(idx);
        return n;
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

const HD_HINT_KEY = "hdHintMeta";

const useHdHint = (productId) => {
  const [show, setShow] = useState(false);

  /* ── decide WHEN the hint should appear ─────────────────────── */
  useEffect(() => {
    const now = Date.now();
    const meta = JSON.parse(localStorage.getItem(HD_HINT_KEY) || "{}");
    const { shownIds = [], totalShown = 0, lastShown = 0 } = meta;

    const msSince = now - lastShown;
    const canShow =
      totalShown < 2 || // first 2 products
      (totalShown === 2 && msSince > 3 * 864e5) || // +3 days
      (totalShown === 3 && msSince > 7 * 864e5); // +1 week

    if (canShow && !shownIds.includes(productId)) {
      setShow(true);
      localStorage.setItem(
        HD_HINT_KEY,
        JSON.stringify({
          shownIds: [...shownIds, productId],
          totalShown: totalShown + 1,
          lastShown: now,
        }),
      );
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
      Double‑tap for HD version
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
  const searchParams = new URLSearchParams(location.search);
  const isShared = searchParams.has("shared");

  const productVendorId = product?.vendorId;
  const [subProducts, setSubProducts] = useState([]);
  const [selectedSubProduct, setSelectedSubProduct] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

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
  const [isThankYouOpen, setIsThankYouOpen] = useState(false);
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
  const currentUser = auth.currentUser;
  const userData = useSelector((state) => state.user.userData);
  const [isAskModalOpen, setIsAskModalOpen] = useState(false);
  const [questionText, setQuestionText] = useState("");
  // Inside your ProductDetailPage component
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [disclaimerUrl, setDisclaimerUrl] = useState("");
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [wishCount, setWishCount] = useState(
    typeof product?.wishCount === "number" ? product.wishCount : 0,
  );

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
const favBusyRef = useRef(false);

  // Derive the price to show
  const effectivePrice = priceLock?.effectivePrice
    ? Number(priceLock.effectivePrice)
    : null;
  const displayPrice = effectivePrice ?? Number(product?.price || 0);
  // ✅ Buy Now (quick flow) trigger
  const [pendingBuyNow, setPendingBuyNow] = useState(false);

  // Local Favorites Context
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();
  const favorite = isFavorite(product?.id);
  const { isActive: quickMode = false, vendorId: basketVendorId = null } =
    useSelector((state) => selectQuickMode(state) ?? {});
  const offerPriceFromState = location.state?.offerPrice;

  // NEW: show one-time toast after arriving via shared link with price
  useEffect(() => {
    if (!isShared) return;
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
      // clear state so toast doesn’t repeat on re-renders/navigation
      navigate(location.pathname + location.search, {
        replace: true,
        state: {},
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isShared, offerPriceFromState]);
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
    const fetchProductDetails = async () => {
      try {
        const productRef = doc(db, "products", id); // Fetch product by ID
        const productSnap = await getDoc(productRef);

        if (productSnap.exists()) {
          const productData = productSnap.data();
          if (!productData.published) {
            toast.dismiss();
            toast.error("This product is no longer available.");
          } else {
            dispatch(fetchProduct(id));
          }
        } else {
          // toast.error("Product not found.");
        }
      } catch (err) {
        console.error("Error fetching product details:", err);
        toast.error("Failed to load product details.");
      }
    };

    fetchProductDetails();
  }, [id, dispatch, navigate, db]);
  useEffect(() => {
    if (isGuestShared && productVendorId) {
      dispatch(activateQuickMode(productVendorId));
      // } else {
      //   dispatch(deactivateQuickMode());
    }
  }, [isGuestShared, productVendorId, dispatch]);
  useEffect(() => {
    if (product && product.variants) {
      const uniqueColors = Array.from(
        new Set(product.variants.map((v) => v.color)),
      );
      const uniqueSizes = Array.from(
        new Set(product.variants.map((v) => v.size)),
      );

      // Initialize state variables
      setAvailableColors(uniqueColors);
      setAvailableSizes(uniqueSizes);
      setSelectedColor("");
      setSelectedSize("");
    } else {
      // Reset state variables if product is null or undefined
      setAvailableColors([]);
      setAvailableSizes([]);
      setSelectedColor("");
      setSelectedSize("");
    }
  }, [product]);

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
  // useEffect(() => {
  //   if (product) {
  //     // Set initial images when the main product is loaded
  //     setAllImages(
  //       product.imageUrls?.length > 1
  //         ? [
  //             product.coverImageUrl,
  //             ...product.imageUrls.filter(
  //               (url) => url !== product.coverImageUrl
  //             ),
  //           ]
  //         : [product.coverImageUrl]
  //     );
  //   }
  // }, [product]);
  // useEffect(() => {
  //   if (product) {
  //     // Use imageUrls directly to align with hdImageUrls
  //     setAllImages(product.imageUrls || []);
  //     setHdImages(
  //       Array.isArray(product.hdImageUrls) ? product.hdImageUrls : []
  //     );
  //     setMainImage(product.coverImageUrl);
  //     setSelectedImage(product.coverImageUrl);
  //     setSubProducts(product.subProducts || []);
  //   }
  // }, [product]);
  // put this near the top, right after you pull `product` from redux
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
  useEffect(() => {
    if (typeof product?.wishCount === "number") setWishCount(product.wishCount);
  }, [product?.wishCount]);

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

const handleFavoriteToggle = async (e) => {
  e?.stopPropagation?.();

  const productId = product?.id;
  const vendorId = product?.vendorId;
  const uid = currentUser?.uid;

  if (!productId || !vendorId) return;

  // Prevent double taps causing double increments
  if (favBusyRef.current) return;
  favBusyRef.current = true;

  // Helper: optimistic UI count change
  const bumpUI = (delta) =>
    setWishCount((c) => Math.max(0, Number(c || 0) + delta));

  // Use current truth from context at click-time (not stale closure)
  const wasFavorite = isFavorite(productId);

  try {
    // ✅ Optimistic UI + favorites context
    if (wasFavorite) {
      removeFavorite(productId);
      bumpUI(-1);
    } else {
      addFavorite(product); // product already has id here
      bumpUI(1);
    }

    // Guest: keep it local only
    if (!uid) return;

    // ✅ Rate limit check (if this fails, we revert below)
    await handleUserActionLimit(
      uid,
      "favorite",
      {},
      {
        collectionName: "usage_metadata",
        writeLimit: 50,
        minuteLimit: 10,
        hourLimit: 80,
        dayLimit: 120,
      }
    );

    const favDocRef = doc(db, "users", uid, "favorites", productId);
    const vendorDocRef = doc(db, "vendors", vendorId);
    const productDocRef = doc(db, "products", productId);

    // We'll set this based on DB truth (not UI truth)
    let didLike = null;

    await runTransaction(db, async (tx) => {
      const [favSnap, vendorSnap, productSnap] = await Promise.all([
        tx.get(favDocRef),
        tx.get(vendorDocRef),
        tx.get(productDocRef),
      ]);

      const currentWish = Number(productSnap.data()?.wishCount || 0);
      const currentVendorLikes = Number(vendorSnap.data()?.likesCount || 0);

      if (favSnap.exists()) {
        // UNLIKE
        didLike = false;

        tx.delete(favDocRef);

        // clamp to 0 so it never goes negative
        if (productSnap.exists()) {
          tx.update(productDocRef, { wishCount: Math.max(0, currentWish - 1) });
        }
        if (vendorSnap.exists()) {
          tx.update(vendorDocRef, {
            likesCount: Math.max(0, currentVendorLikes - 1),
          });
        }
      } else {
        // LIKE
        didLike = true;

        tx.set(favDocRef, {
          productId,
          vendorId,
          name: product?.name || "",
          price: Number(product?.price || 0),
          createdAt: serverTimestamp(),
        });

        if (productSnap.exists()) {
          tx.update(productDocRef, { wishCount: currentWish + 1 });
        }
        if (vendorSnap.exists()) {
          tx.update(vendorDocRef, { likesCount: currentVendorLikes + 1 });
        }
      }
    });

    // ✅ Tracking (based on DB truth)
    if (didLike === true) {
      track(
        "product_like",
        {
          surface: "product_detail",
          productId,
          vendorId,
          priceShown: Number(displayPrice || product?.price || 0),
          currency: "NGN",
        },
        { surface: "product_detail" }
      );
    } else if (didLike === false) {
      track(
        "product_unlike",
        { surface: "product_detail", productId, vendorId },
        { surface: "product_detail" }
      );
    }
  } catch (err) {
    console.error("Error updating favorites:", err);

    // ✅ Revert optimistic UI
    if (wasFavorite) {
      addFavorite(product);
      bumpUI(1);
    } else {
      removeFavorite(productId);
      bumpUI(-1);
    }

    toast.error(err?.message || "Failed to update favorites. Please try again.");
  } finally {
    favBusyRef.current = false;
  }
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
  useEffect(() => {
    setSelectedSubProduct(null);
    setSelectedSwatchKey("");
    setSelectedColor("");
    setSelectedSize("");

    if (Array.isArray(product?.variants)) {
      setAvailableColors(
        Array.from(new Set(product.variants.map((v) => v.color))),
      );
      setAvailableSizes(
        Array.from(new Set(product.variants.map((v) => v.size))),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const nativeShareProduct = async () => {
    // ✅ mx link (same one you want)
    const shareableLink = `https://mx.shopmythrift.store/product/${id}?shared=true`;

    // ✅ same message as your copy function
    const message = `Hey, check out this item I saw on ${
      vendor?.shopName || "this store"
    }'s store on My Thrift: ${shareableLink}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: product?.name || "My Thrift product",
          text: message, // 👈 full message
          url: shareableLink, // 👈 mx link
        });

        return;
      }

      // fallback: copy the same message
      await navigator.clipboard.writeText(message);
      toast.success("Link copied!");
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

const handleMainProductClick = () => {
  setSelectedSubProduct(null);
  setSelectedSwatchKey("");
  setSelectedColor("");
  setSelectedSize("");

  const rawImages = (Array.isArray(product?.imageUrls) ? product.imageUrls : [])
    .map((u) => String(u || "").trim())
    .filter(Boolean);

  const cover = String(product?.coverImageUrl || "").trim();
  const images = rawImages.length ? rawImages : cover ? [cover] : [];

  setAllImages(images);

  // ✅ keep HD aligned to `images` (what you render)
  const rawHd = Array.isArray(product?.hdImageUrls) ? product.hdImageUrls : [];
  const singleHd = String(product?.hdImageUrl || "").trim() || null;

  const hd = images.map((_, i) => rawHd[i] || (i === 0 ? singleHd : null));
  setHdImages(hd);

  setCurrentImageIndex(0);
  setSelectedImage(images[0] || "");
  setMainImage(images[0] || "");

  // Reset available colors/sizes like you already do
  const mainColors = Array.from(new Set((product?.variants || []).map((v) => v.color)));
  const mainSizes = Array.from(new Set((product?.variants || []).map((v) => v.size)));
  setAvailableColors(mainColors);
  setAvailableSizes(mainSizes);
};

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
    dispatch(fetchProduct(id)).catch((err) => {
      console.error("Failed to fetch product:", err);
      toast.error("Failed to load product details.");
    });
  }, [dispatch, id]);
useEffect(() => {
  if (!product) return;
  const first =
    (Array.isArray(product.imageUrls) && product.imageUrls.find(Boolean)) ||
    product.coverImageUrl ||
    "";
  setMainImage(first);
  setInitialImage(first);
}, [product]);


  useEffect(() => {
    if (product && product.vendorId) {
      fetchVendorData(product.vendorId);
    }
  }, [product]);

  const fetchVendorData = async (vendorId) => {
    try {
      const vendorRef = doc(db, "vendors", vendorId);
      const vendorSnap = await getDoc(vendorRef);
      if (vendorSnap.exists()) {
        setVendor(vendorSnap.data());
      } else {
        console.error("Vendor not found");
      }
    } catch (err) {
      console.error("Error fetching vendor data:", err);
    } finally {
      setVendorLoading(false);
    }
  };

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

    basketRef.current?.openCheckoutAuth?.();
    setPendingBuyNow(false);
  }, [
    pendingBuyNow,
    quickMode,
    product?.vendorId,
    basketVendorId,
    checkoutCount,
  ]);
  const handleAddToCart = useCallback(
    (override = {}) => {
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

      // Ask for size / colour ONLY when it’s a fashion item
      if (isFashion) {
        if (!finalSize) return toast.error("Please select a size first!");
        if (!finalColor) return toast.error("Please select a color first!");
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

      if (existingCartItem) {
        dispatch(addToCart({ ...existingCartItem, quantity: finalQty }, true));
      } else {
        dispatch(addToCart(productToAdd, true));
      }

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
    ],
  );

  const handleOfferSubmitted = useCallback(() => {
    toastOfferSent({
      onAction: () => navigate("/offers"),
    });

    setOfferModalOpen(false);
  }, [navigate]);

  const handleSendQuestion = useCallback(async () => {
    console.log("[Q&A] send button clicked, questionText:", questionText);
    const q = questionText.trim();
    if (!q) {
      console.log("[Q&A] no text, aborting");
      return toast.error("Please enter a question.");
    }

    // Immediately show spinner/disable UI
    setIsSending(true);

    // 1) Enforce a daily limit of 3 questions
    try {
      await handleUserActionLimit(
        currentUser.uid,
        "askQuestion",
        {}, // no extra userData
        { dayLimit: 20 }, // cap at 3 per 24 hours
      );
    } catch (limitError) {
      // Rate limit hit: hide spinner and show error instantly
      setIsSending(false);
      return toast.error(limitError.message);
    }

    // build your object so you can inspect it
    const inquiryPayload = {
      productId: id,
      productName: product.name,
      vendorId: product.vendorId,
      customerId: currentUser.uid,
      question: q,
      status: "open",
      createdAt: serverTimestamp(),
      hasRead: false,
      customerHasRead: false,
      uid: currentUser.uid,
      email: currentUser.email,
    };

    console.log("[Q&A] payload to write:", inquiryPayload);

    try {
      console.log("[Q&A] writing to Firestore…");
      await addDoc(collection(db, "inquiries"), inquiryPayload);
      console.log("[Q&A] write succeeded");
      setIsAskModalOpen(false);
      setIsThankYouOpen(true);
    } catch (err) {
      console.error("[Q&A] write failed:", err);
      toast.error("Failed to send. Please try again.");
    } finally {
      console.log("[Q&A] send handler complete");
      setIsSending(false);
    }
  }, [questionText, id, product, currentUser, db]);

  const viewLoggedRef = useRef(new Set());
  const viewSignals = useProductViewQuality({
    enabled: isUser && !!product?.id && !!product?.vendorId,
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
  const handleIncreaseQuantity = useCallback(() => {
    console.log("Increase Quantity Triggered");
    console.log("Product:", product);
    console.log("Selected Size:", selectedSize);
    console.log("Selected Color:", selectedColor);
    console.log("Selected Sub-Product:", selectedSubProduct);
    console.log("Current Quantity:", quantity);

    if (!product) return console.error("Product not found.");

    // Fashion items still need size + colour picked
    if (isFashion && (!selectedSize || !selectedColor)) {
      return toast.error(
        "Please select a size and color before adjusting quantity.",
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

    dispatch(increaseQuantity({ vendorId: product.vendorId, productKey }));
    setQuantity(updatedQuantity);
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
  ]);

  const handleDecreaseQuantity = useCallback(() => {
    console.log("Decrease Quantity Triggered");
    console.log("Product:", product);
    console.log("Selected Size:", selectedSize);
    console.log("Selected Color:", selectedColor);
    console.log("Selected Sub-Product:", selectedSubProduct);
    console.log("Current Quantity:", quantity);

    if (!product) return console.error("Product not found.");

    if (isFashion && (!selectedSize || !selectedColor)) {
      return toast.error(
        "Please select a size and color before adjusting quantity.",
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

    dispatch(decreaseQuantity({ vendorId: product.vendorId, productKey }));
    setQuantity(updatedQuantity);
  }, [
    product,
    quantity,
    selectedSize,
    selectedColor,
    dispatch,
    cart,
    selectedSubProduct,
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
    if (!canAdjustQty) return toast.error("Please select size and color first");
    if (decDisabled) return;

    // if already in cart -> update cart
    if (isAddedToCart) return handleDecreaseQuantity();

    // before adding -> local state only
    setQuantity((q) => Math.max(1, q - 1));
  }, [canAdjustQty, decDisabled, isAddedToCart, handleDecreaseQuantity]);

  const handleQtyIncrease = useCallback(() => {
    if (!canAdjustQty) return toast.error("Please select size and color first");
    if (incDisabled) return;

    if (isAddedToCart) return handleIncreaseQuantity();
    setQuantity((q) => q + 1);
  }, [canAdjustQty, incDisabled, isAddedToCart, handleIncreaseQuantity]);

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

  const isSizeInStock = (sizeLike) => {
    const size = getSizeValue(sizeLike);

    if (!isFashion) return true;

    if (selectedSubProduct) {
      return (
        String(selectedSubProduct.size) === String(size) &&
        Number(selectedSubProduct.stock) > 0
      );
    }

    // ✅ KEY CHANGE: no color picked yet → never show “Out of Stock”
    const hasColorContext = Boolean(selectedColor || selectedSwatchKey);
    if (!hasColorContext) return true;

    // ✅ swatch-mode stock check (only after swatch selected)
    if (selectedSwatchKey) {
      return (variants || []).some(
        (v) =>
          String(v?.size) === String(size) &&
          normalizeColorKeyForSwatch(v?.color) === selectedSwatchKey &&
          Number(v?.stock) > 0,
      );
    }

    // ✅ raw-color mode (only after color selected)
    if (selectedColor) {
      const v = findVariant({ variants }, size, selectedColor);
      return !!v && Number(v?.stock) > 0;
    }

    return true;
  };

  const handleSizeClick = (size) => {
    if (!isSizeInStock(size)) return;
    viewSignals?.markVariantChange?.();
    if (selectedSize === size) {
      setSelectedSize("");
      // if main product swatch mode: clear raw color too
      if (!selectedSubProduct) setSelectedColor("");
      return;
    }

    setSelectedSize(size);

    // If main product swatch is chosen, resolve RAW DB color from the variant row
    if (!selectedSubProduct && selectedSwatchKey) {
      const match = (variants || []).find(
        (v) =>
          String(v?.size) === String(size) &&
          normalizeColorKeyForSwatch(v?.color) === selectedSwatchKey,
      );

      if (match?.color) {
        setSelectedColor(match.color); // ✅ RAW Firestore string
      }
    }
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

  const handleRemoveFromCart = useCallback(() => {
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

    dispatch(removeFromCart({ vendorId: product.vendorId, productKey }));
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
      const shareableLink = `https://mx.shopmythrift.store/product/${id}?shared=true`;

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

  const handleBuyNow = useCallback(() => {
    if (!product) return;

    // ✅ Require selection ONLY when variants exist (same as your UI)
    if (hasVariants && !selectedSubProduct) {
      if (!selectedSize) return toast.error("Please select a size first!");
      if (!selectedColor) return toast.error("Please select a color first!");
    }

    // ✅ stock guard (maxQty already matches your selection rules)
    const stock = Number(maxQty || 0);
    if (stock <= 0) return toast.error("This item is out of stock.");
    if (quantity > stock)
      return toast.error("Selected quantity exceeds stock availability!");

    // ✅ build cart payload (same as Add to Cart)
    const productToAdd = {
      ...product,
      quantity,
      selectedSize,
      selectedColor,
      selectedImageUrl: selectedImage,
      selectedSubProduct,
      subProductId: selectedSubProduct ? selectedSubProduct.subProductId : null,
    };

    const productKey = buildCartKey({
      vendorId: product.vendorId,
      productId: product.id,
      isFashion,
      selectedSize,
      selectedColor,
      subProductId: selectedSubProduct?.subProductId,
    });

    const existingCartItem = cart?.[product.vendorId]?.products?.[productKey];

    if (existingCartItem) {
      dispatch(addToCart({ ...existingCartItem, quantity }, true));
    } else {
      dispatch(addToCart(productToAdd, true));
    }

    setIsAddedToCart(true);
    track(
      "checkout_started",
      {
        surface: "product_detail",
        vendorId: product.vendorId,
        productId: product.id,
        qty: quantity,
        intent: "buy_now",
      },
      { surface: "product_detail" },
    );
    // ✅ QUICK MODE: use StoreBasket flow (auth + delivery)
    if (quickMode && product.vendorId === basketVendorId) {
      setPendingBuyNow(true);
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
    maxQty,
    isFashion,
  ]);
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

  try {
    viewSignals?.markHdLoad?.();

    // loadHd might be sync or async depending on your hook.
    // Awaiting it is safe either way.
    await Promise.resolve(loadHd(idx));
  } catch (err) {
    console.error("HD load failed:", err);

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
  if (!product?.published) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <Productnotofund />
        <h1 className="text-2xl font-opensans font-bold text-red-600 mb-2">
          Product Not Found
        </h1>
        <p className="text-lg text-gray-700 font-opensans mb-4">
          It looks like this product has been removed or unpublished by the
          vendor.
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

  const shouldShowAlikeProducts = subProducts && subProducts.length > 0;

  const AlikeProducts = () => (
    <div className="alike-products p-3 mt-1">
      <h2 className="text-lg font-semibold font-opensans mb-2">
        Similar Products
      </h2>
      <div className="flex gap-4 overflow-x-scroll">
        <div
          className="w-48 min-w-48 cursor-pointer"
          onClick={handleMainProductClick}
        >
          <div className="relative mb-2">
            <img
              src={mainImage} // Ensures this is always the main product image
              alt="Original image"
              className="h-52 w-full object-cover rounded-lg"
            />
          </div>
          <p className="text-sm font-opensans text-black font-normal">
            Original
          </p>
          <p className="text-lg font-opensans font-bold text-black">
            ₦{formatPrice(product.price)}
          </p>
          {product.discount &&
            product.discount.initialPrice &&
            product.discount.discountType !== "personal-freebies" && (
              <p className="text-sm font-opensans text-gray-500 line-through">
                ₦{formatPrice(product.discount.initialPrice)}
              </p>
            )}
        </div>

        {/* Map through Sub-Products */}
        {subProducts.map((subProduct, index) => {
          const isOutOfStock = subProduct.stock <= 0;

          return (
            <div
              key={index}
              className={`w-48 min-w-48 ${
                isOutOfStock
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer"
              }`}
              onClick={() => {
                if (!isOutOfStock) {
                  handleSubProductClick(subProduct);
                }
              }}
            >
              <div className="relative mb-2">
                <img
                  src={subProduct.images[0]}
                  alt={`Sub-product ${index + 1}`}
                  className="h-52 w-full object-cover rounded-lg"
                />
              </div>
              <p className="text-sm font-opensans text-black font-normal">
                {isOutOfStock ? "Out of Stock" : product.name}
              </p>
              <p className="text-lg font-opensans font-bold text-black">
                ₦{formatPrice(product.price)}
              </p>
              {product.discount &&
                product.discount.initialPrice &&
                product.discount.discountType !== "personal-freebies" && (
                  <p className="text-sm font-opensans text-gray-500 line-through">
                    ₦{formatPrice(product.discount.initialPrice)}
                  </p>
                )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <SEO
        title={product.name}
        description={product.description}
        image={product.coverImageUrl}
        url={`https://www.shopmythrift.store/product/${product.id}`}
      />
      <div className="relative px-2 pb-20">
        {/* --- IMAGE SWIPER SECTION --- */}

        <div
          ref={swiperRef}
          className="flex rounded-md justify-center mt-3 h-[500px] relative bg-gray-50"
        >
          {/* OVERLAY CONTROLS (Back Button) */}
         {/* OVERLAY CONTROLS (Back/Home Button) */}
          <div className="fixed top-5 left-4 z-[9000]">
            <button
              onClick={handleTopLeftBack}
              aria-label={isShared ? "Home" : "Back"}
              className={[
                "w-11 h-11 rounded-xl backdrop-blur-md flex items-center justify-center",
                "transition-all duration-200 active:scale-95",
                isSticky
                  ? "bg-black/25 opacity-70 shadow-none"
                  : "bg-black/50 opacity-100 shadow-sm",
              ].join(" ")}
            >
              {/* If shared, show Home icon, else show Back arrow */}
              {isShared ? (
                <LiaHomeSolid className="text-xl text-white" />
              ) : (
                <IoMdArrowBack className="text-xl text-white" />
              )}
            </button>
          </div>

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
                      <SafeImg
                        src={
                          loadedHd.has(index) && hdImages[index]
                            ? hdImages[index]
                            : image
                        }
                        alt={`${product.name} image ${index + 1}`}
                        className="object-cover rounded-xl w-full h-full"
                      />

                      {/* HD Loader */}
                      {loadingHd.has(index) && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                          <Oval
                            height={50}
                            width={50}
                            color="#f9531e"
                            secondaryColor="rgba(0,0,0,0.2)"
                            strokeWidth={4}
                            ariaLabel="loading"
                          />
                        </div>
                      )}

                      {/* HD Badge */}
                      {loadedHd.has(index) && hdImages[index] && (
                        <div className="absolute top-6 left-2 z-10">
                          <BsBadgeHdFill
                            className="text-white bg-black bg-opacity-40 p-1 rounded-full text-xl"
                            title="HD image"
                          />
                        </div>
                      )}

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

              <AskQuestionNudge
                variant="inline"
                onAskClick={() => {
                  if (!currentUser) {
                    navigate("/login", { state: { from: location.pathname } });
                  } else {
                    setIsAskModalOpen(true);
                    viewSignals?.markAskOpen?.();
                  }
                }}
              />
              <button
                onClick={() =>
                  toast("Report feature coming soon!", { icon: "⚠️" })
                }
                className="flex-shrink-0 flex items-center gap-1.5 bg-gray-100 px-4 py-2 rounded-full hover:bg-gray-200 transition-colors"
              >
                <IoFlagOutline className="text-black text-lg" />
                <span className="text-sm font-opensans font-medium text-black">
                  Report
                </span>
              </button>
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

                  {conditionText && <span>{conditionText}</span>}
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
          {showMakeOffer && (
            <div className="mt-4">
              <button
                onClick={() => {
                  if (!currentUser) {
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
                          const isSelected = selectedSwatchKey === sw.key;

                          return (
                            <button
                              key={sw.key + sw.label}
                              type="button"
                              onClick={() => {
                                viewSignals?.markVariantChange?.();
                                setSelectedSwatchKey((prev) => {
                                  const next = prev === sw.key ? "" : sw.key;

                                  setSelectedColor("");
                                  setSelectedSize("");

                                  if (!next) {
                                    // swatch cleared -> show all sizes
                                    const all = Array.from(
                                      new Set(
                                        (variants || [])
                                          .map((v) => v?.size)
                                          .filter(Boolean),
                                      ),
                                    );
                                    setAvailableSizes(all);
                                  } else {
                                    // swatch selected -> sizes for that swatch
                                    const sizesForSwatch = (variants || [])
                                      .filter(
                                        (v) =>
                                          normalizeColorKeyForSwatch(
                                            v?.color,
                                          ) === next,
                                      )
                                      .map((v) => v?.size)
                                      .filter(Boolean);

                                    setAvailableSizes(
                                      Array.from(new Set(sizesForSwatch)),
                                    );
                                  }

                                  return next;
                                });
                              }}
                              className="flex flex-col items-center shrink-0"
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
          {isFashion && (
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

          <AboutThisItem product={product} onOpenDefect={handleOpenModal} />

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
              onQuickFlow={() => setShowFastDrawer(true)}
            />
          )}

          <AnimatePresence>
            {isAskModalOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.8 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  onClick={() => setIsAskModalOpen(false)}
                  className="fixed inset-0 bg-black z-[8000]"
                />
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  onClick={(e) => e.stopPropagation()}
                  transition={{ type: "tween", duration: 0.3 }}
                  className="fixed bottom-0 left-0 h-60% right-0 z-[8100]  bg-white rounded-t-xl p-6 shadow-lg"
                >
                  <div>
                    <QuestionandA />
                  </div>
                  <h2 className="text-xl font-semibold font-ubuntu mb-2">
                    One-off question
                  </h2>
                  <p className="text-xs font-opensans text-gray-600 mb-4">
                    This is a single ask use it if you’re unsure of product
                    details or want to know more before buying. The vendor will
                    reply as soon as possible.
                  </p>

                  <label className="block text-xs font-medium font-opensans text-gray-700 mb-1">
                    Your email (We will send the response here)
                  </label>
                  <input
                    type="email"
                    value={currentUser.email}
                    readOnly
                    className="w-full mb-4 px-3 py-2 border font-opensans rounded bg-gray-100 text-sm"
                  />

                  <label className="block text-xs font-medium font-opensans text-gray-700 mb-1">
                    Ask question here
                  </label>
                  <textarea
                    rows={3}
                    placeholder="what do you wanna know?..."
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    maxLength={700}
                    className="w-full mb-4 px-3 py-2 border rounded resize-none font-opensans focus:outline-none text-base"
                  />

                  <div className="flex px-4 justify-center ">
                    <button
                      onClick={handleSendQuestion}
                      disabled={isSending}
                      className="px-4 py-2 bg-customOrange w-full font-opensans text-white rounded-full text-base font-semibold flex justify-center items-center"
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
                </motion.div>
              </>
            )}
          </AnimatePresence>
          <AddToCartVariantSheet
            open={addSheetOpen}
            onClose={() => setAddSheetOpen(false)}
            product={product}
            variants={variants}
            imageUrl={product?.coverImageUrl || selectedImage}
            title="Add to Cart"
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
            onConfirm={({ swatchKey, size, rawColor, qty }) => {
              // keep your UI in sync (robust)
              setSelectedSwatchKey(swatchKey);
              setSelectedSize(size);
              setSelectedColor(rawColor);
              setQuantity(qty);

              // call same Add To Cart behaviour
              // IMPORTANT: this will work best if handleAddToCart can accept overrides.
              handleAddToCart({ size, color: rawColor, qty });

              setAnimateCart(true);
              setAddSheetOpen(false);
            }}
          />

          <Modal
            isOpen={isOfferInfoOpen}
            onRequestClose={() => setOfferInfoOpen(false)}
            className="modal-content-offer"
            overlayClassName="offer-overlay backdrop-blur-md"
            ariaHideApp={false}
          >
            <div className="p-3 relative">
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
                    <span className="font-semibold">6 hours</span>.
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
          </Modal>
        </div>

        <RelatedProducts product={product} />
        <Modal
          isOpen={isThankYouOpen}
          onRequestClose={() => setIsThankYouOpen(false)}
          overlayClassName="fixed  inset-0 bg-black p-12 bg-opacity-50 z-[9000]"
          className="absolute inset-x-4 top-1/4   py-6 px-4 bg-white rounded-lg  shadow-lg"
          closeTimeoutMS={300}
          ariaHideApp={false}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="flex flex-col "
          >
            <div className="flex items-center  ">
              <FaSmileBeam className="text-xl mr-2 text-customRichBrown " />
              <h2 className="text-base font-medium font-opensans ">
                Message Sent!
              </h2>
            </div>
            <LiaTimesSolid
              onClick={() => setIsThankYouOpen(false)}
              className="absolute top-4 right-4"
            />
            <p className="text-sm mt-5 text-gray-800 font-opensans">
              <span className="text-customOrange font-medium">
                {vendorLoading ? (
                  /* make sure this loader renders inline or wrap it in a span */
                  <span className="inline-block">
                    <LoadProducts />
                  </span>
                ) : vendor ? (
                  /* use <span> instead of <div> */
                  <span>{vendor.shopName}</span>
                ) : (
                  /* use <span> instead of <p> */
                  <span className="text-xs text-gray-500">
                    Vendor information not available
                  </span>
                )}
              </span>{" "}
              has your question and will reply within 6 hours or less. Please
              check your spam folder if you don’t see their answer in your email
              inbox.
            </p>
          </motion.div>
        </Modal>

        <Modal
          isOpen={showModal}
          onRequestClose={handleCloseModal}
          contentLabel="Product Defect Details"
          ariaHideApp={false}
          className="modal-content-defect"
          overlayClassName="modal-overlay-defect"
        >
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
              By purchasing this product, you acknowledge the disclosed defects.{" "}
              By proceeding, you accept the product as-is.
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
        </Modal>
        <QuickAuthModal
          open={showQuickAuth}
          onClose={() => setShowQuickAuth(false)}
          onComplete={(user) => {
            setShowQuickAuth(false);
            setOfferModalOpen(true); // Open offer sheet after successful auth
          }}
          mergeCart={mergeCarts}
          openDisclaimer={openDisclaimer}
          headerText="Sign in to send an offer"
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

        <div
          className="fixed bottom-0 left-0 right-0 z-[8000] bg-white border-t border-gray-100 p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex w-full gap-3">
            <button
              onClick={() => {
                // If already in cart -> checkout
                if (isAddedToCart) {
                  // choose what your checkout route should be
                  // 1) cart page:
                  return navigate("/latest-cart", {
                    state: { fromProductDetail: true },
                  });
                }

                // If missing variant selection -> open modal (instead of toast)
                const needsModal =
                  hasVariants &&
                  !selectedSubProduct &&
                  (!selectedSize || !selectedColor);

                if (needsModal) return setAddSheetOpen(true);

                // Normal behaviour
                handleAddToCart();
                setAnimateCart(true);
              }}
              className="flex-1 h-12 rounded-lg bg-gray-100 text-gray-900 font-opensans font-medium shadow-sm active:scale-[0.98] transition-transform"
            >
              {isAddedToCart ? "View in Cart" : "Add to Cart"}
            </button>

            {/* Buy Now (UNCHANGED) */}
            <button
              onClick={() => {
                handleBuyNow();
              }}
              className="flex-1 h-12 rounded-lg bg-customOrange text-white font-opensans font-medium shadow-sm active:scale-[0.98] transition-transform"
            >
              Buy Now
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductDetailPage;
