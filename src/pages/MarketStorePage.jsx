import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth } from "../firebase.config";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  updateDoc,
  setDoc,
  increment,
  query,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { GoDotFill, GoChevronLeft } from "react-icons/go";
import { FiSearch } from "react-icons/fi";
import { FaAngleLeft, FaPlus, FaCheck } from "react-icons/fa";
import toast from "react-hot-toast";
import ProductCard from "../components/Products/ProductCard";
import Loading from "../components/Loading/Loading";
import { FaStar } from "react-icons/fa6";
import { CiSearch } from "react-icons/ci";

const MarketStorePage = () => {
  const { id } = useParams();
  const [vendor, setVendor] = useState(null);
  const [products, setProducts] = useState([]);
  const [favorites, setFavorites] = useState({});
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVendorData = async () => {
      try {
        // Fetch vendor data
        const vendorRef = doc(db, "vendors", id);
        const vendorDoc = await getDoc(vendorRef);
        if (vendorDoc.exists()) {
          const vendorData = vendorDoc.data();
          setVendor(vendorData);

          // Fetch products from the centralized 'products' collection
          const productsRef = collection(db, "products");
          const productsSnapshot = await getDocs(
            query(productsRef, where("vendorId", "==", id))
          );

          const productsList = productsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setProducts(productsList);
        } else {
          toast.error("Vendor not found!");
        }
      } catch (error) {
        toast.error("Error fetching vendor data: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVendorData();
  }, [id]);

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

  const handleFollowClick = () => {
    setIsFollowing(!isFollowing);
    toast(
      isFollowing
        ? "Unfollowed"
        : "You will be notified of new products and promos."
    );
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

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (selectedCategory === "All" || product.category === selectedCategory)
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
  const DefaultImageUrl =
    "https://images.saatchiart.com/saatchi/1750204/art/9767271/8830343-WUMLQQKS-7.jpg";

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
              {vendor.shopName}
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
            <img
              className="w-32 h-32 rounded-full bg-slate-700 object-cover"
              src={DefaultImageUrl}
              alt="Default Image"
            />
          )}
        </div>
      </div>
      <div className="flex justify-center mt-3 mb-2">
        <div className="flex items-center text-black text-lg font-medium">
          {vendor.socialMediaHandle}
        </div>
      </div>
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
        <div className="flex justify-between  mb-4 w-full  overflow-x-auto  space-x-2">
          {["All", "Tops", "Bottoms", "Shoes", "Dresses", "Accessories"].map(
            (category) => (
              <button
                key={category}
                onClick={() => handleCategorySelect(category)}
                className={`flex-shrink-0 h-12 px-4 py-2 text-xs font-semibold font-opensans text-black border border-gray-400 rounded-full ${
                  selectedCategory === category
                    ? "bg-customOrange text-white"
                    : "bg-transparent"
                }`}
              >
                {category}
              </button>
            )
          )}
        </div>

        <div className="grid mt-2 grid-cols-2 gap-2">
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} height={200} width="100%" />
              ))
            : filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isFavorite={!!favorites[product.id]}
                  onFavoriteToggle={handleFavoriteToggle}
                />
              ))}
        </div>
      </div>
    </div>
  );
};

export default MarketStorePage;
