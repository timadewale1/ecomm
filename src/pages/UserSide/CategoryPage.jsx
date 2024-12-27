import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth } from "../../firebase.config";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  setDoc,
  doc,
  deleteDoc,
  limit,
  startAfter,
} from "firebase/firestore";
import ProductCard from "../../components/Products/ProductCard";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

import { toast } from "react-toastify";
import { GoChevronLeft } from "react-icons/go";
import { FaStar, FaPlus, FaCheck } from "react-icons/fa";
import { CiSearch } from "react-icons/ci";
import { Cloudinary } from "@cloudinary/url-gen";
import { auto } from "@cloudinary/url-gen/actions/resize";
import { autoGravity } from "@cloudinary/url-gen/qualifiers/gravity";
import { AdvancedImage } from "@cloudinary/react";
import { onAuthStateChanged } from "firebase/auth";
import Typewriter from "typewriter-effect";
import { MdCancel } from "react-icons/md";

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
  const { category } = useParams();
  const navigate = useNavigate();

  // Data arrays
  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [filteredVendors, setFilteredVendors] = useState([]);

  // Pagination
  const [lastVisibleProduct, setLastVisibleProduct] = useState(null);
  const [lastVisibleVendor, setLastVisibleVendor] = useState(null);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  // Loading & user states
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // UI states
  const [followedVendors, setFollowedVendors] = useState({});
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isSticky, setIsSticky] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [noResults, setNoResults] = useState(false);

  // Cloudinary
  const cld = new Cloudinary({
    cloud: {
      cloudName: "dtaqusjav",
    },
  });

  // Monitor auth state
  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        fetchFollowedVendors(user.uid);
      } else {
        setCurrentUser(null);
        setFollowedVendors({});
      }
    });
  }, []);

  // Fetch which vendors the user follows
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

  // Slide through images every 5s
  useEffect(() => {
    const imageInterval = setInterval(() => {
      setCurrentImageIndex((prevIndex) =>
        prevIndex === imageSets[category]?.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000);

    return () => clearInterval(imageInterval);
  }, [category]);

  // Fetch initial data (vendors + products) by category
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      setVendors([]);
      setProducts([]);

      try {
        // Vendors
        const vendorsQuery = query(
          collection(db, "vendors"),
          where("categories", "array-contains", category),
          where("isApproved", "==", true),
          where("isDeactivated", "==", false),
          limit(25)
        );
        const vendorSnapshot = await getDocs(vendorsQuery);
        const vendorsList = vendorSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setVendors(vendorsList);
        setFilteredVendors(vendorsList);
        setLastVisibleVendor(
          vendorSnapshot.docs[vendorSnapshot.docs.length - 1]
        );

        // Products
        const productsQuery = query(
          collection(db, "products"),
          where("category", "==", category),
          where("isDeleted", "==", false),
          where("published", "==", true),
          limit(50)
        );
        const productSnapshot = await getDocs(productsQuery);
        const productsList = productSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProducts(productsList);
        setFilteredProducts(productsList);
        setLastVisibleProduct(
          productSnapshot.docs[productSnapshot.docs.length - 1]
        );
      } catch (error) {
        console.error("Error fetching initial products and vendors:", error);
        toast.error("Error fetching initial products and vendors.");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [category]);

  // Infinite scroll fetching more data
  const fetchMoreData = useCallback(async () => {
    if (isFetchingMore) return;
    setIsFetchingMore(true);

    const normalizedCategory =
      category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();

    try {
      // More vendors
      if (lastVisibleVendor) {
        const nextVendorsQuery = query(
          collection(db, "vendors"),
          where("categories", "array-contains", normalizedCategory),
          where("isApproved", "==", true),
          where("isDeactivated", "==", false),
          startAfter(lastVisibleVendor),
          limit(25)
        );
        const vendorSnapshot = await getDocs(nextVendorsQuery);
        const newVendors = vendorSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setVendors((prev) => [...prev, ...newVendors]);
        setFilteredVendors((prev) => [...prev, ...newVendors]);
        setLastVisibleVendor(
          vendorSnapshot.docs[vendorSnapshot.docs.length - 1]
        );
      }

      // More products
      if (lastVisibleProduct) {
        const nextProductsQuery = query(
          collection(db, "products"),
          where("category", "==", normalizedCategory),
          where("published", "==", true),
          where("isDeleted", "==", false),
          startAfter(lastVisibleProduct),
          limit(50)
        );
        const productSnapshot = await getDocs(nextProductsQuery);
        const newProducts = productSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProducts((prev) => [...prev, ...newProducts]);
        setFilteredProducts((prev) => [...prev, ...newProducts]);
        setLastVisibleProduct(
          productSnapshot.docs[productSnapshot.docs.length - 1]
        );
      }
    } catch (error) {
      toast.error("Error loading more data.");
    } finally {
      setIsFetchingMore(false);
    }
  }, [category, lastVisibleVendor, lastVisibleProduct, isFetchingMore]);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 200
      ) {
        fetchMoreData();
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [fetchMoreData]);

  // Sticky header effect
  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 100);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Additional vendor & product fetch if category changes
  useEffect(() => {
    const fetchVendorsAndProducts = async () => {
      setLoading(true);
      try {
        const normalizedCat =
          category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();

        // Vendors
        const vendorsQuery = query(
          collection(db, "vendors"),
          where("categories", "array-contains", normalizedCat),
          where("isApproved", "==", true),
          where("isDeactivated", "==", false)
        );
        const vendorSnapshot = await getDocs(vendorsQuery);
        const vendorsList = vendorSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setVendors(vendorsList);
        setFilteredVendors(vendorsList);

        // Products
        const productsQuery = query(
          collection(db, "products"),
          where("category", "==", normalizedCat),
          where("isDeleted", "==", false),
          where("published", "==", true)
        );
        const productSnapshot = await getDocs(productsQuery);
        const productsList = productSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProducts(productsList);
        setFilteredProducts(productsList);
      } catch (error) {
        toast.error("Error fetching products and vendors: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVendorsAndProducts();
  }, [category]);

  // Follow/unfollow logic
  const handleFollowClick = async (vendorId) => {
    try {
      if (!currentUser) {
        throw new Error("User is not logged in");
      }
      const followRef = doc(db, "follows", `${currentUser.uid}_${vendorId}`);

      if (!followedVendors[vendorId]) {
        await setDoc(followRef, {
          userId: currentUser.uid,
          vendorId,
          createdAt: new Date(),
        });
        toast.success("You will be notified of new products and promos.");
      } else {
        await deleteDoc(followRef);
        toast.success("Unfollowed the vendor.");
      }

      setFollowedVendors((prev) => ({
        ...prev,
        [vendorId]: !prev[vendorId],
      }));
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    }
  };

  const handleVendorClick = async (vendorId) => {
    try {
      const vendorRef = doc(db, "vendors", vendorId);
      const vendorDoc = await getDoc(vendorRef);

      if (vendorDoc.exists()) {
        const vendorData = vendorDoc.data();

        if (vendorData.marketPlaceType === "virtual") {
          navigate(`/store/${vendorId}`, { replace: false });
        } else if (vendorData.marketPlaceType === "marketplace") {
          navigate(`/marketstorepage/${vendorId}`, { replace: false });
        }
      } else {
        console.error("Vendor not found:", vendorId);
      }
    } catch (error) {
      console.error("Error fetching vendor data:", error);
    }
  };

  // Determine which image to show for slideshow
  const getCategoryStyles = (category) => {
    const currentImagePublicId = imageSets[category]?.[currentImageIndex];
    if (!currentImagePublicId) {
      return { text: "", cldImage: null };
    }

    const backgroundImageUrl = cld
      .image(currentImagePublicId)
      .format("auto")
      .quality("auto")
      .resize(auto().gravity(autoGravity()).width(1000).height(600));

    switch (category) {
      case "Mens":
        return {
          text: "Discover the Latest Men's Fashion",
          cldImage: backgroundImageUrl,
        };
      case "Womens":
        return {
          text: "Explore the Latest Women's Fashion",
          cldImage: backgroundImageUrl,
        };
      case "Kids":
        return {
          text: "Adorable Kids Collection",
          cldImage: backgroundImageUrl,
        };
      default:
        return { text: "", cldImage: null };
    }
  };

  const { text: headerText, cldImage } = getCategoryStyles(category);

  // Search
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

  // Render
  return (
    <div className="category-page mb-14">
      {/* Top Icons */}
      <div className="absolute top-0 z-10 w-full mt-2 flex justify-between p-2">
        {!isSearching ? (
          <>
            <button onClick={() => navigate(-1)}>
              <GoChevronLeft className="text-4xl text-white" />
            </button>
            <CiSearch
              className="text-3xl text-white"
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
        <div className="sticky top-0 z-20 w-full flex items-center py-2 px-2 h-20 opacity-95 bg-white shadow-md">
          <button onClick={() => navigate(-1)} className="p-1 rounded-full">
            <GoChevronLeft className="text-3xl" />
          </button>
          <div className="flex-grow text-xl font-opensans font-semibold">
            {category}
          </div>
        </div>
      )}

      {/* Hero / Slideshow */}
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
        {loading ? (
          // Show skeletons if loading
          <div className="flex flex-col space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} height={100} />
            ))}
          </div>
        ) : (
          // Display either content or "No results" / "Nothing in category"
          <>
            {noResults ? (
              <div className="flex items-center text-center flex-col justify-center mt-4">
                <h2 className="text-center text-lg font-opensans font-semibold text-black">
                  Ooops! No results found
                </h2>
                <p className="font-opensans text-gray-800 text-sm">
                  Try searching for another product or vendor.
                </p>
              </div>
            ) : (
              <>
                {/* 1. If we have no vendors & no products, show "Nothing in this category yet..." */}
                {filteredVendors.length === 0 &&
                filteredProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center mt-4">
                    <h2 className="text-center text-lg font-opensans font-semibold">
                      Nothing in this category yet
                    </h2>
                    <p className="font-opensans text-gray-800 text-sm">
                      Please check back later for updates.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* 2. Show Vendors (if any) */}
                    {filteredVendors.length > 0 && (
                      <>
                        <h2 className="text-lg font-opensans font-semibold mb-2 mt-4">
                          Top Vendors
                        </h2>
                        <div className="flex space-x-8 overflow-x-scroll">
                          {filteredVendors.map((vendor) => {
                            const avgRating =
                              vendor.ratingCount > 0
                                ? (vendor.rating / vendor.ratingCount).toFixed(
                                    1
                                  )
                                : 0;
                            return (
                              <div
                                key={vendor.id}
                                className="w-full min-w-[250px] max-w-[250px]"
                              >
                                <img
                                  src={
                                    vendor.coverImageUrl ||
                                    "https://images.saatchiart.com/saatchi/1750204/art/9767271/8830343-WUMLQQKS-7.jpg"
                                  }
                                  alt={vendor.shopName || "Vendor Image"}
                                  className="w-full h-36 object-cover rounded-md"
                                  onClick={() => handleVendorClick(vendor.id)}
                                />
                                <div className="flex justify-between items-center">
                                  <div
                                    onClick={() => handleVendorClick(vendor.id)}
                                  >
                                    <h3 className="mt-2 text-lg font-opensans font-medium">
                                      {vendor.shopName?.length > 12
                                        ? `${vendor.shopName.slice(0, 12)}...`
                                        : vendor.shopName}
                                    </h3>
                                    <div className="flex items-center font-opensans text-xs">
                                      <FaStar className="text-yellow-500 mr-1" />
                                      <span>{avgRating}</span>
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
                                    } mt-3 px-4 py-2 h-10 rounded-md`}
                                    onClick={() => handleFollowClick(vendor.id)}
                                  >
                                    {followedVendors[vendor.id] ? (
                                      <div className="flex">
                                        <h2 className="text-xs font-opensans">
                                          Followed
                                        </h2>
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
                            );
                          })}
                        </div>
                      </>
                    )}

                    {/* 3. Show Products (if any) */}
                    {filteredProducts.length > 0 && (
                      <div className="mt-6">
                        <h2 className="text-lg font-opensans font-semibold mb-2">
                          Explore Products
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                          {filteredProducts.map((product) => (
                            <ProductCard key={product.id} product={product} />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CategoryPage;
