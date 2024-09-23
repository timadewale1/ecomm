import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth } from "../../firebase.config";
import {
  collection,
  query,
  where,
  getDocs,
  setDoc,
  doc,
  deleteDoc,
  limit,
  startAfter,
} from "firebase/firestore";
import ProductCard from "../../components/Products/ProductCard";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

import { useCallback } from "react";
import { toast } from "react-toastify";
import { GoChevronLeft } from "react-icons/go";
import { FaStar, FaPlus, FaCheck } from "react-icons/fa";
import { CiSearch } from "react-icons/ci";
import { Cloudinary } from "@cloudinary/url-gen";
import { auto } from "@cloudinary/url-gen/actions/resize";
import { autoGravity } from "@cloudinary/url-gen/qualifiers/gravity";
import { AdvancedImage } from "@cloudinary/react";
import { onAuthStateChanged } from "firebase/auth";
import Typewriter from "typewriter-effect"; // Import Typewriter

// Cloudinary public IDs for images
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
  const { category } = useParams(); // The category selected (Mens, Womens, etc.)
  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState([]); // To fetch the vendors in this category
  const [loading, setLoading] = useState(true);
  const [lastVisibleProduct, setLastVisibleProduct] = useState(null); // Tracks last fetched product
  const [lastVisibleVendor, setLastVisibleVendor] = useState(null); // Tracks last fetched vendor
  const [isFetchingMore, setIsFetchingMore] = useState(false); // Prevents multiple fetches at once

  const [currentImageIndex, setCurrentImageIndex] = useState(0); // For slideshow
  const navigate = useNavigate();
  const [followedVendors, setFollowedVendors] = useState({}); // For followed vendors
  const [isSticky, setIsSticky] = useState(false);
  const [currentUser, setCurrentUser] = useState(null); // For current user
  const [isSearching, setIsSearching] = useState(false); // For search input visibility
  const [searchTerm, setSearchTerm] = useState(""); // For search term
  const [filteredVendors, setFilteredVendors] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [noResults, setNoResults] = useState(false);

  // Initialize Cloudinary instance
  const cld = new Cloudinary({
    cloud: {
      cloudName: "dtaqusjav", // Replace with your cloud name
    },
  });

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        fetchFollowedVendors(user.uid); // Fetch followed vendors on user login
      } else {
        setCurrentUser(null);
        setFollowedVendors({}); // Reset followed vendors if no user
      }
    });
  }, []);

  // Fetch followed vendors from Firestore when the page loads
  const fetchFollowedVendors = async (userId) => {
    try {
      const followsQuery = query(
        collection(db, "follows"),
        where("userId", "==", userId)
      );
      const followSnapshot = await getDocs(followsQuery);

      const followedVendorsMap = {};
      followSnapshot.forEach((doc) => {
        followedVendorsMap[doc.data().vendorId] = true; // Mark vendor as followed
      });

      setFollowedVendors(followedVendorsMap);
    } catch (error) {
      console.error("Error fetching followed vendors:", error);
      toast.error("Error fetching followed vendors.");
    }
  };

  // Slideshow effect
  useEffect(() => {
    const imageInterval = setInterval(() => {
      setCurrentImageIndex((prevIndex) =>
        prevIndex === imageSets[category]?.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(imageInterval); // Cleanup on unmount
  }, [category]);

  useEffect(() => {
    const fetchInitialData = async () => {
      // Clear the current products and vendors
      setProducts([]);
      setVendors([]);
      setLoading(true); // Set loading to true during data fetch
  
      // Check if data is available in localStorage for this category
      const savedProducts = JSON.parse(localStorage.getItem(`${category}_products`) || '[]');
      const savedVendors = JSON.parse(localStorage.getItem(`${category}_vendors`) || '[]');
  
      if (savedProducts.length > 0 && savedVendors.length > 0) {
        // If data exists in localStorage, use it
        setProducts(savedProducts);
        setVendors(savedVendors);
        setFilteredProducts(savedProducts);
        setFilteredVendors(savedVendors);
        setLoading(false);
        return;
      }
  
      // If no data in localStorage, fetch from Firestore
      try {
        const normalizedCategory = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
  
        // Fetch first 25 vendors
        const vendorsQuery = query(
          collection(db, "vendors"),
          where("categories", "array-contains", normalizedCategory),
          where("isApproved", "==", true),
          where("isDeactivated", "==", false),
          limit(25) // Fetch only 25 vendors
        );
        const vendorSnapshot = await getDocs(vendorsQuery);
        const vendorsList = vendorSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setVendors(vendorsList);
        setFilteredVendors(vendorsList);
        setLastVisibleVendor(vendorSnapshot.docs[vendorSnapshot.docs.length - 1]); // Track last vendor
  
        // Save vendors to localStorage
        localStorage.setItem(`${category}_vendors`, JSON.stringify(vendorsList));
  
        // Fetch first 50 products
        const productsQuery = query(
          collection(db, "products"),
          where("category", "==", normalizedCategory),
          limit(50) // Fetch only 50 products
        );
        const productSnapshot = await getDocs(productsQuery);
        const productsList = productSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setProducts(productsList);
        setFilteredProducts(productsList);
        setLastVisibleProduct(productSnapshot.docs[productSnapshot.docs.length - 1]); // Track last product
  
        // Save products to localStorage
        localStorage.setItem(`${category}_products`, JSON.stringify(productsList));
      } catch (error) {
        toast.error("Error fetching initial products and vendors.");
      } finally {
        setLoading(false); // Set loading to false after data is fetched
      }
    };
  
    fetchInitialData();
  }, [category]); // Dependencies ensure it only runs when category changes
  

 

  const fetchMoreData = useCallback(async () => {
    if (isFetchingMore) return; // Prevent multiple fetches at once
    setIsFetchingMore(true);

    const normalizedCategory =
      category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();

    try {
      // Fetch next 25 vendors if there are more
      if (lastVisibleVendor) {
        const nextVendorsQuery = query(
          collection(db, "vendors"),
          where("categories", "array-contains", normalizedCategory),
          where("isApproved", "==", true),
          where("isDeactivated", "==", false),
          startAfter(lastVisibleVendor), // Start after the last fetched vendor
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
        ); // Track last vendor
      }

      // Fetch next 50 products if there are more
      if (lastVisibleProduct) {
        const nextProductsQuery = query(
          collection(db, "products"),
          where("category", "==", normalizedCategory),
          startAfter(lastVisibleProduct), // Start after the last fetched product
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
        ); // Track last product
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
        fetchMoreData(); // Trigger fetching more data
      }
    };
    window.addEventListener("scroll", handleScroll); // Attach the scroll listener
    return () => window.removeEventListener("scroll", handleScroll); // Cleanup listener
  }, [fetchMoreData]);

  // Fetch vendors and products based on category
  useEffect(() => {
    const fetchVendorsAndProducts = async () => {
      try {
        console.log(`Fetching vendors and products for category: ${category}`);

        // Normalize the category for case consistency
        const normalizedCategory =
          category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();

        // Query vendors matching the normalized category
        const vendorsQuery = query(
          collection(db, "vendors"),
          where("categories", "array-contains", normalizedCategory),
          where("isApproved", "==", true),
          where("isDeactivated", "==", false)
        );

        const vendorSnapshot = await getDocs(vendorsQuery);

        const vendorsList = vendorSnapshot.docs.map((vendorDoc) => ({
          id: vendorDoc.id,
          ...vendorDoc.data(),
        }));

        setVendors(vendorsList);
        setFilteredVendors(vendorsList); // Initialize filtered vendors

        // Now fetch products from the centralized "products" collection
        const productsQuery = query(
          collection(db, "products"),
          where("category", "==", normalizedCategory)
        );

        const productsSnapshot = await getDocs(productsQuery);
        const productsList = productsSnapshot.docs.map((productDoc) => ({
          id: productDoc.id,
          ...productDoc.data(),
        }));

        setProducts(productsList); // Set products for the category
        setFilteredProducts(productsList); // Initialize filtered products
      } catch (error) {
        console.error("Error fetching products and vendors:", error);
        toast.error("Error fetching products and vendors: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVendorsAndProducts();
  }, [category]);

  // Handle Follow/Unfollow
  const handleFollowClick = async (vendorId) => {
    try {
      if (!currentUser) {
        throw new Error("User is not logged in");
      }

      const followRef = doc(db, "follows", `${currentUser.uid}_${vendorId}`);

      if (!followedVendors[vendorId]) {
        // Follow vendor
        await setDoc(followRef, {
          userId: currentUser.uid,
          vendorId,
          createdAt: new Date(),
        });
        toast.success("You will be notified of new products and promos.");
      } else {
        // Unfollow vendor
        await deleteDoc(followRef);
        toast.success("Unfollowed the vendor.");
      }

      // Toggle the follow state dynamically
      setFollowedVendors((prev) => ({
        ...prev,
        [vendorId]: !prev[vendorId],
      }));
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    }
  };

  // Navigate to vendor store page
  const handleVendorClick = (vendorId) => {
    navigate(`/store/${vendorId}`, { replace: false });
  };
  

  // Dynamic header styles based on category and slideshow image
  const getCategoryStyles = (category) => {
    const currentImagePublicId = imageSets[category]?.[currentImageIndex];

    if (!currentImagePublicId) {
      return { text: "", cldImage: null }; // Return default if no image is found
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

  // Sticky header with back and search icons (visible on scroll)
  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 100); // Show sticky header after scrolling down
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle Search Input Change
  const handleSearchChange = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);

    const filteredVendors = vendors.filter((vendor) =>
      vendor.shopName.toLowerCase().includes(term)
    );
    const filteredProducts = products.filter((product) =>
      product.name.toLowerCase().includes(term)
    );

    setNoResults(filteredVendors.length === 0 && filteredProducts.length === 0);
    setFilteredVendors(filteredVendors);
    setFilteredProducts(filteredProducts);
  };

  // Clear search state and reset search box
  const resetSearch = () => {
    setSearchTerm("");
    setIsSearching(false);
    setNoResults(false);
    setFilteredVendors(vendors);
    setFilteredProducts(products);
  };

  return (
    <div className="category-page mb-14">
      <div className="absolute top-0 z-10 w-full mt-2 flex justify-between p-2">
        {!isSearching ? (
          <>
            <button onClick={() => navigate(-1)} className="">
              <GoChevronLeft className="text-4xl text-white" />
            </button>
            <CiSearch
              className="text-3xl text-white"
              onClick={() => setIsSearching(true)}
            />
          </>
        ) : (
          <>
            <GoChevronLeft
              className="text-3xl text-white cursor-pointer mr-2"
              onClick={resetSearch}
            />
            <input
              type="text"
              className="w-full px-3 py-2 text-sm rounded-full focus:outline-none"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </>
        )}
      </div>

      {isSticky && !isSearching && (
        <div className="sticky top-0 z-20 w-full flex items-center py-2 px-2  h-20 opacity-95 bg-white shadow-md">
          <button onClick={() => navigate(-1)} className="p-1 rounded-full">
            <GoChevronLeft className="text-3xl" />
          </button>
          <div className="flex-grow text-center text-xl font-opensans font-semibold">
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

      <div className="p-3">
        {noResults ? (
          <h2 className="text-center text-lg font-semibold text-gray-500">
            No results found
          </h2>
        ) : (
          <>
            {filteredVendors.length > 0 && (
              <>
                <h2 className="text-lg font-opensans font-semibold mb-2">
                  Top Vendors
                </h2>
                <div className="flex space-x-8 overflow-x-scroll">
                  {loading
                    ? Array.from({ length: 3 }).map((_, index) => (
                        <Skeleton key={index} width={200} height={150} />
                      ))
                    : filteredVendors.map((vendor) => {
                        const averageRating =
                          vendor.ratingCount > 0
                            ? (vendor.rating / vendor.ratingCount).toFixed(1)
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
                              <div onClick={() => handleVendorClick(vendor.id)}>
                                <h3 className="mt-2 text-lg font-opensans font-medium">
                                  {vendor.shopName?.length > 12
                                    ? `${vendor.shopName.slice(0, 12)}...`
                                    : vendor.shopName}
                                </h3>
                                <div className="flex items-center text-xs">
                                  <FaStar className="text-yellow-500 mr-1" />
                                  <span>{averageRating}</span>
                                  <span className="ml-1">
                                    ({vendor.ratingCount})
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
                                  <>
                                    <div className="flex">
                                      <h2 className="text-xs">Followed</h2>
                                      <FaCheck className="ml-2 mt-0.5 text-xs" />
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="flex">
                                      <h2 className="text-xs font-medium">
                                        Follow
                                      </h2>
                                      <FaPlus className="ml-2 text-xs mt-0.5" />
                                    </div>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                </div>
              </>
            )}

            {filteredProducts.length > 0 && (
              <div className="">
                <h2 className="text-lg font-opensans mt-4 font-semibold mb-2">
                  Explore Products
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {loading
                    ? Array.from({ length: 6 }).map((_, index) => (
                        <Skeleton key={index} height={200} width="100%" />
                      ))
                    : filteredProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CategoryPage;
