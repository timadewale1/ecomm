import React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useFavorites } from "../../components/Context/FavoritesContext";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

const ProductCard = ({ product, isLoading }) => {
  const navigate = useNavigate();
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();
  const favorite = isFavorite(product?.id);

  const handleCardClick = () => {
    if (!isLoading && product?.stockQuantity > 0) {
      console.log(`Navigating to product/${product.id}`);
      navigate(`/product/${product.id}`);
    }
  };

  const handleVendorClick = (e) => {
    e.stopPropagation();
    console.log(`Navigating to vendor/${product.vendorId} with name ${product.vendorName}`);
    navigate(`/store/${product.vendorId}`);
  };

  const handleFavoriteToggle = (e) => {
    e.stopPropagation();
    if (favorite) {
      removeFavorite(product.id);
      toast.info(`Removed ${product.name} from favorites!`);
    } else {
      addFavorite(product);
      toast.success(`Added ${product.name} to favorites!`);
    }
  };

  const mainImage = product?.coverImageUrl;

  const formatPrice = (price) => {
    return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const renderCondition = (condition) => {
    if (!condition) return null;

    switch (condition.toLowerCase()) {
      case "defect":
        return <p className="text-xs text-red-500">{condition}</p>;
      case "brand new":
        return <p className="text-xs text-green-500">Brand New</p>;
      case "thrift":
        return <p className="text-xs text-yellow-500">Thrift</p>;
      case "second hand":
        return <p className="text-xs text-green-500">Second Hand</p>;
      default:
        return <p className="text-xs text-red-500">{condition}</p>;
    }
  };

  const isOutOfStock = product?.stockQuantity === 0;

  return (
    <div
      className={`product-card relative mb-2 cursor-pointer ${
        isOutOfStock ? "bg-gray-300 opacity-60 rounded-lg" : ""
      }`}
      onClick={handleCardClick}
      style={{
        width: "100%",
        margin: "0",
        pointerEvents: isOutOfStock ? "none" : "auto",
      }}
    >
      <div className="relative">
        {isLoading ? (
          <Skeleton height={160} />
        ) : (
          <img
            src={mainImage}
            alt={product.name}
            className={`h-52 w-full object-cover rounded-lg ${
              isOutOfStock ? "opacity-50" : ""
            }`}
          />
        )}
        <div
          className="absolute bottom-2 right-2 cursor-pointer"
          onClick={handleFavoriteToggle}
        >
          <img
            src={favorite ? "/heart-filled.png" : "/heart.png"}
            alt="Favorite Icon"
            className="w-8 h-8"
          />
        </div>
      </div>
      <div className="">
        <div className="flex font-opensans font-light items-center mt-2">
          {isLoading ? (
            <Skeleton width={100} />
          ) : isOutOfStock ? (
            <p className="text-xs text-red-500">Out of Stock</p>
          ) : (
            renderCondition(product.condition)
          )}
        </div>
        <h3 className="text-sm font-opensans font-medium mt-1">
          {isLoading ? <Skeleton width={100} /> : product.name}
        </h3>
        <div className="flex items-center justify-between mt-1">
          <p className="text-black text-lg font-opensans font-bold">
            {isLoading ? <Skeleton width={50} /> : `₦${formatPrice(product.price)}`}
          </p>
        </div>
        {product.vendorName && (
          <p
            className="text-xs font-light text-gray-600 underline cursor-pointer"
            onClick={handleVendorClick}
          >
            {product.vendorName}
          </p>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
