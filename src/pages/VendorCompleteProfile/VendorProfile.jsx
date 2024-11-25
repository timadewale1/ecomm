import React, { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { MdModeEdit } from "react-icons/md";
import { auth, db } from "../../firebase.config";
import { RotatingLines } from "react-loader-spinner";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { ChevronRight, User, ChevronLeft } from "lucide-react";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import useAuth from "../../custom-hooks/useAuth";
import { IoMdContact } from "react-icons/io";
import { TbHomeStar } from "react-icons/tb";
import { PiSignOutBold } from "react-icons/pi";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import AvatarSelectorModal from "../vendor/VendorAvatarSelect.jsx";
import Skeleton from "react-loading-skeleton";
import VprofileDetails from "../vendor/VprofileDetails.jsx";
import { useDispatch, useSelector } from "react-redux";
import { clearOrders } from "../../redux/actions/orderaction.js";
import { FaStar } from "react-icons/fa";
import { ProgressBar } from "react-bootstrap";
import { GoChevronLeft } from "react-icons/go";
import { setVendorProfile, setLoading } from "../../redux/vendorProfileSlice";
ChartJS.register(ArcElement, Tooltip, Legend);


const defaultImageUrl =
  "https://images.saatchiart.com/saatchi/1750204/art/9767271/8830343-WUMLQQKS-7.jpg";

const VendorProfile = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentUser } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showRatings, setShowRatings] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [fulfilledOrders, setFulfilledOrders] = useState(0);
  const [unfulfilledOrders, setUnfulfilledOrders] = useState(0);
  const [incomingOrders, setIncomingOrders] = useState(0);
  const [selectedRating, setSelectedRating] = useState("All");
  const [reviews, setReviews] = useState([]);
  const [filterReviews, setFilterReviews] = useState([]);
  const [ratingBreakdown, setRatingBreakdown] = useState({
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  });
  const totalOrders = fulfilledOrders + unfulfilledOrders + incomingOrders;

  const totalRatings = Object.values(ratingBreakdown).reduce(
    (acc, value) => acc + value,
    0
  );

  const calculatePercentage = (count) => (count / totalRatings) * 100;

  const activityData = {
    labels: ["Fulfilled", "Unfulfilled", "Incoming"],
    datasets: [
      {
        data:
          totalOrders === 0
            ? [1, 1, 1]
            : [fulfilledOrders, unfulfilledOrders, incomingOrders],
        backgroundColor: ["#15803d", "#d8d333", "#3b82f6" ],
        hoverBackgroundColor: ["#D92CA0", "#F27D38", "#5CBF49"],
        borderWidth: 0,
      },
    ],
  };

  const activityOptions = {
    rotation: -90, // Start from the top (semi-circle orientation)
    circumference: 180, // Only show half of the chart (semi-circle)
    cutout: "70%", // Size of the center hole
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
      },
    },
  };

  const { data: userData, loading } = useSelector(
    (state) => state.vendorProfile
  );

   // Fetch user data on mount if not already in Redux
   useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser) {
        dispatch(setLoading(true)); // Set loading state
        try {
          const vendorDoc = await getDoc(doc(db, "vendors", currentUser.uid)); // Replace with actual UID
          if (vendorDoc.exists()) {
            dispatch(setVendorProfile(vendorDoc.data())); // Save data in Redux
          } else {
            console.error("No such document!");
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          toast.error("Failed to fetch user data.", {
            className: "custom-toast",
          });
        } finally {
          dispatch(setLoading(false)); // Stop loading
        }
      }
    };

    fetchUserData();
  }, [dispatch, currentUser]);

  const {
    shopName,
    coverImageUrl,
    marketPlaceType,
    uid,
    ratingCount,
    rating
  } = userData || {}

  useEffect(() => {
    const fetchOrderData = async () => {
      if (!uid) return; // Ensure currentUser is defined
      
      try {
        const ordersRef = collection(db, "orders");

        // Fulfilled Orders (Delivered)
        const fulfilledQuery = query(
          ordersRef,
          where("progressStatus", "==", "Delivered"),
          where("vendorId", "==", uid)
        );
        const fulfilledSnapshot = await getDocs(fulfilledQuery);
        setFulfilledOrders(fulfilledSnapshot.size);

        // Unfulfilled Orders (In Progress, Shipped, or Pending)
        const unfulfilledQuery = query(
          ordersRef,
          where("progressStatus", "in", ["In Progress", "Shipped", "Pending"]),
          where("vendorId", "==", uid)
        );
        const unfulfilledSnapshot = await getDocs(unfulfilledQuery);
        setUnfulfilledOrders(unfulfilledSnapshot.size);

        // Incoming Orders
        const incomingQuery = query(
          ordersRef,
          where("progressStatus", "==", "Pending"),
          where("vendorId", "==", uid)
        );
        const incomingSnapshot = await getDocs(incomingQuery);
        setIncomingOrders(incomingSnapshot.size);
      } catch (error) {
        console.error("Error fetching order data:", error);
      }
    };

    fetchOrderData();
  }, [currentUser]);

  // useEffect(() => {
  //   setIsLoading(true);
  //   const fetchUserData = async () => {
  //     if (currentUser) {
  //       try {
  //         // Fetch user document from Firestore
  //         const vendorDoc = await getDoc(doc(db, "vendors", currentUser.uid));
  //         if (vendorDoc.exists()) {
  //           const data = vendorDoc.data();
  //           setUserData(data);
  //           setDisplayName(data.firstName + " " + data.lastName);
  //           setEmail(data.email || "");
  //           setShopName(data.shopName || "");

  //           // Set cover image URL from Firestore or use default image
  //           setCoverImageUrl(data.coverImageUrl || defaultImageUrl);
  //         }
  //       } catch (error) {
  //         console.error("Error fetching user data:", error);
  //       } finally {
  //         setIsLoading(false);
  //       }
  //     }
  //   };
  //   fetchUserData();
  // }, [currentUser]);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!uid) {
        console.error("User not logged in or UID missing");
        return; // Exit the function early if currentUser or UID is not available
      } 
      setIsLoading(true)
        try {
        const reviewsRef = collection(
          db,
          "vendors",
          uid,
          "reviews"
        );
        const reviewsSnapshot = await getDocs(reviewsRef);
        const reviewsList = reviewsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Apply filter based on selectedRating
        // Filter reviews based on selectedRating
        const filteredReviews =
          selectedRating === "All"
            ? reviewsList
            : reviewsList.filter((review) => review.rating === selectedRating);

        setFilterReviews(filteredReviews); // Update filtered reviews
        setReviews(reviewsList); // Update all reviews

        // Separate text and non-text reviews
        const textReviews = filteredReviews.filter(
          (review) => review.reviewText
        );
        setReviews(textReviews); 

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
        setIsLoading(false);
      }
    };
    fetchReviews();
  }, [currentUser, selectedRating]); // Trigger on `selectedRating` change

  const averageRating =
    ratingCount > 0
      ? rating / ratingCount
      : 0;

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut(auth);

      // Dispatch clearOrders action to clear orders from Redux store
      dispatch(clearOrders());

      toast.success("Successfully logged out", { className: "custom-toast" });
      navigate("/vendorlogin");
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Error logging out", { className: "custom-toast" });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="font-opensans">
      {!showDetails && !showHistory && !showRatings ? (
        <div>
          {/* Cover Image Section */}
          <div
            className="relative w-full h-56 bg-cover bg-customSoftGray bg-full flex"
            style={{
              backgroundImage: loading ? "none" : marketPlaceType === "virtual" ? `url(${coverImageUrl})` : `url(${defaultImageUrl})`,
            }} 
          >
            {loading && (
              <Skeleton
                height={224} // Adjusted height to match the cover div height
                width="100%"
                className="absolute top-0 left-0 w-full h-full"
              />
            )}
          </div>

          <div className="p-2 text-2xl font-opensans font-bold text-black capitalize mt-1 items-start">
            {shopName}
          </div>
          <div className="flex flex-col">
            {/* My Activity Chart */}
            <div className=" my-4 w-full px-2">
            
              <div className="w-full h-14 flex">
                <h1 className="text-base font-semibold font-opensans mx-2 translate-y-4 text-black">
                  Quick Stats
                </h1>
              </div>
              <div className="relative bg-customOrange flex flex-col items-center rounded-xl"><div className="absolute top-0 right-0">
            <img src="./Vector.png" alt="" className="w-16 h-24" />
          </div>
          <div className="absolute bottom-0 left-0">
            <img src="./Vector2.png" alt="" className="w-16 h-16" />
          </div>
                <div className="w-40 h-40 relative">
                  <Doughnut data={activityData} options={activityOptions} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center mt-5">
                      <p className="text-xs text-black font-opensans font-medium">
                        Total Orders
                      </p>
                      <p className="text-lg font-opensans text-black font-bold">
                        {totalOrders}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex mt-2 space-x-6 text-sm mb-3">
                  <div className="flex items-center space-x-1">
                    <span className="w-3 h-3 rounded-full bg-green-700"></span>
                    <span className="font-opensans text-black">
                      Fulfilled ({fulfilledOrders})
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="w-3 h-3 rounded-full bg-[#d8d333]"></span>
                    <span className="font-opensans text-black">
                      Unfulfilled ({unfulfilledOrders})
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                    <span className="font-opensans text-black">
                      Incoming ({incomingOrders})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Options */}
            <div className="w-full mt-2 px-2">
              <div className="w-full h-14 flex">
                <h1 className="text-base font-semibold mx-2 translate-y-3 text-black">
                  Personal
                </h1>
              </div>
              <div className="flex flex-col items-center w-full">
                <div
                  className="flex items-center justify-between w-full px-3 py-3 cursor-pointer rounded-xl bg-customGrey mb-3"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  <div className="flex items-center">
                    <User className="text-black text-xl mr-4" />
                    <h2 className="text-size font-normal text-black capitalize">
                      Personal information
                    </h2>
                  </div>
                  <ChevronRight className="text-black" />
                </div>
              </div>

              <div className="w-full h-14 flex">
                <h1 className="text-base font-semibold mx-2 translate-y-3 text-black">
                  Data
                </h1>
              </div>
              <div className="flex flex-col items-center w-full">
                <div
                  className="flex items-center justify-between w-full px-3 py-3 cursor-pointer rounded-xl bg-customGrey mb-3"
                  onClick={() => setShowRatings(!showRatings)}
                >
                  <div className="flex items-center">
                    <TbHomeStar className="text-black text-xl mr-4" />
                    <h2 className="text-size font-normal text-black capitalize">
                      View Ratings
                    </h2>
                  </div>
                  <ChevronRight className="text-black" />
                </div>

                <div
                  className="flex items-center justify-between w-full px-3 py-3 cursor-pointer rounded-xl bg-customGrey mb-3"
                  onClick={handleLogout}
                >
                  <div className="flex items-center">
                    <PiSignOutBold className="text-red-600 text-xl mr-4" />
                    <p className="text-size text-black font-normal capitalize">
                      Sign Out
                    </p>
                  </div>
                  {isLoggingOut && (
                    <div className="flex items-center ml-auto">
                      <RotatingLines
                        strokeColor="#f9531e"
                        strokeWidth="5"
                        animationDuration="0.75"
                        width="24"
                        visible={true}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {showDetails && (
            <VprofileDetails
              showDetails={showDetails}
              setShowDetails={setShowDetails}
            />
          )}
          {showHistory && (
            <div className="flex flex-col items-center">
              <ChevronLeft
                className="text-2xl text-black cursor-pointer self-start"
                onClick={() => setShowHistory(false)}
              />
              <h2 className="text-xl font-ubuntu mt-4">Recent Activities</h2>
              {/* Render History content here */}
            </div>
          )}
          {showRatings && (
            <div className="px-2 py-4">
              <div className="sticky py-3 top-0 bg-white z-10">
                <div className="flex items-center justify-between mb-3 pb-2">
                  <GoChevronLeft
                    className="text-3xl cursor-pointer"
                    onClick={() => setShowRatings(!showRatings)}
                  />
                  <h1 className="text-xl font-opensans font-semibold">
                    Reviews
                  </h1>

                  {/*This empty div gives the illusion that the text above is centered */}
                  <div></div>
                </div>

                <div className="flex justify-between mb-3 w-full overflow-x-auto space-x-2 scrollbar-hide">
                  {["All", 5, 4, 3, 2, 1].map((star) => (
                    <button
                      key={star}
                      onClick={() => setSelectedRating(star)} // This correctly updates selectedRating
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
                    {isLoading ? (
                      <div className="flex flex-col">
                        <Skeleton square={true} height={80} width={80} />
                        <Skeleton square={true} height={15} width={80} />
                        <Skeleton square={true} height={15} width={20} />
                        </div>
                      
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
                          {ratingCount}
                        </span>
                      </>
                    )}
                  </div>
                </div> 

                <div className="my-4  w-full">
                  {[5, 4, 3, 2, 1].map((star) => (
                    <div key={star} className="flex items-center mb-2">
                      <span className="w-6 text-xs  font-opensans font-light">
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
                            width: `${calculatePercentage(
                              ratingBreakdown[star]
                            )}%`,
                            borderRadius: "10px",
                          }}
                        />
                      </ProgressBar>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-2">
                {filterReviews.length > 0 ? (
                  filterReviews.map((review) => (
                    <div key={review.id} className="mb-4">
                      <div className="flex items-center mb-1">
                        <img
                          src={review.userPhotoURL || defaultImageUrl}
                          alt={review.userName}
                          className="w-11 h-11 rounded-full mr-3"
                        />
                        <div>
                          <h2 className="font-semibold text-xs">
                            {review.userName}
                          </h2>
                        </div>
                      </div>
                      <div className="flex space-x-3">
                        <div className="flex space-x-1">
                          {Array.from({ length: review.rating }).map(
                            (_, index) => (
                              <FaStar key={index} className="text-yellow-500" />
                            )
                          )}
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
                  ))
                ) : (
                  <p className="text-center text-xl mt-6">No reviews found for this filter.</p>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* {isAvatarModalOpen && (
        <AvatarSelectorModal
          userId={currentUser.uid}
          onClose={() => setIsAvatarModalOpen(false)}
          onAvatarChange={(newAvatar) =>
            setUserData((prev) => ({ ...prev, photoURL: newAvatar }))
          }
          onRemoveAvatar={async () => {
            try {
              await updateDoc(doc(db, "vendors", currentUser.uid), {
                photoURL: "",
              });
              setUserData((prev) => ({ ...prev, photoURL: "" }));
              toast.success("Avatar removed successfully", {
                className: "custom-toast",
              });
            } catch (error) {
              toast.error("Error removing avatar. Please try again.", {
                className: "custom-toast",
              });
            }
          }}
        />
      )} */}
    </div>
  );
};

export default VendorProfile;
