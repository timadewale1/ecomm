import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { db, auth } from "../../firebase.config";
import {
  doc,
  getDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { GoChevronLeft } from "react-icons/go";
import { FiPlus } from "react-icons/fi";
import { FaStar } from "react-icons/fa";
import { ProgressBar } from "react-bootstrap";
import toast from "react-hot-toast";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { IoMdContact } from "react-icons/io";
import SEO from "../../components/Helmet/SEO";
import QuickAuthModal from "../../components/PwaModals/AuthModal";
import ReviewComposer from "../../components/Reviews/ReviewComposer";
import ReviewOrderPicker from "../../components/Reviews/ReviewOrderPicker";
import {
  fetchEligibleReviewOrders,
  findRequestedReviewOrder,
} from "../../components/Reviews/reviewOrders";
import { takeAuthIntent } from "../../services/authIntent";
import { acquireScrollLock } from "../../services/scrollLock";
import {getPublicVendor} from "../../services/publicVendors";

const VendorRatings = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [reviews, setReviews] = useState([]);
  const [vendor, setVendor] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showOrderPicker, setShowOrderPicker] = useState(false);
  const [eligibleOrders, setEligibleOrders] = useState([]);
  const [eligibleOrdersLoading, setEligibleOrdersLoading] = useState(false);
  const [eligibleOrdersReady, setEligibleOrdersReady] = useState(false);
  const [selectedReviewOrder, setSelectedReviewOrder] = useState(null);
  const [pendingReviewOpen, setPendingReviewOpen] = useState(false);
  const requestedOrderHandled = useRef("");
  const [allReviews, setAllReviews] = useState([]);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);
  const [reviewsVendorId, setReviewsVendorId] = useState("");
  const [showQuickAuth, setShowQuickAuth] = useState(false);

  const [selectedRating, setSelectedRating] = useState("All");

  const [hasDeliveredOrder, setHasDeliveredOrder] = useState(false);

  const [loading, setLoading] = useState(true);
  const [ratingBreakdown, setRatingBreakdown] = useState({
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  });

  const [isProfileComplete, setIsProfileComplete] = useState(false);

  useEffect(() => {
    const fetchCurrentUser = async (uid) => {
      try {
        const userDoc = await getDoc(doc(db, "users", uid));
        const userData = userDoc.data();
        setCurrentUser({ uid, ...userData });

        // Check if the user's profile is complete
        if (userData.displayName && userData.birthday) {
          setIsProfileComplete(true);
        } else {
          setIsProfileComplete(false);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchCurrentUser(user.uid);
      } else {
        setCurrentUser(null);
        setIsProfileComplete(false);
      }
    });
  }, []);

  useEffect(() => {
    const fetchVendorData = async () => {
      try {
        const vendorData = await getPublicVendor(id);
        if (vendorData) {
          setVendor(vendorData);
        } else {
          toast.error("Vendor not found!");
        }
      } catch (error) {
        toast.error("Error fetching vendor data: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVendorData();
  }, [id]);
  const openDisclaimer = (path) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(path);
  };
  const fetchReviews = async () => {
    try {
      const reviewsRef = collection(db, "vendors", id, "reviews");
      const reviewsSnapshot = await getDocs(reviewsRef);
      const reviewsList = reviewsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAllReviews(reviewsList);

      // Apply filter based on selectedRating
      let filteredReviews = reviewsList;

      if (selectedRating !== "All") {
        filteredReviews = reviewsList.filter(
          (review) => review.rating === selectedRating
        );
      }

      // Ratings without optional text are still valid reviews and must remain visible.
      setReviews(filteredReviews);

      // Calculate rating breakdown including all reviews (with and without text)
      const allReviews = reviewsList;
      const breakdown = {
        5: reviewsList.filter((r) => r.rating === 5).length,
        4: reviewsList.filter((r) => r.rating === 4).length,
        3: reviewsList.filter((r) => r.rating === 3).length,
        2: reviewsList.filter((r) => r.rating === 2).length,
        1: reviewsList.filter((r) => r.rating === 1).length,
      };

      setRatingBreakdown(breakdown); // Update the rating breakdown
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
      setReviewsLoaded(true);
      setReviewsVendorId(id);
    }
  };

  useEffect(() => {
    if (id) {
      fetchReviews();
    }
  }, [id, selectedRating]);

  useEffect(() => {
    let active = true;
    const loadEligibleOrders = async () => {
      setEligibleOrdersReady(false);
      if (
        !currentUser?.uid ||
        !id ||
        !reviewsLoaded ||
        reviewsVendorId !== id
      ) {
        if (active) {
          setEligibleOrders([]);
          setHasDeliveredOrder(false);
        }
        return;
      }
      try {
        setEligibleOrdersLoading(true);
        const orders = await fetchEligibleReviewOrders({
          userId: currentUser.uid,
          vendorId: id,
          reviews: allReviews,
        });
        if (!active) return;
        setEligibleOrders(orders);
        setHasDeliveredOrder(orders.length > 0);
      } catch (error) {
        console.error("Error loading reviewable orders:", error);
        if (active) {
          setEligibleOrders([]);
          setHasDeliveredOrder(false);
        }
      } finally {
        if (active) {
          setEligibleOrdersLoading(false);
          setEligibleOrdersReady(true);
        }
      }
    };

    loadEligibleOrders();
    return () => {
      active = false;
    };
  }, [currentUser?.uid, id, allReviews, reviewsLoaded, reviewsVendorId]);

  useEffect(() => {
    if (
      !currentUser?.uid ||
      !reviewsLoaded ||
      reviewsVendorId !== id ||
      !eligibleOrdersReady ||
      eligibleOrdersLoading
    )
      return;
    const params = new URLSearchParams(location.search);
    const requestKey = params.get("rateStockpile")
      ? `stockpile:${params.get("rateStockpile")}`
      : params.get("rateOrder")
      ? `order:${params.get("rateOrder")}`
      : "";
    if (!requestKey || requestedOrderHandled.current === requestKey) return;

    requestedOrderHandled.current = requestKey;
    const requested = findRequestedReviewOrder(eligibleOrders, params);
    if (requested) {
      setSelectedReviewOrder(requested);
      setShowOrderPicker(false);
      setShowModal(true);
    } else {
      toast("This order is not ready to rate or has already been rated.");
    }
  }, [
    currentUser?.uid,
    eligibleOrders,
    eligibleOrdersLoading,
    eligibleOrdersReady,
    location.search,
    reviewsLoaded,
    reviewsVendorId,
    id,
  ]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    const intent = takeAuthIntent({types: "open-vendor-review", pathname: location.pathname});
    if (!intent || String(intent.payload?.vendorId || "") !== String(id)) return;
    setPendingReviewOpen(true);
  }, [currentUser?.uid, id, location.pathname]);

  useEffect(() => {
    if (
      !pendingReviewOpen ||
      !currentUser?.uid ||
      !reviewsLoaded ||
      reviewsVendorId !== id ||
      !eligibleOrdersReady ||
      eligibleOrdersLoading
    )
      return;
    setPendingReviewOpen(false);
    setShowOrderPicker(true);
  }, [
    pendingReviewOpen,
    currentUser?.uid,
    eligibleOrdersLoading,
    eligibleOrdersReady,
    reviewsLoaded,
    reviewsVendorId,
    id,
  ]);

  const openReviewFlow = () => {
    if (!currentUser) {
      setShowQuickAuth(true);
      return;
    }
    setShowOrderPicker(true);
  };

  const closeComposer = () => {
    setShowModal(false);
    setSelectedReviewOrder(null);
    const params = new URLSearchParams(location.search);
    if (params.has("rateOrder") || params.has("rateStockpile")) {
      navigate(-1);
    } else {
      setShowOrderPicker(true);
    }
  };

  const handleReviewSuccess = () => {
    setShowModal(false);
    setShowOrderPicker(false);
    setSelectedReviewOrder(null);
    void fetchReviews();
    const params = new URLSearchParams(location.search);
    if (params.has("rateOrder") || params.has("rateStockpile")) {
      navigate(-1);
    }
  };

  useEffect(() => {
    if (!showModal && !showOrderPicker) return undefined;
    return acquireScrollLock("VendorRatingsReviewFlow");
  }, [showModal, showOrderPicker]);

  const averageRating =
    vendor?.ratingCount > 0 ? vendor.rating / vendor.ratingCount : 0;
  // const ratingBreakdown = {
  //   5: reviews.filter((r) => r.rating === 5).length,
  //   4: reviews.filter((r) => r.rating === 4).length,
  //   3: reviews.filter((r) => r.rating === 3).length,
  //   2: reviews.filter((r) => r.rating === 2).length,
  //   1: reviews.filter((r) => r.rating === 1).length,
  // };

  const totalRatings = Object.values(ratingBreakdown).reduce(
    (acc, value) => acc + value,
    0
  );

  const calculatePercentage = (count) => (count / totalRatings) * 100;

  return (
    <>
      <SEO
        title={`Reviews for ${vendor?.shopName || "Vendor"} - My Thrift`}
        url={`https://www.shopmythrift.store/reviews/${id}`}
      />
      <div className="px-2 py-4">
        <div className="sticky py-3 top-0 bg-white ">
          <div className="flex items-center justify-between mb-3 pb-2">
            <GoChevronLeft
              className="text-3xl cursor-pointer"
              onClick={() => navigate(-1)}
            />
            <h1 className="text-xl font-opensans font-semibold flex-grow text-center">
              Reviews
            </h1>
            {/* Conditionally show FiPlus or an invisible placeholder */}
            {!currentUser || hasDeliveredOrder ? (
              <FiPlus
                className="text-3xl cursor-pointer"
                onClick={openReviewFlow}
              />
            ) : (
              <div className="w-8 h-8" />
            )}
          </div>

          <div className="flex justify-between mb-3 w-full overflow-x-auto space-x-2 scrollbar-hide">
            {["All", 5, 4, 3, 2, 1].map((star) => (
              <button
                key={star}
                onClick={() => setSelectedRating(star)} // This correctly updates selectedRating
                className={`flex-shrink-0 h-12 px-3 py-2 text-xs font-bold font-opensans text-black border border-gray-200 rounded-full ${
                  selectedRating === star
                    ? "bg-customOrange text-white"
                    : "bg-transparent"
                }`}
              >
                {star === "All" ? star : `${star} stars`}
              </button>
            ))}
          </div>

          <div className="border-b border-gray-300 w-screen translate-y-3 relative left-1/2 transform -translate-x-1/2"></div>
        </div>
        <div className="flex space-x-6">
          <div className="flex items-center justify-start my-4">
            <div className=" rounded-full flex flex-col ">
              {loading ? (
                <Skeleton square={true} height={80} width={80} />
              ) : (
                <>
                  <span className="text-5xl font-opensans font-semibold">
                    {averageRating.toFixed(1)}
                  </span>
                  <div className="flex text-xs mt-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <FaStar
                        key={i}
                        className={
                          i < Math.floor(averageRating)
                            ? "text-yellow-500"
                            : "text-gray-300"
                        }
                      />
                    ))}
                  </div>
                  <span className="text-xs mt-1 font-poppins  text-gray-600">
                    {vendor.ratingCount}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="my-4  w-full">
            {totalRatings > 0 ? (
              [5, 4, 3, 2, 1].map((star) => (
                <div key={star} className="flex items-center mb-2">
                  <span className="w-6 text-xs font-opensans font-light">
                    {star}
                  </span>
                  <ProgressBar
                    now={calculatePercentage(ratingBreakdown[star] || 0)}
                    className="flex-1 mx-2"
                    style={{
                      height: "14px",
                      backgroundColor: "#f5f3f2",
                      borderRadius: "10px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: "#f9531e",
                        height: "100%",
                        width: `${calculatePercentage(
                          ratingBreakdown[star] || 0
                        )}%`,
                        borderRadius: "10px",
                      }}
                    />
                  </ProgressBar>
                </div>
              ))
            ) : (
              <p className="text-xs font-opensans text-gray-600">
                No ratings available yet.
              </p>
            )}
          </div>
        </div>

        <div className="p-2 pb-24">
          {reviews.map((review) => (
            <div key={review.id} className="mb-4">
              <div className="flex items-center mb-1">
                {review.userPhotoURL ? (
                  <img
                    src={review.userPhotoURL}
                    alt={review.userName}
                    className="w-11 h-11 rounded-full mr-3"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                    <IoMdContact className="text-gray-500 text-xl" />
                  </div>
                )}
                <div>
                  <h2 className="font-semibold text-xs">{review.userName}</h2>
                </div>
              </div>
              <div className="flex space-x-3">
                <div className="flex space-x-1">
                  {Array.from({ length: review.rating }, (_, index) => (
                    <FaStar key={index} className="text-yellow-500" />
                  ))}
                </div>
                <span className="ratings-text font-medium font-opensans text-gray-500">
                  {review.createdAt?.toDate
                    ? review.createdAt.toDate().toLocaleDateString()
                    : review.createdAt?.seconds
                    ? new Date(review.createdAt.seconds * 1000).toLocaleDateString()
                    : review.createdAt
                    ? new Date(review.createdAt).toLocaleDateString()
                    : "Just now"}
                </span>
              </div>
              {review.reviewText && (
                <p className="mt-2 text-black font-opensans text-sm">
                  {review.reviewText}
                </p>
              )}
              {((review.productSnapshots || []).some(
                (item) => item.productImageUrl
              ) || (review.reviewImageUrls || []).length > 0) && (
                <div className="vendor-review-media" aria-label="Review images">
                  {(review.productSnapshots || [])
                    .filter((item) => item.productImageUrl)
                    .map((item, index) => (
                      <img
                        key={`product-${item.productId || index}`}
                        src={item.productImageUrl}
                        alt={item.productName || "Reviewed product"}
                      />
                    ))}
                  {(review.reviewImageUrls || []).map((imageUrl, index) => (
                    <img
                      key={`review-${index}`}
                      src={imageUrl}
                      alt={`Buyer review ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
          <div className="fixed bottom-0 left-0 w-full bg-white py-4">
            <div className="text-center">
              <div className="flex justify-center items-center mb-2">
                <FaStar className="text-yellow-500 text-lg mr-2" />
                <h2 className="text-xs font-opensans font-semibold">
                  Reviews from Verified Buyers
                </h2>
              </div>
              <p className="text-xs font-opensans text-gray-700">
                All reviews on this page are submitted by verified buyers.
              </p>
            </div>
          </div>
        </div>

        {showOrderPicker && (
          <ReviewOrderPicker
            orders={eligibleOrders}
            loading={eligibleOrdersLoading}
            onBack={() => setShowOrderPicker(false)}
            onSelect={(order) => {
              setSelectedReviewOrder(order);
              setShowOrderPicker(false);
              setShowModal(true);
            }}
          />
        )}
        {showModal && vendor && selectedReviewOrder && (
          <ReviewComposer
            vendor={{ ...vendor, id }}
            order={selectedReviewOrder}
            currentUser={currentUser}
            isProfileComplete={isProfileComplete}
            onClose={closeComposer}
            onSuccess={handleReviewSuccess}
          />
        )}
        <QuickAuthModal
          open={showQuickAuth}
          onClose={() => setShowQuickAuth(false)}
          onComplete={(user) => {
            setShowQuickAuth(false);
            setPendingReviewOpen(true);
          }}
          headerText="Let’s set up your review"
          openDisclaimer={openDisclaimer}
          authIntent={{
            type: "open-vendor-review",
            returnTo: `${location.pathname}${location.search}`,
            payload: {vendorId: id},
          }}
        />
      </div>
    </>
  );
};

export default VendorRatings;
