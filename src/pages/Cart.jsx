import React, { useEffect, useCallback, useState } from "react";
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
import EmptyCart from "../components/Loading/EmptyCart";
import { useAuth } from "../custom-hooks/useAuth";
import { CiLogin } from "react-icons/ci";
import { useNavigate, useLocation } from "react-router-dom";
import {
  GoChevronLeft,
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
import { FcPaid } from "react-icons/fc";
import { MdClose } from "react-icons/md";
import { IoMdClose } from "react-icons/io";
import { CiCircleInfo } from "react-icons/ci";
import IkImage from "../services/IkImage";
import { LuDot } from "react-icons/lu";
import { track } from "../services/signals";
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

const Cart = () => {
  const cart = useSelector((state) => state.cart || {});
  const dispatch = useDispatch();
  const [showHeadsUp, setShowHeadsUp] = useState(false);

  const handleDismiss = () => {
    // Hide the alert and save preference to local storage
    setShowHeadsUp(false);
    localStorage.setItem("cart_reservation_dismissed", "true");
  };
  const navigate = useNavigate();
  const { currentUser, loading } = useAuth();
  const [selectedVendorId, setSelectedVendorId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [vendorNotes, setVendorNotes] = useState({});
  const [vendorsInfo, setVendorsInfo] = useState({});
  const location = useLocation();
  const [checkoutLoading, setCheckoutLoading] = useState({});
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showExitStockpileModal, setShowExitStockpileModal] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingVendorForCheckout, setPendingVendorForCheckout] =
    useState(null);
  const { pileItems } = useSelector((state) => state.stockpile);
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

  useEffect(() => {
    if (isModalOpen || isNoteModalOpen || authOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isModalOpen, isNoteModalOpen, authOpen]);
  const formatPrice = (price) => {
    if (typeof price !== "number" || isNaN(price)) return "0.00";
    return price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  const mergeCartFor = async (uid) => {
    try {
      const res = await fetchAndMergeCart(db, uid, dispatch, {
        localCart: JSON.parse(localStorage.getItem("cart") || "{}"),
        clearLocal: true,
      });
      return res; // { mergedCart, addedByVendor, conflicts }
    } catch (e) {
      console.warn("mergeCart failed:", e);
      return null;
    }
  };
  useEffect(() => {
    if (isActive && selectedVendorId === stockpileVendorId && currentUser) {
      dispatch(
        fetchStockpileData({
          userId: currentUser.uid,
          vendorId: selectedVendorId,
        }),
      );
    }
  }, [selectedVendorId, isActive, stockpileVendorId, currentUser, dispatch]);

  const checkCartProducts = useCallback(async () => {
    try {
      const vendorIds = Object.keys(cart);

      for (const vendorId of vendorIds) {
        const vendor = cart[vendorId];

        for (const productKey in vendor.products) {
          const product = vendor.products[productKey];
          if (!product || !product.id) {
            console.error(
              `Invalid product found for key ${productKey}:`,
              product,
            );
            dispatch(removeFromCart({ vendorId, productKey }));
            continue;
          }

          const { id } = product;

          try {
            const productDoc = await getDoc(doc(db, `products`, id));
            if (!productDoc.exists()) {
              dispatch(removeFromCart({ vendorId, productKey }));
              toast.dismiss();
              toast(
                `Product ${product.name} has been removed as it is no longer available.`,
                { icon: "ℹ️" },
              );
            } else {
              const productData = productDoc.data();
              if (!productData.published || productData.isDeleted) {
                dispatch(removeFromCart({ vendorId, productKey }));
                toast.dismiss();
                toast(
                  `Product ${product.name} has been removed as it is ${
                    productData.isDeleted
                      ? "deleted by the vendor"
                      : "unpublished by the vendor"
                  }.`,
                  { icon: "ℹ️" },
                );
              }
            }
          } catch (err) {
            console.error(`Error fetching product ${id}:`, err);
          }
        }
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
    if (isModalOpen || isNoteModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isModalOpen, isNoteModalOpen]);

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
    if (cart && Object.keys(cart).length > 0) {
      checkCartProducts();
    } else {
    }
  }, [cart, checkCartProducts]);

  const handleRemoveFromCart = useCallback(
    (vendorId, productKey, meta = {}) => {
      const product = cart?.[vendorId]?.products?.[productKey];
      if (!product) return;

      // ✅ log BEFORE dispatch so we still have product data
      logRemoveFromCart(vendorId, product, meta);

      dispatch(removeFromCart({ vendorId, productKey }));
      toast(`Removed ${product.name} from cart!`, { icon: "ℹ️" });
    },
    [cart, dispatch],
  );

  const NGN = (n) =>
    Number(n || 0).toLocaleString("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    });
  const getEffectiveUnitPrice = (product) => {
    const lock = product?.id ? locksByProduct[product.id] : null;
    const lockPrice = lock?.effectivePrice ? Number(lock.effectivePrice) : null;
    // fall back to the product’s normal price if no lock
    return typeof lockPrice === "number"
      ? lockPrice
      : Number(product.price || 0);
  };
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

  const handleClearSelection = (vendorId) => {
    const confirmClear = window.confirm(
      `Are you sure you want to clear the cart?`,
    );
    if (confirmClear) {
      dispatch(clearCart(vendorId));
      toast.success(`Cleared cart for ${cart[vendorId].vendorName}!`);
      setIsModalOpen(false);

      setVendorNotes((prevNotes) => {
        const updatedNotes = { ...prevNotes };
        delete updatedNotes[vendorId];
        return updatedNotes;
      });
    }
  };
  const openDisclaimer = (path) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    const abs = `${window.location.origin}${path}`;
    setDisclaimerUrl(abs);
    setShowDisclaimerModal(true);
  };
  const handleCheckout = async (vendorId, authUser = currentUser) => {
    setCheckoutLoading((prev) => ({ ...prev, [vendorId]: true }));

    const vendorCart = cart[vendorId];
    if (!vendorCart || Object.keys(vendorCart.products).length === 0) {
      toast.error("No products to checkout for this vendor.");
      setCheckoutLoading((prev) => ({ ...prev, [vendorId]: false }));
      return;
    }

    /* ───── 1 – Auth guard ───── */
    if (!authUser) {
      setPendingVendorForCheckout(vendorId);
      setAuthOpen(true);
      setCheckoutLoading((prev) => ({ ...prev, [vendorId]: false }));
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
      setCheckoutLoading((prev) => ({ ...prev, [vendorId]: false }));
      return;
    }

    /* ───── 3 – Stockpile exit guard ───── */
    if (isActive && vendorId !== stockpileVendorId) {
      setPendingCheckoutVendor(vendorId);
      setShowExitStockpileModal(true);
      setCheckoutLoading((prev) => ({ ...prev, [vendorId]: false }));
      return;
    }

    /* ───── 4 – Profile completeness check ───── */
    let profileComplete = authUser.profileComplete;
    let location = authUser.location;

    if (profileComplete === undefined || location === undefined) {
      try {
        const userDoc = await getDoc(doc(db, "users", authUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          profileComplete = userData.profileComplete;
          location = userData.location;
        }
      } catch (error) {
        console.error("Error fetching user profile from Firestore:", error);
        setCheckoutLoading((prev) => ({ ...prev, [vendorId]: false }));
        return;
      }
    }

    if (!profileComplete) {
      toast.error(
        "Please complete your profile before proceeding to checkout.",
      );
      navigate("/profile?incomplete=true");
      setCheckoutLoading((prev) => ({ ...prev, [vendorId]: false }));
      return;
    }
    if (
      typeof location?.lat !== "number" ||
      typeof location?.lng !== "number"
    ) {
      toast.error("Please update your delivery address before checking out.");
      navigate("/profile?incomplete=true");
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
      if (vendorDocSnap.data().isDeactivated) {
        toast.error("This vendor is currently not active.");
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
  const handleAuthComplete = async (user) => {
    // Show a clear “working” state as we merge + maybe open modal or navigate
    setAuthTransitioning(true);
    setAuthOpen(false); // close the auth modal immediately

    // Merge device cart -> Firestore cart and get what changed
    const mergeMeta = await mergeCartFor(user.uid);

    const addedVendors = mergeMeta?.addedByVendor
      ? Object.keys(mergeMeta.addedByVendor).filter(
          (vid) => (mergeMeta.addedByVendor[vid] || []).length > 0,
        )
      : [];

    if (addedVendors.length > 0) {
      const targetVendor =
        pendingVendorForCheckout &&
        addedVendors.includes(pendingVendorForCheckout)
          ? pendingVendorForCheckout
          : addedVendors[0];

      setSelectedVendorId(targetVendor);
      setIsModalOpen(true);
      toast.success(
        "We merged your items. Review your selection before checkout.",
      );
      setPendingVendorForCheckout(null);
      setAuthTransitioning(false);
      return;
    }

    const v = pendingVendorForCheckout;
    setPendingVendorForCheckout(null);

    if (v) {
      await handleCheckout(v, user);
    }

    setAuthTransitioning(false);
  };
  const calculateVendorTotal = (vendorId) => {
    const vendorCart = cart[vendorId]?.products || {};
    return Object.values(vendorCart).reduce(
      (total, product) => total + product.price * product.quantity,
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
  };

  const handleAddToSelection = (vendorId) => {
    const vendorInfo = vendorsInfo[vendorId];
    if (vendorInfo) {
      const marketPlaceType = vendorInfo.marketPlaceType;
      if (marketPlaceType === "virtual") {
        navigate(`/store/${vendorId}`);
      } else {
        navigate(`/marketstorepage/${vendorId}`);
      }
    } else {
      // Vendor info not available
      console.warn(`Vendor info not available for vendorId ${vendorId}`);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      setIsModalOpen(false);
    }
  };
  const handleLoginOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      setIsLoginModalOpen(false);
    }
  };
  const exitVendorName =
    cart[stockpileVendorId]?.vendorName ||
    vendorsInfo[stockpileVendorId]?.shopName ||
    "this vendor";

  const handleNoteOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      setIsNoteModalOpen(false);
    }
  };
  const hasVendorNote = (vendorId) =>
    Boolean((vendorNotes?.[vendorId] || "").trim());

  if (loading) {
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

      <div className="flex flex-col h-full justify-between pb-20 px-2 py-8 bg-white">
        <div className=" top-0 bg-white w-full  flex items-center  py-2                           mb-4  z-10 relative">
          {fromProductDetail && (
            <GoChevronLeft
              className="text-3xl cursor-pointer z-20"
              onClick={() => navigate(-1)}
            />
          )}

          <h1 className="font-opensans font-semibold text-xl text-black absolute left-1/2 -translate-x-1/2">
            My Cart
          </h1>
        </div>
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
                                    <span>
                                      {firstProduct.selectedSize ||
                                        firstProduct.size ||
                                        "Size N/A"}
                                    </span>

                                    <GoDotFill className="mx-1 text-[7px] text-gray-200 translate-y-[0.5px]" />

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
                            onClick={() => handleCheckout(vendorId)}
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

        {/* Modal for viewing all products */}
        {isModalOpen && selectedVendorId && (
          <div
            className="fixed inset-0 modal bg-black bg-opacity-50 flex items-end justify-center"
            onClick={handleOverlayClick}
          >
            <div
              className="bg-white w-full h-4/5 rounded-t-xl px-2 py-6  flex flex-col animate-modal-slide-up"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="relative flex justify-center pb-2 items-center">
                <h2 className="text-lg font-opensans font-semibold">
                  {isActive && selectedVendorId === stockpileVendorId
                    ? "Review Pile"
                    : "Review Order"}
                </h2>

                <LiaTimesSolid
                  onClick={() => setIsModalOpen(false)}
                  className="absolute right-3 top-1 text-black text-xl cursor-pointer"
                />
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

                const pileEntries =
                  isActive && selectedVendorId === stockpileVendorId
                    ? pileItems.map((item, index) => ({
                        ...item,
                        selectedImageUrl: item.imageUrl || "",
                        quantity: item.quantity || 1,
                        __isCart: false,
                        __index: index,
                      }))
                    : [];

                const items = [...pileEntries, ...cartEntries];
                const isLoadingSelection = items.length === 0;
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
                    <div className="overflow-y-auto scrollbar-hide mt-4 flex-grow">
                      {isLoadingSelection ? (
                        <div className="h-full w-full flex items-center justify-center py-10">
                          <RotatingLines
                            strokeColor="#f9531e"
                            strokeWidth="5"
                            width="28"
                            visible
                          />
                        </div>
                      ) : (
                        items.map((item, index) => {
                          const isCartItem = item.__isCart;
                          const isLast = index === items.length - 1;

                          return (
                            <div
                              key={
                                isCartItem ? item.__productKey : `pile-${index}`
                              }
                            >
                              <div
                                className={[
                                  "flex items-stretch justify-between gap-3 py-3",
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
                                <div className="relative flex-shrink-0 w-16 self-stretch">
                                  <IkImage
                                    src={item.selectedImageUrl}
                                    alt={item.name}
                                    className="w-16 h-full object-cover rounded-lg"
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

                                  {isCartItem && (
                                    <>
                                      <p className="font-opensans text-sm mt-1 text-black font-semibold">
                                        {NGN(getEffectiveUnitPrice(item))}
                                      </p>

                                      {/* size • color • condition */}
                                      {item.isFashion && (
                                        <div className="mt-1 text-xs font-opensans text-gray-600 flex items-center flex-wrap">
                                          <span>
                                            {item.selectedSize ||
                                              item.size ||
                                              "Size N/A"}
                                          </span>

                                          <GoDotFill className="mx-1 text-[7px] text-gray-200 translate-y-[0.5px]" />

                                          <span>
                                            {formatColorText(
                                              item.selectedColor || item.color,
                                            ) || "Color N/A"}
                                          </span>

                                          <GoDotFill className="mx-1 text-[7px] text-gray-200 translate-y-[0.5px]" />

                                          <span>
                                            {getConditionLabel(item.condition)}
                                          </span>
                                        </div>
                                      )}

                                      <p className="text-xs font-opensans text-gray-600 mt-1">
                                        Qty: {item.quantity ?? 1}
                                      </p>
                                    </>
                                  )}
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
                                    <FcPaid className="text-2xl mt-2" />
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Sticky Footer */}
                    <div className="mt-4">
                      {/* "Leave a Message for the Vendor" */}

                      {/* "Proceed to Checkout" and "Clear Order" Buttons */}
                      <div className="flex flex-col justify-between space-y-4 mt-4">
                        <button
                          onClick={() => handleCheckout(selectedVendorId)}
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

                              <span className="">({NGN(checkoutTotal)})</span>
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Modal for  a note */}
        {isNoteModalOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center modal1"
            onClick={handleNoteOverlayClick}
          >
            <div
              className="bg-white w-full h-3/5 rounded-t-xl p-4 flex flex-col z-50 animate-modal-slide-up"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-opensans text-black font-semibold">
                  Note for Vendor
                </h2>
                <LiaTimesSolid
                  onClick={() => setIsNoteModalOpen(false)}
                  className="text-black text-xl cursor-pointer"
                />
              </div>
              {/* Text input area */}
              <textarea
                maxLength={50}
                value={vendorNotes[selectedVendorId] || ""}
                onChange={(e) =>
                  setVendorNotes({
                    ...vendorNotes,
                    [selectedVendorId]: e.target.value,
                  })
                }
                className="w-full mt-4 p-2 border bg-gray-200 h-44 rounded-md"
                placeholder=""
              />
              {/* Send Note button */}
              <button
                onClick={() => {
                  setIsNoteModalOpen(false);
                  // Note is already saved in vendorNotes
                }}
                className="bg-customOrange w-full text-white font-opensans font-semibold py-3 mt-4 h-12 translate-y-10 rounded-full"
              >
                Send Note
              </button>
            </div>
          </div>
        )}
        <QuickAuthModal
          open={authOpen}
          onClose={() => setAuthOpen(false)}
          onComplete={handleAuthComplete}
          openDisclaimer={openDisclaimer}
          headerText="Continue to checkout"
          vendorId={pendingVendorForCheckout}
        />
        <IframeModal
          show={showDisclaimerModal}
          onClose={() => setShowDisclaimerModal(false)}
          url={disclaimerUrl}
        />

        {showExitStockpileModal && (
          <div
            className="fixed inset-0 px-4 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowExitStockpileModal(false)}
          >
            <div
              className="bg-white rounded-lg p-6 max-w-sm w-full shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex  items-center mb-4">
                <ImSad2 className="text-2xl text-customRichBrown mr-2" />
                <h2 className="text-lg font-semibold  font-opensans">
                  Exit Stockpiling?
                </h2>
              </div>

              <p className="text-sm text-gray-800 font-opensans">
                You're currently repiling from{" "}
                <span className="font-semibold text-customOrange">
                  {exitVendorName}
                </span>
                . Checking out with another vendor will exit this pile and clear
                your cart. Continue?
              </p>

              <div className="mt-6 flex justify-end space-x-4">
                <button
                  onClick={() => setShowExitStockpileModal(false)}
                  className="px-4 py-2 bg-transparent border border-customRichBrown text-sm rounded-full font-opensans"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Immediately close the modal.
                    setShowExitStockpileModal(false);
                    // Clear only the cart for the stockpiled vendor.
                    dispatch(clearCart(stockpileVendorId));
                    // Exit stockpiling mode.
                    dispatch(exitStockpileMode());
                    setPendingCheckoutVendor(null);
                  }}
                  className="px-4 py-2 bg-customOrange text-white text-sm rounded-full font-opensans"
                >
                  Yes, Exit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Cart;
