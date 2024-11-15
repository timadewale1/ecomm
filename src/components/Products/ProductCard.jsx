import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useFavorites } from "../../components/Context/FavoritesContext";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { db } from "../../firebase.config"; // Ensure firebase is configured
import { doc, getDoc } from "firebase/firestore"; // Firestore methods
import { RiHeart3Fill, RiHeart3Line } from "react-icons/ri";

const ProductCard = ({ product, isLoading, showVendorName = true  }) => {
  const navigate = useNavigate();
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();
  const favorite = isFavorite(product?.id);
  const [vendorMarketplaceType, setVendorMarketplaceType] = useState(null);

  // Fetch vendor's marketplace type from Firestore
  useEffect(() => {
    const fetchVendorMarketplaceType = async () => {
      try {
        const vendorRef = doc(db, "vendors", product.vendorId);
        const vendorDoc = await getDoc(vendorRef);

        if (vendorDoc.exists()) {
          const vendorData = vendorDoc.data();
          setVendorMarketplaceType(vendorData.marketPlaceType);
        } else {
          console.error("Vendor not found");
        }
      } catch (error) {
        console.error("Error fetching vendor marketplace type:", error);
      }
    };

    if (product.vendorId) {
      fetchVendorMarketplaceType();
    }
  }, [product.vendorId]);

  const handleCardClick = () => {
    if (!isLoading && product?.stockQuantity > 0) {
      navigate(`/product/${product.id}`);
    }
  };

  const handleVendorClick = (e) => {
    e.stopPropagation();

    if (vendorMarketplaceType === "virtual") {
      navigate(`/store/${product.vendorId}`);
    } else if (vendorMarketplaceType === "marketplace") {
      navigate(`/marketstorepage/${product.vendorId}`);
    } else {
      console.error("Unknown marketplace type or vendor not found");
    }
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

  const mainImage = product?.coverImageUrl || product?.imageUrls[0];

  const formatPrice = (price) => {
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const renderCondition = (condition) => {
    if (!condition) return null;

    switch (condition.toLowerCase()) {
      case "defect:":
        return <p className="text-xs text-red-500">{condition}</p>;
      case "brand new":
        return <p className="text-xs text-green-500">Brand New</p>;
      case "thrift":
        return <p className="text-xs text-yellow-500">Thrift</p>;
      default:
        return <p className="text-xs text-red-500">{condition}</p>;
    }
  };

  return (
    <div
      className={`product-card relative mb-2 cursor-pointer ${
        product.stockQuantity === 0 ? "opacity-50 pointer-events-none" : ""
      }`}
      onClick={handleCardClick}
      style={{
        width: "100%",
        margin: "0",
      }}
    >
      <div className="relative">
        {isLoading ? (
          <Skeleton height={160} />
        ) : (
          <img
            src={mainImage}
            alt={product.name}
            className="h-52 w-full object-cover rounded-lg"
          />
        )}

        {/* Favorite Icon */}
        <div
          className="absolute bottom-2 right-2 cursor-pointer bg-white p-1 rounded-full shadow-lg"
          onClick={handleFavoriteToggle}
        >
          {favorite ? (
            <RiHeart3Fill className="text-red-500 text-2xl" />
          ) : (
            <RiHeart3Line className="text-gray-800 text-2xl" />
          )}
        </div>

        {/* Out of Stock Overlay */}
        {product.stockQuantity === 0 && (
          <div className="absolute inset-0 bg-gray-900 bg-opacity-70 flex items-center justify-center rounded-lg">
            <p className="text-red-700 font-semibold text-lg animate-pulse">
              Out of Stock
            </p>
          </div>
        )}
      </div>
      <div className="">
        <div className="flex font-opensans font-light items-center mt-2">
          {isLoading ? (
            <Skeleton width={100} />
          ) : (
            <div className="flex items-center space-x-1">
              {renderCondition(product.condition)}
              {product.condition === "Defect:" && product.defectDescription && (
                <span className="text-xs text-red-500">
                  {product.defectDescription}
                </span>
              )}
            </div>
          )}
        </div>

        <h3 className="text-sm font-opensans font-medium mt-1">
          {isLoading ? <Skeleton width={100} /> : product.name}
        </h3>
        <div className="flex items-center justify-between mt-1">
          <p className="text-black text-lg font-opensans font-bold">
            {isLoading ? (
              <Skeleton width={50} />
            ) : (
              `₦${formatPrice(product.price)}`
            )}
          </p>
        </div>
        {showVendorName && product.vendorName && (
          <p
            className="text-xs font-opensans font-light text-gray-600 underline cursor-pointer"
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
