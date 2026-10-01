import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { AlertCircle, ArrowUpRight, Flag, Star, UserRound, X } from "lucide-react";
import { RotatingLines } from "react-loader-spinner";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { db, functions } from "../../firebase.config";
import { useAuth } from "../../custom-hooks/useAuth";
import AppBottomSheet from "../../components/layout/AppBottomSheet";
import AppPageHeader from "../../components/layout/AppPageHeader";
import NativePickerField from "../../components/Form/NativePickerField";
import SEO from "../../components/Helmet/SEO";
import { appHaptics } from "../../services/haptics";
import { reviewVersion } from "../../services/reviewClient.mjs";
import "./store-reviews.css";

const PAGE_SIZE = 20;
const FILTERS = ["All", 5, 4, 3, 2, 1];
const DISPUTE_REASONS = [
  {value: "not-my-customer", label: "This person did not buy from me"},
  {value: "incorrect-order-details", label: "The review describes the wrong order"},
  {value: "abusive-or-harassing", label: "Abusive or harassing content"},
  {value: "spam-or-irrelevant", label: "Spam or unrelated content"},
  {value: "other", label: "Something else"},
];

const toDate = (value) => {
  if (typeof value?.toDate === "function") return value.toDate();
  if (value?.seconds) return new Date(value.seconds * 1000);
  const parsed = new Date(value || 0);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};
const formatDate = (value) => {
  const date = toDate(value);
  return date ? new Intl.DateTimeFormat("en-GB", {day: "numeric", month: "short", year: "numeric"}).format(date) : "Date unavailable";
};

function ReviewSkeleton() {
  return <div className="store-review-skeleton" aria-label="Loading reviews" aria-busy="true">{[0,1,2].map((row) => <div key={row}><span/><i/><i/><i/></div>)}</div>;
}

export default function StoreReviews() {
  const navigate = useNavigate();
  const {currentUser} = useAuth();
  const vendorProfile = useSelector((state) => state.vendorProfile.data) || {};
  const [selectedRating, setSelectedRating] = useState("All");
  const [reviews, setReviews] = useState([]);
  const [counts, setCounts] = useState({1: 0, 2: 0, 3: 0, 4: 0, 5: 0});
  const [lastDocument, setLastDocument] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [disputeStatuses, setDisputeStatuses] = useState({});
  const [disputeReview, setDisputeReview] = useState(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeDetails, setDisputeDetails] = useState("");
  const [submittingDispute, setSubmittingDispute] = useState(false);

  const reviewsRef = useMemo(
    () => currentUser?.uid ? collection(db, "vendors", currentUser.uid, "reviews") : null,
    [currentUser?.uid],
  );

  const loadDisputeStatuses = useCallback(async (reviewIds) => {
    if (!reviewIds.length) return;
    try {
      const callable = httpsCallable(functions, "getMyReviewDisputeStatusesV1");
      const response = await callable({reviewIds});
      setDisputeStatuses((current) => ({...current, ...(response.data?.statuses || {})}));
    } catch (error) {
      console.warn("Review dispute status lookup failed:", error);
    }
  }, []);

  const fetchPage = useCallback(async ({append = false} = {}) => {
    if (!reviewsRef) return;
    append ? setLoadingMore(true) : setLoading(true);
    try {
      const constraints = [];
      if (selectedRating !== "All") constraints.push(where("rating", "==", Number(selectedRating)));
      constraints.push(orderBy("createdAt", "desc"));
      if (append && lastDocument) constraints.push(startAfter(lastDocument));
      constraints.push(limit(PAGE_SIZE));
      const snapshot = await getDocs(query(reviewsRef, ...constraints));
      const page = snapshot.docs.map((review) => ({id: review.id, ...review.data()}));
      setReviews((current) => append ? [...current, ...page] : page);
      setLastDocument(snapshot.docs.at(-1) || null);
      setHasMore(snapshot.size === PAGE_SIZE);
      void loadDisputeStatuses(page.map((review) => review.id));
    } catch (error) {
      console.error("Store reviews load failed:", error);
      toast.error("Reviews could not be loaded. Please try again.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [lastDocument, loadDisputeStatuses, reviewsRef, selectedRating]);

  useEffect(() => {
    setLastDocument(null);
    setReviews([]);
    void fetchPage({append: false});
    // A filter change intentionally starts a new cursor chain.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid, selectedRating]);

  useEffect(() => {
    if (!reviewsRef) return;
    let cancelled = false;
    void Promise.all([1,2,3,4,5].map(async (rating) => {
      const snapshot = await getCountFromServer(query(reviewsRef, where("rating", "==", rating)));
      return [rating, snapshot.data().count];
    })).then((entries) => {
      if (!cancelled) setCounts(Object.fromEntries(entries));
    }).catch((error) => console.warn("Rating breakdown failed:", error));
    return () => { cancelled = true; };
  }, [reviewsRef]);

  const totalRatings = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const average = Number(vendorProfile.ratingCount || totalRatings) > 0
    ? Number(vendorProfile.rating || 0) / Number(vendorProfile.ratingCount || totalRatings)
    : 0;

  const openDispute = (review) => {
    setDisputeReview(review);
    setDisputeReason("");
    setDisputeDetails("");
    void appHaptics.selection();
  };

  const submitDispute = async () => {
    if (!disputeReview || !disputeReason || submittingDispute) return;
    setSubmittingDispute(true);
    try {
      const callable = httpsCallable(functions, "submitReviewDisputeV1");
      const response = await callable({reviewId: disputeReview.id, version: reviewVersion(disputeReview), reason: disputeReason, details: disputeDetails});
      setDisputeStatuses((current) => ({...current, [disputeReview.id]: response.data?.status || "open"}));
      setDisputeReview(null);
      void appHaptics.success();
      toast.success(response.data?.alreadySubmitted ? "This review is already under review." : "Review dispute submitted");
    } catch (error) {
      console.error("Review dispute failed:", error);
      void appHaptics.error();
      toast.error(error?.message || "Your dispute could not be submitted.");
    } finally { setSubmittingDispute(false); }
  };

  const openOrder = (review) => {
    const orderId = review?.orderId || review?.orderIds?.[0];
    if (!orderId) return;
    void appHaptics.selection();
    navigate("/vendor-orders", {state: {focusOrderId: orderId}});
  };

  return (
    <>
      <SEO title="Store reviews - My Thrift" description="Reviews from verified My Thrift buyers." url="https://www.shopmythrift.store/store-reviews" />
      <main className="store-reviews-page">
        <AppPageHeader title="Ratings and reviews" onBack={() => navigate(-1)} />
        <section className="store-rating-summary">
          <div><strong>{average.toFixed(1)}</strong><span>{[1,2,3,4,5].map((star) => <Star key={star} className={star <= Math.round(average) ? "is-filled" : ""}/>)}</span><small>{totalRatings.toLocaleString()} ratings</small></div>
          <div>{[5,4,3,2,1].map((star) => <span key={star}><small>{star}</small><i><b style={{width: `${totalRatings ? (counts[star] / totalRatings) * 100 : 0}%`}}/></i></span>)}</div>
        </section>
        <nav className="store-review-tabs" aria-label="Filter reviews by rating">{FILTERS.map((filter) => <button type="button" key={filter} className={selectedRating === filter ? "is-active" : ""} onClick={() => { setSelectedRating(filter); void appHaptics.selection(); }}>{filter === "All" ? "All" : `${filter} star`}</button>)}</nav>
        <section className="store-review-list">
          {loading ? <ReviewSkeleton/> : !reviews.length ? <div className="store-review-empty"><AlertCircle/><p>No {selectedRating === "All" ? "" : `${selectedRating}-star `}reviews yet.</p></div> : reviews.map((review) => {
            const images = [...(review.productSnapshots || []).map((item) => item.productImageUrl), ...(review.reviewImageUrls || [])].filter(Boolean);
            const status = disputeStatuses[review.id];
            const orderId = review.orderId || review.orderIds?.[0] || "";
            return <article key={review.id} className="store-review-card">
              <header><span className="store-review-avatar">{review.userPhotoURL ? <img src={review.userPhotoURL} alt=""/> : <UserRound/>}</span><div><strong>{review.userName || "My Thrift shopper"}</strong><small>{formatDate(review.createdAt)}</small></div><button type="button" disabled={Boolean(status)} onClick={() => openDispute(review)}>{status ? <span>{status}</span> : <><Flag/>Dispute</>}</button></header>
              <div className="store-review-stars">{[1,2,3,4,5].map((star) => <Star key={star} className={star <= Number(review.rating) ? "is-filled" : ""}/>)}</div>
              {review.reviewText && <p>{review.reviewText}</p>}
              {images.length > 0 && <div className="store-review-images">{images.map((image, index) => <img key={`${image}-${index}`} src={image} alt={`Review attachment ${index + 1}`}/>)}</div>}
              {orderId && <div className="store-review-order"><span><small>Order</small><strong title={orderId}>{orderId}</strong></span><button type="button" onClick={() => openOrder(review)}>Go to order<ArrowUpRight/></button></div>}
            </article>;
          })}
          {hasMore && !loading && <button type="button" className="store-review-load-more" onClick={() => fetchPage({append: true})} disabled={loadingMore}>{loadingMore ? <RotatingLines strokeColor="#f9531e" width="20"/> : "Load more reviews"}</button>}
        </section>
      </main>

      <AppBottomSheet open={Boolean(disputeReview)} onClose={() => !submittingDispute && setDisputeReview(null)} height="68dvh" compactTop keyboardAware dismissible={!submittingDispute} closeOnBackdrop={!submittingDispute} ariaLabel="Dispute review">
        <div className="store-review-dispute-head"><div><h2>Dispute this review</h2><p>Our support team will compare it with the verified order.</p></div><button type="button" onClick={() => setDisputeReview(null)} disabled={submittingDispute}><X/></button></div>
        <div className="store-review-dispute-body"><NativePickerField title="Reason" value={disputeReason} options={DISPUTE_REASONS} onChange={setDisputeReason} placeholder="Choose a reason" className="store-review-reason-picker"/><textarea rows={5} maxLength={1000} value={disputeDetails} onChange={(event) => setDisputeDetails(event.target.value)} placeholder="Add context for our support team (optional)"/><p>Disputing does not immediately remove a review. Support will review the order and contact you if more information is needed.</p></div>
        <div className="store-review-dispute-footer"><button type="button" onClick={submitDispute} disabled={!disputeReason || submittingDispute || (disputeReason === "other" && disputeDetails.trim().length < 10)}>{submittingDispute ? <RotatingLines strokeColor="#fff" width="20"/> : "Submit dispute"}</button></div>
      </AppBottomSheet>
    </>
  );
}
