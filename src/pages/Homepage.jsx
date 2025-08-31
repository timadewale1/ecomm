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
import FeaturedInfinite from "../components/Products/FeaturedProducts";
import posthog from "posthog-js"; // ✅ added

gsap.registerPlugin(ScrollTrigger);

const Homepage = () => {
  const navigate = useNavigate();
  const { setActiveNav } = useNavigation();

  const dispatch = useDispatch();

  const [userName, setUserName] = useState("User");
  const location = useLocation();

  const { products, lastVisible, status } = useSelector(
    (state) => state.homepage
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredProducts, setFilteredProducts] = useState([]);
  const productCardsRef = useRef([]);
  const [initialLoad, setInitialLoad] = useState(true);
  const [loading, setLoading] = useState(true);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  const { promoImages, promoLoading } = useSelector((state) => state.promo);
  const [currentSlide, setCurrentSlide] = useState(
    () => parseInt(localStorage.getItem("currentSlide")) || 0
  );

  const scrollPositionRef = useRef(0);
  const prevProductsRef = useRef(null);

  // ✅ PostHog: Track page view
  useEffect(() => {
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      if (user) {
        posthog.capture("homepage_viewed", {
          userId: user.uid,
          email: user.email || null,
        });
      } else {
        posthog.capture("homepage_viewed", { userId: "guest" });
      }
    });
  }, []);

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
    posthog.capture("search_cleared", { location: "homepage" }); // ✅ added
  };

  // Save scroll position
  useEffect(() => {
    return () => {
      scrollPositionRef.current = window.scrollY;
    };
  }, []);

  useEffect(() => {
    window.scrollTo(0, scrollPositionRef.current);
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
    if (promoImages.length === 0) {
      const images = [
        "https://res.cloudinary.com/dtaqusjav/image/upload/v1751554023/Book_your_travels_with_posh_retreats_2_mkj6jg.png",
        "https://res.cloudinary.com/dtaqusjav/video/upload/v1751554144/Untitled_1000_x_490_px_1_nhy93v.mp4",
        "https://res.cloudinary.com/dtaqusjav/image/upload/v1751557578/Untitled_1000_x_490_px_5_i8ssvn.png",
      ];
      dispatch(setPromoLoading(true));
      setTimeout(() => {
        dispatch(setPromoImages(images));
        dispatch(setPromoLoading(false));
      }, 1000);
    }
  }, [dispatch, promoImages]);

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchHomepageData());
    }
  }, [dispatch, status]);

  const handleLoadMore = () => {
    if (lastVisible && status !== "loading") {
      dispatch(fetchHomepageData());
    }
  };

  const cld = new Cloudinary({
    cloud: {
      cloudName: "dtaqusjav",
    },
  });

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
          <CiSearch
            className="text-3xl cursor-pointer"
            onClick={() => {
              posthog.capture("search_clicked", { location: "homepage" }); // ✅ added
              navigate("/search");
            }}
          />
          <IoIosNotificationsOutline
            onClick={() => {
              posthog.capture("notification_clicked", { location: "homepage" }); // ✅ added
              navigate("/notifications");
            }}
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
                      onClick={() => {
                        posthog.capture("promo_clicked", {
                          index,
                          type: url.endsWith(".mp4") ? "video" : "image",
                        }); // ✅ added
                        if (index === 0) {
                          window.open("https://poshretreats.co.uk", "_blank");
                        } else if (index === 2) {
                          navigate("/store/HiyUGWBqxEXWLcwPgOvxH5gq2uF2");
                        }
                      }}
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
          </div>
          <Condition />
        </>
      )}

      {/* ✅ Vendors tracking */}
      <TopVendors
        onView={() => posthog.capture("vendors_viewed")} // ✅ added
        onVendorClick={(vendor) =>
          posthog.capture("vendor_clicked", {
            vendorId: vendor.id,
            vendorName: vendor.name,
          })
        }
      />

      <PopularCats />
      <PersonalDiscountCarousel />
      <BlogImageGrid />
      <FeaturedInfinite />
    </>
  );
};

export default Homepage;