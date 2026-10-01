import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import ProductCard from "../../components/Products/ProductCard";
import { FiSearch } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import SEO from "../../components/Helmet/SEO";
import "./favorites.css";
import AppPageHeader from "../../components/layout/AppPageHeader";
import { appHaptics } from "../../services/haptics";
import { useFavorites } from "../../components/Context/FavoritesContext";
import {
  refreshFavoriteProducts,
  selectFavoriteIds,
  selectFavoriteProducts,
  selectFavoritesCloudError,
  selectFavoritesCloudHydrated,
  selectFavoritesCloudStatus,
  selectFavoritesError,
  selectFavoritesStatus,
} from "../../redux/reducers/favoritesSlice";

const FAVORITES_REVEAL_COUNT = 4;

const FavoritesSkeleton = () => (
  <section
    className="favorites-grid favorites-skeleton-grid"
    aria-label="Loading favourite products"
    aria-busy="true"
  >
    {Array.from({ length: 6 }).map((_, index) => (
      <div className="favorites-skeleton-card" key={index} aria-hidden="true">
        <span className="favorites-skeleton-block is-image" />
        <span className="favorites-skeleton-block is-title" />
        <span className="favorites-skeleton-block is-price" />
      </div>
    ))}
  </section>
);

const FavoritesPage = () => {
  const dispatch = useDispatch();
  const favoriteIds = useSelector(selectFavoriteIds);
  const favoriteProducts = useSelector(selectFavoriteProducts);
  const favoritesStatus = useSelector(selectFavoritesStatus);
  const favoritesError = useSelector(selectFavoritesError);
  const favoritesCloudStatus = useSelector(selectFavoritesCloudStatus);
  const favoritesCloudHydrated = useSelector(selectFavoritesCloudHydrated);
  const favoritesCloudError = useSelector(selectFavoritesCloudError);
  const { retryCloudSync } = useFavorites();
  const hadCachedProductsOnMountRef = useRef(favoriteProducts.length > 0);
  const initialRevealCompleteRef = useRef(favoriteProducts.length > 0);
  const shownErrorRef = useRef(null);
  const [visibleCount, setVisibleCount] = useState(favoriteProducts.length);
  const navigate = useNavigate();

  useEffect(() => {
    if (favoriteIds.length > 0) {
      dispatch(refreshFavoriteProducts());
    }
  }, [dispatch, favoriteIds]);

  useEffect(() => {
    if (!favoritesError || favoritesError === shownErrorRef.current) return;
    shownErrorRef.current = favoritesError;

    // Cached products remain usable if a silent refresh fails.
    if (favoriteProducts.length > 0) {
      toast.error("Could not refresh favourites. Showing saved products.");
    }
  }, [favoritesError, favoriteProducts.length]);

  useEffect(() => {
    const isInitialLoading =
      favoriteIds.length > 0 &&
      favoriteProducts.length === 0 &&
      (favoritesStatus === "idle" || favoritesStatus === "loading");
    if (isInitialLoading) return;

    if (favoriteProducts.length === 0) {
      setVisibleCount(0);
      return;
    }

    if (
      initialRevealCompleteRef.current ||
      hadCachedProductsOnMountRef.current
    ) {
      setVisibleCount(favoriteProducts.length);
      return;
    }

    initialRevealCompleteRef.current = true;
    const staggeredCount = Math.min(
      FAVORITES_REVEAL_COUNT,
      favoriteProducts.length
    );
    const timers = [];
    setVisibleCount(1);
    appHaptics.selection();

    for (let index = 2; index <= staggeredCount; index += 1) {
      timers.push(
        window.setTimeout(() => {
          setVisibleCount(index);
          appHaptics.selection();

          if (index === staggeredCount) {
            setVisibleCount(favoriteProducts.length);
          }
        }, (index - 1) * 110)
      );
    }

    if (staggeredCount === 1) {
      setVisibleCount(favoriteProducts.length);
    }

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [favoriteIds.length, favoriteProducts.length, favoritesStatus]);

  const showInitialSkeleton =
    (!favoritesCloudHydrated &&
      favoritesCloudStatus === "connecting" &&
      favoriteProducts.length === 0) ||
    (favoriteIds.length > 0 &&
      favoriteProducts.length === 0 &&
      (favoritesStatus === "idle" || favoritesStatus === "loading"));
  const showBlockingError =
    favoriteProducts.length === 0 &&
    ((favoriteIds.length > 0 && favoritesStatus === "failed") ||
      (!favoritesCloudHydrated && favoritesCloudStatus === "error"));

  return (
    <>
      <SEO
        title="Favourites - My Thrift"
        description="Your favourite products on My Thrift"
        url="https://www.shopmythrift.store/favorites"
      />

      <main className="favorites-page">
        <AppPageHeader
          title="Favourites"
          onBack={() => navigate(-1)}
          rightAction={
            <button
              type="button"
              onClick={() => navigate("/search")}
              aria-label="Search products"
            >
              <FiSearch aria-hidden="true" />
            </button>
          }
        />

        {showInitialSkeleton ? (
          <FavoritesSkeleton />
        ) : showBlockingError ? (
          <section className="favorites-empty" role="alert">
            <div className="favorites-empty-copy">
              <h2>Favourites could not load</h2>
              <p>
                {favoritesCloudError || favoritesError ||
                  "Please check your connection and try again."}
              </p>
            </div>
            <button
              type="button"
              className="favorites-continue"
              onClick={() => {
                retryCloudSync();
                dispatch(refreshFavoriteProducts({ force: true }));
              }}
            >
              Try Again
            </button>
          </section>
        ) : favoriteProducts.length > 0 ? (
          <section className="favorites-grid" aria-label="Saved products">
            {favoriteProducts.slice(0, visibleCount).map((product) => (
              <div className="favorites-card-reveal" key={product.id}>
                <ProductCard product={product} surface="favorites" />
              </div>
            ))}
          </section>
        ) : (
          <section className="favorites-empty">
            <img
              src="/figma-assets/favourites-empty.svg"
              alt=""
              className="favorites-empty-illustration"
            />
            <div className="favorites-empty-copy">
              <h2>No favourites yet</h2>
              <p>Tap the heart to save items here</p>
            </div>
            <button
              type="button"
              className="favorites-continue"
              onClick={() => navigate("/")}
            >
              Continue Shopping
            </button>
          </section>
        )}
      </main>
    </>
  );
};

export default FavoritesPage;
