import React, { useState, useEffect, useRef } from "react";
import { IoArrowBack } from "react-icons/io5";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/free-mode";
import "swiper/css/autoplay";
import { Cloudinary } from "@cloudinary/url-gen";
import { auto } from "@cloudinary/url-gen/actions/resize";
import { autoGravity } from "@cloudinary/url-gen/qualifiers/gravity";
import { AdvancedImage } from "@cloudinary/react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { collection, query, getDocs, getDoc, doc } from "firebase/firestore";
import { FreeMode, Autoplay } from "swiper/modules";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import BottomBar from "../components/BottomBar/BottomBar";
import "../styles/bottombar.css";
import { useNavigate } from "react-router-dom";
import { useNavigation } from "../components/Context/Bottombarcontext";
import Market from "../components/Market/Market";
import { db } from "../firebase.config";
import ProductCard from "../components/Products/ProductCard";

import SearchDropdown from "../components/Search/SearchDropdown";
gsap.registerPlugin(ScrollTrigger);

const Homepage = () => {
  const navigate = useNavigate();
  const { setActiveNav } = useNavigation();
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [userName, setUserName] = useState("User");
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredProducts, setFilteredProducts] = useState([]);
  const productCardsRef = useRef([]);
  const [initialLoad, setInitialLoad] = useState(true);

  // const handleFocus = () => {
  //   setIsSearchFocused(true);
  // };

  // const handleBlur = () => {
  //   setIsSearchFocused(false);
  // };

  const handleShowMore = () => {
    setActiveNav(2);
    navigate("/explore");
  };

  const handleCategoryClick = (category) => {
    navigate(`/category/${category}`);
  };

  // const handleSearchChange = (e) => {
  //   const term = e.target.value.toLowerCase();
  //   setSearchTerm(term);

  //   if (term.length < 2) {
  //     setFilteredProducts(products);
  //   } else {
  //     const filtered = products.filter((product) =>
  //       product.name.toLowerCase().includes(term)
  //     );
  //     setFilteredProducts(filtered);
  //   }
  // };

  const clearSearch = () => {
    setSearchTerm("");
    setFilteredProducts(products);
  };

  const handleLoadMore = () => {
    setActiveNav(3);
    navigate("/market-vendors");
  };

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
      const vendorsSnapshot = await getDocs(collection(db, "vendors"));
      const vendorList = [];
      const productsList = [];

      for (const vendorDoc of vendorsSnapshot.docs) {
        const vendorData = vendorDoc.data();
        vendorList.push({ id: vendorDoc.id, ...vendorData });

        const productsSnapshot = await getDocs(
          collection(db, `vendors/${vendorDoc.id}/products`)
        );

        productsSnapshot.forEach((productDoc) => {
          productsList.push({
            id: productDoc.id,
            ...productDoc.data(),
            vendorName: vendorData.shopName, // Include vendorName in product
            vendorId: vendorDoc.id, // Include vendorId in product
          });
        });
      }

      setVendors(vendorList); // Ensure vendorList is an array
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

  return (
    <>
      <div className="flex p-2 mt-3 justify-center mb-3">
        {searchTerm && (
          <IoArrowBack
            className="mr-2 text-3xl text-gray-500 cursor-pointer mt-3 bg-white rounded-full p-1"
            onClick={clearSearch}
          />
        )}
        <SearchDropdown products={products} vendors={vendors} />
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
                  <SwiperSlide className="transition-transform duration-500 ease-in-out transform hover:scale-105">
                    <div className="p-4 w-auto h-44 bg-orange-500 shadow-md rounded-lg">
                      <h2 className="text-lg text-white font-bold">
                        Hello, {userName}
                      </h2>
                      <p className="text-white">
                        Explore our marketplaces to see the deals we have today!
                      </p>
                    </div>
                  </SwiperSlide>
                  <SwiperSlide className="transition-transform duration-500 ease-in-out transform hover:scale-105">
                    <div className="p-4 w-auto h-44 bg-green-400 shadow-md rounded-lg">
                      <h2 className="text-lg text-white font-bold">DEALS!!!</h2>
                      <h1 className="text-white">₦1,500</h1>
                      <p className="text-white">5TH-7TH JULY</p>
                    </div>
                  </SwiperSlide>
                  <SwiperSlide className="transition-transform duration-500 ease-in-out transform hover:scale-105">
                    <div className="w-auto h-44 p-4 bg-blue-900 shadow-md rounded-lg">
                      <h2 className="text-lg font-bold text-white">UP TO</h2>
                      <h1 className="text-white">50% OFF</h1>
                      <p className="text-white">
                        Buy one get one free from Guccineal Stores!!
                      </p>
                    </div>
                  </SwiperSlide>
                  <SwiperSlide className="transition-transform duration-500 ease-in-out transform hover:scale-105">
                    <div className="w-auto h-44 p-4 bg-red-500 shadow-md rounded-lg">
                      <h2 className="text-white">CHECKOUT</h2>
                      <h2 className="text-lg font-bold text-white">
                        YABA DEALS
                      </h2>
                      <p className="text-white">
                        Free shipping on orders over ₦5000!
                      </p>
                    </div>
                  </SwiperSlide>
                  <SwiperSlide className="transition-transform duration-500 ease-in-out transform hover:scale-105">
                    <div className="w-auto h-44 p-4 bg-yellow-500 shadow-md rounded-lg">
                      <h2 className="text-white">WELCOME</h2>
                      <h2 className="text-lg font-bold text-white">
                        TO THE REAL MARKETPLACE
                      </h2>
                      <p className="text-white">
                        Grab coupons worth ₦20000 by inviting a friend!
                      </p>
                    </div>
                  </SwiperSlide>
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
                    onClick={() => handleCategoryClick("Men")}
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
                    onClick={() => handleCategoryClick("Women")}
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
            <div className="flex justify-between px-2 mt-10 text-base">
              <h1 className="font-semibold text-xl">Explore</h1>
              <p
                className="font-light text-red-500 cursor-pointer"
                onClick={handleShowMore}
              >
                Show All
              </p>
            </div>
          </div>
          <Market />
        </>
      )}
      <div className="p-2">
        <h1 className="text-left mt-2 font-medium text-xl translate-y-2 font-ubuntu mb-4">
          Featured Products
        </h1>
        <div className="grid grid-cols-2 gap-2">
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} height={200} width="100%" />
            ))
          ) : filteredProducts.length > 0 ? (
            filteredProducts.slice(0, 16).map((product, index) => (
              <div
                ref={(el) => (productCardsRef.current[index] = el)}
                key={product.id}
              >
                <ProductCard
                  product={product}
                  vendorId={product.vendorId}
                  vendorName={product.vendorName} // Pass vendorName to ProductCard
                />
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center mt-4 text-lg font-medium text-gray-500">
              Sorry, we can't find that in our stores.
            </div>
          )}
        </div>
        {!searchTerm && filteredProducts.length > 0 && (
          <button
            className="w-full mt-4 py-2 font-medium bg-customOrange text-white rounded-full"
            onClick={handleLoadMore}
          >
            Load More
          </button>
        )}
      </div>
      {!searchTerm && (
        <div className="px-2 mt-6 mb-4">
          <div
            className="relative w-auto rounded-lg h-52 bg-green-700 overflow-hidden cursor-pointer"
            onClick={() => navigate("/donate")}
          >
            <AdvancedImage
              cldImg={donationImg}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 opacity-100 z-10 -translate-y-2 left-4">
              <p className="text-xs text-white font-light  font-lato">
                DONATIONS:
              </p>
              <p className="text-xl font-poppins mb-1 text-white font-medium">
                LEND A HELPING HAND
              </p>
              <p className="text-xs font-lato underline font-light text-white  underline-offset-4">
                DONATE
              </p>
            </div>
          </div>
        </div>
      )}
      <BottomBar isSearchFocused={isSearchFocused} />
    </>
  );
};

export default Homepage;
