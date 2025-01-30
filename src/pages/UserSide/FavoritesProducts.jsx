import React, { useEffect, useState } from "react";
import { db } from "../../firebase.config";
import { doc, getDoc } from "firebase/firestore";
import ProductCard from "../../components/Products/ProductCard";
import { useFavorites } from "../../components/Context/FavoritesContext";
import Faves from "../../components/Loading/Faves";
import Loading from "../../components/Loading/Loading";
import { GoChevronLeft } from "react-icons/go";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const FavoritesPage = () => {
  const { favorites: contextFavorites } = useFavorites(); // From Context
  const [favoriteProducts, setFavoriteProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFavoriteProducts = async () => {
      setLoading(true);

      try {
        const contextFavoriteIds = contextFavorites.map(
          (favorite) => favorite.id
        );

        // Fetch from Firestore
        const firestoreFavorites = await fetchFirestoreFavorites();
        const firestoreFavoriteIds = firestoreFavorites.map(
          (product) => product.id
        );

        // Combine Firestore favorites with Context favorites
        const combinedIds = Array.from(
          new Set([...contextFavoriteIds, ...firestoreFavoriteIds])
        ); // Remove duplicates

        // Fetch all products by IDs
        const productPromises = combinedIds.map((productId) =>
          getDoc(doc(db, "products", productId))
        );
        const productSnapshots = await Promise.all(productPromises);

        const products = productSnapshots
          .map((productDoc) => {
            if (productDoc.exists()) {
              const productData = productDoc.data();
              return { id: productDoc.id, ...productData };
            } else {
              console.error(`No product found with ID: ${productDoc.id}`);
              return null;
            }
          })
          .filter((product) => product !== null);

        setFavoriteProducts(products);
      } catch (error) {
        console.error("Error fetching favorite products:", error);
        toast.error("Error fetching favorite products. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    const fetchFirestoreFavorites = async () => {
      const currentUser = JSON.parse(localStorage.getItem("currentUser")); // Or use a hook if available
      if (!currentUser) return []; // If not logged in, skip Firestore

      try {
        // Simulate fetching favorites from Firestore
        const favoritesCollection = await getFavoritesFromFirestore(
          currentUser.uid
        );
        return favoritesCollection; // Assuming an array of product objects
      } catch (error) {
        console.error("Error fetching Firestore favorites:", error);
        return [];
      }
    };

    const getFavoritesFromFirestore = async (userId) => {
      // Firestore favorites collection path: /users/{userId}/favorites
      const favoriteDocs = []; // Simulate Firestore read logic here
      // Loop through your favorites docs and extract the products or IDs
      return favoriteDocs; // Return as an array of objects or IDs
    };

    fetchFavoriteProducts();
  }, [contextFavorites]);

  return (
    <div className="p-2">
      <div className="sticky top-0 bg-white z-10 flex items-center justify-between h-24">
        <div className="flex items-center space-x-2">
          <GoChevronLeft
            className="text-2xl text-black cursor-pointer"
            onClick={() => navigate(-1)}
          />
          <h1 className="text-xl font-opensans font-bold">Favorites</h1>
        </div>
      </div>
      {loading ? (
        <Loading />
      ) : favoriteProducts.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {favoriteProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isFavorite={true}
              onFavoriteToggle={() => {}} // No toggle needed in FavoritesPage
            />
          ))}
        </div>
      ) : (
        <>
          <Faves />
          <p className="font-opensans text-center text-sm text-gray-800">
            Your liked items would show here!
          </p>
        </>
      )}
    </div>
  );
};

export default FavoritesPage;
