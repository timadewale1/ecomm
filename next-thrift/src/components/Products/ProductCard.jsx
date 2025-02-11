"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; // <== Use Next.js router
import toast from "react-hot-toast";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

// Firestore
import { db } from "firebase.config";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";

// Icons
import { RiHeart3Fill, RiHeart3Line } from "react-icons/ri";

// Custom Hooks / Context
import { useAuth } from "@/custom-hooks/useAuth";
import { useFavorites } from "@/components/context/FavoritesContext";

// Import the handleUserActionLimit helper
import { handleUserActionLimit } from "@/services/userWriteHandler";

const ProductCard = ({ product, isLoading, showVendorName = true }) => {
  const router = useRouter(); // <== Replaces useNavigate()

  // Auth state
  const { currentUser } = useAuth();

  // Local Favorites Context
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();
  const favorite = isFavorite(product?.id);

  // State for vendor's marketplace type
  const [vendorMarketplaceType, setVendorMarketplaceType] = useState(null);

  // Fetch vendor's marketplace type from Firestore
  useEffect(() => {
    const fetchVendorMarketplaceType = async () => {
      if (!product?.vendorId) return;
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
    fetchVendorMarketplaceType();
  }, [product?.vendorId]);

  // Navigate to product detail page if in stock
  const handleCardClick = () => {
    if (!isLoading && product?.stockQuantity > 0) {
      // In Next.js, we use router.push
      router.push(`/product/${product.id}`);
    }
  };

  // Navigate to vendor store (virtual or marketplace)
  const handleVendorClick = (e) => {
    e.stopPropagation();

    if (vendorMarketplaceType === "virtual") {
      router.push(`/store/${product.vendorId}`);
    } else if (vendorMarketplaceType === "marketplace") {
      router.push(`/marketstorepage/${product.vendorId}`);
    } else {
      console.error("Unknown marketplace type or vendor not found");
    }
  };

  // Optimistic UI: Toggle heart immediately, then do Firestore + rate-limit checks in background
  const handleFavoriteToggle = async (e) => {
    e.stopPropagation();

    // 1) Save old state so we can revert if something fails
    const wasFavorite = favorite;

    // 2) Immediately toggle local state (optimistic update)
    if (favorite) {
      removeFavorite(product.id);
      toast.info(`Removed ${product.name} from favorites!`);
    } else {
      addFavorite(product);
      toast.success(`Added ${product.name} to favorites!`);
    }

    // 3) If user not logged in => do local only
    if (!currentUser) {
      return;
    }

    // 4) If user is logged in => enforce rate limit, then Firestore
    try {
      // Rate limit check
      await handleUserActionLimit(
        currentUser.uid,
        "favorite",
        {},
        {
          collectionName: "usage_metadata",
          writeLimit: 50, // universal writes/hour
          minuteLimit: 10, // 10 favorites/min
          hourLimit: 80, // 80 favorites/hour
          dayLimit: 120, // 120 favorites/day
        }
      );

      // Firestore doc reference
      const favDocRef = doc(
        db,
        "users",
        currentUser.uid,
        "favorites",
        product.id
      );

      if (wasFavorite) {
        // Previously was a favorite => means user wants to remove it
        await deleteDoc(favDocRef);
      } else {
        // Previously not favorite => means user wants to add it
        await setDoc(favDocRef, {
          productId: product.id,
          name: product.name,
          price: product.price,
          createdAt: new Date(),
        });
      }
    } catch (err) {
      console.error("Error updating favorites:", err);

      // 5) Revert the local favorite state if there's an error
      if (wasFavorite) {
        // If it was a favorite, we re-add it because we optimistically removed it
        addFavorite(product);
      } else {
        // If it was not a favorite, we remove it because we optimistically added it
        removeFavorite(product.id);
      }

      // Show user the error
      toast.error(
        err.message || "Failed to update favorites. Please try again."
      );
    }
  };

  // Utility to format price
  const formatPrice = (price) => {
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Utility to display condition
  const renderCondition = (condition) => {
    if (!condition) return null;
    const lower = condition.toLowerCase();
    if (lower.includes("defect"))
      return <p className="text-xs text-red-500">{condition}</p>;
    if (lower.includes("brand new"))
      return <p className="text-xs text-green-500">Brand New</p>;
    if (lower.includes("thrift"))
      return <p className="text-xs text-yellow-500">Thrift</p>;

    return <p className="text-xs text-red-500">{condition}</p>;
  };

  // The product’s main image
  const mainImage = product?.coverImageUrl || product?.imageUrls?.[0];

  return (
    <div
      className={`product-card relative mb-2 cursor-pointer ${
        product?.stockQuantity === 0 ? "opacity-50 pointer-events-none" : ""
      }`}
      onClick={handleCardClick}
      style={{ width: "100%", margin: 0 }}
    >
      <div className="relative">
        {isLoading ? (
          <Skeleton height={160} />
        ) : (
          <img
            src={mainImage}
            alt={product?.name || "Product"}
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
        {product?.stockQuantity === 0 && (
          <div className="absolute inset-0 bg-gray-900 bg-opacity-70 flex items-center justify-center rounded-lg">
            <p className="text-red-700 font-semibold text-2xl animate-pulse">
              Sold Out!
            </p>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div>
        <div className="flex font-opensans font-light items-center mt-2">
          {isLoading ? (
            <Skeleton width={100} />
          ) : (
            <div className="flex items-center space-x-1">
              {renderCondition(product?.condition)}
              {product?.condition === "Defect:" &&
                product?.defectDescription && (
                  <span className="text-xs text-red-500">
                    {product.defectDescription}
                  </span>
                )}
            </div>
          )}
        </div>

        <h3 className="text-sm font-opensans font-medium mt-1">
          {isLoading ? <Skeleton width={100} /> : product?.name}
        </h3>
        <div className="flex items-center justify-between mt-1">
          <p className="text-black text-lg font-opensans font-bold">
            {isLoading ? (
              <Skeleton width={50} />
            ) : (
              `₦${formatPrice(product?.price || 0)}`
            )}
          </p>
        </div>

        {/* Show vendor name if requested */}
        {showVendorName && product?.vendorName && (
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
