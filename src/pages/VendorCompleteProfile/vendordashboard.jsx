import React, {
  useEffect,
  useState,
  useContext,
  useCallback,
  useRef,
} from "react";
import {
  collection,
  query,
  where,
  updateDoc,
  onSnapshot,
  doc,
} from "firebase/firestore";
import { db } from "../../firebase.config";

import toast from "react-hot-toast";
import Modal from "../../components/layout/Modal";
import AddProduct from "../vendor/AddProducts";
import { useNavigate, useLocation } from "react-router-dom";
// import Loading from "../../components/Loading/Loading";
import { useSelector, useDispatch } from "react-redux";
import {
  fetchRecentActivities,
  resetActivities,
} from "../../redux/recentActivitiesSlice.js";
import { VendorContext } from "../../components/Context/Vendorcontext";
import { FiPlus } from "react-icons/fi";
import { BsBoxSeam, BsEye, BsEyeSlash } from "react-icons/bs";
import { LuCopy, LuCopyCheck, LuListFilter } from "react-icons/lu";
import NotApproved from "../../components/Infos/NotApproved";
import Skeleton from "react-loading-skeleton";
import ScrollToTop from "../../components/layout/ScrollToTop";
import SEO from "../../components/Helmet/SEO";
import Lottie from "lottie-react";
import LoadState from "../../Animations/loadinganimation.json";
import StockpileSetupModal from "../../components/StockPile.jsx";
import MissingLocationModal from "../../components/Location/MissingLocationModal.jsx";
import TipChat from "../../components/TipsMaltilda.jsx";

const VendorDashboard = () => {
  const defaultImageUrl =
    "https://images.saatchiart.com/saatchi/1750204/art/9767271/8830343-WUMLQQKS-7.jpg";
  const { vendorData, loading } = useContext(VendorContext);
  // console.log("VendorDashboard render:", { vendorData, loading });

  const [totalFulfilledOrders, setTotalFulfilledOrders] = useState(0);
  const [hide, setHide] = useState(false);
  // const [coverImageUrl, setCoverImageUrl] = useState(defaultImageUrl);
  const [filterOptions, setFilterOptions] = useState("All");
  const [viewOptions, setViewOptions] = useState(false);
  const [totalUnfulfilledOrders, setTotalUnfulfilledOrders] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  // const [recentActivities, setRecentActivities] = useState([]);
  // const [activityLoading, setActivityLoading] = useState(false);
  const [isModalOpen, setModalOpen] = useState(false);

  const [showMissingLocationModal, setShowMissingLocationModal] =
    useState(false);
  const [locationFixing, setLocationFixing] = useState(false);

  // const [lastDoc, setLastDoc] = useState(null);
  // const [hasMore, setHasMore] = useState(true); // If there are more activities to load
  const navigate = useNavigate();
  const location = useLocation();
  const redirectedRef = useRef(false);
  const dispatch = useDispatch();
  const {
    activities,
    lastDoc,
    loading: activitiesLoading,
    hasMore,
  } = useSelector((state) => state.activities);

  useEffect(() => {
    if (vendorData?.vendorId) {
      dispatch(resetActivities()); // optional: clear previous state if needed
      dispatch(
        fetchRecentActivities({
          vendorId: vendorData.vendorId,
          nextPage: false,
        })
      );
    }
  }, [vendorData, dispatch]);

  useEffect(() => {
    if (vendorData) {
      fetchStatistics(vendorData.vendorId);
      fetchVendorRevenue(vendorData.vendorId);
      fetchInfo(vendorData.vendorId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorData]);
  useEffect(() => {
    if (!loading && vendorData && vendorData.profileComplete === false) {
      toast("Please complete your profile.");
      navigate("/complete-profile");
    }
  }, [vendorData, loading, navigate]);
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
    navigate("/login", { replace: true, state: { from: location.pathname } });
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

  useEffect(() => {
    if (vendorData?.vendorId == null) return;
    fetchVendorRevenue(vendorData.vendorId);
  }, [vendorData?.vendorId, totalFulfilledOrders]);

  // 3) The revenue fetcher with localStorage cache
  async function fetchVendorRevenue(vendorId) {
    const cacheKey = `vendorRevenue_${vendorId}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached != null) {
      // show stale data immediately
      setTotalRevenue(Number(cached));
    }

    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
      const token = import.meta.env.VITE_RESOLVE_TOKEN;

      const res = await fetch(`${API_BASE_URL}/vendor-revenue/${vendorId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        console.error("Revenue API failed:", res.status);
        return;
      }
      const { data } = await res.json();
      const revenue = data.vendorRevenue;

      // cache & state
      localStorage.setItem(cacheKey, revenue.toString());
      setTotalRevenue(revenue);
    } catch (err) {
      console.error("Error fetching vendor revenue:", err);
    }
  }

  const filteredActivities = activities.filter((activity) => {
    if (filterOptions === "All") return true;
    return activity.type === filterOptions;
  });

  const fetchInfo = (vendorId) => {
    const productsRef = collection(db, "products");
    const productsQuery = query(
      productsRef,
      where("vendorId", "==", vendorId),
      where("isDeleted", "==", false) // Exclude deleted products
    );

    const unsubscribe = onSnapshot(productsQuery, (snapshot) => {
      setTotalProducts(snapshot.docs.length);
    });

    return () => unsubscribe();
  };
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

  const fetchStatistics = (vendorId) => {
    const ordersRef = collection(db, "orders");
    const ordersQuery = query(ordersRef, where("vendorId", "==", vendorId));

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      let fulfilledCount = 0;
      let unfulfilledCount = 0;
      let totalCount = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        const { progressStatus } = data;

        if (progressStatus === "Delivered") {
          fulfilledCount++;
        } else if (
          ["In Progress", "Shipped", "Pending"].includes(progressStatus)
        ) {
          unfulfilledCount++;
        }
        totalCount++;
      });

      setTotalOrders(totalCount);
      setTotalFulfilledOrders(fulfilledCount);
      setTotalUnfulfilledOrders(unfulfilledCount);
    });

    return () => unsubscribe();
  };

  const textToCopy = vendorData?.vendorId
    ? `https://mx.shopmythrift.store/${
        vendorData?.marketPlaceType === "virtual" ? "store" : "marketstorepage"
      }/${vendorData.vendorId}?shared=true`
    : "";
  const [copied, setCopied] = useState(false);
  const copyToClipboard = async () => {
    if (!copied) {
      console.log("Clicked");
      try {
        (await navigator.clipboard.writeText(textToCopy)) &&
          console.log("copied"); // Ensure the text is copied
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } catch (err) {
        toast.error("Failed to copy!"); // Handle any errors during copy
        console.error("Failed to copy text: ", err);
      }
    }
  };

  const formatDateOrTime = (timestamp) => {
    const eventDate = new Date(timestamp.toDate()); // Convert Firestore timestamp to JS Date
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

  // Fetch vendor's recent activities in real-time
  // const fetchRecentActivities = (vendorId, nextPage = false) => {
  //   const activityRef = collection(db, "vendors", vendorId, "activityNotes");
  //   let recentActivityQuery;

  //   if (!nextPage || !lastDoc) {
  //     // INITIAL REAL‑TIME FETCH (first 15 items)
  //     recentActivityQuery = query(
  //       activityRef,
  //       orderBy("timestamp", "desc"),
  //       limit(PAGE_SIZE)
  //     );

  //     const unsubscribe = onSnapshot(recentActivityQuery, (querySnapshot) => {
  //       const activities = querySnapshot.docs.map((doc) => ({
  //         id: doc.id,
  //         ...doc.data(),
  //       }));
  //       setRecentActivities(activities);

  //       // Update last document for pagination
  //       if (querySnapshot.docs.length === PAGE_SIZE) {
  //         setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);
  //       }
  //       // If fewer than PAGE_SIZE items, then there is no more data
  //       if (querySnapshot.docs.length < PAGE_SIZE) {
  //         setHasMore(false);
  //       }
  //     });

  //     return () => unsubscribe();
  //   } else {
  //     // PAGINATION: Fetch next 15 items (non real‑time)
  //     // (Make sure lastDoc exists before calling this)
  //     if (!lastDoc) return;

  //     setActivityLoading(true);
  //     recentActivityQuery = query(
  //       activityRef,
  //       orderBy("timestamp", "desc"),
  //       startAfter(lastDoc),
  //       limit(PAGE_SIZE)
  //     );

  //     getDocs(recentActivityQuery).then((querySnapshot) => {
  //       const activities = querySnapshot.docs.map((doc) => ({
  //         id: doc.id,
  //         ...doc.data(),
  //       }));
  //       // Append the new activities to the existing list
  //       setRecentActivities((prevActivities) => [
  //         ...prevActivities,
  //         ...activities,
  //       ]);

  //       // Update lastDoc
  //       if (querySnapshot.docs.length === PAGE_SIZE) {
  //         setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);
  //       }
  //       // If fewer than PAGE_SIZE items, mark no more data
  //       if (querySnapshot.docs.length < PAGE_SIZE) {
  //         setHasMore(false);
  //       }
  //       setActivityLoading(false);
  //     });
  //   }
  // };

  const observer = useRef();
  const lastActivityRef = useCallback(
    (node) => {
      if (activitiesLoading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
       if (entries[0].isIntersecting && hasMore && vendorData?.vendorId) {
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
     [activitiesLoading, hasMore, vendorData?.vendorId, lastDoc, dispatch]
  );

  const openModal = () => setModalOpen(true);
  const closeModal = () => setModalOpen(false);

  if (loading) {
    return (
      <div className="mb-40 mx-3 my-7 flex flex-col justify-center space-y-1 font-opensans">
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
          <div className="relative bg-customDeepOrange w-full h-36 rounded-2xl flex flex-col justify-between px-4 py-2">
            <div className="flex flex-col justify-center items-center space-y-4">
              <Skeleton width={120} height={20} />
              <Skeleton width={100} height={30} />
            </div>
            <div>
              <Skeleton width={"80%"} height={20} />
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
                className="flex flex-col justify-between w-custVCard h-20 rounded-xl bg-customSoftGray p-2"
              >
                <div className="flex justify-between items-center">
                  <Skeleton width={30} height={30} />
                  <Skeleton width={100} height={15} />
                </div>
                <Skeleton width={40} height={20} />
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
  return (
    <>
      {vendorData && !vendorData.stockpile && (
        <StockpileSetupModal vendorId={vendorData.vendorId} />
      )}
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
      <div className="mb-40 mx-3 my-7 flex flex-col justify-center space-y-1 font-opensans ">
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
            <NotApproved />
            {/* <img src="info.png" alt="" className="w-full h-28" /> */}
          </div>
        )}

        <div className="flex flex-col justify-center items-center mt-4">
          <div className="relative bg-customDeepOrange w-full h-36 rounded-2xl flex flex-col justify-between px-4 py-2">
            <div className="absolute top-0 right-0">
              <img src="./Vector.png" alt="" className="w-16 h-24" />
            </div>
            <div className="absolute bottom-0 left-0">
              <img src="./Vector2.png" alt="" className="w-16 h-16" />
            </div>
            <div className="flex flex-col justify-center items-center space-y-4">
              <p className="text-white text-lg flex justify-between items-center">
                <p className="text-white mr-2">Total Revenue </p>
                <p>
                  {!hide ? (
                    <BsEye
                      onClick={() => setHide(!hide)}
                      className="text-white"
                    />
                  ) : (
                    <BsEyeSlash
                      onClick={() => setHide(!hide)}
                      className="text-white"
                    />
                  )}
                </p>
              </p>
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
                  className="text-white opacity-50 cursor-not-allowed"
                  onClick={copyToClipboard}
                >
                  {!copied ? (
                    <LuCopy className="text-white" />
                  ) : (
                    <LuCopyCheck className="text-[#28a745]" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        <TipChat />
        <div className="flex flex-col justify-center translate-y-4">
          <div>
            <p className="text-black text-lg text-start font-semibold mb-3">
              Overview
            </p>
            <div className="flex justify-center">
              <div className="grid grid-cols-2 gap-2 justify-center">
                <div className="flex flex-col justify-between w-custVCard h-20 rounded-xl bg-customSoftGray p-2">
                  <div className="flex justify-between items-center">
                    <div className="rounded-md bg-white w-7 h-7 flex justify-center items-center">
                      <BsBoxSeam className="text-sm text-customOrange" />
                    </div>

                    <div>
                      <p className="text-xs text-customRichBrown font-medium">
                        Total Orders
                      </p>
                    </div>
                  </div>
                  <div className="text-lg font-semibold text-end">
                    {totalOrders}
                  </div>
                </div>

                <div className="flex flex-col justify-between w-custVCard h-20 rounded-xl bg-customSoftGray p-2">
                  <div className="flex justify-between items-center">
                    <div className="rounded-md bg-white w-7 h-7 flex justify-center items-center">
                      <BsBoxSeam className="text-sm text-customOrange" />
                    </div>

                    <div>
                      <p className="text-xs text-customRichBrown font-medium">
                        Total Products
                      </p>
                    </div>
                  </div>
                  <div className="text-lg font-semibold text-end">
                    {totalProducts}
                  </div>
                </div>

                <div className="flex flex-col justify-between w-custVCard h-20 rounded-xl bg-customSoftGray p-2">
                  <div className="flex justify-between items-center">
                    <div className="rounded-md bg-white w-7 h-7 flex justify-center items-center">
                      <BsBoxSeam className="text-sm text-customOrange" />
                    </div>

                    <div>
                      <p className="text-xs text-customRichBrown font-medium">
                        Unfulfilled Orders
                      </p>
                    </div>
                  </div>
                  <div className="text-lg font-semibold text-end">
                    {totalUnfulfilledOrders}
                  </div>
                </div>

                <div className="flex flex-col justify-between w-custVCard h-20 rounded-xl bg-customSoftGray p-2">
                  <div className="flex justify-between items-center">
                    <div className="rounded-md bg-white w-7 h-7 flex justify-center items-center">
                      <BsBoxSeam className="text-sm text-customOrange" />
                    </div>

                    <div>
                      <p className="text-xs text-customRichBrown font-medium">
                        Fulfilled Orders
                      </p>
                    </div>
                  </div>
                  <div className="text-lg font-semibold text-end">
                    {totalFulfilledOrders}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center translate-y-8 ">
          <div className="flex justify-between mb-3">
            <p className="text-black text-lg font-semibold">Recent activity</p>

            <div className="relative">
              {viewOptions && (
                <div className="z-50 absolute bg-white w-44 h-40 rounded-2.5xl shadow-[0_0_10px_rgba(0,0,0,0.1)] -left-44 top-2 p-3 flex flex-col justify-between">
                  <span
                    className={`${
                      filterOptions === "All"
                        ? "text-customOrange"
                        : "text-black"
                    } text-xs ml-2 cursor-pointer`}
                    onClick={() => {
                      setFilterOptions("All");
                      setViewOptions(!viewOptions);
                    }}
                  >
                    All
                  </span>
                  <hr className="text-slate-300" />
                  <span
                    className={`${
                      filterOptions === "transactions"
                        ? "text-customOrange"
                        : "text-black"
                    } text-xs ml-2 cursor-pointer`}
                    onClick={() => {
                      setFilterOptions("transactions");
                      setViewOptions(!viewOptions);
                    }}
                  >
                    Recent Transactions
                  </span>
                  <hr className="text-slate-300" />
                  <span
                    className={`${
                      filterOptions === "order"
                        ? "text-customOrange"
                        : "text-black"
                    } text-xs ml-2 cursor-pointer`}
                    onClick={() => {
                      setFilterOptions("order");
                      setViewOptions(!viewOptions);
                    }}
                  >
                    Orders
                  </span>
                  <hr className="text-slate-300" />
                  <span
                    className={`${
                      filterOptions === "Product Update"
                        ? "text-customOrange"
                        : "text-black"
                    } text-xs ml-2 cursor-pointer`}
                    onClick={() => {
                      setFilterOptions("Product Update");
                      setViewOptions(!viewOptions);
                    }}
                  >
                    Product Update
                  </span>
                </div>
              )}
              <LuListFilter
                className="text-customOrange cursor-pointer"
                onClick={() => setViewOptions(!viewOptions)}
              />
            </div>
          </div>

          <div className="flex flex-col space-y-2 text-black">
            {activities && filteredActivities.length > 0 && !loading ? (
              <>
                {Object.entries(
                  filteredActivities.reduce((groups, activity) => {
                    // Convert Firestore Timestamp to JavaScript Date
                    const timestamp = new Date(
                      activity.timestamp.seconds * 1000 +
                        activity.timestamp.nanoseconds / 1e6
                    );
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
                            {formatDateOrTime(activity.timestamp)}
                          </p>
                        </div>
                        <p className="text-black text-xs">{activity.note}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </>
            ) : loading ? (
              <>
                <Skeleton square={true} height={84} className="w-full mb-2" />
                <Skeleton square={true} height={84} className="w-full mb-2" />
                <Skeleton square={true} height={84} className="w-full mb-2" />
                <Skeleton square={true} height={84} className="w-full mb-2" />
              </>
            ) : filteredActivities.length < 1 && !loading ? (
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
            {activitiesLoading && (
              <div className="flex justify-center items-center">
                <Lottie
                  className="w-10 h-10"
                  animationData={LoadState}
                  loop={true}
                  autoplay={true}
                />
              </div>
            )}
            {<div ref={lastActivityRef} />}
          </div>
        </div>
      </div>
      <button
        onClick={openModal}
        className={`fixed bottom-24 right-5 flex justify-center items-center ${
          vendorData?.isApproved
            ? "bg-customOrange"
            : "bg-customOrange opacity-35 cursor-not-allowed"
        } text-white rounded-full w-11 h-11 shadow-lg focus:outline-none`}
        disabled={!vendorData?.isApproved}
      >
        <span className="text-3xl">
          <FiPlus />
        </span>
      </button>
      <Modal isOpen={isModalOpen} onClose={closeModal}>
        <AddProduct vendorId={vendorData?.vendorId} closeModal={closeModal} />
      </Modal>
    </>
  );
};

export default VendorDashboard;
