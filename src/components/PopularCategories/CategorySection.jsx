import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { query, collection, where, orderBy, limit, startAfter, getDocs } from "firebase/firestore";
import { db } from "../../firebase.config";
import ProductCard from "../Products/ProductCard";
import { GoChevronLeft } from "react-icons/go";
import { RotatingLines } from "react-loader-spinner";
import SEO from "../Helmet/SEO";

const CategoryProducts = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { products: initialProducts } = location.state || {}; // Initial products passed from PopularCats
  const [products, setProducts] = useState([]); // Products to render
  const [lastVisible, setLastVisible] = useState(null); // Tracks the last document in the current batch
  const [loading, setLoading] = useState(false); // Loading state
  const [noMoreProducts, setNoMoreProducts] = useState(false); // Indicates if all products have been fetched
  const productType = initialProducts?.[0]?.productType || "Products";

  const BATCH_SIZE_INCREMENT = 5; // Initial batch size

  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollPosition, setLastScrollPosition] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollPosition = window.scrollY;

      if (currentScrollPosition > lastScrollPosition) {
        // User is scrolling down
        setShowHeader(false);
      } else {
        // User is scrolling up
        setShowHeader(true);
      }

      setLastScrollPosition(currentScrollPosition);

      // Check if the user has scrolled near the bottom
      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 100
      ) {
        fetchMoreProducts(); // Fetch more products when scrolling near the bottom
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [lastScrollPosition]);

  useEffect(() => {
    fetchInitialProducts();
  }, []);

  const fetchInitialProducts = async () => {
    setLoading(true);
    try {
      const productsRef = collection(db, "products");
      const q = query(
        productsRef,
        where("productType", "==", productType),
        orderBy("createdAt", "desc"),
        limit(BATCH_SIZE_INCREMENT)
      );
      const snapshot = await getDocs(q);

      const fetchedProducts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setProducts(fetchedProducts);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1]); // Track the last document

      if (snapshot.docs.length < BATCH_SIZE_INCREMENT) {
        setNoMoreProducts(true); // No more products to fetch
      }
    } catch (error) {
      console.error("Error fetching initial products:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMoreProducts = async () => {
    if (loading || noMoreProducts || !lastVisible) return;

    setLoading(true);
    try {
      const productsRef = collection(db, "products");
      const q = query(
        productsRef,
        where("productType", "==", productType),
        orderBy("createdAt", "desc"),
        startAfter(lastVisible), // Start fetching after the last document in the current batch
        limit(BATCH_SIZE_INCREMENT + products.length) // Increase batch size dynamically
      );

      const snapshot = await getDocs(q);

      const fetchedProducts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setProducts((prevProducts) => [...prevProducts, ...fetchedProducts]); // Append new products
      setLastVisible(snapshot.docs[snapshot.docs.length - 1]); // Update the last document

      if (snapshot.docs.length < BATCH_SIZE_INCREMENT) {
        setNoMoreProducts(true); // No more products to fetch
      }
    } catch (error) {
      console.error("Error fetching more products:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <SEO 
        title={`Shop ${productType} | ShopMyThrift`} 
        description={`Shop ${productType} on ShopMyThrift`}
        url={`https://www.shopmythrift.store/producttype/${productType}`} 
      />
    <div className="px-4 py-6">
      {/* Sticky Header */}
      <div
        className={`fixed top-0 left-0 w-full bg-white z-10 px-2 py-6 shadow-md transition-transform duration-300 ${
          showHeader ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="flex items-center">
          <GoChevronLeft
            className="text-2xl cursor-pointer mr-2"
            onClick={() => navigate(-1)} // Navigate back to the previous page
          />
          <h2 className="text-lg font-opensans font-semibold">
            {productType}
          </h2>
        </div>
      </div>

      {/* Product Grid */}
      <div className="pt-16 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

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

      
    </div>
    </>
  );
};

export default CategoryProducts;
