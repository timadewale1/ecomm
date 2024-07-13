import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Cloudinary } from "@cloudinary/url-gen";
import { fit } from "@cloudinary/url-gen/actions/resize";
import { AdvancedImage } from "@cloudinary/react";
import { FaAngleRight } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import { useNavigation } from "../Context/Bottombarcontext";

gsap.registerPlugin(ScrollTrigger);

const Market = () => {
  const cardsRef = useRef([]);
  const navigate = useNavigate();
  const { setActiveNav } = useNavigation();

  useEffect(() => {
    cardsRef.current.forEach((card, index) => {
      gsap.fromTo(
        card,
        {
          opacity: 0,
          x: index % 2 === 0 ? -100 : 100, // Alternate between left and right
        },
        {
          opacity: 1,
          x: 0,
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
  }, []);

  // Initialize Cloudinary instance
  const cld = new Cloudinary({
    cloud: {
      cloudName: "dtaqusjav",
    },
  });

  const YabaMrkt = cld
    .image("yaba_lhc52r")
    .format("auto")
    .quality("auto")
    .resize(fit().width(500).height(1000));

  const onlineMrkt = cld
    .image("woman-shopping-thrift-store_1_nolq7q")
    .format("auto")
    .quality("auto")
    .resize(fit().width(500).height(1000));

  const cardTexts = [
    { title: "POPULAR MARKETS", subtitle: "BROWSE", action: "SHOP NOW" },
    { title: "ONLINE STORES", subtitle: "TRENDING", action: "SHOP NOW" },
  ];

  const handleCardClick = (marketName) => {
    setActiveNav(3); // Set active nav to 'Market'
    if (marketName === "ONLINE STORES") {
      navigate(`/online-vendors`);
    } else if (marketName === "POPULAR MARKETS") {
      navigate(`/market-vendors`);
    }
  };

  return (
    <div className="justify-around mt-4 px-2">
      {[YabaMrkt, onlineMrkt].map((img, index) => (
        <div
          key={index}
          ref={(el) => (cardsRef.current[index] = el)}
          className="relative w-auto mb-2 rounded-lg h-52 bg-green-700 overflow-hidden cursor-pointer"
          onClick={() => handleCardClick(cardTexts[index].title)}
        >
          <AdvancedImage
            cldImg={img}
            className="w-full h-full object-contain object-fill "
          />
          <div className="absolute bottom-4 opacity-100 z-10 -translate-y-2 left-4">
            <p className="text-xs text-white font-light font-lato">
              {cardTexts[index].subtitle}
            </p>
            <p className="text-xl font-lato mb-1 text-white font-semiboldf#">
              {cardTexts[index].title}
            </p>
            <p className="text-xs font-lato font-light text-white underline underline-offset-4 flex items-center">
              {cardTexts[index].action} <FaAngleRight className="" />
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Market;
