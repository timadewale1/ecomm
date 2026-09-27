import { siteUrls } from "../../config/siteUrls.mjs";
import React, {
  useCallback,
  useEffect,
  useState,
  useContext,
  useRef,
} from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  arrayRemove,
  doc,
  updateDoc,
  addDoc,
  onSnapshot,
  where,
  query,
  writeBatch,
  getDoc,
  getDocs,
  limit,
  orderBy,
  startAfter,
  documentId,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../../firebase.config";
import { toast } from "react-hot-toast";
import { useNavigate, useLocation } from "react-router-dom";
import {
  MdOutlineUnpublished,
  MdPublishedWithChanges,
} from "react-icons/md";
import Modal from "../../components/layout/Modal";
import ConfirmationDialog from "../../components/layout/ConfirmationDialog";
import { FaRegCircle } from "react-icons/fa";
import { RiHeart3Fill } from "react-icons/ri";
import { GrRadialSelected } from "react-icons/gr";
import { RotatingLines } from "react-loader-spinner";
import AddProduct from "../vendor/AddProducts";
import { FiPlus } from "react-icons/fi";
import VendorProductModal from "../../components/layout/VendorProductModal";
import VendorProductActionsSheet from "../../components/VendorSide/VendorProductActionsSheet";
import AppPageHeader from "../../components/layout/AppPageHeader";
import ToggleButton from "../../components/Buttons/ToggleButton";
import { motion } from "framer-motion";
import Skeleton from "react-loading-skeleton";
import "./vendor.css";
import ScrollToTop from "../../components/layout/ScrollToTop";
import { VendorContext } from "../../components/Context/Vendorcontext";
import {
  LuCopy,
  LuCopyCheck,
  LuChevronRight,
  LuEye,
  LuListChecks,
  LuSearch,
  LuSlidersHorizontal,
} from "react-icons/lu";
import SEO from "../../components/Helmet/SEO";
import {
  TbBoxOff,
  TbEdit,
  TbRosetteDiscount,
  TbRosetteDiscountOff,
} from "react-icons/tb";
import SingleDiscountModal from "../vendor/SingleDiscountModal";
import { start } from "@cloudinary/url-gen/qualifiers/textAlignment";
import { IoTrashOutline } from "react-icons/io5";
import { IoMdCheckmarkCircleOutline } from "react-icons/io";
import { HiWrenchScrewdriver } from "react-icons/hi2";
import MultiDiscountModal from "../vendor/MultiDiscountModal";
import EditProductModal from "../vendor/EditProductModal";
import { appHaptics } from "../../services/haptics";
import VendorProductSortSheet from "../../components/VendorSide/VendorProductSortSheet";
import VendorProductImageViewer from "../../components/VendorSide/VendorProductImageViewer";
import AppScrollToTopButton from "../../components/layout/AppScrollToTopButton";
import "./vendor-products.css";

const PRODUCT_PAGE_SIZE = 50;
const LOW_STOCK_THRESHOLD = 3;
const LOW_STOCK_BASELINE_MINIMUM = 15;
const DEFAULT_PRODUCT_SORT = "newest";
const VIEW_STATS_CHUNK_SIZE = 50;

const getVariantStockSummary = (product) => {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  return variants.reduce(
    (summary, variant) => {
      const stock = Number(variant?.stock || 0);
      if (stock <= 0) summary.out += 1;
      return summary;
    },
    { out: 0 },
  );
};

const isGenuinelyLowStock = (product) => {
  const baseline = Number(product?.stockAlertBaseline || 0);
  const currentStock = Number(product?.stockQuantity || 0);
  return (
    baseline > LOW_STOCK_BASELINE_MINIMUM &&
    currentStock > 0 &&
    currentStock <= LOW_STOCK_THRESHOLD
  );
};

const needsStockAttention = (product) => {
  const summary = getVariantStockSummary(product);
  return isGenuinelyLowStock(product) || summary.out > 0;
};

const productCreatedAtMillis = (product) => {
  const value = product?.createdAt;
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeVendorProductDocs = async (snapshotDocs) => {
  const updatedProducts = [];
  const batch = writeBatch(db);
  let hasBatchUpdates = false;

  snapshotDocs.forEach((productDoc) => {
    const product = { id: productDoc.id, ...productDoc.data() };
    const normalizationUpdates = {};
    if (Number(product.stockQuantity || 0) === 0 && product.isFeatured) {
      normalizationUpdates.isFeatured = false;
      product.isFeatured = false;
    }
    if (
      product.stockAlertBaseline == null ||
      !Number.isFinite(Number(product.stockAlertBaseline))
    ) {
      const stockAlertBaseline = Math.max(
        0,
        Number(product.stockQuantity || 0),
      );
      normalizationUpdates.stockAlertBaseline = stockAlertBaseline;
      product.stockAlertBaseline = stockAlertBaseline;
    }
    if (Object.keys(normalizationUpdates).length) {
      batch.update(productDoc.ref, normalizationUpdates);
      hasBatchUpdates = true;
    }
    updatedProducts.push(product);
  });

  if (hasBatchUpdates) {
    try {
      await batch.commit();
    } catch (error) {
      // Product management must remain available even if this legacy cleanup
      // write is rejected or temporarily offline.
      console.warn("Out-of-stock feature cleanup could not be saved:", error);
    }
  }
  return updatedProducts;
};

const VendorProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vendorId, setVendorId] = useState(null);
  const [tabOpt, setTabOpt] = useState("Active");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [totalProducts, setTotalProducts] = useState(0);
  const [isViewProductModalOpen, setIsViewProductModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isAddProductBusy, setIsAddProductBusy] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showDisableConfirmation, setShowDisableConfirmation] = useState(false);
  const [disableLoading, setDisableLoading] = useState(false);
  const [action, setAction] = useState("");
  const [isRestocking, setIsRestocking] = useState(false); // New state
  const [restockValues, setRestockValues] = useState({});
  const [rLoading, setRLoading] = useState(false);
  const [oLoading, setOLoading] = useState(false);
  const [mLoading, setMLoading] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [picking, setPicking] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [sortOption, setSortOption] = useState(DEFAULT_PRODUCT_SORT);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [viewStatsById, setViewStatsById] = useState({});
  const [selectedProductImage, setSelectedProductImage] = useState("");
  const [fullImageIndex, setFullImageIndex] = useState(null);

  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isMultiDiscountModalOpen, setIsMultiDiscountModalOpen] =
    useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [actionProduct, setActionProduct] = useState(null);
  const longPressTimerRef = useRef(null);
  const longPressOriginRef = useRef(null);
  const suppressProductClickRef = useRef(false);
  const firstProductPageRef = useRef(new Map());
  const additionalProductPagesRef = useRef(new Map());
  const lastProductDocRef = useRef(null);
  const hasMoreProductsRef = useRef(true);
  const loadingMoreProductsRef = useRef(false);
  const productLoadSentinelRef = useRef(null);
  const requestedViewStatsRef = useRef(new Set());
  const viewStatsRetryTimersRef = useRef(new Set());
  const productsRef = useRef([]);
  const lastViewStatsRefreshAtRef = useRef(0);

  const { vendorData } = useContext(VendorContext);
  const canManageCatalogue = Boolean(
    (vendorData?.isApproved === true ||
      vendorData?.profileComplete === true) &&
      vendorData?.isDeactivated !== true,
  );

  const [pickedProducts, setPickedProducts] = useState([]);
  const [pickState, setPickState] = useState(null);

  const auth = getAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { highlightId } = location.state || {};

  const commitProductPages = useCallback(() => {
    const merged = new Map([
      ...firstProductPageRef.current,
      ...additionalProductPagesRef.current,
    ]);
    const nextProducts = [...merged.values()];
    setProducts(nextProducts);
    setTotalProducts(nextProducts.length);
  }, []);

  const loadNextProductPage = useCallback(async () => {
    if (
      !vendorId ||
      !lastProductDocRef.current ||
      !hasMoreProductsRef.current ||
      loadingMoreProductsRef.current
    ) {
      return false;
    }

    loadingMoreProductsRef.current = true;
    setLoadingMoreProducts(true);
    setLoadMoreError(false);
    try {
      const nextPageQuery = query(
        collection(db, "products"),
        where("vendorId", "==", vendorId),
        where("isDeleted", "==", false),
        orderBy("createdAt", "desc"),
        startAfter(lastProductDocRef.current),
        limit(PRODUCT_PAGE_SIZE),
      );
      const snapshot = await getDocs(nextPageQuery);
      const pageProducts = await normalizeVendorProductDocs(snapshot.docs);
      pageProducts.forEach((product) => {
        additionalProductPagesRef.current.set(product.id, product);
      });

      if (snapshot.docs.length) {
        lastProductDocRef.current = snapshot.docs[snapshot.docs.length - 1];
      }
      const hasMore = snapshot.size === PRODUCT_PAGE_SIZE;
      hasMoreProductsRef.current = hasMore;
      setHasMoreProducts(hasMore);
      commitProductPages();
      return snapshot.size > 0;
    } catch (error) {
      console.error("Loading more vendor products failed:", error);
      setLoadMoreError(true);
      toast.error("More products could not be loaded. Please try again.");
      return false;
    } finally {
      loadingMoreProductsRef.current = false;
      setLoadingMoreProducts(false);
    }
  }, [commitProductPages, vendorId]);

  const renderVariants = (variants) => {
    const groupedVariants = groupVariantsByColor(variants);
    return Object.entries(groupedVariants).map(
      ([color, variants], colorIndex) => {
        const hasOutOfStockVariant = variants.some(
          (variant) => variant.stock === 0,
        );

        return (
          <div
            key={colorIndex}
            className="bg-customSoftGray p-3 rounded-lg relative"
          >
            {hasOutOfStockVariant && tabOpt !== "OOS" && (
              <div className="absolute top-2 right-2 w-3 h-3 bg-customOrange rounded-full animate-ping"></div>
            )}

            <p className="text-black font-semibold text-sm mb-2">
              Color: {color}
            </p>

            {/* Vertical table layout for sizes and quantities */}
            <table className="w-custVCard text-left border-collapse">
              <thead>
                <tr className="space-x-8">
                  <th className="text-black font-semibold text-sm pb-2 border-b border-customOrange border-opacity-40">
                    Size
                  </th>
                  <th className="text-black text-right font-semibold text-sm pb-2 border-b border-customOrange border-opacity-40">
                    Quantity
                  </th>
                </tr>
              </thead>

              <tbody>
                {variants.map((variant) => {
                  const variantKey = `${variant.color}-${variant.size}`;
                  return (
                    <>
                      <tr key={variantKey} className="space-x-8">
                        <td className="py-2 text-sm font-normal border-b border-customOrange border-opacity-40">
                          {variant.size}
                        </td>
                        <td
                          className={`py-2 text-sm text-right font-normal border-b border-customOrange border-opacity-40 ${
                            Number(variant.stock || 0) < 1
                              ? "text-red-500"
                              : ""
                          }`}
                        >
                          {isRestocking ? (
                            <input
                              type="number"
                              className="border text-right no-spinner p-1 ml-2 rounded-[10px] focus:outline-customOrange h-6 w-24"
                              value={restockValues[variantKey]?.quantity || ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Prevent negative values
                                if (value >= 0) {
                                  handleRestockInputChange(
                                    "quantity",
                                    variantKey,
                                    value,
                                  );
                                } else {
                                  toast.error(
                                    "Please enter a non-negative value.",
                                  );
                                }
                              }}
                            />
                          ) : variant.stock > 0 ? (
                            variant.stock
                          ) : (
                            <span className="font-semibold">Out of stock</span>
                          )}
                        </td>
                      </tr>
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      },
    );
  };

  useEffect(() => {
    let unsubscribe;

    // Set up real-time listener for the selected product when the modal is open
    if (selectedProduct && isViewProductModalOpen) {
      const productRef = doc(db, "products", selectedProduct.id);

      unsubscribe = onSnapshot(productRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const nextProduct = { id: docSnapshot.id, ...docSnapshot.data() };
          setSelectedProduct(nextProduct);
          if (firstProductPageRef.current.has(nextProduct.id)) {
            firstProductPageRef.current.set(nextProduct.id, nextProduct);
          }
          if (additionalProductPagesRef.current.has(nextProduct.id)) {
            additionalProductPagesRef.current.set(nextProduct.id, nextProduct);
          }
          setProducts((current) =>
            current.map((product) =>
              product.id === nextProduct.id ? nextProduct : product,
            ),
          );
        }
      });
    }

    // Clean up the listener when the modal closes
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [selectedProduct?.id, isViewProductModalOpen]);

  useEffect(() => {
    // Only set the vendorId when authenticated, then call fetchVendorProducts
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setVendorId(user.uid);
        console.log("Vendor ID set:", user.uid);
      } else {
        toast.error("Unauthorized access or no user is signed in.");
        setLoading(false);
        navigate("/vendorlogin", {
          replace: true,
          state: { returnTo: "/vendor-products" },
        });
      }
    });

    return () => unsubscribeAuth(); // Clean up on unmount
  }, [auth, navigate]);

  // Keep the first 50 products live. Additional pages are fetched only when
  // the vendor approaches the end of the catalogue or searches/filters it.
  useEffect(() => {
    if (!vendorId) return;

    firstProductPageRef.current = new Map();
    additionalProductPagesRef.current = new Map();
    lastProductDocRef.current = null;
    hasMoreProductsRef.current = true;
    loadingMoreProductsRef.current = false;
    requestedViewStatsRef.current = new Set();
    setProducts([]);
    setViewStatsById({});
    setHasMoreProducts(true);
    setLoadingMoreProducts(false);
    setLoadMoreError(false);
    setProductsLoading(true);
    const productsQuery = query(
      collection(db, "products"),
      where("vendorId", "==", vendorId),
      where("isDeleted", "==", false),
      orderBy("createdAt", "desc"),
      limit(PRODUCT_PAGE_SIZE),
    );

    const unsubscribe = onSnapshot(productsQuery, async (snapshot) => {
      try {
        const updatedProducts = await normalizeVendorProductDocs(snapshot.docs);
        firstProductPageRef.current = new Map(
          updatedProducts.map((product) => [product.id, product]),
        );
        if (!additionalProductPagesRef.current.size) {
          lastProductDocRef.current = snapshot.docs.length
            ? snapshot.docs[snapshot.docs.length - 1]
            : null;
          const hasMore = snapshot.size === PRODUCT_PAGE_SIZE;
          hasMoreProductsRef.current = hasMore;
          setHasMoreProducts(hasMore);
        }
        commitProductPages();
      } catch (error) {
        console.error("Vendor product normalization failed:", error);
        toast.error("Your products could not be refreshed. Please try again.");
      } finally {
        setProductsLoading(false);
      }
    }, (error) => {
      console.error("Vendor products listener failed:", error);
      setProductsLoading(false);
      toast.error("Your products could not be refreshed. Please try again.");
    });
    return () => unsubscribe();
  }, [commitProductPages, vendorId]);

  useEffect(() => {
    const sentinel = productLoadSentinelRef.current;
    if (
      !sentinel ||
      !hasMoreProducts ||
      productsLoading ||
      loadingMoreProducts ||
      loadMoreError
    ) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void loadNextProductPage();
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    hasMoreProducts,
    loadMoreError,
    loadNextProductPage,
    loadingMoreProducts,
    productsLoading,
  ]);

  // Catalogue management search must include drafts and unavailable products,
  // which the public search index intentionally excludes. Hydrate remaining
  // 50-item pages in the background while either management filter is active.
  useEffect(() => {
    const catalogueFilterActive =
      Boolean(searchTerm.trim()) ||
      lowStockOnly ||
      sortOption !== DEFAULT_PRODUCT_SORT;
    if (
      !catalogueFilterActive ||
      !hasMoreProducts ||
      loadingMoreProducts ||
      productsLoading ||
      loadMoreError
    ) {
      return;
    }
    void loadNextProductPage();
  }, [
    hasMoreProducts,
    loadNextProductPage,
    loadingMoreProducts,
    loadMoreError,
    lowStockOnly,
    productsLoading,
    searchTerm,
    sortOption,
  ]);

  const loadViewStatsForIds = useCallback(async (rawProductIds) => {
    const productIds = [...new Set(rawProductIds.filter(Boolean))];
    if (!productIds.length) return;

    try {
      const nextStats = {};
      const getViewStats = httpsCallable(
        functions,
        "getMyVendorProductViewStatsV1",
      );
      for (
        let offset = 0;
        offset < productIds.length;
        offset += VIEW_STATS_CHUNK_SIZE
      ) {
        const ids = productIds.slice(offset, offset + VIEW_STATS_CHUNK_SIZE);
        ids.forEach((id) => {
          nextStats[id] = 0;
        });
        const response = await getViewStats({ productIds: ids });
        const stats = Array.isArray(response?.data?.stats)
          ? response.data.stats
          : [];
        stats.forEach((row) => {
          if (!row?.productId) return;
          nextStats[row.productId] = Math.max(
            0,
            Number(row.completedViews || 0),
          );
        });
      }
      setViewStatsById((current) => ({ ...current, ...nextStats }));
    } catch (error) {
      // Backward-compatible fallback while the callable is unavailable. This
      // projection is delayed, but it is preferable to hiding all view data.
      try {
        const fallbackStats = {};
        for (let offset = 0; offset < productIds.length; offset += 30) {
          const ids = productIds.slice(offset, offset + 30);
          const statsSnapshot = await getDocs(
            query(
              collection(db, "product_rank_signals_v2"),
              where(documentId(), "in", ids),
            ),
          );
          ids.forEach((id) => {
            fallbackStats[id] = 0;
          });
          statsSnapshot.docs.forEach((statsDoc) => {
            fallbackStats[statsDoc.id] = Math.max(
              0,
              Number(statsDoc.data()?.metrics24h?.views || 0),
            );
          });
        }
        setViewStatsById((current) => ({ ...current, ...fallbackStats }));
      } catch (fallbackError) {
        productIds.forEach((id) => requestedViewStatsRef.current.delete(id));
        console.warn("Vendor product view stats could not be loaded:", {
          callableCode: error?.code || "unknown",
          fallbackCode: fallbackError?.code || "unknown",
        });
      }
    }
  }, []);

  useEffect(() => {
    productsRef.current = products;
    const missingIds = products
      .map((product) => product.id)
      .filter((id) => !requestedViewStatsRef.current.has(id));
    if (!missingIds.length) return undefined;

    missingIds.forEach((id) => requestedViewStatsRef.current.add(id));
    void loadViewStatsForIds(missingIds);

    // View events are aggregated asynchronously. One bounded follow-up avoids
    // permanently caching a zero returned in the short gap before aggregation.
    const timer = window.setTimeout(() => {
      viewStatsRetryTimersRef.current.delete(timer);
      void loadViewStatsForIds(missingIds);
    }, 3500);
    viewStatsRetryTimersRef.current.add(timer);
    return undefined;
  }, [loadViewStatsForIds, products]);

  useEffect(() => {
    const refreshVisibleViewStats = () => {
      if (document.visibilityState === "hidden") return;
      const now = Date.now();
      if (now - lastViewStatsRefreshAtRef.current < 1500) return;
      lastViewStatsRefreshAtRef.current = now;
      void loadViewStatsForIds(
        productsRef.current.map((product) => product.id),
      );
    };

    document.addEventListener("visibilitychange", refreshVisibleViewStats);
    window.addEventListener("focus", refreshVisibleViewStats);
    window.addEventListener("pageshow", refreshVisibleViewStats);
    return () => {
      document.removeEventListener("visibilitychange", refreshVisibleViewStats);
      window.removeEventListener("focus", refreshVisibleViewStats);
      window.removeEventListener("pageshow", refreshVisibleViewStats);
      viewStatsRetryTimersRef.current.forEach((timer) =>
        window.clearTimeout(timer),
      );
      viewStatsRetryTimersRef.current.clear();
    };
  }, [loadViewStatsForIds]);

  // The selected product listener above already keeps this value current.
  useEffect(() => {
    setIsPublished(Boolean(selectedProduct?.published));
  }, [selectedProduct?.published]);

  useEffect(() => {
    setSelectedProductImage(
      selectedProduct?.imageUrls?.[0] || selectedProduct?.coverImageUrl || "",
    );
    setFullImageIndex(null);
  }, [
    selectedProduct?.id,
    selectedProduct?.coverImageUrl,
    selectedProduct?.imageUrls,
  ]);

  useEffect(() => {
    if (!isViewProductModalOpen || !selectedProduct?.id) return;
    void loadViewStatsForIds([selectedProduct.id]);
  }, [isViewProductModalOpen, loadViewStatsForIds, selectedProduct?.id]);

  const handleProductClick = (product) => {
    void appHaptics.selection();
    setSelectedProduct(product);
    setproductId(product.id);
    setIsViewProductModalOpen(true);
  };

  const clearProductLongPress = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressOriginRef.current = null;
  };

  const beginProductLongPress = (event, product) => {
    if (picking || event.pointerType === "mouse" && event.button !== 0) return;
    clearProductLongPress();
    longPressOriginRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
    longPressTimerRef.current = window.setTimeout(() => {
      suppressProductClickRef.current = true;
      setSelectedProduct(product);
      setproductId(product.id);
      setActionProduct(product);
      void appHaptics.medium();
      clearProductLongPress();
    }, 500);
  };

  const moveProductLongPress = (event) => {
    const origin = longPressOriginRef.current;
    if (!origin) return;
    if (
      Math.abs(event.clientX - origin.x) > 10 ||
      Math.abs(event.clientY - origin.y) > 10
    ) {
      clearProductLongPress();
    }
  };

  const finishProductLongPress = () => {
    clearProductLongPress();
  };

  const handleProductCardClick = (product) => {
    if (suppressProductClickRef.current) {
      suppressProductClickRef.current = false;
      return;
    }
    if (picking) {
      void appHaptics.selection();
      togglePickProduct(product.id);
      return;
    }
    handleProductClick(product);
  };

  useEffect(() => () => clearProductLongPress(), []);

  const startPicking = () => {
    setPicking(true);
    setPickedProducts([]); // Reset picked products when toggling
  };

  const stopPicking = () => {
    void appHaptics.selection();
    setPickedProducts([]);
    setPickState(null);
    setPicking(false);
  };

  const togglePickProduct = (productId) => {
    setPickedProducts((prevPicked) =>
      prevPicked.includes(productId)
        ? prevPicked.filter((id) => id !== productId)
        : [...prevPicked, productId],
    );
  };

  // Function to check if picked products are only from the same tab
  const canPublishOrUnpublish = () => {
    if (pickedProducts.length === 0) return false;
    const selectedProducts = products.filter((p) =>
      pickedProducts.includes(p.id),
    );
    const isAllPublished = selectedProducts.every((p) => p.published);
    const isAllDrafted = selectedProducts.every((p) => !p.published);
    return (
      (tabOpt === "Active" && isAllPublished) ||
      (tabOpt === "Drafts" && isAllDrafted)
    );
  };
  useEffect(() => {
    if (!highlightId || productsLoading) return;

    const targetProduct = products.find(
      (product) => String(product.id) === String(highlightId),
    );
    if (!targetProduct) return;
    const targetTab = !targetProduct.published
      ? "Drafts"
      : Number(targetProduct.stockQuantity || 0) <= 0
        ? "OOS"
        : "Active";
    if (tabOpt !== targetTab) {
      setPickState(null);
      setPicking(false);
      setTabOpt(targetTab);
      return;
    }

    // Small timeout so that React has actually rendered all cards into the DOM first:
    const scrollTimer = setTimeout(() => {
      const el = document.getElementById(`product-${highlightId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("highlight-animation");
        window.setTimeout(() => el.classList.remove("highlight-animation"), 2000);
      }
    }, 300);
    return () => window.clearTimeout(scrollTimer);
  }, [highlightId, productsLoading, products, tabOpt]);

  const bulkPublishStateChange = async () => {
    setOLoading(true);
    try {
      for (const productId of pickedProducts) {
        const productRef = doc(db, "products", productId);
        await updateDoc(productRef, {
          published: tabOpt === "Drafts",
          isFeatured: false,
        });
      }
      toast.success(
        tabOpt === "Drafts"
          ? "Selected products published successfully."
          : "Selected products unpublished successfully.",
      );
      setPickedProducts([]);
      setPickState(null);
      setAction("");
      setPicking(false); // Reset picking state when toggling
      setShowConfirmation(false);
    } catch (error) {
      console.error("Error changing publish state: ", error);
      toast.error("Error changing publish state: " + error.message);
    } finally {
      setOLoading(false);
    }
  };

  const confirmBulkDeleteProduct = async () => {
    setOLoading(true);
    const vendorDocRef = doc(db, "vendors", vendorId);
    const length = pickedProducts.length;
    try {
      for (const productId of pickedProducts) {
        const productRef = doc(db, "products", productId);
        await updateDoc(productRef, {
          published: false, // Ensure the product is unpublished
          isDeleted: true,
        });

        await updateDoc(vendorDocRef, {
          productIds: arrayRemove(productId),
        });
      }
      toast.success("Selected products deleted successfully.");
      setPickedProducts([]);
      setPickState(null);
      setPicking(false); // Reset picking state when toggling
      setShowConfirmation(false);
      setAction("");

      await addActivityNote(
        `Deleted ${length > 1 ? "Products" : "a Product"}🗑`,
        `You removed ${length} product${
          length > 1 ? "s" : ""
        } from your store! ${
          length > 1 ? "These products" : "This product"
        } no longer exist in your store and customers that have ${
          length > 1 ? "them" : "it"
        } in their carts will be notified.`,
        "Product Update",
      );
    } catch (error) {
      console.error("Error deleting products: ", error);
      toast.error("Error deleting products: " + error.message);
    } finally {
      setOLoading(false);
    }
  };

  const handleBulkDiscountRemoval = async () => {
    if (pickedProducts.length === 0) return;
    setOLoading(true);
    const updatedProducts = []; // Store updated products for state update
    try {
      for (const productId of pickedProducts) {
        const productRef = doc(db, "products", productId);
        const productSnap = await getDoc(productRef);

        if (!productSnap.exists()) continue;

        const productData = productSnap.data();
        const discount = productData.discount;
        const initPrice = discount?.initialPrice;
        const notFreebie = discount?.discountType !== "personal-freebies";

        if (notFreebie) {
          await updateDoc(productRef, {
            price: initPrice,
            discount: null,
            discountId: null,
          });
          updatedProducts.push({
            ...productData,
            id: productId,
            price: initPrice,
            discount: null,
            discountId: null,
          });
        } else {
          await updateDoc(productRef, {
            discount: null,
            discountId: null,
          });
          updatedProducts.push({
            ...productData,
            id: productId,
            discount: null,
            discountId: null,
          });
        }
      }

      await addActivityNote(
        "Discounts Disabled ❌",
        `You've disabled the discount on some products. Customers can now only buy them at their original prices.`,
        "Product Update",
      );
      toast.success("Discounts removed from selected product(s).");

      setPickedProducts([]);
      setAction("");
      setPickState(null);
      setPicking(false); // Reset picking state when toggling
      setShowConfirmation(false);
    } catch (error) {
      console.error("Error in bulk discount removal: ", error);
      toast.error("Error in bulk discount removal: " + error.message);
    } finally {
      setOLoading(false);
    }
  };

  const openAddProductModal = () => {
    void appHaptics.medium();
    setIsAddProductBusy(false);
    setIsAddProductModalOpen(true);
  };

  const closeAddProductModal = ({ force = false } = {}) => {
    if (isAddProductBusy && !force) return;
    setIsAddProductModalOpen(false);
  };

  const closeModals = () => {
    setFullImageIndex(null);
    setIsViewProductModalOpen(false);
    setIsAddProductModalOpen(false);
    setIsEditModalOpen(false);
    setSelectedProduct(null);

    if (isRestocking) {
      setIsRestocking(false);
      setRestockValues({});
    }
  };
  const [productId, setproductId] = useState("null");

  const textToCopy = siteUrls.productShareUrl(productId || "null");

  const [copied, setCopied] = useState(false);
  const copyToClipboard = async () => {
    if (!copied) {
      console.log("Clicked");
      try {
        (await navigator.clipboard.writeText(textToCopy)) &&
          console.log("copied"); // Ensure the text is copied
        setCopied(true);
        void appHaptics.success();
        setTimeout(() => setCopied(false), 3000);
      } catch (err) {
        toast.error("Failed to copy!"); // Handle any errors during copy
        void appHaptics.error();
        console.error("Failed to copy text: ", err);
      }
    }
  };

  // Reverse Engineering the discount logic
  const closeDiscountModal = () => {
    setIsDiscountModalOpen(false);
  };

  const closeMultiDiscountModal = () => {
    setIsMultiDiscountModalOpen(false);
    setAction("");
  };

  const disableDiscount = async () => {
    setDisableLoading(true);
    try {
      const productRef = doc(db, "products", selectedProduct.id);

      let initPrice = selectedProduct.discount.initialPrice;
      let notFreebie =
        selectedProduct.discount.discountType !== "personal-freebies";

      notFreebie
        ? await updateDoc(productRef, {
            price: initPrice,
            discount: null,
            discountId: null,
          }).then(
            setProducts((prevProducts) =>
              prevProducts.map((p) =>
                p.id === selectedProduct.id
                  ? {
                      ...p,
                      price: initPrice,
                      discount: null,
                      discountId: null,
                    }
                  : p,
              ),
            ),
          )
        : await updateDoc(productRef, {
            discount: null,
            discountId: null,
          }).then(
            setProducts((prevProducts) =>
              prevProducts.map((p) =>
                p.id === selectedProduct.id
                  ? {
                      ...p,
                      discount: null,
                      discountId: null,
                    }
                  : p,
              ),
            ),
          );

      await addActivityNote(
        "Discount Disabled ❌",
        `You've disabled the discount on ${selectedProduct.name}. Customers can now only buy this at the original price.`,
        "Product Update",
      );
      toast.success("Discount disabled successfully.");
      void appHaptics.success();
    } catch (error) {
      console.error("Error disabling discount", error);
      toast.error("Error disabling discount: " + error.message);
      setDisableLoading(false);
    }
    setShowDisableConfirmation(false);
    setDisableLoading(false);
  };

  const zeroAllStock = async () => {
    setMLoading(true);
    try {
      // Legacy subProducts are intentionally preserved but no longer drive the UI.
      const variants = selectedProduct.variants || [];

      const productRef = doc(db, "products", selectedProduct.id);

      // Update variants with restock values
      const updatedVariants = variants.map((variant) => {
        return {
          ...variant,
          stock: 0,
        };
      });

      // Update Firestore with the modified stock quantities and total stockQuantity
      await updateDoc(productRef, {
        variants: updatedVariants,
        stockQuantity: 0, // Update the stockQuantity field with the new total
      });
      toast.success(`Product is now marked as "Sold Out"`);
      void appHaptics.success();
      await addActivityNote(
        "Product Sold Out 🚫",
        `You've marked ${selectedProduct.name} as "Sold Out". Customers will not be able to buy this product until it is restocked.`,
        "Product Update",
      );
    } catch (error) {
      console.error("Error marking as Sold Out:", error);
      toast.error("Error marking as Sold Out: " + error.message);
      void appHaptics.error();
    } finally {
      setMLoading(false);
      setShowConfirmation(false);
      setAction("");
    }
  };

  const addActivityNote = async (title, note, type) => {
    try {
      const activityNotesRef = collection(
        db,
        "vendors",
        vendorId,
        "activityNotes",
      );
      await addDoc(activityNotesRef, {
        title,
        type,
        note,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Error adding activity note: ", error);
      toast.error("Error adding activity note: " + error.message);
    }
  };

  const confirmDeleteProduct = async () => {
    setOLoading(true);
    try {
      const productId = selectedProduct.id;

      // Step 1: Update the 'isDeleted' field of the product in the 'products' collection
      await updateDoc(doc(db, "products", productId), {
        isDeleted: true,
        published: false, // Ensure the product is unpublished
      });

      // Step 2: Optionally, remove the productId from the vendor's 'productIds' array
      // (if needed for logic where you don't want the vendor to reference this product anymore)
      const vendorDocRef = doc(db, "vendors", vendorId);
      await updateDoc(vendorDocRef, {
        productIds: arrayRemove(productId),
      });

      // Step 3: Log activity for product deletion
      await addActivityNote(
        "Deleted Product 🗑",
        `You removed ${selectedProduct.name} from your store! This product no longer exists in your store and customers that have it in their carts will be notified.`,
        "Product Update",
      );

      // Update the products state
      setProducts(
        products.filter((product) => product.id !== selectedProduct.id),
      );

      toast.success("Product deleted successfully.");
      void appHaptics.success();
      closeModals();
    } catch (error) {
      console.error("Error deleting product: ", error);
      toast.error("Error deleting product: " + error.message);
      void appHaptics.error();
    } finally {
      setOLoading(false);
      setAction("");
      setShowConfirmation(false);
    }
  };

  // Toggle restock mode
  const toggleRestockMode = () => {
    setIsRestocking((prev) => !prev);
    setRestockValues({}); // Reset restock values
  };

  const hasValidRestockValues = () => {
    return Object.values(restockValues).some((value) => {
      return value?.quantity && parseInt(value.quantity, 10) > 0;
    });
  };

  // Handle restock input change
  const handleRestockInputChange = (type, id, value) => {
    setRestockValues((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [type]: value,
      },
    }));
  };

  // Submit restock changes to Firestore
  const handleSubmitRestock = async () => {
    setRLoading(true);
    try {
      // Legacy subProducts are intentionally preserved but no longer drive the UI.
      const variants = selectedProduct.variants || [];

      const productRef = doc(db, "products", selectedProduct.id);

      // Update variants with restock values
      const updatedVariants = variants.map((variant) => {
        const variantKey = `${variant.color}-${variant.size}`;
        const restockQuantity = parseInt(
          restockValues[variantKey]?.quantity,
          10,
        );
        if (!isNaN(restockQuantity)) {
          return {
            ...variant,
            stock: restockQuantity,
          };
        }
        return variant;
      });

      const totalStock = updatedVariants.reduce(
        (sum, variant) => sum + (variant.stock || 0),
        0,
      );

      // Update Firestore with the modified stock quantities and total stockQuantity
      await updateDoc(productRef, {
        variants: updatedVariants,
        stockQuantity: totalStock, // Update the stockQuantity field with the new total
        // A restock starts a fresh depletion cycle. Products intentionally
        // stocked at 15 units or fewer will not receive low-stock warnings.
        stockAlertBaseline: totalStock,
      });

      toast.success("Product restocked successfully.");
      void appHaptics.success();
      await addActivityNote(
        "Restocked Product 🔄",
        `You restocked ${selectedProduct.name}! Customers can now buy more of this product from your store.`,
        "Product Update",
      );
      setIsRestocking(false);
      setRestockValues({});
    } catch (error) {
      console.error("Error restocking product:", error);
      toast.error("Error restocking product: " + error.message);
      void appHaptics.error();
    } finally {
      setRLoading(false);
    }
  };

  const handleDeleteProduct = () => {
    setAction("delete");
    setShowConfirmation(true);
  };

  const confirmStockReset = () => {
    setAction("markSoldOut");
    setShowConfirmation(true);
  };

  const handleBulkDelete = () => {
    setAction("bulkDelete");
    setShowConfirmation(true);
  };
  const truncateText = (text, maxLength = 20) => {
    if (!text) return "";
    return text.length <= maxLength
      ? text
      : text.substring(0, maxLength) + "...";
  };

  const handlePublish = () => {
    setAction("publish");
    setShowConfirmation(true);
  };

  const handleUnpublish = () => {
    setAction("unpublish");
    setShowConfirmation(true);
  };

  // await addActivityNote(
  //   `Restocked Product 📦`,
  //   ` You’ve restocked ${selectedProduct.name}! Products are in stock and available for purchase.`,
  //   "Product Update"
  // );
  // Helper function to group variants by color
  const groupVariantsByColor = (variants) => {
    return variants.reduce((acc, variant) => {
      if (!acc[variant.color]) {
        acc[variant.color] = [];
      }
      acc[variant.color].push(variant);
      return acc;
    }, {});
  };

  const totalOutOfStock = products.filter((p) => p.stockQuantity === 0).length;

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredProducts = products
    .filter((p) => {
      let matchesTab = false;
      if (tabOpt === "Active") {
        if (pickState === "addDisc") {
          matchesTab = (
            p.published && p.stockQuantity > 0 && !p.discountId && !p.discount
          );
        } else if (pickState === "remDisc") {
          matchesTab = (
            p.published && p.stockQuantity > 0 && p.discountId && p.discount
          );
        } else matchesTab = p.published && p.stockQuantity > 0;
      } else if (tabOpt === "OOS") {
        if (pickState === "addDisc") {
          matchesTab = p.stockQuantity === 0 && !p.discountId && !p.discount;
        } else if (pickState === "remDisc") {
          matchesTab = p.stockQuantity === 0 && p.discountId && p.discount;
        } else matchesTab = p.stockQuantity === 0;
      } else {
        if (pickState === "addDisc") {
          matchesTab = !p.published && !p.discountId && !p.discount;
        } else if (pickState === "remDisc") {
          matchesTab = !p.published && p.discountId && p.discount;
        } else matchesTab = !p.published;
      }

      if (!matchesTab) return false;
      if (lowStockOnly && !needsStockAttention(p)) return false;
      if (!normalizedSearchTerm) return true;

      return [
        p.name,
        p.productType,
        p.subType,
        p.category,
        ...(Array.isArray(p.tags) ? p.tags : []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearchTerm);
    })
    .sort((a, b) => {
      if (sortOption === "price_desc") {
        return Number(b.price || 0) - Number(a.price || 0);
      }
      if (sortOption === "price_asc") {
        return Number(a.price || 0) - Number(b.price || 0);
      }
      if (sortOption === "newest" || sortOption === "oldest") {
        const left = productCreatedAtMillis(a);
        const right = productCreatedAtMillis(b);
        if (!left && !right) return 0;
        if (!left) return 1;
        if (!right) return -1;
        return sortOption === "newest" ? right - left : left - right;
      }

      // Newest-first is the inventory default, including for any legacy
      // sort value restored from an older app build.
      return productCreatedAtMillis(b) - productCreatedAtMillis(a);
    });

  const formatNumber = (num) => {
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // New products store the cover as imageUrls[0]. Only fall back to the legacy
  // cover field when there is no gallery, otherwise a one-image product can be
  // mistaken for a two-image product when its URLs differ by a transform.
  const selectedProductImages = Array.from(
    new Set(
      (Array.isArray(selectedProduct?.imageUrls) &&
      selectedProduct.imageUrls.filter(Boolean).length
        ? selectedProduct.imageUrls
        : [selectedProduct?.coverImageUrl]
      ).filter(Boolean),
    ),
  );
  const selectedProductViews = selectedProduct?.id
    ? viewStatsById[selectedProduct.id]
    : undefined;

  return (
    <>
      <SEO
        title={`Your Store - My Thrift`}
        description={`Manage your products on My Thrift`}
        url={`https://www.shopmythrift.store/vendor-products`}
      />
      <div className="vendor-products-page min-h-[100dvh] bg-white font-satoshi">
        <AppPageHeader
          title={picking ? `${pickedProducts.length} selected` : "Products"}
          showBack={false}
          className="vendor-section-header vendor-products-header"
          rightAction={
            picking ? (
              <button
                type="button"
                onClick={stopPicking}
                className="text-sm font-semibold text-customOrange"
              >
                Cancel
              </button>
            ) : null
          }
        />
        <div className="mb-40 mx-3 pt-4 flex flex-col justify-center space-y-5 bg-white">
        <ScrollToTop />
        <div className="relative bg-customDeepOrange w-full h-c120 rounded-2xl flex flex-col justify-center px-4 py-2">
          <div className="absolute top-0 right-0">
            <img src="./Vector.png" alt="" className="w-16 h-24" />
          </div>
          <div className="absolute bottom-0 left-0">
            <img src="./Vector2.png" alt="" className="w-16 h-16" />
          </div>
          <div className="flex flex-col justify-center items-center space-y-3">
            <p className="text-white text-lg">
              {tabOpt === "Active"
                ? tabOpt
                : tabOpt === "Drafts"
                  ? "Drafted"
                  : "Out of Stock"}{" "}
              Products
            </p>
            <p className="text-white text-3xl font-bold">
              {productsLoading ? (
                <Skeleton width={38} height={28} className="opacity-50" />
              ) : (
                filteredProducts.length
              )}
            </p>
          </div>
        </div>
        <div className="flex justify-center space-x-5 items-center">
          <div className="flex flex-col justify-center items-center space-y-3">
            <p
              className={`text-sm cursor-pointer ${
                tabOpt === "Active" ? "text-customOrange" : "text-black"
              }`}
              onClick={() => {
                if (tabOpt !== "Active") void appHaptics.selection();
                setTabOpt("Active");
              }}
            >
              Active
            </p>
            <div className="h-1">
              {tabOpt === "Active" && (
                <hr className="text-customOrange opacity-40  w-11" />
              )}
            </div>
          </div>
          <div className="flex flex-col justify-center items-center space-y-3">
            <p
              className={`text-sm cursor-pointer flex space-x-1 ${
                tabOpt === "OOS" ? "text-customOrange" : "text-black"
              }`}
              onClick={() => {
                if (tabOpt !== "OOS") void appHaptics.selection();
                setTabOpt("OOS");
              }}
            >
              Out of Stock{" "}
              {totalOutOfStock > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full flex items-center justify-center w-5 h-5 animate-ping">
                  {totalOutOfStock}
                </span>
              )}
            </p>
            <div className="h-1">
              {tabOpt === "OOS" && (
                <hr className="text-customOrange opacity-40  w-11" />
              )}
            </div>
          </div>
          <div className="flex flex-col justify-center items-center space-y-3">
            <p
              className={` text-sm cursor-pointer ${
                tabOpt === "Drafts" ? "text-customOrange" : "text-black"
              }`}
              onClick={() => {
                if (tabOpt !== "Drafts") void appHaptics.selection();
                setTabOpt("Drafts");
              }}
            >
              Drafts
            </p>
            <div className="h-1">
              {tabOpt === "Drafts" && (
                <hr className="text-customOrange opacity-40  w-11" />
              )}
            </div>
          </div>
        </div>
        <div className="vendor-products-tools">
          <label className="vendor-products-search">
            <LuSearch aria-hidden="true" />
            <span className="sr-only">Search your catalogue</span>
            <input
              type="search"
              inputMode="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search your products"
              autoComplete="off"
            />
          </label>
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={sortSheetOpen}
            onClick={() => {
              void appHaptics.selection();
              setSortSheetOpen(true);
            }}
            className={`vendor-products-stock-filter ${
              lowStockOnly || sortOption !== DEFAULT_PRODUCT_SORT
                ? "is-active"
                : ""
            }`}
          >
            <LuSlidersHorizontal aria-hidden="true" />
            Sort &amp; filter
            {(lowStockOnly || sortOption !== DEFAULT_PRODUCT_SORT) && (
              <span className="vendor-products-stock-filter__count">
                {Number(lowStockOnly) +
                  Number(sortOption !== DEFAULT_PRODUCT_SORT)}
              </span>
            )}
          </button>
        </div>
        {(searchTerm.trim() ||
          lowStockOnly ||
          sortOption !== DEFAULT_PRODUCT_SORT) &&
          hasMoreProducts && (
            <p className="-mt-3 text-[11px] font-medium text-gray-500">
              Loading the complete catalogue so results include every product…
            </p>
          )}
        {tabOpt === "Active" &&
          (() => {
            const activeDiscountedProducts = products.filter(
              (product) =>
                product.discount && !product.isDeleted && product.published,
            );
            return (
              activeDiscountedProducts.length > 0 && (
                <div className="vendor-products-discount-banner -translate-y-2">
                  <span className="vendor-products-discount-banner__icon">
                    <TbRosetteDiscount aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#8f2f0f]">
                      Your discount campaign is live
                    </p>
                    <p className="mt-0.5 text-xs font-medium leading-5 text-[#9a4b2d]">
                      {activeDiscountedProducts.length} discounted product
                      {activeDiscountedProducts.length > 1 ? "s are" : " is"}{" "}
                      catching buyers’ attention. Your followers will be notified.
                    </p>
                  </div>
                </div>
              )
            );
          })()}

        <div
          className={` ${
            filteredProducts.length < 1 && " justify-center items-center text-center"
          } ${
            filteredProducts.length > 0 &&
            !productsLoading &&
            "grid grid-cols-2 gap-4"
          }`}
        >
          {filteredProducts &&
          filteredProducts.length > 0 &&
          !productsLoading ? (
            filteredProducts.map((product) => {
              const variantStock = getVariantStockSummary(product);
              const productIsLowStock = isGenuinelyLowStock(product);
              const completedViews = viewStatsById[product.id];
              const likeCount = Math.max(
                0,
                Number(
                  product.wishCount ??
                    product.likeCount ??
                    product.likesCount ??
                    0,
                ) || 0,
              );
              return (
                <div
                  key={product.id}
                  id={`product-${product.id}`}
                  className="vendor-product-card cursor-pointer p-1.5 sm:p-2"
                  onClick={() => handleProductCardClick(product)}
                  onPointerDown={(event) => beginProductLongPress(event, product)}
                  onPointerMove={moveProductLongPress}
                  onPointerUp={finishProductLongPress}
                  onPointerCancel={finishProductLongPress}
                  onPointerLeave={finishProductLongPress}
                  onContextMenu={(event) => event.preventDefault()}
                >
                  {/* Image container */}
                  <div
                    className={`
        relative aspect-square w-full rounded-xl bg-customSoftGray overflow-hidden
        ${
          highlightId === product.id
            ? "ring-4 ring-customOrange animate-pulse"
            : ""
        }
      `}
                  >
                    {tabOpt !== "OOS" &&
                      (variantStock.out > 0 || productIsLowStock) && (
                        <div className="vendor-product-card__stock-badges">
                          {variantStock.out > 0 && (
                            <span className="is-out">
                              {variantStock.out} variant
                              {variantStock.out === 1 ? "" : "s"} out
                            </span>
                          )}
                          {productIsLowStock && (
                            <span className="is-low">Low stock</span>
                          )}
                        </div>
                      )}

                    {picking ? (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePickProduct(product.id);
                        }}
                        className="absolute top-2 left-2"
                      >
                        {pickedProducts.includes(product.id) ? (
                          <GrRadialSelected className="text-customOrange w-6 h-6" />
                        ) : (
                          <FaRegCircle className="text-customOrange w-6 h-6" />
                        )}
                      </div>
                    ) : null}

                    {!picking && product.discount && (
                      <div className="absolute top-2 left-2 flex items-center">
                        {product.discount.discountType.startsWith(
                          "personal-freebies",
                        ) ? (
                          <div className="bg-customPink text-customOrange text-sm px-2 py-1 font-medium rounded-md">
                            {truncateText(product.discount.freebieText)}
                          </div>
                        ) : (
                          <div className="bg-customPink text-customOrange text-sm font-medium px-2 py-1 rounded-md">
                            -{product.discount.percentageCut}%
                          </div>
                        )}
                      </div>
                    )}

                    <img
                      src={product.coverImageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover rounded-xl bg-customSoftGray"
                    />
                    {likeCount > 0 && (
                      <span
                        className="vendor-product-card__likes"
                        aria-label={`${likeCount} product ${
                          likeCount === 1 ? "like" : "likes"
                        }`}
                      >
                        <RiHeart3Fill aria-hidden="true" />
                        {likeCount.toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* Text container */}
                  <div className="mt-2 flex flex-col space-y-1">
                    <div className="flex">
                      <p className="w-full truncate text-xs font-semibold text-black">
                        {product.name}
                      </p>
                    </div>

                    <div className="flex justify-between">
                      <p className="text-xs font-semibold text-black">
                        Total Stock: {product.stockQuantity}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 text-xs font-medium text-black">
                        &#x20a6;{formatNumber(product.price)}
                      </p>
                      <span
                        className="vendor-product-card__views"
                        aria-label={
                          Number.isFinite(completedViews)
                            ? `${completedViews} all-time product views`
                            : "Loading product views"
                        }
                        title="All-time product views"
                      >
                        <LuEye aria-hidden="true" />
                        {Number.isFinite(completedViews) ? completedViews : "—"}
                      </span>
                    </div>
                    {!product.published && (
                      <p className="text-xs font-semibold text-customOrange">
                        Unpublished Product
                      </p>
                    )}

                    {product.discount && (
                      <p className="text-xs font-semibold text-customRichBrown">
                        {product.discount.discountType.startsWith("inApp")
                          ? "In-App Discount"
                          : product.discount.discountType ===
                              "personal-monetary"
                            ? "Personal Monetary Discount"
                            : `Freebie: ${truncateText(
                                product.discount.freebieText,
                              )}`}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          ) : (normalizedSearchTerm || lowStockOnly) && !productsLoading ? (
            <p className="text-xs font-opensans mt-24">
              No products match this search and stock filter.
            </p>
          ) : tabOpt === "Active" && !productsLoading ? (
            <p className="text-xs font-opensans mt-24">
              📭 Your store has no active products yet. Upload items to start
              attracting customers!
            </p>
          ) : tabOpt === "OOS" && !productsLoading ? (
            <p className="text-xs font-opensans mt-24">
              📦 You currently have no items marked as out of stock.
            </p>
          ) : productsLoading ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col space-y-2">
                <Skeleton width={176} height={176} />
                <Skeleton width={120} height={12} />
                <Skeleton width={105} height={12} />
                <Skeleton width={70} height={12} />
              </div>
              <div className="flex flex-col space-y-2">
                <Skeleton width={176} height={176} />
                <Skeleton width={78} height={12} />
                <Skeleton width={135} height={12} />
                <Skeleton width={98} height={12} />
              </div>
              <div className="flex flex-col space-y-2">
                <Skeleton width={176} height={176} />
                <Skeleton width={98} height={12} />
                <Skeleton width={155} height={12} />
                <Skeleton width={66} height={12} />
              </div>
              <div className="flex flex-col space-y-2">
                <Skeleton width={176} height={176} />
                <Skeleton width={78} height={12} />
                <Skeleton width={135} height={12} />
                <Skeleton width={98} height={12} />
              </div>
              <div className="flex flex-col space-y-2">
                <Skeleton width={176} height={176} />
                <Skeleton width={88} height={12} />
                <Skeleton width={105} height={12} />
                <Skeleton width={90} height={12} />
              </div>
              <div className="flex flex-col space-y-2">
                <Skeleton width={176} height={176} />
                <Skeleton width={68} height={12} />
                <Skeleton width={145} height={12} />
                <Skeleton width={88} height={12} />
              </div>
              <div className="flex flex-col space-y-2">
                <Skeleton width={176} height={176} />
                <Skeleton width={70} height={12} />
                <Skeleton width={115} height={12} />
                <Skeleton width={67} height={12} />
              </div>
            </div>
          ) : (
            // <div className="flex flex-col justify-center items-center space-y-2">
            //   <Lottie
            //     className="w-10 h-10"
            //     animationData={LoadState}
            //     loop={true}
            //     autoplay={true}
            //   />
            //   <p className="text-xs">Loading products...</p>
            // </div>
            !productsLoading && (
              <p className="text-xs mt-24 font-opensans">
                📝 You have no saved draft products yet. Start a new listing and
                save it as a draft anytime!
              </p>
            )
          )}
        </div>
        <div
          ref={productLoadSentinelRef}
          className="flex min-h-12 items-center justify-center"
          aria-live="polite"
        >
          {loadingMoreProducts && (
            <span className="vendor-products-page-loader">
              <span aria-hidden="true" />
              Loading more products
            </span>
          )}
          {loadMoreError && hasMoreProducts && !loadingMoreProducts && (
            <button
              type="button"
              className="text-xs font-bold text-customOrange"
              onClick={() => {
                void appHaptics.selection();
                void loadNextProductPage();
              }}
            >
              Retry loading products
            </button>
          )}
          {!hasMoreProducts && totalProducts > PRODUCT_PAGE_SIZE && (
            <span className="text-[11px] font-medium text-gray-400">
              All products loaded
            </span>
          )}
        </div>
      </div>
      {!picking && (
        <button
          onClick={openAddProductModal}
          className={`fixed right-5 z-[1000] flex justify-center items-center ${
            canManageCatalogue
              ? "bg-customOrange shadow-md active:scale-95"
              : "bg-customOrange opacity-35 cursor-not-allowed"
          } text-white rounded-full w-11 h-11 transition-transform focus:outline-none`}
          style={{
            bottom:
              "calc(5.5rem + var(--app-safe-bottom, env(safe-area-inset-bottom, 0px)))",
          }}
          disabled={!canManageCatalogue}
          aria-label="Add product"
          data-vendor-tour="add-product"
        >
          <span className="text-3xl">
            <FiPlus />
          </span>
        </button>
      )}

      {!picking && !isViewProductModalOpen && (
        <AppScrollToTopButton bottomOffset={88} zIndex={999} />
      )}

      {picking && pickedProducts.length > 0 && pickState === "manage" ? (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className={`fixed bottom-0 z-[1001] flex px-4 ${
            canPublishOrUnpublish() ? "justify-between" : "justify-center"
          } py-3 bg-white text-white w-full h-[94px] shadow-lg focus:outline-none`}
        >
          {canPublishOrUnpublish() && (
            <p className="text-lg font-semibold font-opensans text-customRichBrown cursor-pointer">
              {tabOpt === "Active" ? (
                <p
                  className="text-lg font-semibold text-customRichBrown"
                  onClick={handleUnpublish}
                >
                  Unpublish
                </p>
              ) : (
                <p
                  className="text-lg font-semibold font-opensans text-customRichBrown cursor-pointer"
                  onClick={handlePublish}
                >
                  Publish
                </p>
              )}
            </p>
          )}
          <p
            className="text-lg font-semibold font-opensans text-customRichBrown mb-4 cursor-pointer"
            onClick={() => handleBulkDelete()}
          >
            Delete
          </p>
        </motion.div>
      ) : (
        picking &&
        pickedProducts.length > 0 && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className={`fixed bottom-0 z-[1001] flex px-4 justify-center py-3 bg-white text-white w-full h-[94px] shadow-lg focus:outline-none`}
          >
            <p className="text-lg font-semibold font-opensans text-customRichBrown">
              {pickState === "addDisc" ? (
                <p
                  className="text-lg font-semibold text-customRichBrown cursor-pointer"
                  // onClick={handleBulkAddDiscount}
                  onClick={() => {
                    setAction("addDiscount");
                    setIsMultiDiscountModalOpen(true);
                  }}
                >
                  Add Discount
                </p>
              ) : (
                pickState === "remDisc" && (
                  <p
                    className="text-lg font-semibold font-opensans text-customRichBrown cursor-pointer"
                    onClick={() => {
                      setAction("removeDiscount");
                      setShowConfirmation(true);
                    }}
                  >
                    Remove Discount
                  </p>
                )
              )}
            </p>
          </motion.div>
        )
      )}

      <VendorProductActionsSheet
        product={actionProduct}
        open={Boolean(actionProduct)}
        onClose={() => setActionProduct(null)}
        onView={() => {
          const product = actionProduct;
          setActionProduct(null);
          if (product) handleProductClick(product);
        }}
        onEdit={() => {
          const product = actionProduct;
          if (!product) return;
          setSelectedProduct(product);
          setproductId(product.id);
          setActionProduct(null);
          if (Number(product.editCount || 0) === 0) {
            setIsEditModalOpen(true);
          } else {
            setAction("editUnavailable");
            setShowConfirmation(true);
          }
        }}
        onStock={() => {
          const product = actionProduct;
          if (!product) return;
          setSelectedProduct(product);
          setproductId(product.id);
          setActionProduct(null);
          if (Number(product.stockQuantity || 0) <= 0) {
            setIsRestocking(true);
            setIsViewProductModalOpen(true);
          } else {
            setAction("markSoldOut");
            setShowConfirmation(true);
          }
        }}
        onDiscount={() => {
          const product = actionProduct;
          if (!product) return;
          setSelectedProduct(product);
          setproductId(product.id);
          setActionProduct(null);
          if (product.discount) {
            setShowDisableConfirmation(true);
          } else {
            setIsDiscountModalOpen(true);
          }
        }}
        onPublish={() => {
          const product = actionProduct;
          if (!product) return;
          setSelectedProduct(product);
          setPickedProducts([product.id]);
          setActionProduct(null);
          setAction(product.published ? "unpublish" : "publish");
          setShowConfirmation(true);
        }}
        onSelectMultiple={() => {
          setActionProduct(null);
          setPickState("manage");
          startPicking();
        }}
        onDelete={() => {
          const product = actionProduct;
          if (!product) return;
          setSelectedProduct(product);
          setproductId(product.id);
          setActionProduct(null);
          setAction("delete");
          setShowConfirmation(true);
        }}
      />

      <VendorProductSortSheet
        open={sortSheetOpen}
        onClose={() => setSortSheetOpen(false)}
        sort={sortOption}
        lowStockOnly={lowStockOnly}
        onApply={({ sort, lowStockOnly: nextLowStockOnly }) => {
          setSortOption(sort);
          setLowStockOnly(nextLowStockOnly);
          setSortSheetOpen(false);
        }}
      />

      {selectedProduct && (
        <VendorProductModal
          isOpen={isViewProductModalOpen}
          onClose={closeModals}
          onDel={handleDeleteProduct}
          footer={
            isRestocking ? (
              <div className="flex items-center gap-3">
                <motion.button
                  type="button"
                  onClick={() => {
                    void appHaptics.medium();
                    void handleSubmitRestock();
                  }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex h-12 w-full items-center justify-center rounded-xl bg-customOrange font-semibold text-white ${
                    !hasValidRestockValues() || rLoading ? "opacity-40" : ""
                  }`}
                  disabled={!hasValidRestockValues() || rLoading}
                >
                  {rLoading ? (
                    <RotatingLines
                      strokeColor="white"
                      strokeWidth="5"
                      animationDuration="0.75"
                      width="20"
                      visible={true}
                    />
                  ) : (
                    "Submit Restock"
                  )}
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    void appHaptics.selection();
                    toggleRestockMode();
                  }}
                  disabled={rLoading}
                  className="h-12 w-full rounded-xl border border-gray-300 bg-gray-100 font-semibold text-gray-800 disabled:opacity-40"
                >
                  Cancel
                </motion.button>
              </div>
            ) : (
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  void appHaptics.selection();
                  toggleRestockMode();
                }}
                className="h-12 w-full rounded-xl bg-customOrange font-semibold text-white"
              >
                Restock Item
              </motion.button>
            )
          }
        >
          <div className="vendor-product-details">
            {selectedProductImage && (
              <button
                type="button"
                className="vendor-product-details__hero-button"
                aria-label={`View ${selectedProduct.name} image full screen`}
                onClick={() => {
                  const imageIndex = Math.max(
                    0,
                    selectedProductImages.indexOf(selectedProductImage),
                  );
                  void appHaptics.selection();
                  setFullImageIndex(imageIndex);
                }}
              >
                <img
                  key={selectedProductImage}
                  src={selectedProductImage}
                  alt={selectedProduct.name}
                  className="vendor-product-details__hero"
                />
                <span
                  className="vendor-product-details__view-badge"
                  aria-label={
                    Number.isFinite(selectedProductViews)
                      ? `${selectedProductViews} all-time product views`
                      : "Loading product views"
                  }
                >
                  <LuEye aria-hidden="true" />
                  <strong>
                    {Number.isFinite(selectedProductViews)
                      ? selectedProductViews
                      : "—"}
                  </strong>
                  <small>
                    {selectedProductViews === 1 ? "view" : "views"}
                  </small>
                </span>
              </button>
            )}

            {selectedProductImages.length > 1 && (
              <div className="vendor-product-details__thumbnails">
                {selectedProductImages.map((url, index) => (
                  <button
                    type="button"
                    key={url}
                    aria-label={`Show product image ${index + 1}`}
                    aria-pressed={selectedProductImage === url}
                    onClick={() => {
                      void appHaptics.selection();
                      setSelectedProductImage(url);
                    }}
                    className={`vendor-product-details__thumbnail ${
                      selectedProductImage === url ? "is-selected" : ""
                    }`}
                  >
                  <img
                    src={url}
                    alt={`Product ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                  </button>
                ))}
              </div>
            )}

            <div className="vendor-product-details__title-row">
              <div className="min-w-0">
                <p className="truncate text-xl font-bold text-gray-950">
                  {selectedProduct.name}
                </p>
                <p className="mt-0.5 text-xs font-medium text-gray-500">
                  Product overview
                </p>
              </div>
              {selectedProduct.published && (
                <button
                  type="button"
                  aria-label={copied ? "Product link copied" : "Copy product link"}
                  className="vendor-product-details__copy"
                  onClick={copyToClipboard}
                >
                  {!copied ? (
                    <LuCopy />
                  ) : (
                    <LuCopyCheck />
                  )}
                </button>
              )}
            </div>
            <div className="vendor-product-details__info-card">
              <p className="text-black font-semibold  font-opensans text-sm">
                Price:{" "}
                <span className="font-normal">
                  &#x20a6;{formatNumber(selectedProduct.price)}
                </span>
              </p>
              <hr className="text-customOrange opacity-40" />

              <p className="text-black font-semibold font-opensans text-sm">
                Product Category:{" "}
                <span className="font-normal">{selectedProduct.category}</span>
              </p>
              <hr className="text-customOrange opacity-40   " />

              <p className="text-black font-semibold font-opensans text-sm">
                Quantity:{" "}
                <span
                  className={`${
                    selectedProduct.stockQuantity < 1 && "text-red-500"
                  }`}
                >
                  {selectedProduct.stockQuantity > 0
                    ? selectedProduct.stockQuantity
                    : "Out of stock"}
                </span>
              </p>
              <hr className="text-customOrange opacity-40   " />

              <p className="text-black font-semibold  font-opensans text-sm">
                Product Type:{" "}
                <span className="font-normal">
                  {selectedProduct.productType}
                </span>
              </p>
              <hr className="text-customOrange opacity-40   " />

              <p className="text-black font-semibold font-opensans text-sm">
                Product Condition:{" "}
                <span className="font-normal">{selectedProduct.condition}</span>
              </p>
              <hr className="text-customOrange opacity-40   " />

              <p className="text-black font-semibold font-opensans text-sm">
                Product Sub-type:{" "}
                <span className="font-normal">{selectedProduct.subType}</span>
              </p>
              <hr className="text-customOrange opacity-40" />

              <div className="text-black font-opensans font-semibold text-sm">
                <p className="text-black font-semibold text-sm mb-2">
                  Product Description
                </p>{" "}
                <p className="text-black font-normal text-sm leading-6">
                  {selectedProduct.description}
                </p>
              </div>

              {selectedProduct.condition === "defect" && (
                <>
                  {" "}
                  <p className="text-red-400 font-opensans font-semibold text-sm">
                    Defect Description:{" "}
                    <span className="font-normal">
                      {selectedProduct.defectDescription}
                    </span>
                  </p>
                  <hr className="text-customOrange opacity-40" />
                </>
              )}
            </div>

            {selectedProduct && selectedProduct.discount && (
              <div className="mt-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold font-opensans mb-2">
                    Product Discount Details
                  </h3>
                  <div
                    className="flex justify-between space-x-1 items-center text-red-600 mb-2 font-medium font-opensans text-base cursor-pointer"
                    onClick={() => {
                      void appHaptics.warning();
                      setShowDisableConfirmation(true);
                    }}
                  >
                    <div>Disable</div>
                    <TbRosetteDiscountOff className="text-2xl" />
                  </div>
                </div>

                {selectedProduct.discount ? (
                  <div className="flex items-center justify-between rounded-xl border border-orange-100 bg-orange-50 px-3 py-2">
                    <span className="text-sm font-semibold font-opensans text-[#8f2f0f]">
                      {selectedProduct.discount.discountType.startsWith("inApp")
                        ? "In‑App Discount"
                        : selectedProduct.discount.discountType ===
                            "personal-monetary"
                          ? "Personal Monetary Discount"
                          : selectedProduct.discount.discountType ===
                              "personal-freebies"
                            ? `Freebie: ${truncateText(
                                selectedProduct.discount.freebieText,
                              )}`
                            : ""}
                    </span>
                    <span className="rounded-full bg-customOrange px-2 py-1 text-xs text-white">
                      Active
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center font-opensans justify-between p-2 bg-gray-200 rounded-full">
                    <span className="text-sm font-semibold  text-gray-600">
                      Discount
                    </span>
                    <span className="bg-gray-400 text-white text-xs px-2 py-1 rounded-full">
                      Inactive
                    </span>
                  </div>
                )}
                {(selectedProduct.discount.discountType.startsWith("inApp") ||
                  selectedProduct.discount.discountType ===
                    "personal-monetary") && (
                  <>
                    <div className="p-3 mb-4 flex w-full bg-gray-50  rounded-lg mt-3 flex-col justify-between space-y-3">
                      <p className="text-black font-semibold font-opensans text-sm">
                        Initial Price:
                        <span className="font-normal">
                          {" "}
                          &#x20a6;
                          {formatNumber(selectedProduct.discount.initialPrice)}
                        </span>
                      </p>
                      <hr className="text-customOrange opacity-40" />

                      <p className="text-black font-semibold font-opensans text-sm">
                        Discount Price:
                        <span className="font-normal">
                          {" "}
                          &#x20a6;
                          {formatNumber(selectedProduct.discount.discountPrice)}
                        </span>
                      </p>
                      <hr className="text-customOrange opacity-40" />

                      <p className="text-black font-semibold font-opensans text-sm">
                        Percentage:
                        <span className="font-normal">
                          {" "}
                          {selectedProduct.discount.percentageCut}%
                        </span>
                      </p>
                      <hr className="text-customOrange opacity-40" />

                      <p className="text-black font-semibold font-opensans text-sm">
                        Amount Off:
                        <span className="font-normal">
                          {" "}
                          &#x20a6;
                          {formatNumber(
                            selectedProduct.discount.subtractiveValue,
                          )}
                        </span>
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
            {selectedProduct?.variants?.length > 1 && (
              <p className="mt-6 text-lg font-opensans text-black font-semibold mb-2">
                {selectedProduct.variants.length - 1 === 1
                  ? "Product Variant"
                  : "Product Variants"}
              </p>
            )}
            <div className="mt-3 px-2">
              <div className="flex w-full font-opensans overflow-x-auto space-x-4 snap-x snap-mandatory">
                {renderVariants(selectedProduct.variants || [])}
              </div>
            </div>

            <hr className="border-gray-100 mt-5" />
      {selectedProduct && (
              <div className="vendor-product-details__section-title">
                <span className="vendor-product-details__section-icon">
                  <LuListChecks aria-hidden="true" />
                </span>
                <div>
                  <p>Product actions</p>
                  <span>Manage this listing</span>
                </div>
              </div>
            )}

            {selectedProduct && (
              <div className="vendor-product-details__actions">
                {!selectedProduct.discount && (
                  <button
                    type="button"
                    className="vendor-product-details__action-row"
                    onClick={() => {
                      void appHaptics.selection();
                      setIsDiscountModalOpen(true);
                    }}
                  >
                    <span className="vendor-product-details__action-copy">
                      <TbRosetteDiscount />
                      <span>Start a discount</span>
                    </span>
                    <LuChevronRight aria-hidden="true" />
                  </button>
                )}

                {!(selectedProduct.stockQuantity < 1) && (
                  <button
                    type="button"
                    className="vendor-product-details__action-row"
                    onClick={() => {
                      void appHaptics.warning();
                      confirmStockReset();
                    }}
                  >
                    <span className="vendor-product-details__action-copy">
                      <TbBoxOff />
                      <span>Mark as sold out</span>
                    </span>
                    <LuChevronRight aria-hidden="true" />
                  </button>
                )}

                <button
                    type="button"
                    className={`vendor-product-details__action-row ${
                      selectedProduct.editCount > 0 ? "is-disabled" : ""
                    }`}
                    onClick={() => {
                      void appHaptics.selection();
                      // If editCount is undefined or null, treat it as zero
                      const edits = selectedProduct.editCount ?? 0;

                      if (edits === 0) {
                        // only toggle if no edits yet
                        setIsEditModalOpen(!isEditModalOpen);
                      } else {
                        setAction("editUnavailable");
                        setShowConfirmation(true);
                      }
                    }}
                  >
                    <span className="vendor-product-details__action-copy">
                      <TbEdit />
                      <span>Edit product</span>
                    </span>
                    <LuChevronRight aria-hidden="true" />
                  </button>

                <div className="vendor-product-details__action-row">
                  <span className="vendor-product-details__action-copy">
                    {isPublished ? (
                      <MdPublishedWithChanges />
                    ) : (
                      <MdOutlineUnpublished />
                    )}
                    <span>{isPublished ? "Published" : "Unpublished"}</span>
                  </span>
                  <ToggleButton
                    itemId={selectedProduct.id}
                    initialIsOn={isPublished}
                    vendorId={vendorId}
                    name={selectedProduct.name}
                  />
                </div>
              </div>
            )}

          </div>
        </VendorProductModal>
      )}

      <VendorProductImageViewer
        open={Number.isInteger(fullImageIndex)}
        images={selectedProductImages}
        index={fullImageIndex || 0}
        productName={selectedProduct?.name || "Product"}
        onIndexChange={(nextIndex) => {
          setFullImageIndex(nextIndex);
          setSelectedProductImage(selectedProductImages[nextIndex] || "");
        }}
        onClose={() => setFullImageIndex(null)}
      />

      {selectedProduct && isDiscountModalOpen && (
        <SingleDiscountModal
          isOpen={isDiscountModalOpen}
          onRequestClose={closeDiscountModal}
          product={selectedProduct}
        />
      )}

      {isAddProductModalOpen && (
        <Modal
          isOpen={isAddProductModalOpen}
          onClose={closeAddProductModal}
          busy={isAddProductBusy}
        >
          <AddProduct
            vendorId={vendorId}
            closeModal={closeAddProductModal}
            onBusyChange={setIsAddProductBusy}
          />
        </Modal>
      )}

      {isEditModalOpen && (
        <EditProductModal
          selectedProduct={selectedProduct}
          vendorId={vendorId}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}

      {showDisableConfirmation && (
        <ConfirmationDialog
          isOpen={showDisableConfirmation}
          onClose={() => setShowDisableConfirmation(false)}
          onConfirm={disableDiscount}
          message="Are you sure you want to disable this discount?"
          icon={<TbRosetteDiscountOff className="w-4 h-4" />}
          title="Disable Product Discount"
          loading={disableLoading}
        />
      )}

      {showConfirmation &&
        (action === "delete" ? (
          <ConfirmationDialog
            isOpen={showConfirmation}
            onClose={() => setShowConfirmation(false)}
            onConfirm={confirmDeleteProduct}
            message="Are you sure you want to delete this product?"
            icon={<IoTrashOutline className="w-4 h-4" />}
            title="Delete Product"
            loading={oLoading}
          />
        ) : action === "bulkDelete" ? (
          <ConfirmationDialog
            isOpen={showConfirmation}
            onClose={() => setShowConfirmation(false)}
            onConfirm={confirmBulkDeleteProduct}
            message="Are you sure you want to delete these products?"
            icon={<IoTrashOutline className="w-4 h-4" />}
            title="Delete Product(s)"
            loading={oLoading}
          />
        ) : action === "publish" ? (
          <ConfirmationDialog
            isOpen={showConfirmation}
            onClose={() => setShowConfirmation(false)}
            onConfirm={bulkPublishStateChange}
            message="Are you sure you want to publish these products?"
            icon={<MdPublishedWithChanges className="w-4 h-4" />}
            title="Publish Products"
            loading={oLoading}
          />
        ) : action === "unpublish" ? (
          <ConfirmationDialog
            isOpen={showConfirmation}
            onClose={() => setShowConfirmation(false)}
            onConfirm={bulkPublishStateChange}
            message="Are you sure you want to unpublish these products?"
            icon={<MdOutlineUnpublished className="w-4 h-4" />}
            title="Unpublish Products"
            loading={oLoading}
          />
        ) : action === "editUnavailable" ? (
          <ConfirmationDialog
            isOpen={showConfirmation}
            onClose={() => setShowConfirmation(false)}
            message={`Cannot edit a product more than once at base level...`}
            loading={mLoading}
          />
        ) : action === "markSoldOut" ? (
          <ConfirmationDialog
            isOpen={showConfirmation}
            onClose={() => setShowConfirmation(false)}
            onConfirm={zeroAllStock}
            message={`Marking as "Sold-Out" will set the stock of every current variant to zero. Are you sure you want to proceed?`}
            icon={<TbBoxOff className="w-4 h-4" />}
            title="Mark as Sold-Out"
            loading={mLoading}
          />
        ) : action === "removeDiscount" ? (
          <ConfirmationDialog
            isOpen={showConfirmation}
            onClose={() => setShowConfirmation(false)}
            onConfirm={handleBulkDiscountRemoval}
            message="Are you sure you want to remove discount from the selected product(s)?"
            icon={<TbRosetteDiscountOff className="w-4 h-4" />}
            title="Remove Discount"
            loading={oLoading}
          />
        ) : null)}

      {action === "addDiscount" && (
        <MultiDiscountModal
          isOpen={isMultiDiscountModalOpen}
          onRequestClose={closeMultiDiscountModal}
          product={pickedProducts}
        />
      )}
      </div>
    </>
  );
};

export default VendorProducts;
