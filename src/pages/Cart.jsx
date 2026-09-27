import React, { useEffect, useCallback, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  removeFromCart,
  clearCart,
  increaseQuantity,
  decreaseQuantity,
} from "../redux/actions/action";
import { LiaTimesSolid } from "react-icons/lia";
import { FaPlus, FaMinus, FaTimes } from "react-icons/fa";
import {
  exitStockpileMode,
  fetchStockpileData,
} from "../redux/reducers/stockpileSlice";
import { RiDeleteBinLine } from "react-icons/ri";
import { HiOutlineChatBubbleOvalLeft } from "react-icons/hi2";
import IframeModal from "../components/PwaModals/PushNotifsModal";
import { RiDeleteBin7Line } from "react-icons/ri";
import { TfiCommentAlt } from "react-icons/tfi";
import toast from "react-hot-toast";
import {
  getDoc,
  doc,
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase.config";
import { appHaptics } from "../services/haptics";
import usePriceLockExpiryClock from "../custom-hooks/usePriceLockExpiryClock";
import { resolveEffectiveUnitPrice } from "../services/priceLocks";
import EmptyCart from "../components/Loading/EmptyCart";
import { useAuth } from "../custom-hooks/useAuth";
import { CiLogin } from "react-icons/ci";
import { useNavigate, useLocation } from "react-router-dom";
import {
  GoChevronUp,
  GoChevronRight,
  GoDotFill,
} from "react-icons/go";
import Loading from "../components/Loading/Loading";
import { HiOutlineBuildingStorefront } from "react-icons/hi2";
import { BiMessageDetail } from "react-icons/bi";
import { fetchAndMergeCart } from "../services/cartMerge";
import QuickAuthModal from "../components/PwaModals/AuthModal";
import { BsPlus } from "react-icons/bs";
import { Bars, RotatingLines } from "react-loader-spinner";
import SEO from "../components/Helmet/SEO";
import { ImSad2 } from "react-icons/im";
import {
  MdCancel,
  MdClose,
  MdOutlineSchedule,
  MdVerified,
} from "react-icons/md";
import { IoMdClose } from "react-icons/io";
import { CiCircleInfo } from "react-icons/ci";
import IkImage from "../services/IkImage";
import { LuDot } from "react-icons/lu";
import { track } from "../services/signals";
import "./cart-note-modal.css";
import AppPageHeader from "../components/layout/AppPageHeader";
import AppBottomSheet from "../components/layout/AppBottomSheet";
import { isVariantSizeHidden } from "../services/productVariantSelection";
import { cartOwnerKey } from "../services/cartPersistence";
import { pendingAuthIntent, takeAuthIntent } from "../services/authIntent";
import {
  isMarketplaceProductEligible,
  isMarketplaceVendorEligible,
} from "../services/marketplaceVisibility";
import {
  getStockpileOrderMembership,
  STOCKPILE_ORDER_MEMBERSHIP,
} from "../services/stockpileOrderStatus";
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

const sameEntityId = (left, right) =>
  left !== null &&
  left !== undefined &&
  right !== null &&
  right !== undefined &&
  String(left) === String(right);

const Cart = () => {
  const cart = useSelector((state) => state.cart || {});
  const cartSync = useSelector((state) => state.cartSync);
  const dispatch = useDispatch();
  const [showHeadsUp, setShowHeadsUp] = useState(false);

  const handleDismiss = () => {
    // Hide the alert and save preference to local storage
    setShowHeadsUp(false);
    localStorage.setItem("cart_reservation_dismissed", "true");
  };
  const navigate = useNavigate();
  const { currentUser, loading } = useAuth();
  const expectedCartOwner = cartOwnerKey(currentUser?.uid);
  const cartIsHydrating =
    cartSync?.ownerKey !== expectedCartOwner || !cartSync?.hydrated;
  const [selectedVendorId, setSelectedVendorId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [vendorNotes, setVendorNotes] = useState({});
  const [vendorsInfo, setVendorsInfo] = useState({});
  const location = useLocation();
  const [checkoutLoading, setCheckoutLoading] = useState({});
  const [showExitStockpileModal, setShowExitStockpileModal] = useState(false);
  // Separate from `pendingVendorForCheckout`, which belongs to the auth flow.
  // This vendor is held while an active repile customer decides whether to
  // leave repile mode and continue with a different store.
  const [pendingCheckoutVendor, setPendingCheckoutVendor] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const authResumeHandledRef = useRef(false);
  const requestCheckoutRef = useRef(null);
  const [authCheckoutResume, setAuthCheckoutResume] = useState(null);
  const [pendingVendorForCheckout, setPendingVendorForCheckout] =
    useState(null);
  const {
    pileOrders,
    loading: stockpileLoading,
  } = useSelector((state) => state.stockpile);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const [disclaimerUrl, setDisclaimerUrl] = useState("");
  const { isActive, vendorId: stockpileVendorId } = useSelector(
    (state) => state.stockpile,
  );
  const [showNoteBadge, setShowNoteBadge] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const [authTransitioning, setAuthTransitioning] = useState(false);

  const vendorIds = Object.keys(cart);
  const firstVendorId = vendorIds.length > 0 ? vendorIds[0] : null;
  const [locksByProduct, setLocksByProduct] = useState({});
  const [liveProductPrices, setLiveProductPrices] = useState({});
  const cartValidationRunRef = useRef(0);
  const priceLockNow = usePriceLockExpiryClock(locksByProduct);

  useEffect(() => {
    // no user → no locks
    if (!currentUser?.uid) {
      setLocksByProduct({});
      return;
    }

    const q = query(
      collection(db, "priceLocks"),
      where("buyerId", "==", currentUser.uid),
      where("state", "==", "active"),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const map = {};
        snap.forEach((d) => {
          const data = d.data();
          // one lock per (buyer, product) — we key by productId for O(1) lookups
          map[data.productId] = data;
        });
        setLocksByProduct(map);
      },
      (err) => {
        console.error("priceLocks onSnapshot error:", err);
        setLocksByProduct({});
      },
    );

    return () => unsub();
  }, [currentUser?.uid, db]);

  useEffect(() => {
    if (!localStorage.getItem("deliveryNoteBadgeShown") && firstVendorId) {
      setShowNoteBadge(true);
      setIsVisible(true);
      localStorage.setItem("deliveryNoteBadgeShown", "true");

      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [firstVendorId]);
  useEffect(() => {
    // Check if the user has already dismissed this message
    const isDismissed = localStorage.getItem("cart_reservation_dismissed");
    if (!isDismissed) {
      setShowHeadsUp(true);
    }
  }, []);
  const handleClose = () => {
    setIsVisible(false);
  };

  const formatPrice = (price) => {
    if (typeof price !== "number" || isNaN(price)) return "0.00";
    return price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  const mergeCartFor = async (uid) => {
    const res = await fetchAndMergeCart(db, uid, dispatch);
    return res; // { mergedCart, addedByVendor, conflicts }
  };
  useEffect(() => {
    if (
      isActive &&
      sameEntityId(selectedVendorId, stockpileVendorId) &&
      currentUser
    ) {
      dispatch(
        fetchStockpileData({
          userId: currentUser.uid,
          vendorId: selectedVendorId,
        }),
      );
    }
  }, [selectedVendorId, isActive, stockpileVendorId, currentUser, dispatch]);

  const checkCartProducts = useCallback(async () => {
    const validationRun = ++cartValidationRunRef.current;
    const nextLivePrices = {};

    try {
      const vendorIds = Object.keys(cart);

      for (const vendorId of vendorIds) {
        const vendor = cart[vendorId];

        try {
          const vendorDoc = await getDoc(doc(db, "vendors", vendorId));
          const liveVendor = vendorDoc.exists() ? vendorDoc.data() : null;
          if (!isMarketplaceVendorEligible(liveVendor)) {
            const synced = await dispatch(clearCart(vendorId));
            if (!synced) {
              console.warn("Cart vendor removal is pending cloud sync", {
                vendorId,
              });
            }
            toast.dismiss();
            toast("Items from this store are not currently available.", {
              icon: "ℹ️",
            });
            continue;
          }
        } catch (error) {
          // A temporary network failure must not destroy a valid cart. The
          // checkout callable performs the final server-side eligibility gate.
          console.error(`Error validating vendor ${vendorId}:`, error);
        }

        for (const productKey in vendor.products) {
          const product = vendor.products[productKey];
          if (!product || !product.id) {
            console.error(
              `Invalid product found for key ${productKey}:`,
              product,
            );
            await dispatch(removeFromCart({ vendorId, productKey }));
            continue;
          }

          const { id } = product;

          try {
            const productDoc = await getDoc(doc(db, `products`, id));
            if (!productDoc.exists()) {
              await dispatch(removeFromCart({ vendorId, productKey }));
              toast.dismiss();
              toast(
                `Product ${product.name} has been removed as it is no longer available.`,
                { icon: "ℹ️" },
              );
            } else {
              const productData = productDoc.data();
              const livePrice = Number(productData.price);
              nextLivePrices[id] = Number.isFinite(livePrice)
                ? livePrice
                : Number(product.price || 0);

              if (!isMarketplaceProductEligible(productData)) {
                await dispatch(removeFromCart({ vendorId, productKey }));
                toast.dismiss();
                toast(`${product.name} is not currently available.`, {
                  icon: "ℹ️",
                });
              }
            }
          } catch (err) {
            console.error(`Error fetching product ${id}:`, err);
            nextLivePrices[id] = Number(product.price || 0);
          }
        }
      }

      if (validationRun === cartValidationRunRef.current) {
        setLiveProductPrices(nextLivePrices);
      }
    } catch (error) {
      console.error("Error checking cart products:", error);
      toast.error(
        "An error occurred while validating your cart. Please try again.",
      );
    }
  }, [cart, dispatch]);
  const getVendorName = (vendorId) =>
    cart?.[vendorId]?.vendorName || vendorsInfo?.[vendorId]?.shopName || null;

  const logRemoveFromCart = (vendorId, product, meta = {}) => {
    if (!product?.id) return;

    track(
      "remove_from_cart",
      {
        vendorId,
        vendorName: getVendorName(vendorId),

        productId: product.id,
        productName: product.name || null,

        quantity: Number(product.quantity ?? 1),
        unitPrice: Number(product.price ?? 0),
        effectiveUnitPrice: Number(getEffectiveUnitPrice(product) ?? 0),

        selectedSize: product.selectedSize || product.size || null,
        selectedColor: product.selectedColor || product.color || null,

        reason: meta.reason || "remove_single",
      },
      {
        surface: meta.surface || "cart",
        path: `${location.pathname}${location.search || ""}`,
      },
    );
  };

  const logClearVendorCart = (vendorId) => {
    const vendorProducts = Object.values(cart?.[vendorId]?.products || {});
    if (!vendorProducts.length) return;

    track(
      "remove_from_cart",
      {
        vendorId,
        vendorName: getVendorName(vendorId),
        reason: "clear_vendor_cart",

        productCount: vendorProducts.length,
        productIds: vendorProducts.map((p) => p.id).filter(Boolean),

        // optional: total value of what was cleared (effective prices)
        totalEffective: vendorProducts.reduce(
          (sum, p) =>
            sum +
            Number(getEffectiveUnitPrice(p) || 0) * Number(p.quantity ?? 1),
          0,
        ),
      },
      {
        surface: "cart",
        path: `${location.pathname}${location.search || ""}`,
      },
    );
  };

  const fromProductDetail = location.state?.fromProductDetail || false;
  useEffect(() => {
    const fetchVendorInfo = async () => {
      try {
        // Build a unique set of IDs: whatever’s in the cart plus the stockpile vendor
        const ids = new Set(
          [...Object.keys(cart), stockpileVendorId].filter(Boolean),
        );

        const newVendorsInfo = { ...vendorsInfo };

        for (const vendorId of ids) {
          // only fetch if we don’t already have it
          if (!newVendorsInfo[vendorId]) {
            const vendorDoc = await getDoc(doc(db, "vendors", vendorId));
            if (vendorDoc.exists()) {
              newVendorsInfo[vendorId] = vendorDoc.data();
            } else {
              console.warn(`Vendor with ID ${vendorId} does not exist.`);
            }
          }
        }

        setVendorsInfo(newVendorsInfo);
      } catch (error) {
        console.error("Error fetching vendor info:", error);
      }
    };

    fetchVendorInfo();
  }, [cart, stockpileVendorId]);

  useEffect(() => {
    if (!cartIsHydrating && cart && Object.keys(cart).length > 0) {
      checkCartProducts();
    } else {
      cartValidationRunRef.current += 1;
      setLiveProductPrices({});
    }
  }, [cart, cartIsHydrating, checkCartProducts]);

  const handleRemoveFromCart = useCallback(
    async (vendorId, productKey, meta = {}) => {
      const product = cart?.[vendorId]?.products?.[productKey];
      if (!product) return;

      // ✅ log BEFORE dispatch so we still have product data
      logRemoveFromCart(vendorId, product, meta);

      const syncPromise = dispatch(removeFromCart({ vendorId, productKey }));
      appHaptics.removeFromCart();
      toast(`Removed ${product.name} from cart!`, { icon: "ℹ️" });
      // Persistence remains queued/retried in the background. The optimistic
      // removal toast above is sufficient feedback; avoid a duplicate sync
      // implementation-detail toast when the device is offline.
      await syncPromise;
    },
    [cart, dispatch],
  );

  const NGN = (n) =>
    Number(n || 0).toLocaleString("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    });
  const getEffectiveUnitPrice = useCallback(
    (product) => {
      const lock = product?.id ? locksByProduct[product.id] : null;
      return resolveEffectiveUnitPrice({
        product,
        lock,
        basePrice: product?.id ? liveProductPrices[product.id] : undefined,
        now: priceLockNow,
      }).unitPrice;
    },
    [liveProductPrices, locksByProduct, priceLockNow],
  );
  const openProduct = (productId) => {
    if (!productId) return;
    setIsModalOpen(false);
    navigate(`/product/${productId}`, { state: { from: "cart" } });
  };

  const handleCartCardClick = (vendorId) => {
    const products = Object.values(cart?.[vendorId]?.products || {});
    if (!products.length) return;

    if (products.length === 1) {
      openProduct(products[0].id);
    } else {
      handleViewSelection(vendorId); // opens modal
    }
  };

  const handleClearSelection = async (vendorId) => {
    const confirmClear = window.confirm(
      `Are you sure you want to clear the cart?`,
    );
    if (confirmClear) {
      const syncPromise = dispatch(clearCart(vendorId));
      appHaptics.warning();
      toast.success(`Cleared cart for ${cart[vendorId].vendorName}!`);
      setIsModalOpen(false);

      setVendorNotes((prevNotes) => {
        const updatedNotes = { ...prevNotes };
        delete updatedNotes[vendorId];
        return updatedNotes;
      });

      // The success toast above is the complete user-facing feedback. The
      // persistence layer retains and retries an offline write silently.
      await syncPromise;
    }
  };
  const openDisclaimer = (path) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    const abs = `${window.location.origin}${path}`;
    setDisclaimerUrl(abs);
    setShowDisclaimerModal(true);
  };
  const handleCheckout = async (
    vendorId,
    authUser = currentUser,
    { skipRepileGuard = false } = {},
  ) => {
    const vendorCart = cart[vendorId];
    if (!vendorCart || Object.keys(vendorCart.products).length === 0) {
      toast.error("No products to checkout for this vendor.");
      return;
    }

    /* ───── 1 – Auth guard ───── */
    if (!authUser) {
      setPendingVendorForCheckout(vendorId);
      setAuthOpen(true);
      return;
    }

    /* ───── 2 – Email verified? ───── */
    /* ───── 2 – Email verified? (password-only) ───── */
    const providers = (authUser.providerData || []).map((p) => p.providerId);
    // true if user has any OAuth provider
    const hasOAuthProvider = providers.some((p) =>
      [
        "google.com",
        "twitter.com",
        "facebook.com",
        "apple.com",
        "github.com",
      ].includes(p),
    );
    const needsEmailVerification = !hasOAuthProvider && !authUser.emailVerified;

    if (needsEmailVerification) {
      toast.error("Please verify your email before proceeding to checkout.");
      return;
    }

    /* ───── 3 – Stockpile exit guard ───── */
    if (
      !skipRepileGuard &&
      isActive &&
      !sameEntityId(vendorId, stockpileVendorId)
    ) {
      setCheckoutLoading((prev) => ({ ...prev, [vendorId]: false }));
      // Avoid stacking this decision over Review Order/Review Pile. Competing
      // sheet focus/body locks can present as a blank surface in the iOS
      // WebView.
      setIsModalOpen(false);
      setIsNoteModalOpen(false);
      setPendingCheckoutVendor(vendorId);
      setShowExitStockpileModal(true);
      void appHaptics.warning();
      return;
    }

    // A repile conflict is a decision, not a network operation. Only show the
    // Checkout loader after that decision has been resolved so the button can
    // never get trapped behind the disclaimer.
    setCheckoutLoading((prev) => ({ ...prev, [vendorId]: true }));

    /* ───── 4 – Profile completeness check ───── */
    let profileComplete = authUser.profileComplete;
    let userLocation = authUser.location;

    if (profileComplete === undefined || userLocation === undefined) {
      try {
        const userDoc = await getDoc(doc(db, "users", authUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          profileComplete = userData.profileComplete;
          userLocation = userData.location;
        }
      } catch (error) {
        console.error("Error fetching user profile from Firestore:", error);
        toast.error("We couldn't check your account details. Please try again.");
        setCheckoutLoading((prev) => ({ ...prev, [vendorId]: false }));
        return;
      }
    }

    if (!profileComplete) {
      toast.error(
        "Please complete your profile before proceeding to checkout.",
      );
      navigate("/account-info", {
        state: {
          highlightIncomplete: true,
          returnTo: `${location.pathname}${location.search || ""}`,
        },
      });
      setCheckoutLoading((prev) => ({ ...prev, [vendorId]: false }));
      return;
    }
    if (
      typeof userLocation?.lat !== "number" ||
      typeof userLocation?.lng !== "number"
    ) {
      toast.error("Please update your delivery address before checking out.");
      navigate("/account-info", {
        state: {
          highlightIncomplete: true,
          returnTo: `${location.pathname}${location.search || ""}`,
        },
      });
      setCheckoutLoading((prev) => ({ ...prev, [vendorId]: false }));
      return;
    }

    /* ───── 5 – Vendor active? ───── */
    try {
      const vendorDocRef = doc(db, "vendors", vendorId);
      const vendorDocSnap = await getDoc(vendorDocRef);

      if (!vendorDocSnap.exists()) {
        toast.error("Vendor not found.");
        setCheckoutLoading((prev) => ({ ...prev, [vendorId]: false }));
        return;
      }
      if (!isMarketplaceVendorEligible(vendorDocSnap.data())) {
        toast.error("This store is not currently available.");
        setCheckoutLoading((prev) => ({ ...prev, [vendorId]: false }));
        return;
      }
    } catch (error) {
      console.error("Error checking vendor status:", error);
      toast.error("Unable to proceed with checkout at this time.");
      setCheckoutLoading((prev) => ({ ...prev, [vendorId]: false }));
      return;
    }

    /* ───── 6 – Out-of-stock scan ───── */
    const outOfStockItems = [];
    try {
      for (const productKey in vendorCart.products) {
        const product = vendorCart.products[productKey];
        const productRef = doc(db, "products", product.id);
        const productDoc = await getDoc(productRef);

        if (!productDoc.exists()) {
          console.warn(`Product with ID ${product.id} not found.`);
          continue;
        }
        const productData = productDoc.data();

        if (product.subProductId) {
          const sp = productData.subProducts?.find(
            (p) => p.subProductId === product.subProductId,
          );
          if (!sp || sp.stock < product.quantity)
            outOfStockItems.push(product.name);
        } else if (product.selectedColor && product.selectedSize) {
          const variant = productData.variants?.find(
            (v) =>
              v.color === product.selectedColor &&
              v.size === product.selectedSize,
          );
          if (!variant || variant.stock < product.quantity)
            outOfStockItems.push(
              `${product.name} (${product.selectedColor}, ${product.selectedSize})`,
            );
        } else if (
          (typeof productData.stockQuantity === "number" &&
            productData.stockQuantity < product.quantity) ||
          (typeof productData.stock === "number" &&
            productData.stock < product.quantity)
        ) {
          outOfStockItems.push(product.name);
        }
      }
    } catch (error) {
      console.error("Error checking cart stock before checkout:", error);
      toast.error("We couldn't check this order right now. Please try again.");
      setCheckoutLoading((prev) => ({ ...prev, [vendorId]: false }));
      return;
    }

    if (outOfStockItems.length) {
      toast.error(`Out of stock: ${outOfStockItems.join(", ")}`);
      setCheckoutLoading((prev) => ({ ...prev, [vendorId]: false }));
      return;
    }

    /* ───── 7 – Navigate to checkout ───── */
    const note = vendorNotes[vendorId]
      ? encodeURIComponent(vendorNotes[vendorId])
      : "";
    navigate(`/newcheckout/${vendorId}?note=${note}`);
    setCheckoutLoading((prev) => ({ ...prev, [vendorId]: false }));
  };
  const requestCheckout = (
    vendorId,
    authUser = currentUser,
    options = undefined,
  ) => {
    void handleCheckout(vendorId, authUser, options).catch((error) => {
      console.error("Checkout could not be started:", error);
      setCheckoutLoading((prev) => ({ ...prev, [vendorId]: false }));
      toast.error("We couldn't start checkout. Please try again.");
    });
  };
  requestCheckoutRef.current = requestCheckout;

  useEffect(() => {
    if (!currentUser?.uid) {
      authResumeHandledRef.current = false;
      return;
    }
    if (authResumeHandledRef.current || !currentUser?.uid) return;
    const pending = pendingAuthIntent();
    if (
      pending?.type !== "cart-checkout" ||
      pending.returnTo?.split(/[?#]/)[0] !== location.pathname
    ) return;
    const vendorId = pending.payload?.vendorId;
    const vendorCart = vendorId ? cart[vendorId] : null;
    if (!vendorCart || !Object.keys(vendorCart.products || {}).length) return;

    const intent = takeAuthIntent({
      types: "cart-checkout",
      pathname: location.pathname,
    });
    if (!intent) return;
    authResumeHandledRef.current = true;
    setPendingVendorForCheckout(null);
    requestCheckoutRef.current?.(vendorId, currentUser);
  }, [cart, currentUser?.uid, location.pathname]);

  useEffect(() => {
    if (!authCheckoutResume || cartIsHydrating) return;
    const vendorId = authCheckoutResume.vendorId;
    const vendorCart = vendorId ? cart[vendorId] : null;
    if (!vendorCart || !Object.keys(vendorCart.products || {}).length) return;

    setAuthCheckoutResume(null);
    setAuthTransitioning(false);
    requestCheckoutRef.current?.(
      vendorId,
      authCheckoutResume.user || currentUser,
    );
  }, [authCheckoutResume, cart, cartIsHydrating, currentUser]);
  const toTitleCase = (str = "") =>
    String(str)
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  const getConditionLabel = (cond) => {
    const raw = String(cond || "")
      .replace(/:$/, "")
      .trim();
    if (!raw) return "Very good"; // fallback

    // If stored like "Thrift: Very good" -> show "Very good"
    const label = raw.includes(":") ? raw.split(":").pop().trim() : raw;

    return toTitleCase(label);
  };
  const handleAuthComplete = async (user, completedMerge = null) => {
    // Show a clear “working” state as we merge + maybe open modal or navigate
    setAuthTransitioning(true);
    setAuthOpen(false); // close the auth modal immediately

    let mergeMeta = completedMerge;
    if (!mergeMeta) {
      try {
        mergeMeta = await mergeCartFor(user.uid);
      } catch (mergeError) {
        // The owner-scoped local cart remains usable and the persistence queue
        // retries later. Never expose background sync state as a cart toast.
        console.warn("Cart merge will retry after sign-in:", mergeError);
      }
    }

    const vendorId = pendingVendorForCheckout;
    setPendingVendorForCheckout(null);
    if (!vendorId) {
      setAuthTransitioning(false);
      return;
    }

    // The cart merge dispatch has completed, but this render can still hold
    // the pre-auth cart closure. Resume from an effect after Redux renders the
    // merged cart so checkout never validates stale products.
    setAuthCheckoutResume({vendorId, user});
  };
  const calculateVendorTotal = (vendorId) => {
    const vendorCart = cart[vendorId]?.products || {};
    return Object.values(vendorCart).reduce(
      (total, product) =>
        total +
        getEffectiveUnitPrice(product) * Number(product.quantity || 1),
      0,
    );
  };
  const formatColorText = (color) => {
    if (!color) return "";
    return color.charAt(0).toUpperCase() + color.slice(1).toLowerCase();
  };

  const calculateTotal = () => {
    return Object.keys(cart).reduce(
      (total, vendorId) => total + calculateVendorTotal(vendorId),
      0,
    );
  };

  const handleViewSelection = (vendorId) => {
    setShowNoteBadge(false);
    setSelectedVendorId(vendorId);
    setIsModalOpen(true);
    if (
      currentUser?.uid &&
      isActive &&
      sameEntityId(vendorId, stockpileVendorId)
    ) {
      // Reopening the same pile must still observe a vendor decision made
      // since the previous open; selectedVendorId alone may not change.
      dispatch(
        fetchStockpileData({
          userId: currentUser.uid,
          vendorId,
        }),
      );
    }
  };

  useEffect(() => {
    if (loading || cartIsHydrating) return;

    const openPileVendorId = location.state?.openPileVendorId;
    const checkoutVendorId = location.state?.checkoutVendorId;
    if (!openPileVendorId && !checkoutVendorId) return;

    const { openPileVendorId: _openPile, checkoutVendorId: _checkout, ...rest } =
      location.state || {};
    navigate(`${location.pathname}${location.search || ""}`, {
      replace: true,
      state: rest,
    });

    if (
      openPileVendorId &&
      isActive &&
      String(openPileVendorId) === String(stockpileVendorId)
    ) {
      handleViewSelection(openPileVendorId);
      return;
    }

    if (checkoutVendorId) {
      requestCheckout(checkoutVendorId);
    }
    // This effect intentionally consumes a one-shot navigation instruction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, cartIsHydrating, location.key]);

  const handleAddToSelection = (vendorId) => {
    const vendorInfo = vendorsInfo[vendorId];
    if (vendorInfo) {
      navigate(`/store/${vendorId}`);
    } else {
      // Vendor info not available
      console.warn(`Vendor info not available for vendorId ${vendorId}`);
    }
  };

  const exitVendorName =
    cart[stockpileVendorId]?.vendorName ||
    vendorsInfo[stockpileVendorId]?.shopName ||
    "this vendor";

  const hasVendorNote = (vendorId) =>
    Boolean((vendorNotes?.[vendorId] || "").trim());

  if (loading || cartIsHydrating) {
    return (
      <div>
        <Loading />
      </div>
    );
  }

  // if (!currentUser) {
  //   return <div>Please log in to view your cart.</div>;
  // }

  return (
    <>
      <SEO
        title={`My Cart - My Thrift`}
        description={`Your cart on My Thrift`}
        url={`https://www.shopmythrift.store/latest-cart`}
      />
      {authTransitioning && (
        <div className="fixed inset-0 z-[9999] bg-white/60 backdrop-blur-sm flex items-center justify-center">
          <RotatingLines
            strokeColor="#f9531e"
            strokeWidth="5"
            width="28"
            visible
          />
        </div>
      )}

      <div className="flex flex-col h-full justify-between pb-20 px-2 bg-white">
        <AppPageHeader
          title="My Cart"
          onBack={() => navigate(-1)}
          showBack={fromProductDetail}
          className="-mx-2 w-auto"
        />
        <div className="p-2 overflow-y-auto flex-grow">
          {Object.keys(cart).length === 0 ? (
            <div>
              <EmptyCart />
              <h1 className="font-ubuntu text-lg text-center text-customOrange mt-20 font-medium">
                Oops! Can't find anything in your Cart
              </h1>
            </div>
          ) : (
            <>
              {showHeadsUp && (
                <div className="bg-[#FFF4F2] rounded-lg px-2  py-4 flex items-start justify-between mb-4  ">
                  <div className="flex gap-3">
                    {/* Icon: Orange Info Circle */}
                    <CiCircleInfo className="text-customOrange text-xl flex-shrink-0 mt-0.5" />

                    {/* Text Content */}
                    <p className="font-opensans text-black text-[13px] leading-tight">
                      Just a heads-up: items in your cart aren’t reserved and
                      can be bought by others.
                    </p>
                  </div>

                  {/* Close Button */}
                  <IoMdClose
                    className="text-gray-700 text-lg cursor-pointer hover:text-gray-600 flex-shrink-0 ml-2"
                    onClick={handleDismiss}
                  />
                </div>
              )}
              <div className="space-y-2 pb-2">
                {Object.keys(cart).map((vendorId) => {
                  const products = Object.values(cart[vendorId].products);
                  const firstProduct = products[0];
                  const productCount = products.length;

                  return (
                    <div
                      key={vendorId}
                      className="bg-white rounded-lg py-2 mb-4 cursor-pointer"
                    >
                      <div className="flex gap-3">
                        {/* LEFT COLUMN: Image Area */}
                        {/* Logic: Click opens 'View Selection' ONLY if multiple products */}
                        <div
                          className={`relative w-[110px] h-[140px] flex-shrink-0 rounded-lg overflow-hidden ${
                            productCount > 1 ? "cursor-pointer" : ""
                          }`}
                          onClick={() => {
                            if (productCount > 1) {
                              handleViewSelection(vendorId);
                            } else {
                              const pid =
                                firstProduct?.id || firstProduct?.productId;
                              if (pid) openProduct(pid);
                            }
                          }}
                        >
                          <IkImage
                            src={firstProduct.selectedImageUrl}
                            alt={firstProduct.name}
                            className="w-full h-full object-cover"
                          />

                          {/* Top Left: Delete Icon Overlay */}
                          <div
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent opening modal when clicking delete
                              handleClearSelection(vendorId);
                            }}
                            className="absolute top-1 left-1 bg-black/40 hover:bg-black/60 backdrop-blur-sm p-1 rounded text-white/80 cursor-pointer transition-colors"
                          >
                            <RiDeleteBin7Line size={16} />
                          </div>

                          {/* Bottom Right: +Count Badge (Only if > 1 product) */}
                          {productCount > 1 && (
                            <div className="absolute bottom-1 font-opensans border  border-white right-1 bg-black/60 px-2 py-1 rounded text-white/90 text-xs font-medium">
                              +{productCount}
                            </div>
                          )}
                        </div>

                        {/* RIGHT COLUMN: Details Area */}
                        <div className="flex flex-col flex-1 justify-between py-1">
                          {/* Top Row: Title & Note Icon */}
                          <div className="flex justify-between items-start gap-2">
                            <h3
                              onClick={() => {
                                if (productCount > 1) {
                                  handleViewSelection(vendorId);
                                } else {
                                  const pid =
                                    firstProduct?.id || firstProduct?.productId;
                                  if (pid) openProduct(pid);
                                }
                              }}
                              className="font-opensans text-sm font-medium text-gray-800 leading-tight line-clamp-2"
                            >
                              {productCount > 1
                                ? (() => {
                                    const names = Object.values(
                                      cart[vendorId].products,
                                    ).map((p) => p.name);
                                    const first = names[0] || "Item";
                                    // show only the first product name, then end with "..."
                                    return `${first}...`;
                                  })()
                                : firstProduct.name}
                            </h3>

                            {/* Note Icon (Replaces View Selection) */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSelectedVendorId(vendorId);
                                setIsNoteModalOpen(true);
                              }}
                              className="relative text-gray-500 hover:text-gray-700 -mt-1"
                              aria-label="Add note for vendor"
                            >
                              <TfiCommentAlt size={16} />
                              {hasVendorNote(vendorId) && (
                                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
                              )}
                            </button>
                          </div>

                          {/* Middle Section: Price & Specs */}
                          <div onClick={() => {
                                if (productCount > 1) {
                                  handleViewSelection(vendorId);
                                } else {
                                  const pid =
                                    firstProduct?.id || firstProduct?.productId;
                                  if (pid) openProduct(pid);
                                }
                              }}>
                            {/* Price */}
                            <p className="font-opensans text-md text-black font-semibold">
                              {NGN(getEffectiveUnitPrice(firstProduct))}
                            </p>

                            {/* Specs / Meta Data */}
                            <div className="mt-1">
                              {productCount > 1 ? (
                                // MULTIPLE PRODUCTS VIEW
                                <div className="flex font-opensans flex-col">
                                  <span className="text-[12px] text-gray-500 font-medium">
                                    {isActive && vendorId === stockpileVendorId
                                      ? `Pile from ${cart[vendorId].vendorName}`
                                      : `Curated from ${cart[vendorId].vendorName}`}
                                  </span>
                                  <span className="text-[12px] text-gray-600">
                                    Items: {productCount}
                                  </span>
                                </div>
                              ) : (
                                // SINGLE PRODUCT VIEW
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[12px] text-gray-600 font-opensans flex items-center flex-wrap">
                                    {!isVariantSizeHidden(firstProduct) && (
                                      <>
                                        <span>
                                          {firstProduct.selectedSize ||
                                            firstProduct.size ||
                                            "Size N/A"}
                                        </span>

                                        <GoDotFill className="mx-1 text-[7px] text-gray-200 translate-y-[0.5px]" />
                                      </>
                                    )}

                                    <span>
                                      {formatColorText(
                                        firstProduct.selectedColor ||
                                          firstProduct.color,
                                      ) || "Color N/A"}
                                    </span>

                                    <GoDotFill className="mx-1 text-[7px] text-gray-200 translate-y-[0.5px]" />

                                    <span>
                                      {getConditionLabel(
                                        firstProduct.condition,
                                      )}
                                    </span>
                                  </span>

                                  <span className="text-xs text-gray-600 font-opensans">
                                    Qty: {firstProduct.quantity ?? 1}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Bottom Row: Checkout Button */}
                          <button
                            onClick={() => requestCheckout(vendorId)}
                            disabled={checkoutLoading[vendorId]}
                            className={`mt-2 w-full py-2.5 rounded-xl text-white font-medium font-opensans text-[13px] transition-colors flex items-center justify-center ${
                              checkoutLoading[vendorId]
                                ? "bg-customOrange"
                                : "bg-customOrange "
                            }`}
                          >
                            {checkoutLoading[vendorId] ? (
                              <RotatingLines
                                strokeColor="#fff"
                                strokeWidth="5"
                                animationDuration="0.75"
                                width="24"
                                visible={true}
                              />
                            ) : (
                              "Checkout"
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Native-feel sheet for reviewing all products */}
        <AppBottomSheet
          open={Boolean(isModalOpen && selectedVendorId)}
          onClose={() => setIsModalOpen(false)}
          height="80dvh"
          ariaLabel={
            isActive && sameEntityId(selectedVendorId, stockpileVendorId)
              ? "Review pile"
              : "Review order"
          }
          zIndex={5000}
          compactTop
          surfaceClassName="mx-auto max-w-[574px] px-4 pt-7 font-satoshi"
          surfaceStyle={{
            paddingBottom:
              "calc(24px + var(--app-safe-bottom, env(safe-area-inset-bottom, 0px)))",
          }}
        >
          {selectedVendorId && (
            <>
              {/* Modal Header */}
              <div className="relative flex justify-center pb-2 items-center">
                <h2 className="text-lg font-opensans font-semibold">
                  {isActive && sameEntityId(selectedVendorId, stockpileVendorId)
                    ? "Review Pile"
                    : "Review Order"}
                </h2>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="absolute right-3 top-0 grid h-8 w-8 place-items-center rounded-full bg-gray-100 text-black"
                  aria-label="Close order review"
                >
                  <LiaTimesSolid className="text-xl" aria-hidden="true" />
                </button>
              </div>

              {/* Precompute items + loading flag */}
              {(() => {
                const cartEntries = Object.entries(
                  cart[selectedVendorId]?.products || {},
                ).map(([key, product]) => ({
                  ...product,
                  __isCart: true,
                  __productKey: key,
                }));

                const isReviewingPile =
                  isActive &&
                  sameEntityId(selectedVendorId, stockpileVendorId);
                const visiblePileOrders = isReviewingPile
                  ? pileOrders || []
                  : [];
                const hasSelection =
                  visiblePileOrders.length > 0 || cartEntries.length > 0;
                const isLoadingSelection =
                  isReviewingPile && stockpileLoading && !hasSelection;
                const checkoutTotal = Object.values(
                  cart[selectedVendorId]?.products || {},
                ).reduce(
                  (sum, p) =>
                    sum + getEffectiveUnitPrice(p) * (p.quantity ?? 1),
                  0,
                );
                return (
                  <>
                    {/* Scrollable Products List */}
                    <div className="mt-3 min-h-0 flex-grow overflow-y-auto scrollbar-hide">
                      {isLoadingSelection ? (
                        <div className="h-full w-full flex items-center justify-center py-10">
                          <RotatingLines
                            strokeColor="#f9531e"
                            strokeWidth="5"
                            width="28"
                            visible
                          />
                        </div>
                      ) : !hasSelection ? (
                        <p className="py-10 text-center text-sm text-gray-500">
                          No items found in this selection.
                        </p>
                      ) : (
                        <>
                          {visiblePileOrders.map((order, orderIndex) => {
                            const isAccepted =
                              order.membershipStatus ===
                              STOCKPILE_ORDER_MEMBERSHIP.READY;
                            const isDeclined =
                              order.membershipStatus ===
                              STOCKPILE_ORDER_MEMBERSHIP.DECLINED;
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
                                aria-label={`Order ${order.orderId}: ${statusLabel}`}
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
                                  {(order.items || []).map((item, itemIndex) => {
                                    const recordedUnitPrice = Number(
                                      item.unitPrice ??
                                        item.productSnapshot?.price ??
                                        item.productPrice ??
                                        item.price,
                                    );
                                    const size =
                                      item.selectedSize ||
                                      item.size ||
                                      item.variantAttributes?.size;
                                    const color =
                                      item.selectedColor ||
                                      item.color ||
                                      item.variantAttributes?.color;
                                    const condition =
                                      item.condition ||
                                      item.productSnapshot?.condition;
                                    const details = [
                                      size && !isVariantSizeHidden(item)
                                        ? size
                                        : null,
                                      color ? formatColorText(color) : null,
                                      condition
                                        ? getConditionLabel(condition)
                                        : null,
                                    ].filter(Boolean);

                                    return (
                                      <button
                                        type="button"
                                        key={`${order.id}-${item.productKey || item.productId || itemIndex}`}
                                        onClick={() => {
                                          const pid = item?.id || item?.productId;
                                          if (pid) openProduct(pid);
                                        }}
                                        className="flex w-full items-stretch gap-3 py-3 text-left"
                                      >
                                        <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                                          <IkImage
                                            src={
                                              item.selectedImageUrl ||
                                              item.imageUrl ||
                                              item.productSnapshot?.imageUrl ||
                                              item.productSnapshot?.coverImageUrl
                                            }
                                            alt={item.name}
                                            className="h-full w-full object-cover"
                                          />
                                          {Number(item.quantity || 1) > 1 && (
                                            <span className="absolute right-1 top-1 grid h-6 min-w-6 place-items-center rounded-full bg-black/60 px-1 text-[10px] text-white">
                                              ×{Number(item.quantity || 1)}
                                            </span>
                                          )}
                                        </div>
                                        <div className="min-w-0 flex-1 self-center">
                                          <p className="line-clamp-2 text-sm font-medium text-gray-950">
                                            {item.name}
                                          </p>
                                          {Number.isFinite(recordedUnitPrice) &&
                                            recordedUnitPrice >= 0 && (
                                              <p className="mt-1 text-sm font-semibold text-black">
                                                {NGN(recordedUnitPrice)}
                                              </p>
                                            )}
                                          {details.length > 0 && (
                                            <p className="mt-1 text-xs text-gray-500">
                                              {details.join(" · ")}
                                            </p>
                                          )}
                                          <p className="mt-1 text-xs text-gray-500">
                                            Qty: {Number(item.quantity || 1)}
                                          </p>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </section>
                            );
                          })}

                          {cartEntries.length > 0 && (
                            <section>
                              {cartEntries.map((item, index) => {
                          const isCartItem = item.__isCart;
                          const isLast = index === cartEntries.length - 1;
                          const pileMembership = isCartItem
                            ? null
                            : item.stockpileMembershipStatus ||
                              getStockpileOrderMembership({
                                progressStatus: item.orderProgressStatus,
                                vendorStatus: item.orderVendorStatus,
                              });
                          const pileStatusLabel =
                            pileMembership === STOCKPILE_ORDER_MEMBERSHIP.READY
                              ? "Accepted into your pile"
                              : pileMembership ===
                                  STOCKPILE_ORDER_MEMBERSHIP.DECLINED
                                ? "Declined"
                                : "Pending vendor acceptance";

                          return (
                            <div
                              key={
                                isCartItem ? item.__productKey : `pile-${index}`
                              }
                            >
                              <div
                                className={[
                                  "flex min-h-[112px] items-stretch justify-between gap-3 py-3",
                                  !isLast ? "" : "",
                                ].join(" ")}
                                onClick={() => {
                                  // only navigate for real products with ids
                                  const pid = item?.id || item?.productId;
                                  if (pid) openProduct(pid);
                                }}
                                role="button"
                              >
                                {/* Product Image */}
                                <div className="relative h-28 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
                                  <IkImage
                                    src={
                                      item.selectedImageUrl ||
                                      item.imageUrl ||
                                      item.productSnapshot?.imageUrl ||
                                      item.productSnapshot?.coverImageUrl
                                    }
                                    alt={item.name}
                                    className="h-full w-full object-cover"
                                  />
                                  {item.quantity > 1 && (
                                    <div className="absolute -top-1 text-xs -right-2 bg-gray-900 bg-opacity-40 text-white rounded-full w-7 h-7 flex items-center justify-center backdrop-blur-md">
                                      +{item.quantity}
                                    </div>
                                  )}
                                </div>

                                {/* Product Details */}
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-opensans text-sm font-medium text-gray-900 leading-tight line-clamp-1">
                                    {item.name}
                                  </h3>

                                  {(() => {
                                    const recordedUnitPrice = Number(
                                      item.unitPrice ??
                                        item.productSnapshot?.price ??
                                        item.productPrice ??
                                        item.price,
                                    );
                                    const unitPrice = isCartItem
                                      ? getEffectiveUnitPrice(item)
                                      : recordedUnitPrice;
                                    const size =
                                      item.selectedSize ||
                                      item.size ||
                                      item.variantAttributes?.size;
                                    const color =
                                      item.selectedColor ||
                                      item.color ||
                                      item.variantAttributes?.color;
                                    const condition =
                                      item.condition ||
                                      item.productSnapshot?.condition;
                                    const details = [
                                      size && !isVariantSizeHidden(item)
                                        ? size
                                        : null,
                                      color ? formatColorText(color) : null,
                                      condition
                                        ? getConditionLabel(condition)
                                        : null,
                                    ].filter(Boolean);

                                    return (
                                      <>
                                        {Number.isFinite(unitPrice) &&
                                          unitPrice >= 0 && (
                                            <p className="mt-1 text-sm font-semibold text-black">
                                              {NGN(unitPrice)}
                                            </p>
                                          )}

                                        {details.length > 0 && (
                                          <div className="mt-1 flex flex-wrap items-center text-xs text-gray-600">
                                            {details.map((detail, detailIndex) => (
                                              <React.Fragment
                                                key={`${detail}-${detailIndex}`}
                                              >
                                                {detailIndex > 0 && (
                                                  <GoDotFill className="mx-1 text-[7px] text-gray-300" />
                                                )}
                                                <span>{detail}</span>
                                              </React.Fragment>
                                            ))}
                                          </div>
                                        )}

                                        <p className="mt-1 text-xs text-gray-600">
                                          Qty: {item.quantity ?? 1}
                                        </p>
                                        {!isCartItem && (
                                          <p
                                            className={`mt-1 text-[11px] font-medium ${
                                              pileMembership ===
                                              STOCKPILE_ORDER_MEMBERSHIP.READY
                                                ? "text-emerald-700"
                                                : pileMembership ===
                                                    STOCKPILE_ORDER_MEMBERSHIP.DECLINED
                                                  ? "text-red-600"
                                                  : "text-amber-700"
                                            }`}
                                          >
                                            {pileStatusLabel}
                                          </p>
                                        )}
                                        {!isCartItem &&
                                          pileMembership ===
                                            STOCKPILE_ORDER_MEMBERSHIP.DECLINED &&
                                          item.declineReason && (
                                            <p className="mt-1 line-clamp-2 text-[11px] text-red-600">
                                              {item.declineReason}
                                            </p>
                                          )}
                                      </>
                                    );
                                  })()}
                                </div>

                                {/* Right-side Action */}
                                <div className="flex-shrink-0">
                                  {isCartItem ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveFromCart(
                                          selectedVendorId,
                                          item.__productKey,
                                          {
                                            surface: "cart_modal",
                                            reason: "remove_in_modal",
                                          },
                                        );
                                      }}
                                      className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                                      aria-label="Remove item"
                                    >
                                      <RiDeleteBin7Line size={18} />
                                    </button>
                                  ) : (
                                    <span
                                      className={`mt-2 grid h-8 w-8 place-items-center rounded-full ${
                                        pileMembership ===
                                        STOCKPILE_ORDER_MEMBERSHIP.READY
                                          ? "bg-emerald-50 text-emerald-600"
                                          : pileMembership ===
                                              STOCKPILE_ORDER_MEMBERSHIP.DECLINED
                                            ? "bg-red-50 text-red-600"
                                            : "bg-amber-50 text-amber-600"
                                      }`}
                                      aria-label={pileStatusLabel}
                                      title={pileStatusLabel}
                                    >
                                      {pileMembership ===
                                      STOCKPILE_ORDER_MEMBERSHIP.READY ? (
                                        <MdVerified className="text-xl" />
                                      ) : pileMembership ===
                                        STOCKPILE_ORDER_MEMBERSHIP.DECLINED ? (
                                        <MdCancel className="text-xl" />
                                      ) : (
                                        <MdOutlineSchedule className="text-xl" />
                                      )}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                              })}
                            </section>
                          )}
                        </>
                      )}
                    </div>

                    {/* Sticky Footer */}
                    <div className="mt-4">
                      {/* "Leave a Message for the Vendor" */}

                      {/* "Proceed to Checkout" and "Clear Order" Buttons */}
                      <div className="flex flex-col justify-between space-y-4 mt-4">
                        <button
                          onClick={() => requestCheckout(selectedVendorId)}
                          disabled={checkoutLoading[selectedVendorId]}
                          className={`rounded-full flex justify-center items-center h-12 w-full font-opensans font-medium text-white px-4 py-2 ${
                            checkoutLoading[selectedVendorId]
                              ? "bg-orange-500"
                              : "bg-customOrange"
                          }`}
                        >
                          {checkoutLoading[selectedVendorId] ? (
                            <RotatingLines
                              strokeColor="#fff"
                              strokeWidth="5"
                              animationDuration="0.75"
                              width="24"
                              visible
                            />
                          ) : (
                            <span className="flex items-center text-sm gap-2">
                              <span>Checkout</span>

                              <span>({NGN(checkoutTotal)})</span>
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </>
          )}
        </AppBottomSheet>

        {/* Native-feel note sheet */}
        <AppBottomSheet
          open={isNoteModalOpen}
          onClose={() => setIsNoteModalOpen(false)}
          height="44dvh"
          ariaLabel="Leave a note"
          zIndex={5100}
          compactTop
          surfaceClassName="mx-auto max-w-[574px] justify-between gap-5 px-4 pt-7"
          surfaceStyle={{
            minHeight: "332px",
            paddingBottom:
              "calc(24px + var(--app-safe-bottom, env(safe-area-inset-bottom, 0px)))",
          }}
        >
              <div className="cart-note-content">
                <div className="cart-note-titlebar">
                  <span aria-hidden="true" />
                  <h2>Leave a note</h2>
                  <button
                    type="button"
                    onClick={() => setIsNoteModalOpen(false)}
                    aria-label="Close note"
                  >
                    <LiaTimesSolid aria-hidden="true" />
                  </button>
                </div>

                <div className="cart-note-field-group">
                  <textarea
                    maxLength={200}
                    value={vendorNotes[selectedVendorId] || ""}
                    onChange={(e) =>
                      setVendorNotes({
                        ...vendorNotes,
                        [selectedVendorId]: e.target.value,
                      })
                    }
                    className="cart-note-textarea"
                    placeholder="Type note here"
                    aria-describedby="cart-note-counter"
                  />
                  <p id="cart-note-counter" className="cart-note-counter">
                    {(vendorNotes[selectedVendorId] || "").length}/200
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsNoteModalOpen(false);
                  // Note is already saved in vendorNotes
                }}
                className="cart-note-save"
              >
                Save
              </button>
        </AppBottomSheet>
        <QuickAuthModal
          open={authOpen}
          onClose={() => setAuthOpen(false)}
          onComplete={handleAuthComplete}
          mergeCart={mergeCartFor}
          openDisclaimer={openDisclaimer}
          headerText="Let’s set up your order"
          vendorId={pendingVendorForCheckout}
          compactTop
          authIntent={{
            type: "cart-checkout",
            returnTo: `${location.pathname}${location.search}`,
            payload: {vendorId: pendingVendorForCheckout},
          }}
        />
        <IframeModal
          show={showDisclaimerModal}
          onClose={() => setShowDisclaimerModal(false)}
          url={disclaimerUrl}
        />

        <AppBottomSheet
          open={showExitStockpileModal}
          onClose={() => {
            setShowExitStockpileModal(false);
            setPendingCheckoutVendor(null);
          }}
          height="42dvh"
          ariaLabel="Leave repile mode"
          zIndex={9000}
          compactTop
          surfaceClassName="font-satoshi"
          surfaceStyle={{ minHeight: "360px" }}
        >
          <div className="flex h-full flex-col px-5 pb-5 pt-4 font-satoshi">
            <div className="flex items-center gap-2">
              <ImSad2 className="shrink-0 text-2xl text-customRichBrown" />
              <h2 className="text-lg font-medium text-gray-950">
                Leave repile mode?
              </h2>
            </div>

            <p className="mt-4 text-sm leading-5 text-gray-700">
              You’re currently repiling from{" "}
              <span className="font-medium text-customOrange">
                {exitVendorName}
              </span>
              . Continuing will leave repile mode and clear its unpurchased
              basket. Your existing stockpile will stay active.
            </p>

            <div className="mt-auto grid gap-3 pt-5">
              <button
                type="button"
                onClick={() => {
                  const nextVendorId = pendingCheckoutVendor;
                  void appHaptics.selection();
                  setShowExitStockpileModal(false);
                  setPendingCheckoutVendor(null);
                  setIsModalOpen(false);

                  // The repile basket is frontend cart state. Clear it in the
                  // background; never touch the persisted stockpile document.
                  void Promise.resolve(
                    dispatch(clearCart(stockpileVendorId)),
                  ).then((synced) => {
                    if (!synced) {
                      console.warn(
                        "Repile basket cleared locally; cloud sync will retry.",
                      );
                    }
                  });
                  dispatch(exitStockpileMode());

                  if (nextVendorId) {
                    requestCheckout(nextVendorId, currentUser, {
                      skipRepileGuard: true,
                    });
                  }
                }}
                className="h-12 w-full rounded-xl bg-customOrange text-sm font-medium text-white"
              >
                Leave &amp; continue
              </button>
              <button
                type="button"
                onClick={() => {
                  void appHaptics.selection();
                  setShowExitStockpileModal(false);
                  setPendingCheckoutVendor(null);
                }}
                className="h-12 w-full rounded-xl border border-gray-300 bg-white text-sm font-medium text-gray-900"
              >
                Stay in repile mode
              </button>
            </div>
          </div>
        </AppBottomSheet>
      </div>
    </>
  );
};

export default Cart;
