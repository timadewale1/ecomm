import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { IoArrowBack } from "react-icons/io5";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import logo from "../Images/logo.png";
import "swiper/css/free-mode";
import { CiSearch } from "react-icons/ci";

import "swiper/css/autoplay";
import { Cloudinary } from "@cloudinary/url-gen";
import { auto } from "@cloudinary/url-gen/actions/resize";
import { autoGravity } from "@cloudinary/url-gen/qualifiers/gravity";
import { AdvancedImage } from "@cloudinary/react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import { FreeMode, Autoplay } from "swiper/modules";
import Skeleton from "react-loading-skeleton";
import { useSelector, useDispatch } from "react-redux";
import {
  fetchHomepageData,
  resetHomepageState,
} from "../redux/actions/homepageactions";
import "react-loading-skeleton/dist/skeleton.css";
import { IoIosNotificationsOutline } from "react-icons/io";
import gsap from "gsap";

import { ScrollTrigger } from "gsap/ScrollTrigger";

import "../styles/bottombar.css";
import { useNavigation } from "../components/Context/Bottombarcontext";
import Market from "../components/Market/Market";
import { db } from "../firebase.config";
import ProductCard from "../components/Products/ProductCard";

import Amazingdeals from "../components/Amazingdeals";
import PopularCats from "../components/PopularCategories/PopularCats";
import Condition from "../components/Conditions/Condition";
gsap.registerPlugin(ScrollTrigger);

const Homepage = () => {
  const navigate = useNavigate();
  const { setActiveNav } = useNavigation();

  const dispatch = useDispatch();

  const [userName, setUserName] = useState("User");
  // const [loading, setLoading] = useState(true);
  const location = useLocation();

  const { products, lastVisible, status } = useSelector(
    (state) => state.homepage
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredProducts, setFilteredProducts] = useState([]);
  const productCardsRef = useRef([]); // For GSAP animations
  const [initialLoad, setInitialLoad] = useState(true);
  // const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true); // Ensure you have this state
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  // Ref to store scroll position
  const scrollPositionRef = useRef(0);
  const prevProductsRef = useRef(null);

  // Fetch unread notifications
  useEffect(() => {
    const fetchUnreadNotifications = async (userId) => {
      try {
        const notificationsRef = collection(db, "notifications");
        const q = query(
          notificationsRef,
          where("userId", "==", userId),
          where("seen", "==", false)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          setHasUnreadNotifications(true);
        } else {
          setHasUnreadNotifications(false);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchUnreadNotifications(user.uid);
      }
    });
  }, []);

  const handleShowMore = () => {
    setActiveNav(3);
    navigate("/browse-markets");
  };

  const clearSearch = () => {
    setSearchTerm("");
    setFilteredProducts(products);
  };

  // Save scroll position when leaving the page
  useEffect(() => {
    return () => {
      scrollPositionRef.current = window.scrollY; // Save the scroll position
    };
  }, []);

  // Restore scroll position when returning to the page
  useEffect(() => {
    window.scrollTo(0, scrollPositionRef.current); // Restore scroll position
  }, []);

  useEffect(() => {
    const auth = getAuth();
    const fetchUserName = async (uid) => {
      try {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserName(userData.username || "User");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchUserName(user.uid);
      } else {
        setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    console.log("Component mounted. Status:", status);

    if (status === "idle") {
      console.log("Dispatching fetchHomepageData...");
      dispatch(fetchHomepageData());
    }
  }, [dispatch, status]);

  const handleLoadMore = () => {
    if (lastVisible && status !== "loading") {
      console.log("Dispatching fetchHomepageData for more products...");
      dispatch(fetchHomepageData());
    }
  };

  useEffect(() => {
    if (products.length > 0) {
      console.log("Products updated:", products);
    }
  }, [products]);

  useEffect(() => {
    if (!loading && initialLoad) {
      productCardsRef.current.forEach((card, index) => {
        gsap.fromTo(
          card,
          {
            opacity: 0,
            y: 100,
          },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            scrollTrigger: {
              trigger: card,
              start: "top 80%",
              end: "top 30%",
              toggleActions: "play none none none",
              once: true,
            },
          }
        );
      });
    } else if (!loading && !initialLoad) {
      productCardsRef.current.forEach((card) => {
        gsap.set(card, { opacity: 1, y: 0 });
      });
    }
  }, [loading, initialLoad]);

  useEffect(() => {
    if (!searchTerm) {
      productCardsRef.current.forEach((card, index) => {
        gsap.fromTo(
          card,
          {
            opacity: 0,
            y: 100,
          },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            scrollTrigger: {
              trigger: card,
              start: "top 80%",
              end: "top 30%",
              toggleActions: "play none none none",
              once: true,
            },
          }
        );
      });
    }
  }, [filteredProducts]);

  const cld = new Cloudinary({
    cloud: {
      cloudName: "dtaqusjav",
    },
  });

  const promoImages = [
    "Promo_Card_2_ofyt9b",
   "Promo_Card_3_khfp3v",
    // "4991116_bwrxkh",
    // "4395311_hcqoss",
  ];

  return (
    <>
      <div className="flex px-3 py-2 mt-3 justify-between mb-2">
        {searchTerm && (
          <IoArrowBack
            className="mr-2 text-3xl text-gray-500 cursor-pointer mt-3 bg-white rounded-full p-1"
            onClick={clearSearch}
          />
        )}

        <img src={logo} alt="Logo"></img>
        <div className="relative flex space-x-2">
          <CiSearch className="text-3xl" onClick={() => navigate("/search")} />
          <IoIosNotificationsOutline
            onClick={() => navigate("/notifications")}
            className="text-3xl cursor-pointer"
          />
          {hasUnreadNotifications && (
            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full ring-2 ring-white bg-red-500"></span>
          )}
        </div>
      </div>
      {!searchTerm && (
        <>
          <div className="px-2 mb-0">
            <Swiper
              modules={[FreeMode, Autoplay]}
              spaceBetween={5}
              slidesPerView={1}
              freeMode={true}
              loop={true}
              autoplay={{
                delay: 2500,
                disableOnInteraction: false,
              }}
              breakpoints={{
                640: {
                  slidesPerView: 2,
                  spaceBetween: 10,
                },
                768: {
                  slidesPerView: 3,
                  spaceBetween: 30,
                },
                1024: {
                  slidesPerView: 4,
                  spaceBetween: 40,
                },
              }}
            >
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <SwiperSlide key={index}>
                    <div className="p-4 w-auto h-44 shadow-md rounded-lg">
                      <Skeleton height="100%" />
                    </div>
                  </SwiperSlide>
                ))
              ) : (
                <>
                  {promoImages.map((publicId, index) => (
                    <SwiperSlide
                      key={index}
                      className="transition-transform duration-500 ease-in-out rounded-lg transform hover:scale-105"
                    >
                      <div
                        className="p- w-full h-48 shadow-md rounded-lg overflow-hidden flex items-center justify-center"
                        style={{
                          position: "relative",
                          padding: "1px", // Additional padding for better spacing
                          height: "13rem", // Adjusted height to prevent overlap
                        }}
                      >
                        <AdvancedImage
                          cldImg={cld
                            .image(publicId)
                            .format("auto")
                            .quality("auto")
                            .resize(
                              auto()
                                .gravity(autoGravity())
                                .width(5000)
                                .height(3000)
                            )}
                          className="w-full h-full object-cover rounded-lg"
                          style={{
                            objectFit: "cover", // Ensures the image covers the container
                            objectPosition: "center", // Centers the image within the container
                          }}
                        />
                      </div>
                    </SwiperSlide>
                  ))}
                </>
              )}
            </Swiper>
          </div>
          <Condition />
          <div className="flex justify-between items-center px-2 mt-2 text-base">
            <h1 className="font-semibold font-opensans text-base">Markets</h1>
            <p
              className=" text-customOrange font-light text-xs font-opensans cursor-pointer"
              onClick={handleShowMore}
            >
              Show All
            </p>
          </div>

          <Market />
        </>
      )}
      <PopularCats />
      <div className="p-2 mb-24">
        <h1 className="text-left font-medium text-lg translate-y-2 font-ubuntu mb-4">
          Featured Products
        </h1>
        <div className="grid grid-cols-2 gap-2">
          {status === "loading" && products.length === 0 ? (
            Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} height={200} width="100%" />
            ))
          ) : products.length > 0 ? (
            products.map((product, index) => (
              <ProductCard key={product.id} product={product} />
            ))
          ) : (
            <div className="col-span-2 text-center mt-4 text-lg font-medium text-gray-500">
              Sorry, we can't find that in our stores.
            </div>
          )}
        </div>

        {/* Load More Button */}
        {lastVisible && (
          <button
            className="w-full mt-4 py-2 h-12 font-opensans font-medium bg-customOrange text-white rounded-full"
            onClick={handleLoadMore}
            disabled={status === "loading"}
          >
            {status === "loading" ? "Loading..." : "Load More"}
          </button>
        )}
        <div className="flex justify-center ">
          <Amazingdeals />
        </div>
      </div>
    </>
  );
};

export default Homepage;
