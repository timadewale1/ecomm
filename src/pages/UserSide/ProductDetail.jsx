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
import { TbInfoOctagon } from "react-icons/tb";
import { TbInfoTriangle } from "react-icons/tb";
import LoadProducts from "../../components/Loading/LoadProducts";
import { GoChevronLeft, GoChevronRight } from "react-icons/go";
import { LuCopyCheck, LuCopy } from "react-icons/lu";
import toast from "react-hot-toast";
import Modal from "react-modal";
import { FiPlus } from "react-icons/fi";
import { buildCartKey } from "../../services/cartKey";
import { FiMinus } from "react-icons/fi";
import { TbSquareRoundedCheck } from "react-icons/tb";
import Badge from "../../components/Badge/Badge";
import { MdCancel, MdOutlineCancel, MdOutlineClose } from "react-icons/md";
import "swiper/css/free-mode";
import { TbFileDescription } from "react-icons/tb";
import "swiper/css/autoplay";
import { useLocation } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import Select from "react-select";
import "swiper/css";
import { Oval, RotatingLines } from "react-loader-spinner";
import StoreBasket from "../../components/QuickMode/StoreBasket";

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
import IkImage from "../../services/IkImage";
import SEO from "../../components/Helmet/SEO";
import QuestionandA from "../../components/Loading/QuestionandA";
import { LiaTimesSolid } from "react-icons/lia";
import { handleUserActionLimit } from "../../services/userWriteHandler";
import SafeImg from "../../services/safeImg";
import { RiHeart3Fill, RiHeart3Line } from "react-icons/ri";
import { useFavorites } from "../../components/Context/FavoritesContext";
import { BsBadgeHdFill } from "react-icons/bs";
import { HiOutlineShoppingBag } from "react-icons/hi";
import { FcShop } from "react-icons/fc";
import { BiInfoCircle, BiSolidOffer } from "react-icons/bi";

import OfferSheet from "../../components/Offers/OfferModal";
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
        })
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
      interval
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

  const [isOfferInfoOpen, setOfferInfoOpen] = useState(false);

  const [vendor, setVendor] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [availableColors, setAvailableColors] = useState([]);
  const [availableSizes, setAvailableSizes] = useState([]);
  const [selectedVariantStock, setSelectedVariantStock] = useState(0);
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

  const [hdImages, setHdImages] = useState([]);
  const [loadedHd, setLoadedHd] = useState(new Set());
  const [loadingHd, setLoadingHd] = useState(new Set());
  const loadHd = useHdLoader(
    hdImages,
    loadedHd,
    setLoadedHd,
    loadingHd,
    setLoadingHd
  );
  const handleOpenModal = () => setShowModal(true);
  const handleCloseModal = () => setShowModal(false);
  const db = getFirestore();

  const isGuestShared = isShared && !currentUser;
  const cart = useSelector((state) => state.cart || {});
  const [showHeader, setShowHeader] = useState(true);
  const prevScrollPos = useRef(0);
  // put with other constants
  const OFFER_SENT_ONCE_KEY = "mythrift_offer_sent_once_v1";

  // put with other state
  const [offerSentModalOpen, setOfferSentModalOpen] = useState(false);

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
        new Set(product.variants.map((v) => v.color))
      );
      const uniqueSizes = Array.from(
        new Set(product.variants.map((v) => v.size))
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
  const isStockpileForThisVendor = useMemo(() => {
    return isActive && vendorId === product?.vendorId;
  }, [isActive, vendorId, product?.vendorId]);
  useEffect(() => {
    if (product) {
      // Set initial images when the main product is loaded
      setAllImages(
        product.imageUrls?.length > 1
          ? [
              product.coverImageUrl,
              ...product.imageUrls.filter(
                (url) => url !== product.coverImageUrl
              ),
            ]
          : [product.coverImageUrl]
      );
    }
  }, [product]);
  useEffect(() => {
    if (product) {
      // Use imageUrls directly to align with hdImageUrls
      setAllImages(product.imageUrls || []);
      setHdImages(
        Array.isArray(product.hdImageUrls) ? product.hdImageUrls : []
      );
      setMainImage(product.coverImageUrl);
      setSelectedImage(product.coverImageUrl);
      setSubProducts(product.subProducts || []);
    }
  }, [product]);
  // put this near the top, right after you pull `product` from redux
  const isFashion = product?.isFashion; // boolean – AddProduct already writes it

  const variants = React.useMemo(
    () => (Array.isArray(product?.variants) ? product.variants : []),
    [product]
  );

  useEffect(() => {
    if (product && selectedSize && selectedColor) {
      // Generate product key based on whether it's a sub-product or a variant
      const productKey = buildCartKey({
        vendorId: product.vendorId,
        productId: product.id,
        isFashion,
        selectedSize,
        selectedColor,
        subProductId: selectedSubProduct?.subProductId,
      });
      console.log("Checking cart for productKey:", productKey);

      // Check if the item exists in the cart
      const existingCartItem = cart?.[product.vendorId]?.products?.[productKey];

      if (existingCartItem) {
        setIsAddedToCart(true);
        setQuantity(existingCartItem.quantity);
        setAnimateCart(true);
        console.log("Product found in cart:", existingCartItem);
      } else {
        setIsAddedToCart(false);
        setQuantity(1);
        setAnimateCart(false);
        console.log("Product not found in cart for productKey:", productKey);
      }
    }
  }, [cart, product, selectedSize, selectedColor, selectedSubProduct]);

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
    setSelectedColor(subProduct.color);
    setSelectedSize(subProduct.size);
    setAllImages(subProduct.images || []);
    setAvailableColors([subProduct.color]);
    setHdImages([]);
    setLoadedHd(new Set());
    setLoadingHd(new Set());
    setAvailableSizes([subProduct.size]);
  };

  // Optimistic UI: Toggle heart immediately, then do Firestore + rate-limit checks in background
  const handleFavoriteToggle = async (e) => {
    e.stopPropagation();

    // 1) Save old state so we can revert if something fails
    const wasFavorite = favorite;

    // 2) Immediately toggle local state (optimistic update)
    if (favorite) {
      removeFavorite(product.id);
    } else {
      addFavorite(product);
    }

    // 3) If user not logged in => we do local only, done
    if (!currentUser) {
      return;
    }

    // 4) If user is logged in => enforce rate limit, then Firestore
    try {
      // Rate limit check
      await handleUserActionLimit(
        currentUser.uid,
        "favorite",
        {},
        {
          collectionName: "usage_metadata",
          writeLimit: 50, // universal writes/hour
          minuteLimit: 10, // 10 favorites/min
          hourLimit: 80, // 80 favorites/hour
          dayLimit: 120, // 120 favorites/day
        }
      );

      // Firestore doc references
      const favDocRef = doc(
        db,
        "users",
        currentUser.uid,
        "favorites",
        product.id
      );
      const vendorDocRef = doc(db, "vendors", product.vendorId);

      if (wasFavorite) {
        // Previously was a favorite => means user wants to remove it
        await deleteDoc(favDocRef);
        // Do nothing to the vendor's likesCount so it never decrements
      } else {
        // Previously not favorite => means user wants to add it
        await setDoc(favDocRef, {
          productId: product.id,
          vendorId: product.vendorId, // Store vendor ID here
          name: product.name,
          price: product.price,
          createdAt: new Date(),
        });
        // Increment vendor's likesCount
        await updateDoc(vendorDocRef, { likesCount: increment(1) });
      }
    } catch (err) {
      console.error("Error updating favorites:", err);

      // 5) Revert the local favorite state if there's an error
      if (wasFavorite) {
        // If it was a favorite, we re-add it because we optimistically removed it
        addFavorite(product);
      } else {
        // If it was not a favorite, we remove it because we optimistically added it
        removeFavorite(product.id);
      }

      // Show user the error
      toast.error(
        err.message || "Failed to update favorites. Please try again."
      );
    }
  };

  const handleDotClick = (index) => {
    setCurrentImageIndex(index);
    const swiperInstance = document.querySelector(".swiper").swiper;
    swiperInstance.slideTo(index);
  };
  const basketRef = useRef(null);
  const vendorCartProducts = useSelector(
    (s) => s.cart?.[productVendorId]?.products || {}
  );
  const checkoutCount = useMemo(
    () =>
      Object.values(vendorCartProducts).reduce(
        (sum, p) => sum + (p.quantity || 0),
        0
      ),
    [vendorCartProducts]
  );
  /* NGN currency with two decimals */
  const NGN = (n) =>
    Number(n || 0).toLocaleString("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  useEffect(() => {
    if (product && product.variants) {
      const uniqueSizes = Array.from(
        new Set(product.variants.map((v) => v.size))
      );
      setAvailableSizes(uniqueSizes); // Show all sizes initially
    }
  }, [product]);
  useEffect(() => {
    if (product && product.variants) {
      const uniqueColors = Array.from(
        new Set(product.variants.map((v) => v.color))
      );
      const uniqueSizes = Array.from(
        new Set(product.variants.map((v) => v.size))
      );

      setAvailableColors(uniqueColors);
      setAvailableSizes(uniqueSizes);
      setSelectedColor("");
      setSelectedSize("");
    } else {
      setAvailableColors([]);
      setAvailableSizes([]);
      setSelectedColor("");
      setSelectedSize("");
    }
  }, [product]);

  const handleMainProductClick = () => {
    setSelectedSubProduct(null);
    setSelectedImage(mainImage);
    setSelectedColor("");
    setSelectedSize("");

    // Reset available colors and sizes to the main product’s variants
    const mainColors = Array.from(
      new Set(product.variants.map((v) => v.color))
    );
    const mainSizes = Array.from(new Set(product.variants.map((v) => v.size)));

    setAvailableColors(mainColors);
    setAvailableSizes(mainSizes);

    setAllImages(
      product.imageUrls?.length > 1
        ? [
            product.coverImageUrl,
            ...product.imageUrls.filter((url) => url !== product.coverImageUrl),
          ]
        : [product.coverImageUrl]
    );
  };

  // Automatically select color if only one is available

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
    if (product) {
      setMainImage(product.coverImageUrl);
      setInitialImage(product.coverImageUrl);
    }
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

  const handleAddToCart = useCallback(() => {
    console.log("Add to Cart Triggered");
    console.log("Product:", product);
    console.log("Selected Size:", selectedSize);
    console.log("Selected Color:", selectedColor);
    console.log("Selected Sub-Product:", selectedSubProduct);
    console.log("Quantity:", quantity);

    if (!product) {
      console.error("Product is missing. Cannot add to cart.");
      return;
    }

    // Ask for size / colour ONLY when it’s a fashion item
    if (isFashion) {
      if (!selectedSize) return toast.error("Please select a size first!");
      if (!selectedColor) return toast.error("Please select a color first!");
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
        selectedSize,
        selectedColor
      );
      if (!matchingVariant) {
        toast.error("Selected variant is not available!");
        console.error(
          "Matching variant not found for selected size and color."
        );
        return;
      }
      maxStock = matchingVariant.stock;
    } else {
      maxStock = Number(product.stockQuantity ?? product.stock ?? 1);
    }

    if (quantity > maxStock) {
      toast.error("Selected quantity exceeds stock availability!");
      return;
    }
    /* ---------- /determine stock ---------- */

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
    console.log("Generated productKey in add:", productKey);

    const existingCartItem = cart?.[product.vendorId]?.products?.[productKey];

    if (existingCartItem) {
      dispatch(addToCart({ ...existingCartItem, quantity }, true));
    } else {
      dispatch(addToCart(productToAdd, true));
    }

    setIsAddedToCart(true);
    toast.success(
      isStockpileForThisVendor
        ? `${product.name} added to Pile!`
        : `Added ${product.name} to cart!`
    );
  }, [
    product,
    quantity,
    selectedSize,
    selectedColor,
    selectedSubProduct,
    dispatch,
    selectedImage,
    cart,
  ]);
  const handleOfferSubmitted = useCallback(() => {
    // only show once on this device
    const seen = localStorage.getItem(OFFER_SENT_ONCE_KEY);
    if (!seen) {
      setOfferSentModalOpen(true);
      localStorage.setItem(
        OFFER_SENT_ONCE_KEY,
        JSON.stringify({ seen: true, ts: Date.now() })
      );
    } else {
      console.log("Offer sent!");
    }
    // close the offer sheet if still open
    setOfferModalOpen(false);
  }, []);

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
        { dayLimit: 20 } // cap at 3 per 24 hours
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
  const uid = currentUser?.uid ?? null;
  const priceLock = usePriceLock(db, uid, product?.id);

  // Derive the price to show
  const effectivePrice = priceLock?.effectivePrice
    ? Number(priceLock.effectivePrice)
    : null;
  const displayPrice = effectivePrice ?? Number(product?.price || 0);
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
        "Please select a size and color before adjusting quantity."
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
        selectedColor
      );
      if (!matchingVariant) {
        toast.error("Selected variant is not available!");
        console.error(
          "Matching variant not found for selected size and color."
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
        "Please select a size and color before adjusting quantity."
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

  const formatPrice = (price) => {
    return price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const capitalizeFirstLetter = (color) => {
    return color.charAt(0).toUpperCase() + color.slice(1).toLowerCase();
  };

  // Check if a color is available for the selected size
  const isColorAvailableForSize = (color) => {
    return variants.some(
      (variant) => variant.size === selectedSize && variant.color === color
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
    0
  );
  // Handle color selection

  const updateSizes = (color) => {
    const uniqueSizesForColor = Array.from(
      new Set(
        product.variants
          .filter((variant) => variant.color === color)
          .map((variant) => variant.size)
      )
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
        Array.from(new Set(product.variants.map((variant) => variant.size)))
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

  // Function to check if a specific size has stock for the selected color
  const isSizeInStock = (size) => {
    // Everyday items (no variants) don’t gate on size at all
    if (!isFashion) return true;

    // Sub-product path
    if (selectedSubProduct) {
      return selectedSubProduct.size === size && selectedSubProduct.stock > 0;
    }

    // Regular fashion variant path
    if (selectedColor) {
      const matchingVariant = findVariant({ variants }, size, selectedColor);
      return matchingVariant && matchingVariant.stock > 0;
    }
    return true;
  };

  const handleSizeClick = (size) => {
    if (!isSizeInStock(size)) {
      console.log("Size clicked is out of stock:", size);
      return;
    }

    if (selectedSize === size) {
      setSelectedSize("");
      console.log("Size deselected:", size);
    } else {
      setSelectedSize(size);
      console.log("Size selected:", size);
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
      (variant) => variant.color === selectedColor && variant.size === size
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
    toast.success(`${product.name} removed from cart!`);
  }, [
    dispatch,
    product,
    selectedSize,
    selectedColor,
    selectedSubProduct,
    isFashion,
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
  const hasVariants = Boolean(
    isFashion && Array.isArray(product?.variants) && product.variants.length > 0
  );
  const copyProductLink = async () => {
    try {
      const shareableLink = `https://mx.shopmythrift.store/product/${id}?shared=true`;

      await navigator.clipboard.writeText(
        `Hey, check out this item I saw on ${vendor.shopName}'s store on My Thrift: ${shareableLink}`
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
          onClick={() => navigate("/newhome")} // Navigate to /newhome on click
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
          onClick={() => navigate("/newhome")} // Navigate to the homepage
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
      <div className="relative pb-20">
        <div>
          {isGuestShared ? (
            <>
              <div
                className={`px-2 fixed top-0 left-0 w-full h-20 py-10 bg-white z-20 shadow-md`}
              >
                <div className="flex items-center justify-between h-full">
                  <div className="w-full ">
                    {/* LEFT: logo */}

                    <div className="flex items-center justify-between">
                      <img
                        src="/newlogo.png"
                        alt="Logo"
                        onClick={() => navigate("/newhome")}
                        className="h-8 w-16 object-contain"
                      />

                      <div className="flex items-center mr-2 space-x-0 relative">
                        <button
                          className={`w-10 h-10 translate-x-1 rounded-full backdrop-blur-md flex items-center justify-center`}
                          onClick={copyProductLink}
                        >
                          {isLinkCopied ? (
                            <LuCopyCheck className="text-xl" />
                          ) : (
                            <LuCopy className="text-xl" />
                          )}
                        </button>

                        {/* Favorite Icon */}
                        <button
                          className="w-10 h-10 rounded-full -translate-x-1 backdrop-blur-md flex items-center justify-center"
                          onClick={handleFavoriteToggle}
                        >
                          <motion.div
                            // whenever `favorite` is true we run this keyframe pop
                            animate={
                              favorite ? { scale: [1, 1.3, 1] } : { scale: 1 }
                            }
                            transition={{
                              duration: 0.4,
                              ease: "easeOut",
                              // you can swap this for a spring:
                              // type: "spring", stiffness: 300, damping: 20
                            }}
                          >
                            {favorite ? (
                              <RiHeart3Fill className="text-red-500 text-2xl" />
                            ) : (
                              <RiHeart3Line className="text-black text-2xl" />
                            )}
                          </motion.div>
                        </button>

                        {!quickMode && (
                          <button
                            className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center`}
                            onClick={() =>
                              navigate("/latest-cart", {
                                state: { fromProductDetail: true },
                              })
                            }
                          >
                            <PiShoppingCartBold className="text-xl" />
                            {cartItemCount > 0 && (
                              <div className="top-1 absolute right-1">
                                <Badge count={cartItemCount} />
                              </div>
                            )}
                          </button>
                        )}
                        {productVendorId && (
                          <button
                            onClick={() =>
                              navigate(`/store/${productVendorId}?shared=true`)
                            }
                            className="bg-transparent border border-customRichBrown text-customRichBrown px-2 py-1.5 rounded-full font-opensans text-xs flex items-center gap-2"
                          >
                            <FcShop className="text-sm" />
                            View Store
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div
                className={` fixed top-0 left-0 w-full h-20 py-10 z-20 bg-white shadow-sm`}
              >
                <div className="flex items-center justify-between h-full">
                  {/* your existing “back + title” on the left */}
                  <div className="flex items-center">
                    <button
                      onClick={() => navigate(-1)}
                      className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center`}
                    >
                      <GoChevronLeft className="text-xl" />
                    </button>

                    <span className={`text-lg font-opensans font-semibold`}>
                      Details
                    </span>
                  </div>

                  {/* your existing copy/cart on the right */}
                  <div className="flex items-center mr-2 space-x-0 relative">
                    <button
                      className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center`}
                      onClick={copyProductLink}
                    >
                      {isLinkCopied ? (
                        <LuCopyCheck className="text-xl" />
                      ) : (
                        <LuCopy className="text-xl" />
                      )}
                    </button>

                    {/* Favorite Icon */}
                    <button
                      className="w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center"
                      onClick={handleFavoriteToggle}
                    >
                      <motion.div
                        // whenever `favorite` is true we run this keyframe pop
                        animate={
                          favorite ? { scale: [1, 1.3, 1] } : { scale: 1 }
                        }
                        transition={{
                          duration: 0.4,
                          ease: "easeOut",
                          // you can swap this for a spring:
                          // type: "spring", stiffness: 300, damping: 20
                        }}
                      >
                        {favorite ? (
                          <RiHeart3Fill className="text-red-500 text-2xl" />
                        ) : (
                          <RiHeart3Line className="text-black text-2xl" />
                        )}
                      </motion.div>
                    </button>
                    {/* {quickMode && productVendorId && (
                      <button
                        className="relative px-4 py-2 rounded-full border border-gray-300 backdrop-blur-md flex items-center justify-center"
                        onClick={() => {
                          if (productVendorId === basketVendorId) {
                            basketRef.current?.openCheckoutAuth();
                          } else {
                            navigate("/latest-cart");
                          }
                        }}
                        aria-label="Checkout"
                      >
                        <span className="text-sm font-opensans  font-medium">Checkout</span>
                        
                      </button>
                    )} */}
                    {!quickMode && (
                      <button
                        className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center`}
                        onClick={() =>
                          navigate("/latest-cart", {
                            state: { fromProductDetail: true },
                          })
                        }
                      >
                        <PiShoppingCartBold className="text-xl" />
                        {cartItemCount > 0 && (
                          <div className="top-1 absolute right-1">
                            <Badge count={cartItemCount} />
                          </div>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div
          ref={swiperRef}
          className={`flex rounded-t-md justify-center h-[540px] relative mt-20`}
        >
          {allImages.length > 1 ? (
            <>
              <Swiper
                modules={[FreeMode, Autoplay]}
                pagination={{ clickable: true }}
                autoplay={{
                  delay: 7500,
                  disableOnInteraction: false,
                }}
                className="product-images-swiper"
                preventClicks={true}
                preventClicksPropagation={true}
                onSlideChange={(swiper) =>
                  setCurrentImageIndex(swiper.activeIndex)
                }
              >
                {allImages.map((image, index) => (
                  <SwiperSlide key={index}>
                    <div
                      className="relative w-full h-full"
                      onDoubleClick={() => loadHd(index)}
                      onTouchEnd={makeDoubleTap(() => loadHd(index))}
                    >
                      <SafeImg
                        src={
                          loadedHd.has(index) && hdImages[index]
                            ? hdImages[index]
                            : image
                        }
                        alt={`${product.name} image ${index + 1}`}
                        className="object-cover w-full h-full"
                      />
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
                      {loadedHd.has(index) && hdImages[index] && (
                        <div className="absolute top-6 left-2 z-10">
                          <BsBadgeHdFill
                            className="text-white bg-black bg-opacity-40 p-1 rounded-full text-xl"
                            title="HD image"
                          />
                        </div>
                      )}
                      {showHdHint && index === 0 && <HdHintOverlay />}
                      {/* Discount Badge inside each slide */}
                      {index === 0 && product.discount && (
                        <div className="absolute top-2 right-2 z-20">
                          {product.discount.discountType.startsWith(
                            "personal-freebies"
                          ) ? (
                            <div className="bg-customPink text-customOrange text-xs px-2 py-1.5 font-opensans font-medium rounded">
                              {product.discount.freebieText}
                            </div>
                          ) : (
                            <div className="bg-customPink text-customOrange text-xs px-2 py-1.5 font-opensans font-medium rounded">
                              -{product.discount.percentageCut}%
                            </div>
                          )}
                        </div>
                      )}
                      {index === 0 && product.defectDescription && (
                        <div
                          onClick={handleOpenModal}
                          className="px-3 w-28 py-1 absolute bg-opacity-40 bottom-16 right-2 bg-black rounded-md cursor-pointer"
                        >
                          <p className="text-[10px]  text-white font-opensans">
                            Tap to view defect description
                          </p>
                        </div>
                      )}
                      <div className="absolute bottom-12 left-2 bg-white bg-opacity-40 px-2 py-1 rounded-lg shadow-md flex items-center space-x-2">
                        <p className="text-xs font-opensans text-gray-700">
                          Still not sure?
                        </p>
                        <button
                          onClick={() => {
                            if (!currentUser) {
                              navigate("/login", {
                                state: { from: location.pathname },
                              });
                            } else {
                              setIsAskModalOpen(true);
                            }
                          }}
                          className="text-xs font-semibold font-opensans text-customOrange hover:underline focus:outline-none"
                        >
                          Ask a question
                        </button>
                      </div>
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>

              {/* Dot Indicators */}
              <div className="absolute bottom-4 z-10 w-full flex justify-center">
                {allImages.map((_, index) => (
                  <div
                    key={index}
                    className={`cursor-pointer mx-1 rounded-full transition-all duration-300 ${
                      index === currentImageIndex
                        ? "bg-customOrange h-3 w-3"
                        : "bg-gray-300 h-2 w-2"
                    }`}
                    onClick={() => handleDotClick(index)}
                  ></div>
                ))}
              </div>
            </>
          ) : (
            // Single image fallback
            <>
              <div
                className="relative w-full h-full"
                onDoubleClick={() => loadHd(0)}
                onTouchEnd={makeDoubleTap(() => loadHd(0))}
              >
                <IkImage
                  src={
                    loadedHd.has(0) && hdImages[0] ? hdImages[0] : allImages[0]
                  }
                  alt={`${product.name} image`}
                  className="object-cover w-full h-full rounded-b-lg"
                />
                {loadingHd.has(0) && (
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
                {loadedHd.has(0) && hdImages[0] && (
                  <div className="absolute top-6 left-2 z-10">
                    <BsBadgeHdFill
                      className="text-white bg-black bg-opacity-40 p-1 rounded-full text-xl"
                      title="HD image"
                    />
                  </div>
                )}
                {showHdHint && <HdHintOverlay />}
              </div>
              {product.discount && (
                <div className="absolute top-10 right-2 ">
                  {product.discount.discountType.startsWith(
                    "personal-freebies"
                  ) ? (
                    <div className="bg-customPink text-customOrange text-xs px-2 py-1.5 font-opensans font-medium rounded">
                      {product.discount.freebieText}
                    </div>
                  ) : (
                    <div className="bg-customPink text-customOrange text-xs px-2 py-1.5 font-opensans font-medium rounded">
                      -{product.discount.percentageCut}%
                    </div>
                  )}
                </div>
              )}
              {product.defectDescription && (
                <div
                  onClick={handleOpenModal}
                  className="px-3 w-28 py-1 absolute bg-opacity-40 bottom-16 right-2 bg-black rounded-md cursor-pointer"
                >
                  <p className="text-xs text-white font-opensans truncate">
                    {product.defectDescription.slice(0, 20)} ...
                  </p>
                  <span className="text-[10px]  text-white font-opensans">
                    Tap to view defect
                  </span>
                </div>
              )}

              <div className="absolute bottom-4 left-2 bg-white bg-opacity-60 px-2 py-1 rounded-lg shadow-md flex items-center space-x-2">
                <p className="text-xs font-opensans text-gray-700">
                  Still not sure?
                </p>
                <button
                  onClick={() => {
                    if (!currentUser) {
                      navigate("/login", {
                        state: { from: location.pathname },
                      });
                    } else {
                      setIsAskModalOpen(true);
                    }
                  }}
                  className="text-xs font-semibold font-opensans text-customOrange hover:underline focus:outline-none"
                >
                  Ask a question
                </button>
              </div>
            </>
          )}
        </div>

        <div className="px-3 mt-2">
          <div className="flex items-center justify-between">
            <h1 className="text-sm font-opensans text-black font-normal ">
              {product.name}
            </h1>
            <div className="">
              {product.condition &&
              product.condition.toLowerCase().includes("defect") ? (
                <div className="flex  items-center mt-2">
                  <TbInfoTriangle className="text-red-500   cursor-pointer" />
                  <p className="ml-2 text-xs font-opensans text-red-500">
                    {product.condition.replace(/:$/, "")}
                  </p>
                </div>
              ) : product.condition.toLowerCase() === "brand new" ? (
                <div className="flex items-center mt-2">
                  <TbSquareRoundedCheck className="text-green-700" />
                  <p className="ml-2 text-xs font-opensans text-green-700">
                    Brand New
                  </p>
                </div>
              ) : product.condition.toLowerCase() === "thrift" ? (
                <div className="flex items-center mt-2">
                  <TbSquareRoundedCheck className="text-yellow-500" />
                  <p className="ml-2 text-xs font-opensans text-yellow-500">
                    Thrift
                  </p>
                </div>
              ) : null}
            </div>
          </div>
          {/* MAIN price */}
          <p className="text-2xl font-opensans items-center flex font-semibold text-black">
            {NGN(displayPrice)}{" "}
            {effectivePrice && (
              <button
                type="button"
                onClick={() => setOfferInfoOpen(true)}
                className=" ml-2 inline-flex  items-center gap-1 text-[9px] underline font-opensans  text-customOrange"
              >
                <BiInfoCircle className="text-base" />
              </button>
            )}
          </p>
          {/* Offer is active – info link */}

          {/* PREVIOUS price row (animated, same style as before) */}
          {(() => {
            const prevs = [];

            // when there’s a locked/accepted price, show the regular product price as a reference
            if (effectivePrice) {
              prevs.push(NGN(Number(product.price || 0)));
            }

            // show discount initial price (if not a personal freebie)
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
                className="mt-0.5 block" // keeps it on the line below
                itemClassName="text-lg font-opensans text-gray-500 line-through"
              />
            );
          })()}

          {vendorLoading ? (
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
          )}
          {isFashion && availableColors.length > 0 && (
            <div className="mt-3">
              <label
                htmlFor="color-select"
                className="text-sm font-semibold text-black font-opensans mb-2 block"
              >
                Color
              </label>

              <Select
                // 1) Transform `availableColors` into an array of { label, value } objects
                options={availableColors.map((color) => ({
                  label: capitalizeFirstLetter(color),
                  value: color,
                }))}
                // 2) If `selectedColor` is a string, convert it to an object
                value={
                  selectedColor
                    ? {
                        label: capitalizeFirstLetter(selectedColor),
                        value: selectedColor,
                      }
                    : null
                }
                onChange={(selectedOption) => {
                  const selectedValue = selectedOption.value;
                  setSelectedColor(selectedValue);

                  // Update sizes for the selected color
                  const sizesForColor = product.variants
                    .filter((variant) => variant.color === selectedValue)
                    .map((variant) => variant.size);
                  setAvailableSizes(Array.from(new Set(sizesForColor)));

                  setSelectedSize(""); // Reset the selected size
                }}
                placeholder="Select"
                // 3) Style it similarly to your Product Type select
                className="w-[109px] font-opensans text-sm"
                classNamePrefix="custom-select"
                isSearchable={false}
                styles={{
                  control: (provided, state) => ({
                    ...provided,
                    height: "2rem", // h-12
                    borderColor: state.isFocused ? "#f9531e" : "#D1D5DB", // Use the `state` parameter
                    borderRadius: "0.5rem", // rounded-lg
                    fontFamily: "Open Sans, sans-serif",
                    fontSize: "0.75rem", // text-sm
                    color: "black",
                    paddingLeft: "0.75rem", // px-4
                  }),
                  input: (provided) => ({
                    ...provided,
                    fontFamily: "Open Sans, sans-serif",
                    fontSize: "1rem",
                    color: "black",
                  }),
                  placeholder: (provided) => ({
                    ...provided,
                    fontFamily: "Open Sans, sans-serif",
                    fontSize: "1rem",
                    color: "#6B7280", // text-gray-500
                  }),
                }}
              />
            </div>
          )}
          {/* Size Selection */}
          {isFashion && (
            <div className="mt-3">
              <p className="text-sm font-semibold text-black font-opensans mb-2">
                Sizes
              </p>
              <div className="flex flex-wrap gap-2">
                {availableSizes.map((size, index) => {
                  const inStock = isSizeInStock(size);
                  const isSelected = selectedSize === size && inStock;

                  return (
                    <div
                      key={index}
                      onClick={() => {
                        if (inStock) {
                          handleSizeClick(size);
                        }
                      }}
                      className={`relative py-2 px-4 border rounded-lg ${
                        isSelected
                          ? "bg-customOrange text-white cursor-pointer"
                          : inStock
                          ? "bg-transparent text-black cursor-pointer"
                          : "bg-gray-200 text-black opacity-50 cursor-not-allowed"
                      }`}
                      style={{ position: "relative" }}
                    >
                      <span className="text-xs font-opensans font-semibold">
                        {size}
                      </span>
                      {!inStock && (
                        <span
                          className="absolute inset-0 animate-pulse flex items-center justify-center bg-gray-800 bg-opacity-50  text-customOrange font-opensans font-semibold text-xs text-center rounded-lg"
                          style={{
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 10,
                            pointerEvents: "none", // Prevents clicks on out-of-stock items
                          }}
                        >
                          Out of Stock
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div
            className="flex items-center mt-5 mb-2 cursor-pointer"
            onClick={() => setIsModalOpen(true)}
          >
            {/* Left label */}
            <span className="text-black text-md font-opensans whitespace-nowrap">
              Product Details
            </span>

            {/* Vertical divider */}
            <span className="mx-2 h-4 border-r border-gray-300" />

            {/* Truncated description */}
            <span className="text-xs text-gray-600 truncate font-opensans max-w-[140px]">
              {product.description?.slice(0, 20)}...
            </span>

            {/* Arrow icon */}
            <GoChevronRight className="ml-auto text-2xl" />
          </div>
          {quickMode && product?.vendorId === basketVendorId && (
            <StoreBasket
              vendorId={basketVendorId}
              quickMode
              ref={basketRef}
              onQuickFlow={() => setShowFastDrawer(true)}
            />
          )}
          <Modal
            isOpen={isModalOpen}
            onRequestClose={() => setIsModalOpen(false)}
            className="modal-content"
            overlayClassName="modal-overlay backdrop-blur-md"
          >
            <div className="p-2 relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 bg-rose-100 flex justify-center items-center rounded-full">
                    <TbFileDescription className="text-customRichBrown" />
                  </div>
                  <h2 className="font-opensans text-base font-semibold">
                    Product Description
                  </h2>
                </div>
                <MdOutlineClose
                  onClick={() => setIsModalOpen(false)}
                  className="absolute top-2 right-2 text-gray-600 cursor-pointer text-2xl"
                />
              </div>{" "}
              <p className="text-gray-600 mt-2 font-opensans text-sm">
                {product.description}
              </p>
            </div>
          </Modal>
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

        {shouldShowAlikeProducts && (
          <>
            <div className="border-t-8 border-gray-100 mt-4"></div>
            <AlikeProducts />
          </>
        )}

        <div className="border-t-8 border-gray-100 mt-4"></div>

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
        <AnimatePresence>
          {offerSentModalOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setOfferSentModalOpen(false)}
                className="fixed inset-0 bg-black z-[8000]"
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 280, damping: 25 }}
                className="fixed bottom-0 left-0 right-0 z-[8100] bg-white h-[35vh] rounded-t-2xl p-4"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
              >
                <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-3" />
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 bg-rose-100 flex justify-center items-center rounded-full">
                    <BiSolidOffer className="text-customRichBrown" />
                  </div>
                  <h2 className="font-opensans text-base font-semibold">
                    Offer sent
                  </h2>
                </div>

                <p className="text-sm mt-6 text-gray-800 font-opensans mb-4">
                  Your offer has been sent. We’ll notify you when the vendor
                  responds. Please check your spam folder if you don’t see their
                  answer in your email inbox.
                </p>
                <li className="text-sm  text-gray-800 font-opensans mb-4">
                  If you need help,{" "}
                  <button
                    id="contact-support-tab"
                    onClick={openChat}
                    className="text-customOrange underline"
                  >
                    contact support
                  </button>
                  .
                </li>
                <div className="absolute left-0 right-0 bottom-4 flex justify-center">
                  <button
                    onClick={() => {
                      setOfferSentModalOpen(false);
                      navigate("/offers");
                    }}
                    className="px-6 py-2 bg-customOrange text-white font-opensans rounded-full font-semibold"
                  >
                    Go to My Offers
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

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
          className="fixed bottom-0 left-0 right-0 z-50 p-3 flex justify-between items-center"
          style={{
            background:
              "linear-gradient(to top, white, rgba(255,255,255,0.85) 55%, rgba(255,255,255,0) 99%)",
            zIndex: 8000,
          }}
          onClick={(e) => e.stopPropagation()} // Prevents background clicks from propagating
        >
          {isAddedToCart ? (
            // Quantity controls (unchanged)
            <div
              className={`flex w-full justify-between transition-all duration-500 ease-in-out transform ${
                animateCart
                  ? "translate-x-0 opacity-100"
                  : "translate-x-full opacity-0"
              }`}
            >
              <button
                onClick={handleRemoveFromCart}
                className="text-black font-opensans mr-4 bg-gray-100 rounded-full h-14 w-52 text-md font-bold"
              >
                Remove
              </button>
              <div className="flex space-x-4 items-center">
                <button
                  onClick={handleDecreaseQuantity}
                  className="flex items-center justify-center w-12 h-12 opacity-40 bg-customOrange text-white text-3xl rounded-full"
                >
                  <FiMinus />
                </button>
                <span className="font-opensans font-semibold text-lg">
                  {quantity}
                </span>
                <button
                  onClick={handleIncreaseQuantity}
                  className="flex items-center justify-center w-12 h-12 bg-customOrange text-white text-3xl rounded-full"
                >
                  <FiPlus />
                </button>
              </div>
            </div>
          ) : isBrandNewCondition ? (
            // BRAND NEW: single full-width rounded button (if fashion and no size/color -> prompt)
            isFashion && (!selectedSize || !selectedColor) ? (
              <button
                onClick={() => {
                  toast.error("Please select size and color");
                }}
                className="bg-customOrange text-white h-12 rounded-full font-opensans font-semibold w-full transition-all duration-300 ease-in-out"
              >
                {isStockpileForThisVendor ? "Add to Pile" : "Add to Cart"}
              </button>
            ) : (
              <button
                onClick={() => {
                  handleAddToCart();
                  setAnimateCart(true); // Trigger the animation
                }}
                className="bg-customOrange text-white h-12 rounded-full font-opensans font-semibold w-full transition-all duration-300 ease-in-out"
              >
                {isStockpileForThisVendor ? "Add to Pile" : "Add to Cart"}
              </button>
            )
          ) : showMakeOffer ? (
            // THRIFT or DEFECT: show Make Offer + Add to Cart (side-by-side)
            <div className="flex w-full gap-2">
              <button
                onClick={() => {
                  if (!currentUser) {
                    setShowQuickAuth(true);
                    return;
                  }
                  setOfferModalOpen(true);
                }}
                className="flex-1 h-12 rounded-full border border-gray-300 bg-white text-black font-opensans font-semibold transition-all duration-300 ease-in-out"
              >
                Make an offer
              </button>

              <button
                onClick={() => {
                  if (isFashion && (!selectedSize || !selectedColor)) {
                    return toast.error("Please select size and color first");
                  }
                  handleAddToCart();
                  setAnimateCart(true);
                }}
                className={`flex-1 h-12 rounded-full font-opensans font-semibold text-white transition-all duration-300 ease-in-out ${
                  isFashion && (!selectedSize || !selectedColor)
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-customOrange"
                }`}
              >
                {isStockpileForThisVendor ? "Add to Pile" : "Add to Cart"}
              </button>
            </div>
          ) : // DEFAULT: single full-width Add to Cart (same style as brand new)
          isFashion && (!selectedSize || !selectedColor) ? (
            <button
              onClick={() => {
                toast.error("Please select size and color");
              }}
              className="bg-customOrange text-white h-12 rounded-full font-opensans font-semibold w-full transition-all duration-300 ease-in-out"
            >
              {isStockpileForThisVendor ? "Add to Pile" : "Add to Cart"}
            </button>
          ) : (
            <button
              onClick={() => {
                handleAddToCart();
                setAnimateCart(true);
              }}
              className="bg-customOrange text-white h-12 rounded-full font-opensans font-semibold w-full transition-all duration-300 ease-in-out"
            >
              {isStockpileForThisVendor ? "Add to Pile" : "Add to Cart"}
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default ProductDetailPage;
