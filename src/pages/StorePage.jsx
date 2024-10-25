import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth } from "../firebase.config";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { GoChevronLeft, GoDotFill } from "react-icons/go";
import { FiSearch } from "react-icons/fi";
import { FaAngleLeft, FaPlus, FaCheck } from "react-icons/fa";
import toast from "react-hot-toast";
import ProductCard from "../components/Products/ProductCard";
import Loading from "../components/Loading/Loading";
import { FaStar } from "react-icons/fa6";
import { CiSearch } from "react-icons/ci";

const StorePage = () => {
  const { id } = useParams();
  const [vendor, setVendor] = useState(null);
  const [products, setProducts] = useState([]);
  const [favorites, setFavorites] = useState({});
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedType, setSelectedType] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVendorData = async () => {
      try {
        // Set loading state to true
        setLoading(true);

        // Fetch vendor data using the vendor ID
        const vendorRef = doc(db, "vendors", id);
        const vendorDoc = await getDoc(vendorRef);

        if (vendorDoc.exists()) {
          const vendorData = vendorDoc.data();
          vendorData.id = vendorDoc.id; // Ensure we have the vendor's document ID
          setVendor(vendorData);

          // If the vendor has productIds, use them to fetch products
          if (vendorData.productIds && vendorData.productIds.length > 0) {
            await fetchVendorProducts(vendorData.productIds); // Fetch the vendor's products
          } else {
            // No products if the vendor has no productIds
            setProducts([]);
          }
        } else {
          // Show error if the vendor is not found
          toast.error("Vendor not found!");
        }
      } catch (error) {
        // Handle any errors during the fetch operation
        toast.error("Error fetching vendor data: " + error.message);
      } finally {
        // Set loading state to false once fetching is complete
        setLoading(false);
      }
    };

    const checkIfFollowing = async (vendorId) => {
      if (currentUser) {
        try {
          const followRef = collection(db, "follows");
          const followDoc = doc(followRef, `${currentUser.uid}_${vendorId}`);
          const followSnapshot = await getDoc(followDoc);

          setIsFollowing(followSnapshot.exists()); // Set follow state based on document existence
        } catch (error) {
          console.error("Error checking follow status:", error);
        }
      }
    };

    fetchVendorData(); // Fetch vendor data on mount
  }, [id, currentUser]); // Depend on vendor ID and current user state

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleFollowClick = async () => {
    try {
      if (!vendor?.id) {
        throw new Error("Vendor ID is undefined");
      }

      const followRef = collection(db, "follows");
      const followDoc = doc(followRef, `${currentUser.uid}_${vendor.id}`);

      if (!isFollowing) {
        // Add follow entry
        await setDoc(followDoc, {
          userId: currentUser.uid,
          vendorId: vendor.id,
          createdAt: new Date(),
        });
        toast.success("You will be notified of new products and promos.");
      } else {
        // Unfollow
        await deleteDoc(followDoc);
        toast.success("Unfollowed");
      }

      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error("Error following/unfollowing:", error.message);
      toast.error(`Error following/unfollowing: ${error.message}`);
    }
  };

  const handleFavoriteToggle = (productId) => {
    setFavorites((prevFavorites) => {
      const isFavorited = prevFavorites[productId];
      if (isFavorited) {
        const { [productId]: removed, ...rest } = prevFavorites;
        return rest;
      } else {
        return { ...prevFavorites, [productId]: true };
      }
    });
  };

  const handleGoToCart = () => {
    navigate("/cart");
  };

  const handleRatingClick = () => {
    navigate(`/reviews/${id}`);
  };

  const handleTypeSelect = (type) => {
    setSelectedType(type);
  };
  const fetchVendorProducts = async (productIds) => {
    try {
      const productsRef = collection(db, "products");
      const q = query(productsRef, where("__name__", "in", productIds)); // Query the products collection by ID

      const querySnapshot = await getDocs(q);
      const fetchedProducts = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setProducts(fetchedProducts); // Set the fetched products to state
    } catch (error) {
      console.error("Error fetching vendor products:", error);
      toast.error("Error fetching products.");
    }
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (selectedType === "All" || product.productType === selectedType)
  );

  if (loading) {
    return (
      <div>
        <Loading />
      </div>
    );
  }

  if (!vendor) {
    return <div>No vendor found</div>;
  }

  // Calculate the average rating
  const averageRating =
    vendor.ratingCount > 0 ? vendor.rating / vendor.ratingCount : 0;

  return (
    <div className="p-3 mb-24">
      <div className="sticky top-0 bg-white h-20 z-10 flex justify-between items-center border-b border-gray-300 w-full">
        {isSearching ? (
          <>
            <FaAngleLeft
              onClick={() => setIsSearching(false)}
              className="cursor-pointer"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search products..."
              className="border rounded-lg px-3 py-2 flex-1 mx-2"
            />
            <div style={{ width: "24px" }} />
          </>
        ) : (
          <>
            <GoChevronLeft
              onClick={() => navigate(-1)}
              className="cursor-pointer text-3xl"
            />
            <h1 className="font-opensans text-lg font-semibold">
              {vendor.shopName.length > 22
                ? `${vendor.shopName.slice(0, 22)}...`
                : vendor.shopName}
            </h1>

            <CiSearch
              className="text-black text-3xl cursor-pointer"
              onClick={() => setIsSearching(true)}
            />
          </>
        )}
      </div>

      <div className="flex justify-center mt-6">
        <div className="relative w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center">
          {loading ? (
            <Skeleton circle={true} height={128} width={128} />
          ) : vendor.coverImageUrl ? (
            <img
              className="w-32 h-32 rounded-full bg-slate-700 object-cover"
              src={vendor.coverImageUrl}
              alt={vendor.shopName}
            />
          ) : (
            <span className="text-center font-bold">{vendor.shopName}</span>
          )}
        </div>
      </div>
      {/* <div className="flex justify-center mt-3 mb-2">
        <div className="flex items-center text-black text-lg font-medium">
          {vendor.socialMediaHandle}
        </div>
      </div> */}
      <div
        className="flex justify-center mt-2"
        style={{ cursor: "pointer" }}
        onClick={handleRatingClick}
      >
        {loading ? (
          <Skeleton width={100} height={24} />
        ) : (
          <>
            <FaStar className="text-yellow-400" size={16} />
            <span className="flex text-xs font-opensans items-center ml-2">
              {averageRating.toFixed(1)}
              <GoDotFill className="mx-1 text-gray-300 font-opensans dot-size" />
              {vendor.ratingCount || 0} ratings
            </span>
          </>
        )}
      </div>

      <div className="w-fit text-center bg-customGreen p-2 flex items-center justify-center rounded-full mt-3 mx-auto">
        <div className="mt-2 flex flex-wrap items-center -translate-y-1 justify-center text-textGreen text-xs space-x-1">
          {loading ? (
            <Skeleton width={80} height={24} count={4} inline={true} />
          ) : (
            vendor.categories.map((category, index) => (
              <React.Fragment key={index}>
                {index > 0 && (
                  <GoDotFill className="mx-1 dot-size text-dotGreen" />
                )}
                <span>{category}</span>
              </React.Fragment>
            ))
          )}
        </div>
      </div>
      <div className="flex items-center justify-center mt-3">
        {loading ? (
          <Skeleton width={128} height={40} />
        ) : (
          <button
            className={`w-full h-12 rounded-full border font-medium flex items-center justify-center transition-colors duration-200 ${
              isFollowing
                ? "bg-customOrange text-white"
                : "bg-customOrange text-white"
            }`}
            onClick={handleFollowClick}
          >
            {isFollowing ? (
              <>
                <FaCheck className="mr-2" />
                Following
              </>
            ) : (
              <>
                <FaPlus className="mr-2" />
                Follow
              </>
            )}
          </button>
        )}
      </div>
      <p className=" text-gray-700 mt-3 text-sm font-opensans text-center">
        {loading ? <Skeleton count={2} /> : vendor.description}
      </p>
      <div className="p-2 mt-7">
        <h1 className="font-opensans text-lg mb-3  font-semibold ">Products</h1>
        <div className="flex justify-between mb-4 w-full overflow-x-auto space-x-2 scrollbar-hide">
          {[
            "All",
            "Cloth",
            "Dress",
            "Jewelry",
            "Footwear",
            "Pants",
            "Shirts",
            "Suits",
            "Hats",
            "Belts",
          ].map((type) => (
            <button
              key={type}
              onClick={() => handleTypeSelect(type)}
              className={`flex-shrink-0 h-12 px-4 py-2 text-xs font-semibold font-opensans text-black border border-gray-400 rounded-full ${
                selectedType === type
                  ? "bg-customOrange text-white"
                  : "bg-transparent"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="grid mt-2 grid-cols-2 gap-2">
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} height={200} width="100%" />
            ))
          ) : filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isFavorite={!!favorites[product.id]}
                onFavoriteToggle={handleFavoriteToggle}
                onClick={() => {
                  navigate(`/product/${product.id}`);
                }}
              />
            ))
          ) : (
            <p className=" flex justify-center text-center font-opensans text-gray-500">
              No products available for this vendor.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StorePage;
