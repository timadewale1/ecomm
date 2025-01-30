import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchCategories } from "../../redux/reducers/categoriesSlice";
import { useNavigate } from "react-router-dom";
import Skeleton from "react-loading-skeleton";

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

  useEffect(() => {
    if (categories.length > 0) {
      const initialImages = categories.reduce((acc, category) => {
        acc[category.type] =
          category.products[0]?.coverImageUrl ||
          "https://via.placeholder.com/150";
        return acc;
      }, {});
      setCurrentImages(initialImages);
    }
  }, [categories]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImages((prevImages) => {
        const newImages = { ...prevImages };

        categories.forEach((category) => {
          const { products } = category;
          if (products.length > 1) {
            const currentImageIndex = products.findIndex(
              (p) => p.coverImageUrl === prevImages[category.type]
            );
            const nextIndex = (currentImageIndex + 1) % products.length;
            newImages[category.type] =
              products[nextIndex]?.coverImageUrl || newImages[category.type];
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
    <div className="px-2 py-3">
      <h2 className="text-base font-medium mb-3 font-ubuntu">
        Popular Categories
      </h2>
      <div className="flex overflow-x-auto space-x-3 scrollbar-hide">
        {status === "loading"
          ? Array(4)
              .fill(0)
              .map((_, index) => (
                <div key={index} className="flex flex-col ">
                  <Skeleton width={150} height={150} />
                  <Skeleton width={100} height={20} className="mt-2" />
                  <Skeleton width={80} height={15} className="mt-1" />
                </div>
              ))
          : categories.map((category) => (
              <div
                key={category.type}
                className="flex-shrink-0 w-28 cursor-pointer"
                onClick={() => handleCategoryClick(category)}
              >
                <img
                  src={
                    currentImages[category.type] ||
                    "https://via.placeholder.com/150"
                  }
                  alt={category.type}
                  className="w-28 h-28 object-cover rounded-lg"
                />
                <h3 className="text-sm font-opensans font-semibold mt-2 text-left">
                  {category.type}
                </h3>
                <p className="text-xs text-gray-500 font-opensans font-medium text-left">
                  {category.count} posts
                </p>
              </div>
            ))}
      </div>
    </div>
  );
};

export default PopularCats;
