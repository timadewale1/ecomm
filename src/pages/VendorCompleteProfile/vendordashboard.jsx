import { siteUrls } from "../../config/siteUrls.mjs";
import React, {
  useEffect,
  useState,
  useContext,
  useCallback,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import {
  collection,
  query,
  where,
  updateDoc,
  onSnapshot,
  doc,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../../firebase.config";

import toast from "react-hot-toast";
import Modal from "../../components/layout/Modal";
import AddProduct from "../vendor/AddProducts";
import { useNavigate, useLocation } from "react-router-dom";
// import Loading from "../../components/Loading/Loading";
import { useSelector, useDispatch } from "react-redux";
import {
  fetchRecentActivities,
  RECENT_ACTIVITY_CACHE_TTL_MS,
  resetActivities,
} from "../../redux/recentActivitiesSlice.js";
import { VendorContext } from "../../components/Context/Vendorcontext";
import { FiPlus } from "react-icons/fi";
import { BsEye, BsEyeSlash } from "react-icons/bs";
import { LuCopy, LuCopyCheck, LuGauge, LuListFilter } from "react-icons/lu";
import {
  CheckCheck,
  ClipboardList,
  Clock3,
  Package,
} from "lucide-react";
import NotApproved from "../../components/Infos/NotApproved";
import Skeleton from "react-loading-skeleton";
import ScrollToTop from "../../components/layout/ScrollToTop";
import SEO from "../../components/Helmet/SEO";
import Lottie from "lottie-react";
import LoadState from "../../Animations/loadinganimation.json";
import MissingLocationModal from "../../components/Location/MissingLocationModal.jsx";
import TipChat from "../../components/TipsMaltilda.jsx";
import { getVendorDashboardRevenue } from "../../services/walletApi";
import VendorTour from "../../components/Tours/VendorTour";
import { appHaptics } from "../../services/haptics";
import NativePickerField from "../../components/Form/NativePickerField";
import {
  loadVendorWalletTransactions,
  readCachedVendorWalletTransactions,
} from "../../services/vendorWalletTransactions";
import { nativePlatform } from "../../services/platform";
import { vendorOrderStatistics } from "../../services/vendorOrderStatistics.mjs";
import { readRevenueHidden, toggleRevenueHidden, subscribeRevenueVisibility } from "../../services/vendorRevenueVisibility.mjs";

const isAndroidNative = nativePlatform === "android";

const ACTIVITY_FILTER_OPTIONS = [
  { value: "All", label: "All activity" },
  { value: "transactions", label: "Recent transactions" },
  { value: "order", label: "Orders" },
  { value: "Product Update", label: "Product updates" },
  { value: "profile", label: "Profile updates" },
];

const walletActivityTimestamp = (value) => {
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const walletActivityMoney = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 2,
});

const walletTransactionToActivity = (transaction) => ({
  id: `wallet:${transaction.id}`,
  type: "transactions",
  title: transaction.type === "credit" ? "Wallet credited" : "Wallet debited",
  note: `${transaction.title || transaction.description || "Wallet transaction"} · ${walletActivityMoney.format(Number(transaction.amount || 0))}${transaction.status ? ` · ${transaction.status}` : ""}`,
  timestampMs: walletActivityTimestamp(transaction.createdAt),
  reference: transaction.reference || null,
});

const formatPerformanceDuration = (value) => {
  const totalMinutes = Math.max(1, Math.round(Number(value || 0) / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  if (days) return `${days}d ${hours ? `${hours}h` : ""}`.trim();
  if (hours) return `${hours}h ${totalMinutes % 60 ? `${totalMinutes % 60}m` : ""}`.trim();
  return `${totalMinutes}m`;
};

const VendorDashboard = () => {
  const defaultImageUrl =
    "https://images.saatchiart.com/saatchi/1750204/art/9767271/8830343-WUMLQQKS-7.jpg";
  const { vendorData, loading } = useContext(VendorContext);
  // console.log("VendorDashboard render:", { vendorData, loading });

  const visibilityVendorId = vendorData?.vendorId;
  const subscribeVisibility = useCallback(
    (callback) => subscribeRevenueVisibility(visibilityVendorId, callback),
    [visibilityVendorId],
  );
  const hide = useSyncExternalStore(
    subscribeVisibility,
    () => readRevenueHidden(visibilityVendorId),
    () => true,
  );
  const toggleRevenue = () => toggleRevenueHidden(visibilityVendorId);
  // const [coverImageUrl, setCoverImageUrl] = useState(defaultImageUrl);
  const [filterOptions, setFilterOptions] = useState("All");
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [revenueReadyVendorId, setRevenueReadyVendorId] = useState(null);
  const [productsReadyVendorId, setProductsReadyVendorId] = useState(null);
  const [completionPerformance, setCompletionPerformance] = useState(null);
  const [walletActivities, setWalletActivities] = useState([]);
  // const [recentActivities, setRecentActivities] = useState([]);
  // const [activityLoading, setActivityLoading] = useState(false);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isAddProductBusy, setIsAddProductBusy] = useState(false);
  const canManageCatalogue = Boolean(
    (vendorData?.isApproved === true ||
      vendorData?.profileComplete === true) &&
      vendorData?.isDeactivated !== true,
  );

  const [showMissingLocationModal, setShowMissingLocationModal] =
    useState(false);
  const [locationFixing, setLocationFixing] = useState(false);

  // const [lastDoc, setLastDoc] = useState(null);
  // const [hasMore, setHasMore] = useState(true); // If there are more activities to load
  const navigate = useNavigate();
  const location = useLocation();
  const redirectedRef = useRef(false);
  const revenueRequestRef = useRef(0);
  const performanceRequestRef = useRef(0);
  const fulfilledBaselineRef = useRef({ vendorId: null, count: null });
  const dispatch = useDispatch();
  const {
    activities,
    lastDoc,
    status: activitiesStatus,
    error: activitiesError,
    hasMore,
    paginationReady,
    ownerVendorId: activitiesOwnerVendorId,
    lastFetchedAt: activitiesLastFetchedAt,
  } = useSelector((state) => state.activities);
  const vendorOrdersState = useSelector((state) => state.orders);
  const orderStatistics = useMemo(() => vendorOrderStatistics(
    vendorData?.vendorId && vendorOrdersState?.ownerVendorId === vendorData.vendorId
      ? vendorOrdersState.orders : [],
  ), [vendorData?.vendorId, vendorOrdersState?.ownerVendorId, vendorOrdersState?.orders]);
  const {total: totalOrders, fulfilled: totalFulfilledOrders, unfulfilled: totalUnfulfilledOrders} = orderStatistics;

  const fetchVendorRevenue = useCallback(async (vendorId) => {
    const requestId = ++revenueRequestRef.current;
    const cacheKey = `vendorRevenue_${vendorId}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached != null && Number.isFinite(Number(cached))) {
      setTotalRevenue(Number(cached));
      setRevenueReadyVendorId(vendorId);
    }

    try {
      const { data } = await getVendorDashboardRevenue(vendorId);
      const revenue = Number(data?.vendorRevenue || 0);
      if (requestId !== revenueRequestRef.current) return;
      localStorage.setItem(cacheKey, revenue.toString());
      setTotalRevenue(revenue);
    } catch (error) {
      // Keep a cached figure on screen, but leave a useful diagnostic for
      // genuine API failures rather than silently swallowing them.
      console.warn("[VendorDashboard] Revenue refresh failed", {
        vendorId,
        code: error?.code || "unknown",
      });
    } finally {
      if (requestId === revenueRequestRef.current) {
        // A provider failure must not leave the page skeleton mounted forever.
        // Cached/zero revenue remains the graceful fallback for this visit.
        setRevenueReadyVendorId(vendorId);
      }
    }
  }, []);

  useEffect(() => {
    const vendorId = vendorData?.vendorId;
    if (!vendorId) {
      setCompletionPerformance(null);
      return undefined;
    }
    const requestId = ++performanceRequestRef.current;
    let active = true;
    const getPerformance = httpsCallable(
      functions,
      "getMyVendorCompletionPerformanceV1",
    );
    const backfill = httpsCallable(
      functions,
      "backfillMyVendorCompletionMetricsV1",
    );
    const backfillKey = `vendorCompletionMetricsBackfillV1_${vendorId}`;

    const load = async () => {
      try {
        const initial = await getPerformance({});
        if (active && requestId === performanceRequestRef.current) {
          setCompletionPerformance(initial.data || null);
        }

        if (localStorage.getItem(backfillKey) === "complete") return;
        let cursor = null;
        do {
          const response = await backfill({cursor, pageSize: 100});
          cursor = response?.data?.complete
            ? null
            : response?.data?.nextCursor || null;
        } while (active && cursor);
        if (!active) return;
        localStorage.setItem(backfillKey, "complete");
        const refreshed = await getPerformance({});
        if (active && requestId === performanceRequestRef.current) {
          setCompletionPerformance(refreshed.data || null);
        }
      } catch (error) {
        // Performance is supplementary; an unavailable metric must never
        // block the dashboard or produce a customer-facing error toast.
        console.warn("[VendorDashboard] Completion benchmark unavailable", {
          code: error?.code || "unknown",
        });
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [vendorData?.vendorId]);

  useEffect(() => {
    const vendorId = vendorData?.vendorId;
    if (!vendorId) return;

    const ownsCache = activitiesOwnerVendorId === vendorId;
    const cacheIsFresh =
      ownsCache &&
      activitiesLastFetchedAt &&
      Date.now() - activitiesLastFetchedAt < RECENT_ACTIVITY_CACHE_TTL_MS;
    const requestInFlight = ["loading", "refreshing", "loadingMore"].includes(
      activitiesStatus,
    );
    const automaticAttemptAlreadyFailed = ownsCache && Boolean(activitiesError);

    // Persisted activity deliberately has no Firestore cursor. Revalidate once
    // in the background to recreate it before infinite scrolling is enabled.
    if (
      (!cacheIsFresh || !paginationReady) &&
      !requestInFlight &&
      !automaticAttemptAlreadyFailed
    ) {
      dispatch(fetchRecentActivities({ vendorId, nextPage: false }));
    }
  }, [
    activitiesLastFetchedAt,
    activitiesOwnerVendorId,
    activitiesError,
    activitiesStatus,
    dispatch,
    paginationReady,
    vendorData?.vendorId,
  ]);

  useEffect(() => {
    if (!loading && !vendorData && activitiesOwnerVendorId) {
      dispatch(resetActivities());
    }
  }, [activitiesOwnerVendorId, dispatch, loading, vendorData]);

  useEffect(() => {
    const vendorId = vendorData?.vendorId;
    if (!vendorId) {
      setProductsReadyVendorId(null);
      return undefined;
    }

    setTotalProducts(0);
    setProductsReadyVendorId(null);

    const productsQuery = query(
      collection(db, "products"),
      where("vendorId", "==", vendorId),
      where("isDeleted", "==", false),
    );
    const unsubscribeProducts = onSnapshot(
      productsQuery,
      (snapshot) => {
        setTotalProducts(snapshot.size);
        setProductsReadyVendorId(vendorId);
      },
      (error) => {
        console.warn("[VendorDashboard] Product count listener failed", {
          vendorId,
          code: error?.code || "unknown",
        });
        // Render the recoverable dashboard state instead of an endless loader.
        setProductsReadyVendorId(vendorId);
      },
    );

    return unsubscribeProducts;
  }, [vendorData?.vendorId]);

  useEffect(() => {
    const vendorId = vendorData?.vendorId;
    const fulfilledCount = totalFulfilledOrders;

    if (!vendorId) {
      fulfilledBaselineRef.current = {vendorId: null, count: null};
      return;
    }
    const baseline = fulfilledBaselineRef.current;
    if (baseline.vendorId !== vendorId || baseline.count == null) {
      fulfilledBaselineRef.current = {vendorId, count: fulfilledCount};
    } else if (baseline.count !== fulfilledCount) {
      fulfilledBaselineRef.current = {vendorId, count: fulfilledCount};
      void fetchVendorRevenue(vendorId);
    }
  }, [fetchVendorRevenue, vendorData?.vendorId, totalFulfilledOrders]);

  useEffect(() => {
    const vendorId = vendorData?.vendorId;
    if (!vendorId) {
      setWalletActivities([]);
      return undefined;
    }
    let cancelled = false;
    const cached = readCachedVendorWalletTransactions(vendorId);
    if (cached.length) {
      setWalletActivities(cached.map(walletTransactionToActivity));
    }
    void loadVendorWalletTransactions(vendorId)
      .then((transactions) => {
        if (!cancelled) {
          setWalletActivities(transactions.map(walletTransactionToActivity));
        }
      })
      .catch((error) => {
        console.warn("[VendorDashboard] Wallet activity refresh failed", {
          code: error?.code || "unknown",
        });
      });
    return () => { cancelled = true; };
  }, [vendorData?.vendorId]);

  useEffect(() => {
    const vendorId = vendorData?.vendorId;
    if (!vendorId) return undefined;
    void fetchVendorRevenue(vendorId);
    return () => {
      revenueRequestRef.current += 1;
    };
  }, [fetchVendorRevenue, vendorData?.vendorId]);
  useEffect(() => {
    const completionWasJustConfirmed =
      location.state?.vendorProfileCompletion === "confirmed";
    if (
      !loading &&
      vendorData &&
      vendorData.profileComplete === false &&
      !completionWasJustConfirmed
    ) {
      toast("Please complete your profile.");
      navigate("/complete-profile", { replace: true });
    }
  }, [vendorData, loading, navigate, location.state]);
  useEffect(() => {
    if (
      vendorData &&
      (!vendorData.location?.lat || !vendorData.location?.lng)
    ) {
      setShowMissingLocationModal(true);
    }
  }, [vendorData]);
  useEffect(() => {
    const blocked = localStorage.getItem("BLOCKED_VENDOR_EMAIL") === "1";
    if (!blocked) return;
    localStorage.removeItem("BLOCKED_VENDOR_EMAIL");
    navigate("/vendorlogin", { replace: true, state: { returnTo: location.pathname } });
  }, [navigate, location.pathname]);
  // If we can't read a vendorId once loading finishes, go back to where the user came from.
  useEffect(() => {
    if (loading || redirectedRef.current) return;
    const hasVendorId = !!vendorData?.vendorId;
    if (hasVendorId) return;

    // Prefer explicit `from` state set by your routers/guards
    const fromState = location.state?.from;

    // Same-origin document.referrer fallback (works if a hard nav happened)
    let fromReferrer = null;
    try {
      if (
        document.referrer &&
        document.referrer.startsWith(window.location.origin)
      ) {
        fromReferrer =
          new URL(document.referrer).pathname +
          new URL(document.referrer).search;
      }
    } catch {}

    const fallback = fromState || fromReferrer || "/";
    redirectedRef.current = true;
    navigate(fallback, { replace: true });
  }, [loading, vendorData, location.state, navigate]);

  const formatRevenue = (revenue) => {
    return revenue.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const visibleActivities = useMemo(() => {
    const savedActivities = activitiesOwnerVendorId === vendorData?.vendorId
      ? activities
      : [];
    // Provider wallet history is the authoritative transaction source. When
    // it is available, suppress older hand-written transaction notes so a
    // single credit or withdrawal is not shown twice.
    const nonDuplicateSaved = walletActivities.length
      ? savedActivities.filter((activity) => activity.type !== "transactions")
      : savedActivities;
    const byId = new Map();
    [...nonDuplicateSaved, ...walletActivities].forEach((activity) => {
      if (activity?.id) byId.set(activity.id, activity);
    });
    return [...byId.values()].sort(
      (left, right) =>
        Number(right.timestampMs || 0) - Number(left.timestampMs || 0),
    );
  }, [activities, activitiesOwnerVendorId, vendorData?.vendorId, walletActivities]);
  const filteredActivities = visibleActivities.filter((activity) => {
    if (filterOptions === "All") return true;
    return activity.type === filterOptions;
  });
  const isInitialActivityLoading =
    visibleActivities.length === 0 &&
    ["idle", "loading"].includes(activitiesStatus);
  const isLoadingMoreActivities = activitiesStatus === "loadingMore";
  const dashboardVendorId = vendorData?.vendorId || null;
  const initialOrdersReady =
    !dashboardVendorId ||
    (vendorOrdersState?.ownerVendorId === dashboardVendorId &&
      !["idle", "connecting"].includes(vendorOrdersState?.status));
  const initialActivitiesReady =
    !dashboardVendorId ||
    (activitiesOwnerVendorId === dashboardVendorId &&
      !["idle", "loading"].includes(activitiesStatus));
  const isInitialDashboardLoading =
    loading ||
    Boolean(
      dashboardVendorId &&
        (revenueReadyVendorId !== dashboardVendorId ||
          productsReadyVendorId !== dashboardVendorId ||
          !initialOrdersReady ||
          !initialActivitiesReady),
    );
  const handleLocationUpdate = async ({ lat, lng, Address }) => {
    setLocationFixing(true);
    try {
      await updateDoc(doc(db, "vendors", vendorData.vendorId), {
        Address,
        location: { lat, lng },
      });
      toast.success("Address updated successfully!");
      setShowMissingLocationModal(false);
    } catch (err) {
      console.error("Failed to update address:", err);
      toast.error("Error updating address.");
    } finally {
      setLocationFixing(false);
    }
  };

  const textToCopy = vendorData?.slug
    ? siteUrls.storeShareUrl({ slug: vendorData.slug })
    : "";

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
        void appHaptics.error();
        toast.error("Failed to copy!"); // Handle any errors during copy
        console.error("Failed to copy text: ", err);
      }
    }
  };

  const formatDateOrTime = (timestampMs) => {
    const eventDate = new Date(Number(timestampMs || 0));
    if (Number.isNaN(eventDate.getTime())) return "";
    const today = new Date();

    // Check if the event happened today by comparing year, month, and day
    const isToday =
      eventDate.getDate() === today.getDate() &&
      eventDate.getMonth() === today.getMonth() &&
      eventDate.getFullYear() === today.getFullYear();

    // Return time if it's today, else return the date
    if (isToday) {
      return eventDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }); // Format as HH:mm
    } else {
      return eventDate.toLocaleDateString(); // Return formatted date
    }
  };

  const getGreeting = () => {
    const currentHour = new Date().getHours(); // Get the current hour (0 - 23)
    let greeting;

    if (currentHour >= 0 && currentHour < 12) {
      greeting = "Good Morning";
    } else if (currentHour >= 12 && currentHour < 18) {
      greeting = "Good Afternoon";
    } else {
      greeting = "Good Evening";
    }

    return greeting;
  };

  // Example usage:
  const greeting = getGreeting();

  const observer = useRef();
  const lastActivityRef = useCallback(
    (node) => {
      if (isLoadingMoreActivities) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (
          entries[0].isIntersecting &&
          paginationReady &&
          hasMore &&
          lastDoc &&
          vendorData?.vendorId
        ) {
          dispatch(
            fetchRecentActivities({
              vendorId: vendorData.vendorId,
              nextPage: true,
              lastDoc,
            })
          );
        }
      });

      if (node) observer.current.observe(node);
    },
    [
      dispatch,
      hasMore,
      isLoadingMoreActivities,
      lastDoc,
      paginationReady,
      vendorData?.vendorId,
    ],
  );

  const openModal = () => {
    void appHaptics.medium();
    setIsAddProductBusy(false);
    setModalOpen(true);
  };
  const closeModal = useCallback(
    ({ force = false } = {}) => {
      if (isAddProductBusy && !force) return;
      setModalOpen(false);
    },
    [isAddProductBusy],
  );

  if (isInitialDashboardLoading) {
    return (
      <div className="mb-40 mx-3 my-7 flex flex-col justify-center space-y-1 font-satoshi">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div className="overflow-hidden w-11 h-11 rounded-full flex justify-center items-center mr-1">
              <Skeleton circle={true} height={44} width={44} />
            </div>
            <div className="ml-1 space-y-2">
              <Skeleton width={120} height={20} />
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center items-center mt-4">
          <div className="relative flex h-36 w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl bg-customSoftGray px-4 py-3">
            <Skeleton width={120} height={16} />
            <Skeleton width={150} height={34} />
            <div className="absolute inset-x-4 bottom-3">
              <Skeleton width="75%" height={14} />
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center mt-4">
          <p className="text-black text-lg text-start font-semibold mb-3">
            <Skeleton width={80} height={20} />
          </p>

          <div className="grid grid-cols-2 gap-2 justify-center">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="flex flex-col justify-between w-full min-h-[5.5rem] rounded-xl bg-customSoftGray p-3"
              >
                <div className="flex justify-between items-center">
                  <Skeleton width={30} height={30} />
                  <Skeleton width={100} height={15} />
                </div>
                <Skeleton width={40} height={20} />
                {i === 0 && <Skeleton width={112} height={11} />}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-center mt-4">
          <div className="flex justify-between mb-3">
            <Skeleton width={100} height={20} />
            <Skeleton width={30} height={20} />
          </div>

          <div className="flex flex-col space-y-2 text-black">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="mb-2 bg-customSoftGray rounded-2xl px-4 py-2"
              >
                <div className="flex justify-between mb-2">
                  <Skeleton width={100} height={15} />
                  <Skeleton width={50} height={15} />
                </div>
                <Skeleton width={"90%"} height={15} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!vendorData) {
    return (
      <p className="">Unable to load vendor data. Please try again later.</p>
    );
  }
  const comparableCompletionStats = [
    completionPerformance?.byKind?.delivery,
    completionPerformance?.byKind?.pickup,
  ].filter((stats) => Number(stats?.sampleCount) > 0);
  const comparableCompletionCount = comparableCompletionStats.reduce(
    (sum, stats) => sum + Number(stats.sampleCount || 0),
    0,
  );
  const comparableCompletionAverage = comparableCompletionCount
    ? comparableCompletionStats.reduce(
        (sum, stats) => sum + Number(stats.totalDurationMs || 0),
        0,
      ) / comparableCompletionCount
    : null;
  const strongestComparableSample = comparableCompletionStats.reduce(
    (max, stats) => Math.max(max, Number(stats.sampleCount || 0)),
    0,
  );
  const completionSamplesRemaining = Math.max(
    0,
    3 - strongestComparableSample,
  );
  return (
    <>
      {showMissingLocationModal && (
        <MissingLocationModal
          onLocationUpdate={handleLocationUpdate}
          isLoading={locationFixing}
          closeModal={() => setShowMissingLocationModal(false)}
        />
      )}

      <SEO
        title={`Vendor Dashboard - My Thrift`}
        description={`Manage your store on My Thrift`}
        url={`https://www.shopmythrift.store/vendordashboard`}
      />
      <div className="mb-40 mx-3 my-7 flex flex-col justify-center space-y-1 font-satoshi bg-white">
        <ScrollToTop />
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div
              className="overflow-hidden w-11 h-11 rounded-full flex justify-center items-center mr-1 cursor-pointer"
              onClick={() => navigate("/vendor-profile")}
            >
              <img
                src={vendorData.coverImageUrl || defaultImageUrl}
                alt="Vendor profile"
                className="rounded-full object-cover h-11 w-11"
              />
            </div>
            <div className="ml-1 space-y-2">
              <p className="font-bold text-lg text-black">
                {greeting}, {vendorData.firstName}
              </p>
            </div>
          </div>
        </div>

      {!vendorData.isApproved && (
          <div className="flex flex-col justify-center items-center">
            <NotApproved allowCatalogue={canManageCatalogue} />
            {/* <img src="info.png" alt="" className="w-full h-28" /> */}
          </div>
        )}

        <div className="flex flex-col justify-center items-center mt-4">
          {isAndroidNative ? (
            <div className="relative flex h-36 w-full items-center justify-center overflow-hidden rounded-2xl bg-[#ff4d22] text-center text-white">
              <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full border-[18px] border-white/10" />
              <div className="absolute inset-x-4 top-5 flex flex-col items-center text-white">
                <div className="flex items-center justify-center text-[13px] font-medium text-white/90">
                  <span className="mr-1.5">Total Revenue</span>
                  <button
                    type="button"
                    onClick={toggleRevenue}
                    className="inline-flex h-6 w-6 items-center justify-center text-white"
                    aria-label={hide ? "Show total revenue" : "Hide total revenue"}
                  >
                    {!hide ? <BsEye aria-hidden="true" /> : <BsEyeSlash aria-hidden="true" />}
                  </button>
                </div>
                <p className="mt-1 text-[34px] font-bold leading-none text-white">
                  {hide ? "**.**" : `₦${formatRevenue(totalRevenue)}`}
                </p>
              </div>
              <div className="absolute inset-x-4 bottom-3 flex min-w-0 items-center gap-2 text-left">
                <p className="min-w-0 flex-1 truncate text-xs font-normal text-white/90">
                  {textToCopy}
                </p>
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/80"
                  aria-label="Copy store link"
                >
                  {!copied ? <LuCopy aria-hidden="true" /> : <LuCopyCheck aria-hidden="true" />}
                </button>
              </div>
            </div>
          ) : (
          <div className="relative bg-customDeepOrange w-full h-36 rounded-2xl flex flex-col justify-between px-4 py-2">
            <div className="absolute top-0 right-0">
              <img src="./Vector.png" alt="" className="w-16 h-24" />
            </div>
            <div className="absolute bottom-0 left-0">
              <img src="./Vector2.png" alt="" className="w-16 h-16" />
            </div>
            <div className="flex flex-col justify-center items-center space-y-4">
              <div className="flex items-center justify-center text-lg text-white">
                <span className="mr-2">Total Revenue</span>
                <button
                  type="button"
                  onClick={toggleRevenue}
                  className="inline-flex h-7 w-7 items-center justify-center text-white"
                  aria-label={hide ? "Show total revenue" : "Hide total revenue"}
                >
                  {!hide ? (
                    <BsEye className="text-white" />
                  ) : (
                    <BsEyeSlash className="text-white" />
                  )}
                </button>
              </div>
              <p className="text-white text-3xl font-bold">
                {hide ? "**.**" : `₦${formatRevenue(totalRevenue)}`}
              </p>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <p className="text-white text-xs truncate w-60 font-thin">
                  {textToCopy}
                </p>
                <button
                  className="text-white opacity-50 cursor-pointer"
                  onClick={copyToClipboard}
                >
                  {!copied ? (
                    <LuCopy className="text-white" />
                  ) : (
                    <LuCopyCheck className="text-white" />
                  )}
                </button>
              </div>
            </div>
          </div>
          )}
        </div>
        <TipChat />
    <div className="flex flex-col justify-center translate-y-4">
      <div>
        <p className="text-black text-lg text-start font-semibold mb-3">
          Overview
        </p>
        {/* Swapped flex-center for a full width container */}
        <div className="w-full"> 
          <div className="grid grid-cols-2 gap-3 w-full">
            
            {/* CARD 1: Total Orders */}
            <div className="flex flex-col justify-between w-full min-h-[5.5rem] rounded-xl bg-customSoftGray p-3">
              <div className="flex justify-between items-start gap-2">
                <div className="rounded-md bg-white w-7 h-7 min-w-[28px] flex justify-center items-center shrink-0">
                  <ClipboardList className="h-4 w-4 text-customOrange" aria-hidden="true" />
                </div>
                <div className="text-right">
                  <p className="text-xs text-customRichBrown font-medium leading-tight">
                    Total Orders
                  </p>
                </div>
              </div>
              <div className="text-lg font-semibold text-end mt-2">
                {totalOrders}
              </div>
            </div>

            {/* CARD 2: Total Products */}
            <div
              className="flex flex-col justify-between w-full min-h-[5.5rem] rounded-xl bg-customSoftGray p-3"
              data-vendor-tour="inventory-summary"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="rounded-md bg-white w-7 h-7 min-w-[28px] flex justify-center items-center shrink-0">
                  <Package className="h-4 w-4 text-customOrange" aria-hidden="true" />
                </div>
                <div className="text-right">
                  <p className="text-xs text-customRichBrown font-medium leading-tight">
                    Total Products
                  </p>
                </div>
              </div>
              <div className="text-lg font-semibold text-end mt-2">
                {totalProducts}
              </div>
            </div>

            {/* CARD 3: Unfulfilled Orders */}
            <div className="flex flex-col justify-between w-full min-h-[5.5rem] rounded-xl bg-customSoftGray p-3">
              <div className="flex justify-between items-start gap-2">
                <div className="rounded-md bg-white w-7 h-7 min-w-[28px] flex justify-center items-center shrink-0">
                  <Clock3 className="h-4 w-4 text-customOrange" aria-hidden="true" />
                </div>
                <div className="text-right">
                  <p className="text-xs text-customRichBrown font-medium leading-tight">
                    Unfulfilled Orders
                  </p>
                </div>
              </div>
              <div className="text-lg font-semibold text-end mt-2">
                {totalUnfulfilledOrders}
              </div>
            </div>

            {/* CARD 4: Fulfilled Orders */}
            <div className="flex flex-col justify-between w-full min-h-[5.5rem] rounded-xl bg-customSoftGray p-3">
              <div className="flex justify-between items-start gap-2">
                <div className="rounded-md bg-white w-7 h-7 min-w-[28px] flex justify-center items-center shrink-0">
                  <CheckCheck className="h-4 w-4 text-customOrange" aria-hidden="true" />
                </div>
                <div className="text-right">
                  <p className="text-xs text-customRichBrown font-medium leading-tight">
                    Fulfilled Orders
                  </p>
                </div>
              </div>
              <div className="text-lg font-semibold text-end mt-2">
                {totalFulfilledOrders}
              </div>
            </div>

          </div>
        </div>
        {completionPerformance && comparableCompletionCount > 0 && (
          <div className="mt-3 rounded-xl bg-[#fff5f1] p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-customOrange">
                <LuGauge aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[#111827]">
                      Fulfilment speed
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#697386]">
                      Your completed delivery and pickup orders are compared
                      only with stores using the same fulfilment method.
                    </p>
                  </div>
                  {comparableCompletionAverage && (
                    <strong className="shrink-0 text-sm text-[#111827]">
                      {formatPerformanceDuration(comparableCompletionAverage)} avg
                    </strong>
                  )}
                </div>
                {completionPerformance.overallPercentile != null &&
                Number.isFinite(
                  Number(completionPerformance.overallPercentile),
                ) ? (
                  <p className="mt-3 text-sm font-bold text-customOrange">
                    Faster than {completionPerformance.overallPercentile}% of
                    comparable stores
                  </p>
                ) : (
                  <p className="mt-3 text-xs font-medium text-[#7a4a0a]">
                    {completionSamplesRemaining > 0
                      ? `Complete ${completionSamplesRemaining} more ${
                          completionSamplesRemaining === 1 ? "order" : "orders"
                        } in one fulfilment method to unlock your percentile.`
                      : "Your percentile is being prepared in the next benchmark update."}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
        <div className="flex flex-col justify-center translate-y-8 ">
          <div className="flex justify-between mb-3">
            <p className="text-black text-lg font-semibold">Recent activity</p>

            <div className="relative w-[9.75rem]">
              <LuListFilter
                className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-customOrange"
                aria-hidden="true"
              />
              <NativePickerField
                title="Filter recent activity"
                ariaLabel="Filter recent activity"
                options={ACTIVITY_FILTER_OPTIONS}
                value={filterOptions}
                onChange={(nextFilter) => {
                  if (!nextFilter || nextFilter === filterOptions) return;
                  setFilterOptions(nextFilter);
                  void appHaptics.selection();
                }}
                className="h-9 rounded-xl bg-customSoftGray pl-9 pr-3 font-satoshi text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-customOrange/30"
              />
            </div>
          </div>

          <div className="flex flex-col space-y-2 text-black">
            {activitiesError && visibleActivities.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  void appHaptics.selection();
                  dispatch(
                    fetchRecentActivities({
                      vendorId: vendorData.vendorId,
                      nextPage: false,
                    }),
                  );
                }}
                className="rounded-xl border border-orange-100 bg-orange-50 px-3 py-2 text-left text-xs text-gray-700"
              >
                Showing saved activity. Tap to retry the latest update.
              </button>
            )}
            {filteredActivities.length > 0 ? (
              <>
                {Object.entries(
                  filteredActivities.reduce((groups, activity) => {
                    const timestamp = new Date(activity.timestampMs || 0);
                    const now = new Date();

                    // Determine the section (Today, Yesterday, Last 7 Days, Older)
                    let section;
                    const isSameDay = (date1, date2) =>
                      date1.getFullYear() === date2.getFullYear() &&
                      date1.getMonth() === date2.getMonth() &&
                      date1.getDate() === date2.getDate();

                    if (isSameDay(timestamp, now)) {
                      section = "Today";
                    } else if (
                      isSameDay(
                        timestamp,
                        new Date(
                          now.getFullYear(),
                          now.getMonth(),
                          now.getDate() - 1
                        )
                      )
                    ) {
                      section = "Yesterday";
                    } else if (
                      timestamp >=
                      new Date(
                        now.getFullYear(),
                        now.getMonth(),
                        now.getDate() - 7
                      )
                    ) {
                      section = "Last 7 Days";
                    } else {
                      section = "Older";
                    }

                    if (!groups[section]) {
                      groups[section] = [];
                    }
                    groups[section].push(activity);

                    return groups;
                  }, {})
                ).map(([section, activities]) => (
                  <div key={section}>
                    <h3 className="text-black font-bold text-sm mb-2">
                      {section}
                    </h3>
                    {activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="mb-2 bg-customSoftGray rounded-2xl px-4 py-2"
                      >
                        <div className="flex justify-between mb-2">
                          <p className="text-black font-semibold text-xs">
                            {activity.title}
                          </p>
                          <p className="text-black font-semibold text-xs">
                            {formatDateOrTime(activity.timestampMs)}
                          </p>
                        </div>
                        <p className="text-black text-xs">{activity.note}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </>
            ) : isInitialActivityLoading ? (
              <>
                <Skeleton square={true} height={84} className="w-full mb-2" />
                <Skeleton square={true} height={84} className="w-full mb-2" />
                <Skeleton square={true} height={84} className="w-full mb-2" />
                <Skeleton square={true} height={84} className="w-full mb-2" />
              </>
            ) : activitiesError && visibleActivities.length === 0 ? (
              <button
                type="button"
                onClick={() => {
                  void appHaptics.selection();
                  dispatch(
                    fetchRecentActivities({
                      vendorId: vendorData.vendorId,
                      nextPage: false,
                    }),
                  );
                }}
                className="my-4 w-full rounded-2xl bg-customSoftGray px-3 py-4 text-center text-xs text-gray-700"
              >
                Recent activity could not be loaded. Tap to try again.
              </button>
            ) : filteredActivities.length < 1 ? (
              filterOptions === "All" ? (
                <div className="text-center my-4 px-2 py-4 rounded-2xl bg-customSoftGray text-xs">
                  🕘 No actions taken yet. Your recent activities will appear
                  here once you start managing your store...
                </div>
              ) : filterOptions === "transactions" ? (
                <div className="text-center my-4 px-2 py-4 rounded-2xl bg-customSoftGray text-xs">
                  📲 You have no recent transactions yet...
                </div>
              ) : filterOptions === "order" ? (
                <div className="text-center my-4 px-2 py-4 rounded-2xl bg-customSoftGray text-xs">
                  🛒 You have no order updates yet...
                </div>
              ) : filterOptions === "Product Update" ? (
                <div className="text-center my-4 px-2 py-4 rounded-2xl bg-customSoftGray text-xs">
                  📦 You have no product updates yet...
                </div>
              ) : filterOptions === "profile" ? (
                <div className="text-center my-4 px-2 py-4 rounded-2xl bg-customSoftGray text-xs">
                  👤 You have no recent profile updates yet...
                </div>
              ) : (
                <div>
                  <img src="./Note.png" alt="" />
                </div>
              )
            ) : (
              <div className="text-center my-4 px-2 py-4 rounded-2xl bg-customSoftGray text-xs">
                Nothing to show here...
              </div>
            )}
            {isLoadingMoreActivities && (
              <div className="flex justify-center items-center">
                <Lottie
                  className="w-10 h-10"
                  animationData={LoadState}
                  loop={true}
                  autoplay={true}
                />
              </div>
            )}
            <div ref={lastActivityRef} />
          </div>
        </div>
      </div>
      <button
        onClick={openModal}
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
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        busy={isAddProductBusy}
      >
        <AddProduct
          vendorId={vendorData?.vendorId}
          closeModal={closeModal}
          onBusyChange={setIsAddProductBusy}
        />
      </Modal>
      <VendorTour
        vendorId={vendorData?.vendorId}
        enabled={canManageCatalogue && vendorData?.isApproved !== true}
      />
    </>
  );
};

export default VendorDashboard;
