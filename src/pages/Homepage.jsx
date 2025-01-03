import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { IoArrowBack } from "react-icons/io5";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import logo from "../Images/logo.png";
import "swiper/css/free-mode";
import { CiSearch } from "react-icons/ci";

import { BsHeart } from "react-icons/bs";
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
  limit,
  orderBy,
  startAfter,
  where,
} from "firebase/firestore";
import { FreeMode, Autoplay } from "swiper/modules";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { IoIosNotificationsOutline } from "react-icons/io";
import gsap from "gsap";
import toast from "react-hot-toast";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import BottomBar from "../components/BottomBar/BottomBar";
import "../styles/bottombar.css";
import { useNavigation } from "../components/Context/Bottombarcontext";
import Market from "../components/Market/Market";
import { db } from "../firebase.config";
import ProductCard from "../components/Products/ProductCard";
import SearchDropdown from "../components/Search/SearchDropdown";
import Amazingdeals from "../components/Amazingdeals";

gsap.registerPlugin(ScrollTrigger);

const Homepage = () => {
  const navigate = useNavigate();
  const { setActiveNav } = useNavigation();
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [userName, setUserName] = useState("User");
  // const [loading, setLoading] = useState(true);
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [lastVisible, setLastVisible] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [approvedVendors, setApprovedVendors] = useState(new Set());

  const [lastFetchedDoc, setLastFetchedDoc] = useState(null);
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

  const handleCategoryClick = (category) => {
    navigate(`/category/${category}`);
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

  const fetchProductsAndVendors = async () => {
    try {
      // Fetch approved vendors only once
      const approvedVendorsSnapshot = await getDocs(
        query(
          collection(db, "vendors"),
          where("isApproved", "==", true),
          where("isDeactivated", "==", false)
        )
      );

      // Store approved vendor IDs in a Set
      const approvedVendorsSet = new Set();
      approvedVendorsSnapshot.forEach((vendorDoc) => {
        approvedVendorsSet.add(vendorDoc.id);
      });
      setApprovedVendors(approvedVendorsSet);

      // Fetch featured products with pagination
      const productsQuery = query(
        collection(db, "products"),
        where("published", "==", true),
        where("isDeleted", "==", false), // Exclude deleted products
        where("isFeatured", "==", true),
        limit(20) // Limit to 20 products
      );

      const productsSnapshot = await getDocs(productsQuery);

      // Save the last visible document for pagination
      const lastVisibleDoc =
        productsSnapshot.docs[productsSnapshot.docs.length - 1];
      setLastVisible(lastVisibleDoc);

      // Create products list
      const productsList = [];
      productsSnapshot.forEach((productDoc) => {
        const productData = productDoc.data();
        if (approvedVendorsSet.has(productData.vendorId)) {
          productsList.push({
            id: productDoc.id,
            ...productData,
          });
        }
      });

      // Update state with results
      setProducts(productsList);
      setFilteredProducts(productsList);
    } catch (error) {
      console.error("Error fetching products and vendors:", error);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  useEffect(() => {
    fetchProductsAndVendors();
  }, []);

  const handleLoadMore = async () => {
    if (lastVisible) {
      try {
        setLoadingMore(true);

        const nextProductsQuery = query(
          collection(db, "products"),
          where("published", "==", true),
          where("isFeatured", "==", true),
          where("isDeleted", "==", false), // Exclude deleted products
          startAfter(lastVisible),
          limit(20)
        );

        const nextProductsSnapshot = await getDocs(nextProductsQuery);

        if (!nextProductsSnapshot.empty) {
          const newLastVisible =
            nextProductsSnapshot.docs[nextProductsSnapshot.docs.length - 1];
          setLastVisible(newLastVisible);

          const newProducts = [];
          nextProductsSnapshot.forEach((productDoc) => {
            const productData = productDoc.data();
            if (approvedVendors.has(productData.vendorId)) {
              newProducts.push({
                id: productDoc.id,
                ...productData,
              });
            }
          });

          // Append new products to the existing list
          setProducts((prevProducts) => [...prevProducts, ...newProducts]);
          setFilteredProducts((prevProducts) => [
            ...prevProducts,
            ...newProducts,
          ]);
        } else {
          // No more products to load
          setLastVisible(null);
        }
      } catch (error) {
        console.error("Error loading more products:", error);
      } finally {
        setLoadingMore(false);
      }
    }
  };

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

  const maleImg = cld
    .image("male_kfm4n5")
    .format("auto")
    .quality("auto")
    .resize(auto().gravity(autoGravity()).width(1000).height(1000));

  const kidImg = cld
    .image("kid_ec5vky")
    .format("auto")
    .quality("auto")
    .resize(auto().gravity(autoGravity()).width(1000).height(1000));

  const femaleImg = cld
    .image("female_s5qaln")
    .format("auto")
    .quality("auto")
    .resize(auto().gravity(autoGravity()).width(1000).height(1000));

  const donationImg = cld
    .image("donate_lrmavr")
    .format("auto")
    .quality("auto")
    .resize(auto().gravity(autoGravity()).width(5000).height(3000));

  const promoImages = [
    "BOTM_xvkkud",
    // "4929101_na7pyp",
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
                      <div className="p-1 w-auto h-44 shadow-md rounded-lg overflow-hidden">
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
                          className="w-full h-full object-cover object-center rounded-lg"
                        />
                      </div>
                    </SwiperSlide>
                  ))}
                </>
              )}
            </Swiper>
          </div>
          <div className="">
            <div className="flex justify-center mt-3 px-2 gap-2">
              {loading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="relative w-32 h-28 rounded-lg bg-gray-200 overflow-hidden"
                  >
                    <Skeleton height="100%" width="100%" />
                  </div>
                ))
              ) : (
                <>
                  <div
                    className="relative w-32 h-28 rounded-lg bg-gray-200 overflow-hidden cursor-pointer"
                    onClick={() => handleCategoryClick("Mens")}
                  >
                    <AdvancedImage
                      cldImg={maleImg}
                      className="w-full h-full object-cover"
                    />
                    <h2 className="absolute bottom-0 w-full text-center text-white font-semibold text-sm bg-transparent">
                      MEN
                    </h2>
                  </div>
                  <div
                    className="relative w-32 h-28 rounded-lg bg-gray-200 overflow-hidden cursor-pointer"
                    onClick={() => handleCategoryClick("Womens")}
                  >
                    <AdvancedImage
                      cldImg={femaleImg}
                      className="w-full h-full object-cover"
                    />
                    <h2 className="absolute bottom-0 w-full text-center text-white font-semibold bg-transparent text-sm">
                      WOMEN
                    </h2>
                  </div>
                  <div
                    className="relative w-32 h-28 rounded-lg bg-gray-200 overflow-hidden cursor-pointer"
                    onClick={() => handleCategoryClick("Kids")}
                  >
                    <AdvancedImage
                      cldImg={kidImg}
                      className="w-full h-full object-cover"
                    />
                    <h2 className="absolute bottom-0 w-full text-center text-white font-semibold bg-transparent text-sm">
                      KIDS
                    </h2>
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-between items-center px-2 mt-10 text-base">
              <h1 className="font-semibold font-opensans text-xl">Explore</h1>
              <p
                className="font-light text-red-500 text-sm font-opensans cursor-pointer"
                onClick={handleShowMore}
              >
                Show All
              </p>
            </div>
          </div>
          <Market />
        </>
      )}
      <div className="p-2 mb-24">
        <h1 className="text-left mt-2 font-medium text-xl translate-y-2 font-ubuntu mb-4">
          Featured Products
        </h1>
        <div className="grid grid-cols-2 gap-2">
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} height={200} width="100%" />
            ))
          ) : filteredProducts.length > 0 ? (
            filteredProducts.map((product, index) => (
              <div
                ref={(el) => (productCardsRef.current[index] = el)}
                key={product.id}
              >
                <ProductCard
                  product={product}
                  vendorId={product.vendorId}
                  vendorName={product.vendorName}
                />
              </div>
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
            disabled={loadingMore}
          >
            {loadingMore ? "Loading..." : "Load More"}
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
