import React, { useState, useEffect } from "react";
import { Cloudinary } from "@cloudinary/url-gen";
import { fit } from "@cloudinary/url-gen/actions/resize";
import { AdvancedImage } from "@cloudinary/react";
import { FaAngleRight } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import { useNavigation } from "../Context/Bottombarcontext";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

const Market = () => {
  const navigate = useNavigate();
  const { setActiveNav } = useNavigation();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 50); // Simulating loading time
  }, []);

  // Initialize Cloudinary instance
  const cld = new Cloudinary({
    cloud: {
      cloudName: "dtaqusjav",
    },
  });

  const YabaMrkt = cld
    .image("balguno_jwm4u4")
    .format("auto")
    .quality("auto")
    .resize(fit().width(2000).height(1000));

  const onlineMrkt = cld
    .image("woman-shopping-thrift-store_1_nolq7q")
    .format("auto")
    .quality("auto")
    .resize(fit().width(2000).height(1000));

  const cardTexts = [
    { title: "POPULAR MARKETS", subtitle: "BROWSE", action: "COMING SOON" },
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
      {loading
        ? Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="relative w-auto mb-2 rounded-lg h-52 overflow-hidden cursor-pointer"
            >
              <Skeleton height="100%" width="100%" />
            </div>
          ))
        : [YabaMrkt, onlineMrkt].map((img, index) => (
            <div
              key={index}
              className="relative w-auto mb-2 rounded-lg h-52 overflow-hidden cursor-pointer"
              onClick={() => handleCardClick(cardTexts[index].title)}
            >
              <AdvancedImage
                cldImg={img}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-50"></div> {/* Semi-transparent overlay */}
              <div className="absolute bottom-4 z-10 left-4">
                <p className="text-xs text-white font-semibold font-lato">
                  {cardTexts[index].subtitle}
                </p>
                <p className="text-xl font-lato mb-1 text-white font-semibold">
                  {cardTexts[index].title}
                </p>
                <p className="text-xs font-lato font-light text-white underline underline-offset-4 flex items-center">
                  {cardTexts[index].action} <FaAngleRight className="ml-1" />
                </p>
              </div>
            </div>
          ))}
    </div>
  );
};

export default Market;
