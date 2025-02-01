/* eslint-disable jsx-a11y/img-redundant-alt */
import React, { useState, useEffect, useRef } from "react";
import DonationsAnimate from "../components/Loading/DonationsAnimation";
import { FaTshirt, FaBook, FaShoePrints, FaBicycle } from "react-icons/fa"; // Icons for categories
import { FaAngleLeft } from "react-icons/fa";
import gsap from "gsap";
import { useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import { FreeMode, Autoplay } from "swiper/modules";
import "swiper/css/free-mode";
import "swiper/css/autoplay";
import Skeleton from "react-loading-skeleton";
import 'react-loading-skeleton/dist/skeleton.css';
import SEO from "../components/Helmet/SEO";

const Donate = () => {
  const [loading, setLoading] = useState(true);
  const cardRefs = useRef([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Simulate a loading delay of 3 seconds
    const timer = setTimeout(() => {
      setLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading && cardRefs.current.length > 0) {
      gsap.fromTo(
        cardRefs.current,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power3.out",
          stagger: {
            each: 0.2,
          },
        }
      );
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <DonationsAnimate />
      </div>
    );
  }

  return (
    <>
    <SEO 
        title={`Donations - My Thrift`} 
        description={`Help give back to the community with donations`}
        url={`https://www.shopmythrift.store/donate`} 
      />
    <div className="p-3">
      <div className="flex items-center mb-4">
        <FaAngleLeft className="text-2xl cursor-pointer" onClick={() => navigate(-1)} />
        <h1 className="text-2xl font-semibold ml-2">Donate</h1>
      </div>

      {/* Slider Section */}
      <div className="mb-4">
        {loading ? (
          <Skeleton height={208} />
        ) : (
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
            <SwiperSlide>
              <img src="https://cdn.loveachild.com/wp-content/uploads/2016/08/LAC-Orphans-Black-Shoes-750x450.jpg" alt="Image 1" className="w-full h-52 object-cover rounded-md" />
            </SwiperSlide>
            <SwiperSlide>
              <img src="https://images.squarespace-cdn.com/content/v1/5a96129885ede18b34f4b7e2/b487ebff-4b2e-4486-ba04-c678c84098f9/FainFamilyTampa1.jpg" alt="Image 2" className="w-full h-52 object-cover rounded-md" />
            </SwiperSlide>
            <SwiperSlide>
              <img src="https://www.savethechildren.org.nz/assets/the-issues/child-poverty/water-ethiopia__FocusFillMaxWyIwLjAwIiwiMC4wMCIsMTQ0Miw3MjFd.jpg" alt="Image 3" className="w-full h-52 object-cover rounded-md" />
            </SwiperSlide>
          </Swiper>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex flex-col items-center">
              <Skeleton circle={true} height={60} width={60} />
              <Skeleton height={20} width={60} />
            </div>
          ))
        ) : (
          <>
            <div className="flex flex-col items-center">
              <FaTshirt className="text-customOrange text-3xl" />
              <span className="mt-2 text-xs font-semibold font-ubuntu">Clothes</span>
            </div>
            <div className="flex flex-col items-center">
              <FaBook className="text-customOrange text-3xl" />
              <span className="mt-2 text-xs font-ubuntu font-semibold">Books</span>
            </div>
            <div className="flex flex-col items-center">
              <FaShoePrints className="text-customOrange text-3xl" />
              <span className="mt-2 text-xs font-ubuntu font-semibold">Footwear</span>
            </div>
            <div className="flex flex-col items-center">
              <FaBicycle className="text-customOrange text-3xl" />
              <span className="mt-2 text-xs font-ubuntu font-semibold">Other </span>
            </div>
          </>
        )}
      </div>

      {loading ? (
        Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="mb-4">
            <Skeleton height={150} />
          </div>
        ))
      ) : (
        <>
          <div ref={(el) => (cardRefs.current[0] = el)} className="mb-4 bg-customCream w-full rounded-md p-4 relative">
            <h2 className="text-xl font-semibold font-poppins mb-2">Clothes</h2>
            <p className="font-poppins mb-4 text-sm">Donate your gently used clothes to those in need. Join us in making a difference.</p>
            <button className="absolute bottom-1 right-2 px-2 py-2 bg-green-500 text-white font-semibold rounded-md">Donate</button>
          </div>
          <div ref={(el) => (cardRefs.current[1] = el)} className="mb-4 bg-customCream w-full rounded-md p-4 relative">
            <h2 className="text-xl font-semibold mb-2 font-poppins">Books</h2>
            <p className="font-poppins mb-4 text-sm">Share the gift of knowledge by donating your used books. Help us spread education.</p>
            <button className="absolute bottom-1 right-2 px-2 py-2 bg-green-500 text-white font-semibold rounded-md">Donate</button>
          </div>
          <div ref={(el) => (cardRefs.current[2] = el)} className="mb-4 bg-customCream w-full  rounded-md p-4 relative">
            <h2 className="text-xl font-semibold mb-2 font-poppins">Footwear</h2>
            <p className="font-poppins mb-4 text-sm">Provide footwear to those in need. Your donation can bring comfort and protection.</p>
            <button className="absolute bottom-1 right-2 px-2 py-2 bg-green-500 text-white font-semibold rounded-md">Donate</button>
          </div>
          <div ref={(el) => (cardRefs.current[3] = el)} className="mb-4 bg-customCream w-full rounded-md p-4 relative">
            <h2 className="text-xl font-semibold mb-2 font-poppins">Other accessories</h2>
            <p className="font-poppins mb-3 text-sm">Donate your old accessories to help someone in need. Your generosity can make a big difference.</p>
            <button className="absolute bottom-1 right-2 px-2 py-2 bg-green-500 text-white font-semibold rounded-md">Donate</button>
          </div>
        </>
      )}
    </div>
    </>
  );
};

export default Donate;
