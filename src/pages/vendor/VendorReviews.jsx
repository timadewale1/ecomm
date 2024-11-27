import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase.config";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
} from "firebase/firestore";
import { GoChevronLeft } from "react-icons/go";
import { FaStar } from "react-icons/fa";
import { ProgressBar } from "react-bootstrap";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import {useAuth} from "../../custom-hooks/useAuth";

const VendorReviews = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [vendor, setVendor] = useState(null);
  const [selectedRating, setSelectedRating] = useState("All");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState(null);
  const [ratingBreakdown, setRatingBreakdown] = useState({
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  });
  const [hasMoreReviews, setHasMoreReviews] = useState(false);

  useEffect(() => {
    if (authLoading || !currentUser) return;

    const fetchVendorData = async () => {
      try {
        const vendorRef = doc(db, "vendors", currentUser.uid);
        const vendorDoc = await getDoc(vendorRef);
        if (vendorDoc.exists()) {
          setVendor(vendorDoc.data());
        } else {
          console.error("Vendor not found!");
        }
      } catch (error) {
        console.error("Error fetching vendor data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVendorData();
  }, [authLoading, currentUser]);

  const fetchReviews = async (loadMore = false) => {
    if (!currentUser) return;

    try {
      const reviewsRef = collection(db, "vendors", currentUser.uid, "reviews");
      const reviewsQuery =
        loadMore && lastVisible
          ? query(
              reviewsRef,
              orderBy("createdAt", "desc"),
              startAfter(lastVisible),
              limit(10)
            )
          : query(reviewsRef, orderBy("createdAt", "desc"), limit(10));

      const reviewsSnapshot = await getDocs(reviewsQuery);

      const newReviews = reviewsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Filter reviews based on selectedRating, if a specific rating is selected
      let filteredReviews = newReviews;
      if (selectedRating !== "All") {
        filteredReviews = newReviews.filter(
          (review) => review.rating === parseInt(selectedRating)
        );
      }

      // Only include reviews with text if that's part of your requirement
      const textReviews = filteredReviews.filter((review) => review.reviewText);

      setReviews((prevReviews) =>
        loadMore ? [...prevReviews, ...textReviews] : textReviews
      );

      // Update last visible document for pagination
      setLastVisible(reviewsSnapshot.docs[reviewsSnapshot.docs.length - 1]);

      // Check if there are more reviews to load
      setHasMoreReviews(reviewsSnapshot.docs.length === 10);

      // Calculate and set rating breakdown only once on initial load
      if (!loadMore) {
        const breakdown = {
          5: newReviews.filter((r) => r.rating === 5).length,
          4: newReviews.filter((r) => r.rating === 4).length,
          3: newReviews.filter((r) => r.rating === 3).length,
          2: newReviews.filter((r) => r.rating === 2).length,
          1: newReviews.filter((r) => r.rating === 1).length,
        };
        setRatingBreakdown(breakdown);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [selectedRating, currentUser]);

  const handleLoadMore = () => {
    setLoadingMore(true);
    fetchReviews(true);
  };

  const DefaultImageUrl =
    "https://images.saatchiart.com/saatchi/1750204/art/9767271/8830343-WUMLQQKS-7.jpg";

  const averageRating =
    vendor?.ratingCount > 0 ? vendor.rating / vendor.ratingCount : 0;

  const totalRatings = Object.values(ratingBreakdown).reduce(
    (acc, value) => acc + value,
    0
  );

  const calculatePercentage = (count) =>
    totalRatings > 0 ? (count / totalRatings) * 100 : 0;

  return (
    <div className="px-2 py-4">
      <div className="sticky py-3 top-0 bg-white z-10">
        <div className="flex items-center justify-center mb-3 pb-2 relative">
          <GoChevronLeft
            className="absolute left-0 text-3xl cursor-pointer"
            onClick={() => navigate(-1)}
          />
          <h1 className="text-xl font-opensans font-semibold">Reviews</h1>
        </div>

        <div className="flex justify-between mb-3 w-full overflow-x-auto space-x-2 scrollbar-hide">
          {["All", 5, 4, 3, 2, 1].map((star) => (
            <button
              key={star}
              onClick={() => setSelectedRating(star)}
              className={`flex-shrink-0 h-12 px-3 py-2 text-xs font-bold font-opensans text-black border border-gray-400 rounded-full ${
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
          <div className="rounded-full flex flex-col">
            {loading ? (
              <Skeleton circle={true} height={80} width={80} />
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
                <span className="text-xs mt-1 font-poppins text-gray-600">
                  {vendor?.ratingCount || 0}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="my-4 w-full">
          {[5, 4, 3, 2, 1].map((star) => (
            <div key={star} className="flex items-center mb-2">
              <span className="w-6 text-xs font-opensans font-light">
                {star}
              </span>
              <ProgressBar
                now={calculatePercentage(ratingBreakdown[star])}
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
                    width: `${calculatePercentage(ratingBreakdown[star])}%`,
                    borderRadius: "10px",
                  }}
                />
              </ProgressBar>
            </div>
          ))}
        </div>
      </div>

      <div className="p-2">
        {loading && !loadingMore
          ? Array(10)
              .fill()
              .map((_, index) => (
                <div key={index} className="mb-4">
                  <Skeleton
                    circle={true}
                    height={44}
                    width={44}
                    className="mr-3"
                  />
                  <Skeleton height={20} width="80%" />
                  <Skeleton height={20} width="60%" />
                </div>
              ))
          : reviews.map((review) => (
              <div key={review.id} className="mb-4">
                <div className="flex items-center mb-1">
                  <img
                    src={review.userPhotoURL || DefaultImageUrl}
                    alt={review.userName}
                    className="w-11 h-11 rounded-full mr-3"
                  />
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
                    {new Date(
                      review.createdAt.seconds * 1000
                    ).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-2 text-black font-opensans text-sm">
                  {review.reviewText}
                </p>
              </div>
            ))}

        {hasMoreReviews && (
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="mt-4 p-2 bg-customOrange text-white rounded"
          >
            {loadingMore ? "Loading..." : "Load More"}
          </button>
        )}
      </div>
    </div>
  );
};

export default VendorReviews;
