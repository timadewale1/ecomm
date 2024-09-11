import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth } from "../../firebase.config";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  increment,
  query,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { GoChevronLeft, GoDotFill } from "react-icons/go";
import { FiPlus } from "react-icons/fi";
import { FaStar } from "react-icons/fa";
import { ProgressBar } from "react-bootstrap";
import toast from "react-hot-toast";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import ReactStars from "react-rating-stars-component";

import RoundedStars from "../../components/RoundedStars";
import { RotatingLines } from "react-loader-spinner";

const VendorRatings = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [vendor, setVendor] = useState(null);
  const [inputValid, setInputValid] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newReview, setNewReview] = useState("");
  const [selectedRating, setSelectedRating] = useState("All");
  const [newRating, setNewRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProfileComplete, setIsProfileComplete] = useState(false);

  useEffect(() => {
    const fetchCurrentUser = async (uid) => {
      try {
        const userDoc = await getDoc(doc(db, "users", uid));
        const userData = userDoc.data();
        setCurrentUser(userData);

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
        const vendorRef = doc(db, "vendors", id);
        const vendorDoc = await getDoc(vendorRef);
        if (vendorDoc.exists()) {
          const vendorData = vendorDoc.data();
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

  const fetchReviews = async () => {
    try {
      const reviewsRef = collection(db, "vendors", id, "reviews");
      let q;

      if (selectedRating && selectedRating !== "All") {
        q = query(reviewsRef, where("rating", "==", selectedRating));
      } else {
        q = reviewsRef;
      }

      const reviewsSnapshot = await getDocs(q);
      const reviewsList = reviewsSnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((review) => review.reviewText); // Only include reviews with text

      setReviews(reviewsList);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    }
  };

  useEffect(() => {
    if (id) {
      fetchReviews();
    } else {
      console.error("id is undefined");
    }
  }, [id, selectedRating]);

  const forbiddenWords = [
    "damn",
    "hell",
    "fool",
    "werey",
    "ode",
    "idiot",
    "shit",
    "crap",
    "bastard",
    "bitch",
    "asshole",
    "dick",
    "piss",
    "prick",
    "cunt",
    "fuck",
    "motherfucker",
    "fucker",
    "cock",
    "pussy",
    "twat",
    "whore",
    "slut",
    "nigger",
    "chink",
    "spic",
    "wanker",
    "bollocks",
    "bugger",
    "tosser",
    "shithead",
    "douchebag",
    "jackass",
    "retard",
  ];

  const checkForForbiddenWords = (text) => {
    const lowerText = text.toLowerCase();
    return forbiddenWords.some((word) => lowerText.includes(word));
  };

  const handleReviewChange = (e) => {
    const text = e.target.value;
    setNewReview(text);

    if (checkForForbiddenWords(text)) {
      setInputValid(false);
    } else {
      setInputValid(true);
    }
  };

  const handleAddReview = async () => {
    if (!inputValid) {
      toast.error("Your review contains inappropriate language.");
      return;
    }

    if (!isProfileComplete) {
      toast.error("Please complete your profile before submitting a review.");
      return;
    }

    try {
      setIsSubmitting(true);
      if (!id || !currentUser) {
        toast.error("You must be logged in to submit a review.");
        setIsSubmitting(false);
        return;
      }

      if (!newRating) {
        toast.error("Please select a rating.");
        setIsSubmitting(false);
        return;
      }

      const reviewsRef = collection(db, "vendors", id, "reviews");

      // Save the review only if text is provided
      if (newReview.trim() !== "") {
        await addDoc(reviewsRef, {
          reviewText: newReview,
          rating: newRating,
          userName: currentUser.username,
          userPhotoURL: currentUser.photoURL,
          createdAt: new Date(),
        });
      }

      // Update vendor rating even if no text review is provided
      const vendorRef = doc(db, "vendors", id);
      await updateDoc(vendorRef, {
        ratingCount: increment(1),
        rating: increment(newRating),
      });

      setShowModal(false);
      setNewReview("");
      setNewRating(0);
      fetchReviews();
      toast.success("Review added successfully!");
    } catch (error) {
      toast.error("Error adding review");
    } finally {
      setIsSubmitting(false);
    }
  };

  const DefaultImageUrl =
    "https://images.saatchiart.com/saatchi/1750204/art/9767271/8830343-WUMLQQKS-7.jpg";

  const averageRating =
    vendor?.ratingCount > 0 ? vendor.rating / vendor.ratingCount : 0;
  const ratingBreakdown = {
    5: reviews.filter((r) => r.rating === 5).length,
    4: reviews.filter((r) => r.rating === 4).length,
    3: reviews.filter((r) => r.rating === 3).length,
    2: reviews.filter((r) => r.rating === 2).length,
    1: reviews.filter((r) => r.rating === 1).length,
  };

  const totalRatings = Object.values(ratingBreakdown).reduce(
    (acc, value) => acc + value,
    0
  );

  const calculatePercentage = (count) => (count / totalRatings) * 100;

  return (
    <div className="px-2 py-4">
      <div className="sticky py-3 top-0 bg-white z-10">
        <div className="flex items-center justify-between mb-3 pb-2">
          <GoChevronLeft
            className="text-3xl cursor-pointer"
            onClick={() => navigate(-1)}
          />
          <h1 className="text-xl font-opensans font-semibold">Reviews</h1>
          <FiPlus
            className="text-3xl cursor-pointer"
            onClick={() => setShowModal(true)}
          />
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
          {[5, 4, 3, 2, 1].map((star) => (
            <div key={star} className="flex items-center mb-2">
              <span className="w-6 text-xs  font-opensans font-light">{star}</span>
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
        {reviews.map((review) => (
          <div key={review.id} className="mb-4">
            <div className="flex items-center mb-1">
              <img
                src={review.userPhotoURL}
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
                {new Date(review.createdAt.seconds * 1000).toLocaleDateString()}
              </span>
            </div>
            <p className="mt-2 text-black font-opensans text-sm">
              {review.reviewText}
            </p>
          </div>
        ))}
      </div>

      {showModal && vendor && (
        <div className="fixed inset-0 bg-white z-50">
          <div className="flex items-center px-2 py-4 mb-2">
            <GoChevronLeft
              className="text-3xl cursor-pointer"
              onClick={() => setShowModal(false)}
            />
            <h1 className="text-lg ml-4 font-opensans font-semibold">
              Rate {vendor.shopName}
            </h1>
            <div />
          </div>
          <div className="border-b border-gray-300 w-full mb-2"></div>

          <div className="p-3">
            <div className="flex justify-center mb-2 ">
              <div className="relative w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center">
                {vendor.coverImageUrl ? (
                  <img
                    className="w-32 h-32 rounded-full bg-slate-700 object-cover"
                    src={vendor.coverImageUrl}
                    alt={vendor.shopName}
                  />
                ) : (
                  <img
                    className="w-32 h-32 rounded-full bg-slate-700 object-cover"
                    src={DefaultImageUrl}
                    alt=""
                  />
                )}
              </div>
            </div>
            <div className="flex justify-center">
              <div className="flex items-center text-black text-lg font-semibold">
                {vendor.socialMediaHandle}
              </div>
            </div>
            <div className="flex justify-center mt-2">
              <>
                <FaStar className="text-yellow-400" size={16} />
                <span className="flex text-xs font-opensans items-center ml-2">
                  {averageRating.toFixed(1)}
                  <GoDotFill className="mx-1 text-gray-300 font-opensans dot-size" />
                  {vendor.ratingCount || 0} ratings
                </span>
              </>
            </div>
            <div className="w-fit text-center bg-customGreen p-2 flex items-center justify-center rounded-full mt-3 mx-auto">
              <div className="mt-2 flex flex-wrap items-center -translate-y-1 justify-center text-textGreen text-xs space-x-1">
                {loading ? (
                  <Skeleton width={80} height={24} count={4} inline={true} />
                ) : (
                  vendor.categories.map((category, index) => (
                    <React.Fragment key={index}>
                      {index > 0 && (
                        <GoDotFill className="mx-1 dot-size text-dotGreen" />
                      )}
                      <span>{category}</span>
                    </React.Fragment>
                  ))
                )}
              </div>
            </div>

            <h1 className="font-opensans text-sm mt-4 font-semibold">
              Rate this shop
            </h1>
            <div className="mt-2 mb-3 flex justify-center">
              <ReactStars
                count={5}
                onChange={(newRating) => setNewRating(newRating)}
                size={24}
                activeColor="#ffd700"
                emptyIcon={<RoundedStars filled={false} />}
                filledIcon={<RoundedStars filled={true} />}
              />
            </div>
            <textarea
              value={newReview}
              onFocus={() => {
                const input = document.querySelector("textarea");
                input.scrollIntoView({ behavior: "smooth" });
              }}
              onChange={handleReviewChange}
              placeholder="Describe your experience with this shop (Optional)"
              className={`w-full p-2 border h-20 text-xs text-gray-900 rounded mb-4 ${
                inputValid ? "border-gray-300" : "border-red-500"
              }`}
              style={{ resize: "none" }}
            />

            <div className="fixed inset-x-0 bottom-0 p-4 bg-white">
              <button
                onClick={handleAddReview}
                className={`${
                  inputValid ? "bg-customOrange" : "bg-gray-400"
                } text-white font-opensans font-medium h-12 px-6 rounded-full w-full flex items-center justify-center`}
                disabled={isSubmitting || !inputValid}
              >
                {isSubmitting ? (
                  <RotatingLines
                    strokeColor="#ffffff"
                    strokeWidth="5"
                    animationDuration="0.75"
                    width="24"
                    visible={true}
                  />
                ) : (
                  "Post"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorRatings;
