import React, { useEffect, useState } from 'react'
import { GoChevronLeft } from 'react-icons/go'
import Skeleton from 'react-loading-skeleton'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../custom-hooks/useAuth'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../firebase.config'
import { useSelector } from 'react-redux'
import { FaStar } from 'react-icons/fa'
import { ProgressBar } from 'react-bootstrap'

const StoreReviews = () => {
    const navigate = useNavigate()
    const {currentUser} = useAuth()
    const { data: userData } = useSelector(
        (state) => state.vendorProfile
      );
    const [isLoading, setIsLoading] = useState(false)
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

    const { ratingCount, rating } =
    userData || {}; 

    const totalRatings = Object.values(ratingBreakdown).reduce(
        (acc, value) => acc + value,
        0
      );
    
      const calculatePercentage = (count) => (count / totalRatings) * 100;

      const defaultImageUrl =
  "https://images.saatchiart.com/saatchi/1750204/art/9767271/8830343-WUMLQQKS-7.jpg";


    useEffect(() => {
        const fetchReviews = async () => {
          if (!currentUser.uid) {
            console.error("User not logged in or UID missing");
            return; // Exit the function early if currentUser or UID is not available
          }
          setIsLoading(true);
          try {
            const reviewsRef = collection(
              db,
              "vendors",
              currentUser.uid,
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

      const averageRating = ratingCount > 0 ? rating / ratingCount : 0;

  return (
    <div className="px-2 py-4">
              <div className="sticky py-3 top-0 bg-white z-10">
                <div className="flex items-center justify-between mb-3 pb-2">
                  <GoChevronLeft
                    className="text-3xl cursor-pointer"
                    onClick={() => navigate(-1)}
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
                  {isLoading ? (
                    <div>
                      <Skeleton
                        square={true}
                        height={20}
                        width={300}
                        className="my-1 ml-3"
                      />
                      <Skeleton
                        square={true}
                        height={20}
                        width={300}
                        className="my-1 ml-3"
                      />
                      <Skeleton
                        square={true}
                        height={20}
                        width={300}
                        className="my-1 ml-3"
                      />
                      <Skeleton
                        square={true}
                        height={20}
                        width={300}
                        className="my-1 ml-3"
                      />
                      <Skeleton
                        square={true}
                        height={20}
                        width={300}
                        className="my-1 ml-3"
                      />
                    </div>
                  ) : (
                    [5, 4, 3, 2, 1].map((star) => (
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
                    ))
                  )}
                </div>
              </div>

              <div className="p-2">
                {filterReviews.length > 0 && !isLoading ? (
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
                      <div className="flex space-x-3 items-center">
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
                ) : isLoading ? (
                  <>
                    <div>
                      <div className="w-full mb-4">
                        <div className="w-full flex items-center mb-1">
                          <Skeleton
                            circle={true}
                            width={44} height={44} className=" rounded-full mr-3"
                          />
                          <div>
                            <Skeleton square={true} width={50} height={20} />
                          </div>
                        </div>
                        <div className="w-full flex space-x-3 items-center">
                          <Skeleton square={true} width={70} height={30} />
                          <Skeleton square={true} width={50} height={20} />
                        </div>
                        <Skeleton square={true} width={330} height={20} />
                      </div>
                      <div className="w-full mb-4">
                        <div className="w-full flex items-center mb-1">
                          <Skeleton
                            circle={true}
                            width={44} height={44} className=" rounded-full mr-3"
                          />
                          <div>
                            <Skeleton square={true} width={50} height={20} />
                          </div>
                        </div>
                        <div className="w-full flex space-x-3 items-center">
                          <Skeleton square={true} width={90} height={30} />
                          <Skeleton square={true} width={50} height={20} />
                        </div>
                        <Skeleton square={true} width={330} height={20} />
                        <Skeleton square={true} width={110} height={20} />
                      </div>
                      <div className="w-full mb-4">
                        <div className="w-full flex items-center mb-1">
                          <Skeleton
                            circle={true}
                            width={44} height={44} className=" rounded-full mr-3"
                          />
                          <div>
                            <Skeleton square={true} width={50} height={20} />
                          </div>
                        </div>
                        <div className="w-full flex space-x-3 items-center">
                          <Skeleton square={true} width={60} height={30} />
                          <Skeleton square={true} width={50} height={20} />
                        </div>
                        <Skeleton square={true} width={330} height={20} />
                        <Skeleton square={true} width={330} height={20} />
                        <Skeleton square={true} width={90} height={20} />
                      </div>
                      <div className="w-full mb-4">
                        <div className="w-full flex items-center mb-1">
                          <Skeleton
                            circle={true}
                            width={44} height={44} className=" rounded-full mr-3"
                          />
                          <div>
                            <Skeleton square={true} width={65} height={20} />
                          </div>
                        </div>
                        <div className="w-full flex space-x-3 items-center">
                          <Skeleton square={true} width={65} height={30} />
                          <Skeleton square={true} width={50} height={20} />
                        </div>
                        <Skeleton square={true} width={230} height={20} />
                      </div>
                      <div className="w-full mb-4">
                        <div className="w-full flex items-center mb-1">
                          <Skeleton
                            circle={true}
                            width={44} height={44} className=" rounded-full mr-3"
                          />
                          <div>
                            <Skeleton square={true} width={90} height={20} />
                          </div>
                        </div>
                        <div className="w-full flex space-x-3 items-center">
                          <Skeleton square={true} width={70} height={30} />
                          <Skeleton square={true} width={50} height={20} />
                        </div>
                        <Skeleton square={true} width={330} height={20} />
                        <Skeleton square={true} width={200} height={20} />
                      </div>
                      <div className="w-full mb-4">
                        <div className="w-full flex items-center mb-1">
                          <Skeleton
                            circle={true}
                            width={44} height={44} className=" rounded-full mr-3"
                          />
                          <div>
                            <Skeleton square={true} width={40} height={20} />
                          </div>
                        </div>
                        <div className="w-full flex space-x-3 items-center">
                          <Skeleton square={true} width={70} height={30} />
                          <Skeleton square={true} width={50} height={20} />
                        </div>
                        <Skeleton square={true} width={330} height={20} />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-xs font-opensans text-gray-800 text-center mt-8">
                    No reviews here yet. Reviews will appear here when customers post them 🌟...
                  </div>
                )}
              </div>
            </div>
  )
}

export default StoreReviews