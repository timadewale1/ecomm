"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Firebase
import { db } from "@/firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  serverTimestamp,
  setDoc,
  deleteDoc,
} from "firebase/firestore";

// 3rd-party libs
import toast from "react-hot-toast";
import Lottie from "lottie-react";

// Icons
import { GoChevronLeft, GoDotFill } from "react-icons/go";
import {
  FaAngleLeft,
  FaPlus,
  FaCheck,
  FaSpinner,
  FaStar,
} from "react-icons/fa6";
import { CiLogin, CiSearch } from "react-icons/ci";
import { MdCancel } from "react-icons/md";
import { LuListFilter } from "react-icons/lu";
import { LiaTimesSolid } from "react-icons/lia";
import { AiOutlineHome } from "react-icons/ai";

// Animations
import ProductNotFound from "@/components/Loading/ProductnotFound";

// Components
import ProductCard from "@/components/Products/ProductCard";
import Loading from "@/components/Loading/Loading";

// Hooks
import { useAuth } from "@/custom-hooks/useAuth";

// Services
import { handleUserActionLimit } from "@/services/userWriteHandler";


export default function StorePage({ vendorId }) {
  // ===============================
  // 1) State to store vendor & loading
  // ===============================
  const [vendor, setVendor] = useState(null);
  const [vendorLoading, setVendorLoading] = useState(true);

  // ===============================
  // 2) State for products & products loading
  // ===============================
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);

  // ===============================
  // 3) Other UI state
  // ===============================
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [sortOption, setSortOption] = useState(null);
  const [viewOptions, setViewOptions] = useState(false);

  // ===============================
  // 4) Auth & follow states
  // ===============================
  const { currentUser } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [favorites, setFavorites] = useState({});
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // ===============================
  // 5) Next.js router
  // ===============================
  const router = useRouter();
  const searchParams = useSearchParams();
  const isShared = searchParams.has("shared");

  // ==================================================
  // A) Fetch the vendor doc from Firestore
  // ==================================================
  useEffect(() => {
    if (!vendorId) return;

    async function fetchVendorAndProducts() {
      setVendorLoading(true);
      setProductsLoading(true);

      try {
        // 1) Fetch the vendor document
        const vendorRef = doc(db, "vendors", vendorId);
        const vendorSnap = await getDoc(vendorRef);

        if (!vendorSnap.exists()) {
          // If there's no document for this vendorId
          setVendor(null);
          setProducts([]);
          return;
        }

        const vendorData = {
          id: vendorSnap.id,
          ...vendorSnap.data(),
        };
        setVendor(vendorData);

        // 2) Fetch the products if productIds exist
        if (vendorData.productIds && vendorData.productIds.length > 0) {
          const productsList = await fetchVendorProducts(vendorData.productIds);
          setProducts(productsList);
        } else {
          setProducts([]);
        }
      } catch (error) {
        toast.error("Error fetching vendor data: " + error.message);
      } finally {
        setVendorLoading(false);
        setProductsLoading(false);
      }
    }

    fetchVendorAndProducts();
  }, [vendorId]);
  //   / For the login modal (disable scrolling)
  useEffect(() => {
    if (isLoginModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isLoginModalOpen]);

  // ==================================================
  // B) Check if current user is following this vendor
  // ==================================================
  useEffect(() => {
    async function checkFollowStatus() {
      if (!currentUser || !vendor?.id) return;
      try {
        const followRef = collection(db, "follows");
        const followDocRef = doc(followRef, `${currentUser.uid}_${vendor.id}`);
        const followSnapshot = await getDocs(
          query(followRef, where("__name__", "==", followDocRef.id))
        );
        setIsFollowing(!followSnapshot.empty);
      } catch (error) {
        console.error("Error checking follow status:", error);
      }
    }
    checkFollowStatus();
  }, [currentUser, vendor?.id]);

  // ===============================
  // C) Helper function to fetch products
  // ===============================
  async function fetchVendorProducts(productIds) {
    const productsRef = collection(db, "products");
    const productChunks = [];

    // Break productIds into chunks of 10 to avoid Firestore's 'in' limit
    for (let i = 0; i < productIds.length; i += 10) {
      productChunks.push(productIds.slice(i, i + 10));
    }

    const productsList = [];
    for (const chunk of productChunks) {
      const q = query(
        productsRef,
        where("__name__", "in", chunk),
        where("published", "==", true)
      );
      const snapshot = await getDocs(q);
      const chunkData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      productsList.push(...chunkData);
    }
    return productsList;
  }

  // ===============================
  // D) Follow / Unfollow logic
  // ===============================
  const handleFollowClick = async () => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }
    if (!vendor?.id) return;

    try {
      setIsFollowLoading(true);

      const followRef = doc(db, "follows", `${currentUser.uid}_${vendor.id}`);
      await handleUserActionLimit(
        currentUser.uid,
        "follow",
        {},
        {
          collectionName: "usage_metadata",
          writeLimit: 50,
          minuteLimit: 8,
          hourLimit: 40,
        }
      );

      if (!isFollowing) {
        // Follow
        await setDoc(followRef, {
          userId: currentUser.uid,
          vendorId: vendor.id,
          createdAt: serverTimestamp(),
        });
        toast.success("You will be notified of new products and promos.");
      } else {
        // Unfollow
        await deleteDoc(followRef);
        toast.success("Unfollowed");
      }
      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error("Error during follow/unfollow operation:", error.message);
      toast.error(error.message);
    } finally {
      setIsFollowLoading(false);
    }
  };

  // ===============================
  // E) UI: Searching, Sorting, Favorites
  // ===============================
  const handleSearchChange = (e) => setSearchTerm(e.target.value);
  const handleClearSearch = () => setSearchTerm("");
  const handleTypeSelect = (type) => setSelectedType(type);

  const handleFavoriteToggle = (productId) => {
    setFavorites((prev) => {
      const isFavorited = prev[productId];
      if (isFavorited) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      } else {
        return { ...prev, [productId]: true };
      }
    });
  };

  // ===============================
  // F) Filter & Sort Products
  // ===============================
  const filteredProducts = products
    .filter(
      (prod) =>
        prod.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (selectedType === "All" || prod.productType === selectedType)
    )
    .sort((a, b) => {
      if (sortOption === "priceAsc") {
        return parseFloat(a.price) - parseFloat(b.price);
      } else if (sortOption === "priceDesc") {
        return parseFloat(b.price) - parseFloat(a.price);
      } else {
        return 0;
      }
    });

  // ===============================
  // G) Loading States
  // ===============================
  // Show a loading screen if vendor or products are still loading
  if (vendorLoading || productsLoading) {
    return <Loading />;
  }

  // If vendor doc doesn't exist in Firestore
  if (!vendor) {
    return (
      <div className="flex flex-col justify-center items-center h-3/6">
        <Lottie
          className="w-full h-full"
          animationData={ProductNotFound}
          loop={true}
          autoplay={true}
        />
        <h1 className="text-xl text-center font-bold text-red-500">
          Vendor not found or no access.
        </h1>
        {currentUser ? (
          <button
            className="w-full mt-4 h-12 rounded-full bg-customOrange text-white"
            onClick={() => router.push("/browse-markets")}
          >
            Go Back
          </button>
        ) : (
          <button
            className="w-full mt-4 h-12 rounded-full bg-customOrange text-white"
            onClick={() => router.push("/confirm-user-state")}
          >
            Go Back
          </button>
        )}
      </div>
    );
  }

  // ===============================
  // H) Calculate rating & categories
  // ===============================
  const averageRating =
    vendor.ratingCount > 0 ? vendor.rating / vendor.ratingCount : 0;
  const productTypes = ["All", ...new Set(products.map((p) => p.productType))];

  // ===============================
  // I) Navigation handlers
  // ===============================
  const handleGoBack = () => router.back();
  const handleRatingClick = () => router.push(`/reviews/${vendor.id}`);

  // ===============================
  // J) Render
  // ===============================
  return (
    <>
      
      <div className="p-3 mb-24">
        {/* Top nav bar area */}
        <div className="sticky top-0 bg-white h-20 z-10 flex items-center border-b border-gray-300 w-full">
          {isSearching ? (
            <div className="flex items-center w-full relative px-2">
              <FaAngleLeft
                onClick={() => {
                  setIsSearching(false);
                  handleClearSearch();
                }}
                className="cursor-pointer text-2xl mr-2"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search store..."
                className="flex-1 border rounded-full font-opensans text-black text-sm border-gray-300 px-3 py-2 font-medium focus:outline-none"
              />
              {searchTerm && (
                <MdCancel
                  className="text-xl text-gray-500 cursor-pointer absolute right-4"
                  onClick={handleClearSearch}
                />
              )}
            </div>
          ) : isShared ? (
            <>
              <div className="flex items-center">
                <AiOutlineHome
                  onClick={() => router.push("/newhome")}
                  className="text-2xl cursor-pointer"
                />
              </div>
              <div className="flex-1 flex justify-center items-center">
                <img
                  src="/logobg.png"
                  alt="Logo"
                  className="object-contain max-h-[72px]"
                />
              </div>
              <div className="flex items-center mr-2 relative">
                <CiSearch
                  className="text-black text-3xl cursor-pointer"
                  onClick={() => setIsSearching(true)}
                />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between w-full">
              <GoChevronLeft
                onClick={handleGoBack}
                className="cursor-pointer text-3xl"
              />
              <h1 className="flex-grow text-center font-opensans text-lg font-semibold">
                {vendor.shopName}
              </h1>
              <CiSearch
                className="text-black text-3xl cursor-pointer"
                onClick={() => setIsSearching(true)}
              />
            </div>
          )}
        </div>

        {/* Vendor image & rating */}
        <div className="flex justify-center mt-6">
          <div className="relative w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center">
            {vendor.coverImageUrl ? (
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

        {/* Rating */}
        <div
          className="flex justify-center mt-2"
          style={{ cursor: "pointer" }}
          onClick={handleRatingClick}
        >
          <FaStar className="text-yellow-400" size={16} />
          <span className="flex text-xs font-opensans items-center ml-2">
            {averageRating.toFixed(1)}
            <GoDotFill className="mx-1 text-gray-300 font-opensans dot-size" />
            {vendor.ratingCount || 0} ratings
          </span>
        </div>

        {/* Vendor categories */}
        <div className="w-fit text-center bg-customGreen p-2 flex items-center justify-center rounded-full mt-3 mx-auto">
          <div className="mt-2 flex flex-wrap items-center -translate-y-1 justify-center text-textGreen text-xs space-x-1">
            {vendor.categories?.map((category, index) => (
              <React.Fragment key={index}>
                {index > 0 && (
                  <GoDotFill className="mx-1 dot-size text-dotGreen" />
                )}
                <span>{category}</span>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Follow button */}
        <div className="flex items-center justify-center mt-3">
          <button
            className="w-full h-12 rounded-full bg-customOrange text-white font-medium flex items-center font-opensans justify-center transition-colors duration-200"
            onClick={handleFollowClick}
            disabled={isFollowLoading}
          >
            {isFollowLoading ? (
              <FaSpinner className="animate-spin mr-2" />
            ) : isFollowing ? (
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
        </div>

        <p className="text-gray-700 mt-3 text-sm font-opensans text-center">
          {vendor.description}
        </p>

        {/* Products */}
        <div className="p-2 mt-7">
          <div className="flex items-center mb-3 justify-between">
            <h1 className="font-opensans text-lg font-semibold">Products</h1>
            <div className="relative">
              {viewOptions && (
                <div className="z-50 absolute bg-white w-44 h-20 rounded-2.5xl shadow-[0_0_10px_rgba(0,0,0,0.1)] -left-24 top-2 p-3 flex flex-col justify-between">
                  <span
                    className={`text-xs font-opensans ml-2 cursor-pointer ${
                      sortOption === "priceAsc"
                        ? "text-customOrange"
                        : "text-black"
                    }`}
                    onClick={() => {
                      setSortOption("priceAsc");
                      setViewOptions(false);
                    }}
                  >
                    Low to High
                  </span>
                  <hr className="text-slate-300" />
                  <span
                    className={`text-xs font-opensans ml-2 cursor-pointer ${
                      sortOption === "priceDesc"
                        ? "text-customOrange"
                        : "text-black"
                    }`}
                    onClick={() => {
                      setSortOption("priceDesc");
                      setViewOptions(false);
                    }}
                  >
                    High to Low
                  </span>
                </div>
              )}
              <span className="flex text-xs font-opensans items-center">
                Sort by Price:
                <LuListFilter
                  className="text-customOrange cursor-pointer ml-1"
                  onClick={() => setViewOptions(!viewOptions)}
                />
              </span>
            </div>
          </div>

          {/* Product Types Filter */}
          <div className="flex mb-4 w-full overflow-x-auto space-x-2 scrollbar-hide">
            {productTypes.map((type) => (
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

          {/* Products Grid */}
          {filteredProducts.length > 0 ? (
            <div className="grid mt-2 grid-cols-2 gap-2">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isFavorite={!!favorites[product.id]}
                  onFavoriteToggle={handleFavoriteToggle}
                  onClick={() => router.push(`/product/${product.id}`)}
                  showVendorName={false}
                />
              ))}
            </div>
          ) : (
            <div className="flex justify-center items-center w-full text-center">
              <p className="font-opensans text-gray-800 text-xs">
                📭 <span className="font-semibold">{vendor.shopName}</span> has
                not added any products to their online store yet. Follow this
                vendor and you will be notified when they upload products!
              </p>
            </div>
          )}
        </div>

        {/* Login Modal */}
        {isLoginModalOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsLoginModalOpen(false);
              }
            }}
          >
            <div
              className="bg-white w-9/12 max-w-md rounded-lg px-3 py-4 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex space-x-4">
                  <div className="w-8 h-8 bg-rose-100 flex justify-center items-center rounded-full">
                    <CiLogin className="text-customRichBrown" />
                  </div>
                  <h2 className="text-lg font-opensans font-semibold">
                    Please Log In
                  </h2>
                </div>
                <LiaTimesSolid
                  onClick={() => setIsLoginModalOpen(false)}
                  className="text-black text-xl mb-6 cursor-pointer"
                />
              </div>
              <p className="mb-6 text-xs font-opensans text-gray-800">
                You need to be logged in to follow this vendor and receive
                notifications. Please log in or create an account to continue.
              </p>
              <div className="flex space-x-16">
                <button
                  onClick={() => {
                    router.push("/signup");
                    setIsLoginModalOpen(false);
                  }}
                  className="flex-1 bg-transparent py-2 text-customRichBrown font-medium text-xs font-opensans border-customRichBrown border rounded-full"
                >
                  Sign Up
                </button>
                <button
                  onClick={() => {
                    router.push("/login");
                    setIsLoginModalOpen(false);
                  }}
                  className="flex-1 bg-customOrange py-2 text-white text-xs font-opensans rounded-full"
                >
                  Login
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
