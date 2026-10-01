// src/components/CategoryPage.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCategorySection,
  resetCategorySection,
} from "../../redux/reducers/catsection";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db } from "../../firebase.config";
import toast from "react-hot-toast";
import ProductCard from "../../components/Products/ProductCard";
import { GoChevronLeft } from "react-icons/go";
import { setVendorFollowState } from "../../services/vendorFollow";
import { RotatingLines } from "react-loader-spinner";
import SEO from "../../components/Helmet/SEO";
import { MdCancel } from "react-icons/md";
import { useAuth } from "../../custom-hooks/useAuth";
import Typewriter from "typewriter-effect";
import { AdvancedImage } from "@cloudinary/react";
import { Cloudinary } from "@cloudinary/url-gen";
import { auto } from "@cloudinary/url-gen/actions/resize";
import { autoGravity } from "@cloudinary/url-gen/qualifiers/gravity";
import { CiSearch } from "react-icons/ci";
import { FaCheck, FaPlus, FaStar } from "react-icons/fa";
import { auth } from "../../firebase.config";
import AppBackButton from "../../components/layout/AppBackButton";
import LoginRequiredSheet from "../../components/PwaModals/LoginRequiredSheet";
import { rememberAuthIntent } from "../../services/authIntent";
import useAuthContinuation from "../../custom-hooks/useAuthContinuation";
// Cloudinary config
const cld = new Cloudinary({
  cloud: {
    cloudName: "dtaqusjav",
  },
});

// Example image sets per category (adjust as needed)
const imageSets = {
  Mens: [
    "person-happy-american-african-business_osy8q7",
    "handsome-surprised-man-with-beard-choosing-shirt-shop_1_nlw6ok",
  ],
  Womens: [
    "darkskinned-woman-denim-outfit-looking-camera-pink-background-portrait-curly-girl-green-tee-smiling-isolated-backdrop_yof3qe",
    "charming-woman-boho-suit-lilac-glasses-jumps-happily-portrait-curly-brunette-girl-beige-jacket-dancing-purple-backdrop_mgtlgi",
  ],
  Kids: [
    "medium-shot-smiley-kids-outdoors_lpgzdw",
    "black-girl-wearing-casual-t-shirt_l3rpel",
  ],
};

const CategoryPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [pendingFollowVendorId, setPendingFollowVendorId] = useState(null);
  // Assume category is provided via URL param or location.state (defaulting to "Mens")
  const { category: paramCategory } = useParams();
  const category = paramCategory || "Mens"; // fallback if no param

  console.log("[CategoryPage] Current category:", category);
  const { currentUser } = useAuth();
  // Retrieve cached data for this category from Redux
  const categoryData = useSelector(
    (state) => state.catsection.data[category]
  ) || {
    vendors: [],
    products: [],
    lastVisibleProduct: null,
    noMoreProducts: false,
    loading: false,
    error: null,
  };
  const {
    vendors,
    products,
    lastVisibleProduct,
    noMoreProducts,
    loading,
    error,
  } = categoryData;
  console.log("[CategoryPage] Category data:", categoryData);

  // Local state for search
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredProducts, setFilteredProducts] = useState(products);
  const [filteredVendors, setFilteredVendors] = useState(vendors);
  const [noResults, setNoResults] = useState(false);

  const [isSearching, setIsSearching] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  // Hero image slideshow
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const getCategoryStyles = (category) => {
    const currentImagePublicId = imageSets[category]?.[currentImageIndex];
    if (!currentImagePublicId) return { text: "", cldImage: null };
    const cldImage = cld
      .image(currentImagePublicId)
      .format("auto")
      .quality("auto")
      .resize(auto().gravity(autoGravity()).width(1200).height(600));
    let headerText = "";
    switch (category) {
      case "Mens":
        headerText = "Discover the Latest Men's Fashion";
        break;
      case "Womens":
        headerText = "Explore the Latest Women's Fashion";
        break;
      case "Kids":
        headerText = "Adorable Kids Collection";
        break;
      default:
        headerText = "Explore Our Collection";
    }
    return { text: headerText, cldImage };
  };

  const { text: headerText, cldImage } = getCategoryStyles(category);

  // Caching: Only fetch if there are no products cached for this category.
  useEffect(() => {
    if (!products.length) {
      console.log(
        "[CategoryPage] No cached products for",
        category,
        ", fetching..."
      );
      // Optionally, you can reset here if you want to clear outdated data:
      // dispatch(resetCategorySection(category));
      dispatch(fetchCategorySection({ category, loadMore: false }));
    } else {
      console.log("[CategoryPage] Using cached products for", category);
    }
  }, [category, products.length, dispatch]);
  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 100);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  // Infinite scroll for products
  const fetchMoreProducts = useCallback(() => {
    if (!loading && !noMoreProducts) {
      console.log("[CategoryPage] Fetching more products for", category);
      dispatch(fetchCategorySection({ category, loadMore: true }));
    }
  }, [dispatch, category, loading, noMoreProducts]);
  const [followedVendors, setFollowedVendors] = useState({});
  const pendingFollowsRef = useRef(new Set());

  const fetchFollowedVendors = async (userId) => {
    try {
      const followsQuery = query(
        collection(db, "follows"),
        where("userId", "==", userId)
      );
      const followSnapshot = await getDocs(followsQuery);
      const followedMap = {};
      followSnapshot.forEach((doc) => {
        followedMap[doc.data().vendorId] = true;
      });
      setFollowedVendors(followedMap);
    } catch (error) {
      console.error("Error fetching followed vendors:", error);
      toast.error("Error fetching followed vendors.");
    }
  };

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchFollowedVendors(user.uid);
      } else {
        setFollowedVendors({});
      }
    });
  }, []);

  const handleFollowClick = async (vendorId) => {
    if (!currentUser) {
      setPendingFollowVendorId(vendorId);
      setIsLoginModalOpen(true);
      return;
    }

    if (pendingFollowsRef.current.has(vendorId)) return;

    // Determine the new follow state optimistically
    const newFollowState = !followedVendors[vendorId];
    pendingFollowsRef.current.add(vendorId);

    // Update the UI immediately (optimistic update)
    setFollowedVendors((prev) => ({
      ...prev,
      [vendorId]: newFollowState,
    }));

    try {
      const result = await setVendorFollowState({
        userId: currentUser.uid,
        vendorId,
        shouldFollow: newFollowState,
      });
      setFollowedVendors((prev) => ({
        ...prev,
        [vendorId]: result.followed,
      }));

      if (result.followed) {
        toast.success("You will be notified of new products and promos.");
      } else {
        toast.success("Unfollowed.");
      }
    } catch (error) {
      // If there's an error, revert the optimistic update
      setFollowedVendors((prev) => ({
        ...prev,
        [vendorId]: !newFollowState,
      }));
      toast.error(`Error: ${error.message}`);
    } finally {
      pendingFollowsRef.current.delete(vendorId);
    }
  };

  useAuthContinuation({ types: "follow-vendor", run: async (intent, user) => {
    const vendorId = intent?.payload?.vendorId;
    if (!vendorId || pendingFollowsRef.current.has(vendorId)) return;
    pendingFollowsRef.current.add(vendorId);
    setFollowedVendors((current) => ({...current, [vendorId]: true}));
    return setVendorFollowState({
      userId: user.uid,
      vendorId,
      shouldFollow: true,
    })
      .then((result) => {
        setFollowedVendors((current) => ({...current, [vendorId]: result.followed}));
        return true;
      })
      .catch((error) => {
        setFollowedVendors((current) => ({...current, [vendorId]: false}));
        toast.error(error.message || "Could not follow this vendor.");
      })
      .finally(() => pendingFollowsRef.current.delete(vendorId));
  } });

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 200
      ) {
        fetchMoreProducts();
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [fetchMoreProducts]);

  // Update filtered products when products or searchTerm changes
  useEffect(() => {
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      const filtered = products.filter((p) =>
        p.name.toLowerCase().includes(lower)
      );
      setFilteredProducts(filtered);
      setNoResults(filtered.length === 0);
    } else {
      setFilteredProducts(products);
      setNoResults(false);
    }
  }, [searchTerm, products]);

  // Update filtered vendors similarly (if needed)
  useEffect(() => {
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      const filtered = vendors.filter((v) =>
        v.shopName.toLowerCase().includes(lower)
      );
      setFilteredVendors(filtered);
    } else {
      setFilteredVendors(vendors);
    }
  }, [searchTerm, vendors]);

  // Sticky header
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollPosition, setLastScrollPosition] = useState(0);
  useEffect(() => {
    const handleSticky = () => {
      const currentScroll = window.scrollY;
      setShowHeader(currentScroll < 100);
      setLastScrollPosition(currentScroll);
    };
    window.addEventListener("scroll", handleSticky);
    return () => window.removeEventListener("scroll", handleSticky);
  }, []);

  // Hero image slideshow
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) =>
        prev === (imageSets[category]?.length || 1) - 1 ? 0 : prev + 1
      );
    }, 5000);
    return () => clearInterval(interval);
  }, [category]);

  const handleSearchChange = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);

    const vendMatches = vendors.filter((v) =>
      v.shopName.toLowerCase().includes(term)
    );
    const prodMatches = products.filter((p) =>
      p.name.toLowerCase().includes(term)
    );

    setFilteredVendors(vendMatches);
    setFilteredProducts(prodMatches);
    setNoResults(vendMatches.length === 0 && prodMatches.length === 0);
  };

  const resetSearch = () => {
    setSearchTerm("");
    setIsSearching(false);
    setNoResults(false);
    setFilteredVendors(vendors);
    setFilteredProducts(products);
  };

  return (
    <>
      <SEO
        title={`Shop ${category} | My Thrift`}
        description={`Explore ${category} products on My Thrift`}
        url={`https://www.shopmythrift.store/category/${category}`}
      />
      <div className="mb-14">
        {/* Hero / Slideshow */}

        {/* Top Icons / Search Bar */}
        <div className="absolute top-0 z-10 w-full mt-2 flex justify-between p-2">
          {!isSearching ? (
            <>
              <AppBackButton
                onClick={() => navigate(-1)}
                variant="overlay"
                fixed
                scrolled={isSticky}
              />
              <CiSearch
                className="ml-auto text-3xl text-white"
                onClick={() => setIsSearching(true)}
              />
            </>
          ) : (
            <div className="flex items-center w-full relative">
              <GoChevronLeft
                className="text-3xl text-white cursor-pointer mr-2"
                onClick={resetSearch}
              />
              <div className="relative w-full">
                <input
                  type="text"
                  className="w-full px-3 font-opensans text-black text-sm py-2 rounded-full focus:outline-none pr-8"
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
                {searchTerm && (
                  <MdCancel
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xl text-gray-400 cursor-pointer"
                    onClick={() => setSearchTerm("")}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sticky header */}
        {isSticky && !isSearching && (
          <div className="sticky top-0 z-20 w-full flex items-center py-2 pl-16 pr-2 h-20 opacity-95 bg-white">
            <div className="flex-grow text-xl font-opensans font-semibold">
              {category}
            </div>
          </div>
        )}
        <div className="relative h-64 rounded-b-lg w-full">
          {cldImage && (
            <AdvancedImage
              cldImg={cldImage}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-black bg-opacity-50 flex justify-center items-center">
            <h1 className="text-white text-3xl text-center px-8 font-poppins">
              <Typewriter
                options={{
                  strings: [headerText],
                  autoStart: true,
                  loop: true,
                  delay: 75,
                }}
              />
            </h1>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-3">
          {/* Vendors Section */}
          {filteredVendors.length > 0 && (
            <>
              <h2 className="text-lg font-opensans font-semibold mb-2 mt-4">
                Top Vendors
              </h2>
              <div className="flex space-x-8 overflow-x-scroll">
                {filteredVendors.map((vendor) => (
                  <div
                    key={vendor.id}
                    className="w-full min-w-[250px] max-w-[250px] cursor-pointer"
                    onClick={() => navigate(`/store/${vendor.id}`)}
                  >
                    <img
                      src={
                        vendor.coverImageUrl ||
                        "https://images.saatchiart.com/saatchi/1750204/art/9767271/8830343-WUMLQQKS-7.jpg"
                      }
                      alt={vendor.shopName || "Vendor Image"}
                      className="w-full h-36 object-cover rounded-md"
                    />
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="mt-2 text-lg font-opensans font-medium">
                          {vendor.shopName?.length > 12
                            ? `${vendor.shopName.slice(0, 12)}...`
                            : vendor.shopName}
                        </h3>
                        <div className="flex items-center font-opensans text-xs">
                          <FaStar className="text-yellow-500 mr-1" />
                          <span>
                            {vendor.ratingCount > 0
                              ? (vendor.rating / vendor.ratingCount).toFixed(1)
                              : 0}
                          </span>
                          <span className="ml-1">
                            ({vendor.ratingCount || 0})
                          </span>
                        </div>
                      </div>
                      <button
                        className={`flex justify-center items-center w-24 h-9 text-sm ${
                          followedVendors[vendor.id]
                            ? "bg-customOrange text-white border-transparent"
                            : "bg-transparent text-black border border-black"
                        } mt-3 px-4 py-2 rounded-md`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFollowClick(vendor.id);
                        }}
                      >
                        {followedVendors[vendor.id] ? (
                          <div className="flex">
                            <h2 className="text-xs font-opensans">Followed</h2>
                            <FaCheck className="ml-2 mt-0.5 text-xs" />
                          </div>
                        ) : (
                          <div className="flex">
                            <h2 className="text-xs font-opensans font-medium">
                              Follow
                            </h2>
                            <FaPlus className="ml-2 text-xs mt-0.5" />
                          </div>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Products Section */}
          {filteredProducts.length > 0 ? (
            <>
              <h2 className="text-lg font-opensans font-semibold mb-2 mt-4">
                Explore Products
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </>
          ) : (
            !loading &&
            !noResults && (
              <div className="flex flex-col items-center justify-center mt-4">
                <h2 className="text-center text-lg font-opensans font-semibold">
                  Nothing in this category yet
                </h2>
                <p className="font-opensans text-gray-800 text-sm">
                  Please check back later for updates.
                </p>
              </div>
            )
          )}

          {/* Loading Spinner */}
          {loading && (
            <div className="flex justify-center my-4">
              <RotatingLines
                strokeColor="#f9531e"
                strokeWidth="5"
                animationDuration="0.75"
                width="20"
                visible={true}
              />
            </div>
          )}

          {/* Optional: Error display */}
          {error && (
            <p className="text-red-600 font-semibold mt-4 text-center">
              {error}
            </p>
          )}
        </div>
        <LoginRequiredSheet
          open={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          title="Let’s set you up to follow"
          description="Sign in to follow this vendor and receive their updates, or create an account to continue."
          onSignUp={() => {
            try { rememberAuthIntent({
              type: "follow-vendor",
              returnTo: `${location.pathname}${location.search}`,
              payload: {vendorId: pendingFollowVendorId},
            }); } catch { toast.error("Allow site storage to continue signing in."); return; }
            navigate("/signup", { state: { from: `${location.pathname}${location.search}` } });
            setIsLoginModalOpen(false);
          }}
          onLogin={() => {
            try { rememberAuthIntent({
              type: "follow-vendor",
              returnTo: `${location.pathname}${location.search}`,
              payload: {vendorId: pendingFollowVendorId},
            }); } catch { toast.error("Allow site storage to continue signing in."); return; }
            navigate("/login", { state: { from: `${location.pathname}${location.search}` } });
            setIsLoginModalOpen(false);
          }}
        />
      </div>
    </>
  );
};

export default CategoryPage;
