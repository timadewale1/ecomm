import React, { useState, useEffect } from "react";
import { RiMenu4Line } from "react-icons/ri";
import { PiBell } from "react-icons/pi";
import { FiSearch } from "react-icons/fi";
import { Swiper, SwiperSlide } from "swiper/react";
import Market from "../components/Market/Market";
import "swiper/css";
import "swiper/css/free-mode";
import "swiper/css/autoplay";
import { Cloudinary } from "@cloudinary/url-gen";
import { auto } from "@cloudinary/url-gen/actions/resize";
import { autoGravity } from "@cloudinary/url-gen/qualifiers/gravity";
import { AdvancedImage } from "@cloudinary/react";
import { getDoc, doc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { FreeMode, Autoplay } from "swiper/modules";
import BottomBar from "../components/BottomBar/BottomBar";
import "../styles/bottombar.css";
import { db } from "../firebase.config"; 

const Homepage = () => {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [userName, setUserName] = useState("User");

  const handleFocus = () => {
    setIsSearchFocused(true);
  };

  const handleBlur = () => {
    setIsSearchFocused(false);
  };

<<<<<<< Updated upstream
  
=======
  const capitalizeName = (name) => {
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  };

  useEffect(() => {
    const auth = getAuth();
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        const name = userData?.displayName ? capitalizeName(userData.displayName) : "User";
        setUserName(name);
      }
    });
  }, []);
>>>>>>> Stashed changes

  // Initialize Cloudinary instance
  const cld = new Cloudinary({
    cloud: {
      cloudName: "dtaqusjav", 
    },
  });

  // Create image objects for each public ID
  const maleImg = cld
    .image("male_kfm4n5")
    .format("auto")
    .quality("auto")
    .resize(auto().gravity(autoGravity()).width(500).height(500));

  const kidImg = cld
    .image("kid_ec5vky")
    .format("auto")
    .quality("auto")
    .resize(auto().gravity(autoGravity()).width(500).height(500));

  const femaleImg = cld
    .image("female_s5qaln")
    .format("auto")
    .quality("auto")
    .resize(auto().gravity(autoGravity()).width(500).height(500));

  return (
    <>
      {/* Header container */}
      <div className="flex my-7 justify-between px-3">
        <RiMenu4Line className="text-2xl" />
        {/* logo container */}
        <div className="text-xl font-semibold text-orange-500">LOGO</div>
        {/* notification icon */}
        <PiBell className="text-2xl" />
      </div>
      <div className="flex px-2 justify-center mb-3">
        <div className="relative w-full mx-auto">
          <input
            type="text"
            placeholder="Search"
            className="w-full rounded-full bg-gray-200 p-3"
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          <FiSearch className="absolute top-1/2 right-3 transform text-xl -translate-y-1/2 text-gray-500" />
        </div>
      </div>
      {/* Promo cards slider */}
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
          <SwiperSlide className="transition-transform duration-500 ease-in-out transform hover:scale-105">
            <div className="p-4 w-auto h-44 bg-orange-500 shadow-md rounded-lg">
              <h2 className="text-lg text-white font-bold">Hello, {userName}</h2>
              <p className="text-white">Click to see the deals we have today!</p>
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
              <p className="text-white">Buy one get one free!</p>
            </div>
          </SwiperSlide>
          <SwiperSlide className="transition-transform duration-500 ease-in-out transform hover:scale-105">
            <div className="w-auto h-44 p-4 bg-red-500 shadow-md rounded-lg">
              <h2 className="text-white">CHECKOUT</h2>
              <h2 className="text-lg font-bold text-white">KANTAGUA DEALS</h2>
              <p className="text-white">Free shipping on orders over $50!</p>
            </div>
          </SwiperSlide>
          <SwiperSlide className="transition-transform duration-500 ease-in-out transform hover:scale-105">
            <div className="w-auto h-44 p-4 bg-yellow-500 shadow-md rounded-lg">
              <h2 className="text-white">CHECKOUT</h2>
              <h2 className="text-lg font-bold text-white">KANTAGUA DEALS</h2>
              <p className="text-white">Free shipping on orders over $50!</p>
            </div>
          </SwiperSlide>
        </Swiper>
      </div>
      <div className="">
        <div className="flex justify-center mt-3 px-2 gap-2">
          <div className="relative w-32 h-28 rounded-lg bg-gray-200 overflow-hidden">
            <AdvancedImage cldImg={maleImg} className="w-full h-full object-cover" />
            <h2 className="absolute bottom-0 w-full text-center text-white font-semibold text-lg bg-transparent">MEN</h2>
          </div>
          <div className="relative w-32 h-28 rounded-lg bg-gray-200 overflow-hidden">
            <AdvancedImage cldImg={femaleImg} className="w-full h-full object-cover" />
            <h2 className="absolute bottom-0 w-full text-center text-white font-semibold bg-transparent text-lg">WOMEN</h2>
          </div>
          <div className="relative w-32 h-28 rounded-lg bg-gray-200 overflow-hidden">
            <AdvancedImage cldImg={kidImg} className="w-full h-full object-cover" />
            <h2 className="absolute bottom-0 w-full text-center text-white font-semibold bg-transparent text-lg">KIDS</h2>
          </div>
        </div>
        <div className="flex justify-between px-2 mt-10 text-base">
          <h1 className="font-semibold text-xl">Explore</h1>
          <p className="font-light text-red-500">Show All</p>
        </div>
      </div>
      <Market />
      <BottomBar isSearchFocused={isSearchFocused} />
    </>
  );
};

export default Homepage;
