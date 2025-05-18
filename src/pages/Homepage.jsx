import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { IoArrowBack } from "react-icons/io5";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import logo from "../Images/logo.png";
import { PiStarFill } from "react-icons/pi";
import "swiper/css/free-mode";
import { CiSearch } from "react-icons/ci";
import { setPromoImages, setPromoLoading } from "../redux/actions/promoaction";
import "swiper/css/autoplay";
import { Cloudinary } from "@cloudinary/url-gen";
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
import { fetchHomepageData } from "../redux/actions/homepageactions";
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
import SEO from "../components/Helmet/SEO";
import DiscountCarousel from "../components/Discounts/DiscountCarousel";
import PersonalDiscountCarousel from "../components/Discounts/PersonalDiscounts";
import TopVendors from "../components/TopVendors/TopVendors";
import BlogImageGrid from "../components/Blog/BlogCarousel";
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

  const { promoImages, promoLoading } = useSelector((state) => state.promo);
  const [currentSlide, setCurrentSlide] = useState(
    () => parseInt(localStorage.getItem("currentSlide")) || 0
  );

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
  useEffect(() => {
    localStorage.setItem("currentSlide", currentSlide);
  }, [currentSlide]);
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
    // Save current slide index to localStorage when it changes
    localStorage.setItem("currentSlide", currentSlide);
  }, [currentSlide]);
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
    if (promoImages.length === 0) {
      // Fetch promo images only if they are not already in Redux
      const images = [
        "https://res.cloudinary.com/dtaqusjav/video/upload/v1744666391/introducing_2_izw3tu.mp4",
        "https://res.cloudinary.com/dtaqusjav/image/upload/v1744671718/NEW_STORE_1080_x_420_px_t3rmma.png",
      ];
      dispatch(setPromoLoading(true));
      setTimeout(() => {
        dispatch(setPromoImages(images));
        dispatch(setPromoLoading(false));
      }, 1000); // Simulate API call delay
    }
  }, [dispatch, promoImages]);
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

  // Promo images stored in a ref to avoid reinitialization
  // const promoImages = useRef([
  //   "https://res.cloudinary.com/dtaqusjav/image/upload/v1736717421/Promo_Card_5_azm2n3.svg",
  //   "https://res.cloudinary.com/dtaqusjav/image/upload/v1736717421/Promo_Card_2_ofyt9b.svg",
  //   "https://res.cloudinary.com/dtaqusjav/image/upload/v1737022557/Promo_Card_7_gxlmrs.svg",
  // ]);

  return (
    <>
      <SEO
        title={`Home - My Thrift`}
        description={`Discover amazing deals and vendors on My Thrift`}
        url={`https://www.shopmythrift.store/newhome`}
      />
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
          <div className="px-2.5">
            <Swiper
              modules={[FreeMode, Autoplay]}
              spaceBetween={10}
              slidesPerView={1}
              freeMode={true}
              loop={true}
              autoplay={{
                delay: 5000,
                disableOnInteraction: false,
              }}
              onSlideChange={(swiper) => setCurrentSlide(swiper.realIndex)}
              breakpoints={{
                640: {
                  slidesPerView: 2,
                  spaceBetween: 15,
                },
                768: {
                  slidesPerView: 3,
                  spaceBetween: 20,
                },
                1024: {
                  slidesPerView: 4,
                  spaceBetween: 25,
                },
              }}
            >
              {promoLoading
                ? Array.from({ length: 5 }).map((_, index) => (
                    <SwiperSlide key={index}>
                      <div className="p-4 w-full h-44 shadow-md rounded-lg">
                        <Skeleton height="100%" />
                      </div>
                    </SwiperSlide>
                  ))
                : promoImages.map((url, index) => (
                    <SwiperSlide
                      key={index}
                      className="transition-transform duration-500 ease-in-out rounded-lg transform hover:scale-105"
                    >
                      <div className=" w-auto h-44 shadow-md rounded-lg overflow-hidden">
                        {url.endsWith(".mp4") ? (
                          <video
                            src={url}
                            className="w-full h-full object-cover object-center rounded-lg"
                            autoPlay
                            muted
                            loop
                            playsInline
                            preload="auto"
                          />
                        ) : (
                          <img
                            src={url}
                            alt={`Promo ${index + 1}`}
                            className="w-full h-full object-cover object-center rounded-lg"
                            loading="lazy"
                          />
                        )}
                      </div>
                    </SwiperSlide>
                  ))}
            </Swiper>
            {/* Dots navigation */}
            <div className="flex justify-center mt-2">
              {promoImages.map((_, index) => (
                <div
                  key={index}
                  className={`cursor-pointer mx-1 rounded-full transition-all duration-300 ${
                    index === currentSlide
                      ? "bg-customOrange h-1 w-5"
                      : "bg-orange-300 h-1.5 w-1.5"
                  }`}
                  onClick={() => setCurrentSlide(index)}
                />
              ))}
            </div>
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
      <BlogImageGrid />
      <TopVendors />
      <PopularCats />
      {/* <DiscountCarousel /> */}
      <PersonalDiscountCarousel />
      <div className="p-2 mt-4 pb-24">
        <div className="flex items-center mb-4">
          <h1 className="text-left font-medium text-xl font-ubuntu mr-1">
            Featured Products
          </h1>
          <PiStarFill className="text-xl text-yellow-300" />
        </div>

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
        <div className="flex justify-center  ">
          <Amazingdeals />
        </div>
      </div>
    </>
  );
};

export default Homepage;
