/* eslint-disable jsx-a11y/img-redundant-alt */
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
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
import { GoDotFill, GoChevronLeft } from "react-icons/go";
import { FiSearch } from "react-icons/fi";
import { FaAngleLeft, FaPlus, FaCheck } from "react-icons/fa";
import Productnotfund from "../Animations/productnotfound.json";
import { FaSpinner, FaStar } from "react-icons/fa6";
import toast from "react-hot-toast";
import ProductCard from "../components/Products/ProductCard";
import Loading from "../components/Loading/Loading";
import { CiLogin, CiSearch } from "react-icons/ci";
import { useAuth } from "../custom-hooks/useAuth";
import { MdCancel, MdClose } from "react-icons/md";
import { LuListFilter } from "react-icons/lu";
import Lottie from "lottie-react";
import { LiaTimesSolid } from "react-icons/lia";
import { AiOutlineHome } from "react-icons/ai";
import SEO from "../components/Helmet/SEO";
const ReviewBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const bannerShown = localStorage.getItem("reviewBannerShown");
    if (!bannerShown) {
      setIsVisible(true);
      localStorage.setItem("reviewBannerShown", "true");

      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
  };

  return (
    <div
      className={`absolute z-10 w-64 bg-customBrown text-white px-2 py-2 rounded-lg shadow-lg flex flex-col items-start space-y-1 transform -translate-x-1/2 translate-y-40 left-1/2 transition-opacity duration-500 ${
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      style={{ maxWidth: "99%" }}
    >
      <span className="font-semibold font-opensans text-sm">
        Click here to rate vendor!
      </span>
      <span className="text-xs font-opensans">
        Shopped from here? Share your experience with other shoppers!🧡
      </span>
      <button onClick={handleClose} className="absolute top-1 right-4">
        <MdClose className="text-white text-lg" />
      </button>
      <div className="absolute bottom-[-7px] left-1/2 transform -translate-x-1/2 w-4 h-4 bg-customBrown rotate-45"></div>{" "}
    </div>
  );
};
const MarketStorePage = () => {
  const { id } = useParams();
  const [vendor, setVendor] = useState(null);
  const [products, setProducts] = useState([]);
  const [favorites, setFavorites] = useState({});
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  // const [currentUser, setCurrentUser] = useState(null);
  const { currentUser } = useAuth();
  const [sortOption, setSortOption] = useState(null); // Add this line
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false); // Add this line
  const [selectedType, setSelectedType] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [viewOptions, setViewOptions] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isShared = searchParams.has("shared");


  useEffect(() => {
    setLoading(true);
    setVendor(null);
    setProducts([]);

    const fetchVendorData = async () => {
      try {
        setLoading(true);

        const vendorRef = doc(db, "vendors", id);
        const vendorDoc = await getDoc(vendorRef);

        if (vendorDoc.exists()) {
          const vendorData = vendorDoc.data();
          vendorData.id = vendorDoc.id;
          setVendor(vendorData);

          if (vendorData.productIds && vendorData.productIds.length > 0) {
            await fetchVendorProducts(vendorData.productIds);
          } else {
            setProducts([]);
          }
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
    setIsFollowing(false);

    const checkIfFollowing = async () => {
      if (currentUser && vendor) {
        try {
          const followRef = collection(db, "follows");
          const followDocRef = doc(
            followRef,
            `${currentUser.uid}_${vendor.id}`
          );
          const followSnapshot = await getDoc(followDocRef);

          if (followSnapshot.exists()) {
            setIsFollowing(true);
          } else {
            setIsFollowing(false);
          }
        } catch (error) {
          console.error("Error checking follow status:", error);
        }
      }
    };

    checkIfFollowing();
  }, [currentUser, vendor]);

  // useEffect(() => {
  //   const unsubscribe = onAuthStateChanged(auth, (user) => {
  //     if (user) {
  //       setCurrentUser(user);
  //     } else {
  //       setCurrentUser(null);
  //     }
  //   });

  //   return () => unsubscribe();
  // }, []);

  const fetchVendorProducts = async (productIds) => {
    try {
      const productsRef = collection(db, "products");

      if (!productIds || productIds.length === 0) {
        setProducts([]);
        return;
      }

      const productChunks = [];
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
        const productsSnapshot = await getDocs(q);
        const productsChunk = productsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        productsList.push(...productsChunk);
      }

      setProducts(productsList);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Error fetching products.");
    }
  };
  const handleTypeSelect = (type) => {
    setSelectedType(type);
  };
  const filteredProducts = products
    .filter(
      (product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (selectedType === "All" || product.productType === selectedType)
    )
    .sort((a, b) => {
      if (sortOption === "priceAsc") {
        return parseFloat(a.price) - parseFloat(b.price);
      } else if (sortOption === "priceDesc") {
        return parseFloat(b.price) - parseFloat(a.price);
      } else {
        return 0; // No sorting applied
      }
    });

  // Handle follow/unfollow vendor
  // const handleFollowClick = async () => {
  //   try {
  //     setIsFollowLoading(true); // Start loading
  //     if (!vendor?.id) {
  //       throw new Error("Vendor ID is undefined");
  //     }

  //     const followRef = collection(db, "follows");
  //     const followDocRef = doc(followRef, `${currentUser.uid}_${vendor.id}`);

  //     if (!isFollowing) {
  //       // Add follow entry
  //       await setDoc(followDocRef, {
  //         userId: currentUser.uid,
  //         vendorId: vendor.id,
  //         createdAt: new Date(),
  //       });
  //       toast.success("You will be notified of new products and promos.");
  //     } else {
  //       // Unfollow
  //       await deleteDoc(followDocRef);
  //       toast.success("Unfollowed");
  //     }

  //     setIsFollowing(!isFollowing);
  //   } catch (error) {
  //     console.error("Error following/unfollowing:", error.message);
  //     toast.error(`Error following/unfollowing: ${error.message}`);
  //   } finally {
  //     setIsFollowLoading(false); // End loading
  //   }
  // };
  const handleFollowClick = async () => {
    if (!currentUser) {
      setIsLoginModalOpen(true); // Show login modal
      return; // Exit the function early
    }

    try {
      setIsFollowLoading(true); // Start loading
      if (!vendor?.id) {
        throw new Error("Vendor ID is undefined");
      }

      const followRef = collection(db, "follows");
      const followDocRef = doc(followRef, `${currentUser.uid}_${vendor.id}`);

      if (!isFollowing) {
        // Add follow entry
        await setDoc(followDocRef, {
          userId: currentUser.uid,
          vendorId: vendor.id,
          createdAt: new Date(),
        });
        toast.success("You will be notified of new products and promos.");
      } else {
        // Unfollow
        await deleteDoc(followDocRef);
        toast.success("Unfollowed");
      }

      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error("Error following/unfollowing:", error.message);
      toast.error(`Error following/unfollowing: ${error.message}`);
    } finally {
      setIsFollowLoading(false); // End loading
    }
  };
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

  // const handleGoToCart = () => {
  //   navigate("/cart");
  // };

  const handleRatingClick = () => {
    navigate(`/reviews/${id}`);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  if (loading) {
    return (
      <div>
        <Loading />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex flex-col justify-center items-center h-3/6">
        <Lottie
          className="w-full h-full"
          animationData={Productnotfund}
          loop={true}
          autoplay={true}
        />
        <h1 className="text-xl text-center font-bold text-red-500">
          Vendor is not found. You entered a wrong link or the vendor is not
          available.
        </h1>
        <button
          className={`w-full mt-4 h-12 rounded-full border font-medium flex items-center font-opensans justify-center transition-colors duration-200 bg-customOrange text-white`}
          onClick={() => {
            if (currentUser) {
              navigate("/browse-markets");
            } else {
              navigate("/confirm-user-state");
            }
          }} // Disable button when loading
        >
          {" "}
          Go Back
        </button>
      </div>
    );
  }
  const handleClearSearch = () => {
    setSearchTerm("");
  };

  const DefaultImageUrl =
    "https://images.saatchiart.com/saatchi/1750204/art/9767271/8830343-WUMLQQKS-7.jpg";

  const averageRating =
    vendor.ratingCount > 0 ? vendor.rating / vendor.ratingCount : 0;
  const productTypes = [
    "All",
    ...new Set(products.map((product) => product.productType)),
  ];
  return (  
    <>
    <SEO 
        title={`${vendor.shopName} - My Thrift`} 
        description={`Shop from ${vendor.shopName} on My Thrift`}
        image={vendor.coverImageUrl}
        url={`https://www.shopmythrift.store/marketstorepage/${id}`} 
      />
    <div className="p-3 mb-24">
      <ReviewBanner />
      <div className="sticky top-0 bg-white h-20 z-20 flex items-center border-b border-gray-300 w-full">
        {isSearching ? (
          <div className="flex items-center w-full relative px-2">
            <FaAngleLeft 
              onClick={() => {
                setIsSearching(false);
                handleClearSearch(); // Clear input when exiting search
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
                        onClick={() => navigate("/newhome")}
                        className="text-2xl cursor-pointer"
                      />
                    </div>
        
                    {/* Centered logo container uses flex-1 to take remaining space and flex to center content */}
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
          <div className="flex items-center justify-between w-full ">
            <GoChevronLeft
              onClick={() => navigate(-1)}
              className="cursor-pointer text-3xl"
            />
            <h1 className="flex-grow text-center font-opensans text-lg font-semibold">
              {vendor.shopName || "Not Found"}
            </h1>
            <CiSearch
              className="text-black text-3xl cursor-pointer"
              onClick={() => setIsSearching(true)}
            />
          </div>
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
            className={`w-full h-12 rounded-full border font-medium flex items-center font-opensans justify-center transition-colors duration-200 ${
              isFollowing
                ? "bg-customOrange text-white"
                : "bg-customOrange text-white"
            }`}
            onClick={handleFollowClick}
            disabled={isFollowLoading} // Disable button when loading
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
        )}
      </div>
      <p className=" text-gray-700 mt-3 text-sm font-opensans text-center">
        {loading ? <Skeleton count={2} /> : vendor.description}
      </p>
      <div className="p-2 mt-7">
        <div className="flex items-center mb-3 justify-between">
          <h1 className="font-opensans text-lg  font-semibold">Products</h1>
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
                    setViewOptions(!viewOptions);
                  }}
                >
                  Low to High
                </span>
                <hr className="text-slate-300" />
                <span
                  className={`text-xs ml-2 font-opensans cursor-pointer ${
                    sortOption === "priceDesc"
                      ? "text-customOrange"
                      : "text-black"
                  }`}
                  onClick={() => {
                    setSortOption("priceDesc");
                    setViewOptions(!viewOptions);
                  }}
                >
                  High to Low
                </span>
              </div>
            )}
            <span className="flex text-xs font-opensans items-center">
              Sort by Price:{" "}
              <LuListFilter
                className="text-customOrange cursor-pointer ml-1"
                onClick={() => setViewOptions(!viewOptions)}
              />
            </span>
          </div>
        </div>

        <div className="flex  mb-4 w-full overflow-x-auto space-x-2 scrollbar-hide">
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

        {loading ? (
          <div className="grid mt-2 grid-cols-2 gap-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} height={200} width="100%" />
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid mt-2 grid-cols-2 gap-2">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isFavorite={!!favorites[product.id]}
                onFavoriteToggle={handleFavoriteToggle}
                onClick={() => {
                  navigate(`/product/${product.id}`);
                }}
                showVendorName={false}
              />
            ))}
          </div>
        ) : (
          <div className="flex justify-center items-center  w-full text-center">
            <p className="font-opensans text-xs text-gray-800">
              📭 <span className="">{vendor.shopName}</span> hasn't added any
              products to their online store yet. Check back soon for new items!
            </p>
          </div>
        )}
      </div>
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
            <p className="mb-6 text-xs font-opensans text-gray-800 ">
              You need to be logged in to follow this vendor to recieve notifications. Please log in to
              your account, or create a new account if you don’t have one, to
              continue.
            </p>
            <div className="flex space-x-16">
              <button
                onClick={() => {
                  navigate("/signup");
                  setIsLoginModalOpen(false);
                }}
                className="flex-1 bg-transparent py-2 text-customRichBrown font-medium text-xs font-opensans border-customRichBrown border-1 rounded-full"
              >
                Sign Up
              </button>
              <button
                onClick={() => {
                  navigate("/login");
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
};

export default MarketStorePage;
