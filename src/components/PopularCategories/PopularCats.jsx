import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchCategories } from "../../redux/reducers/categoriesSlice";
import { useNavigate } from "react-router-dom";
import Skeleton from "react-loading-skeleton";
import IkImage from "../../services/IkImage";
const PopularCats = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { categories, status } = useSelector((state) => state.categories);
  const [currentImages, setCurrentImages] = useState({});

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchCategories());
    }
  }, [dispatch, status]);

  // Initialize images on first load
  useEffect(() => {
    if (categories.length > 0) {
      const initialImages = categories.reduce((acc, category) => {
        acc[category.type] = category.products[0]?.coverImageUrl || null; // no placeholder here
        return acc;
      }, {});
      setCurrentImages(initialImages);
    }
  }, [categories]);

  // Cycle images every 5 seconds if multiple product covers
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImages((prevImages) => {
        const newImages = { ...prevImages };

        categories.forEach((category) => {
          const { products } = category;
          // Only rotate if there's more than one product image
          if (products.length > 1) {
            const currentIndex = products.findIndex(
              (p) => p.coverImageUrl === prevImages[category.type]
            );
            const nextIndex = (currentIndex + 1) % products.length;
            newImages[category.type] =
              products[nextIndex]?.coverImageUrl || null;
          }
        });

        return newImages;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [categories]);

  const handleCategoryClick = (category) => {
    navigate(`/producttype/${category.type}`, {
      state: { products: category.products },
    });
  };

  return (
    <div className="px-2 mt-2 ">
      <h2 className="text-xl font-semibold  mb-5 font-opensans text-black">
        Popular Categories 🏅
      </h2>

      <div className="flex overflow-x-auto space-x-3 scrollbar-hide">
        {status === "loading"
          ? // Show skeleton
            Array(4)
              .fill(0)
              .map((_, index) => (
                <div key={index} className="flex flex-col">
                  <Skeleton width={150} height={150} />
                  <Skeleton width={100} height={20} className="mt-2" />
                  <Skeleton width={80} height={15} className="mt-1" />
                </div>
              ))
          : // Render categories
            categories.map((category) => {
              const imgSrc = currentImages[category.type];
              const exactCount = category.count;
              const approxCount = Math.floor(exactCount / 10) * 10;

              // If fewer than 10, show the exact count.
              const displayText =
                exactCount < 10
                  ? `${exactCount} post${exactCount === 1 ? "" : "s"}`
                  : `${approxCount}+ posts`;

              return (
                <div
                  key={category.type}
                  className="flex-shrink-0 w-28 cursor-pointer"
                  onClick={() => handleCategoryClick(category)}
                >
                  {/* 
                  Outer conatainer stays the same size/shape. 
                  If imgSrc is null or empty, show logo.svg in a circular wrapper. 
                */}
                  <div className="rounded-lg overflow-hidden flex items-center justify-center bg-gray-100 w-28 h-28">
                    {imgSrc ? (
                      <IkImage
                        src={imgSrc}
                        alt="" // remove category.type from alt
                        className="w-28 h-28 object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                        <img src="/logo.png" alt="logo" className="w-7 h-7" />
                      </div>
                    )}
                  </div>

                  <h3 className="text-sm font-opensans font-semibold mt-2 text-left">
                    {category.type}
                  </h3>
                  <p className="text-xs text-gray-500 font-opensans font-medium text-left">
                  {displayText}
                  </p>
                </div>
              );
            })}
      </div>
      <div className="-mx-4 h-1.5 bg-gray-50" />
    </div>
  );
};

export default PopularCats;
