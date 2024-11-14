import React, { useEffect, useState } from "react";
import { db } from "../../firebase.config";
import { doc, getDoc } from "firebase/firestore";
import ProductCard from "../../components/Products/ProductCard";
import { useFavorites } from "../../components/Context/FavoritesContext";
import Faves from "../../components/Loading/Faves";
import Loading from "../../components/Loading/Loading";
import { FaAngleLeft } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import { GoChevronLeft } from "react-icons/go";
import toast from "react-hot-toast";
const FavoritesPage = () => {
  const { favorites } = useFavorites();
  const [favoriteProducts, setFavoriteProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFavoriteProducts = async () => {
      try {
        const favoriteProductIds = favorites.map((favorite) => favorite.id);

        const productPromises = favoriteProductIds.map((productId) => {
          return getDoc(doc(db, "products", productId));
        });

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
        toast.error("Error fetching favorite products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFavoriteProducts();
  }, [favorites]);

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
        <div className="grid grid-cols-2 gap-4 ">
          {favoriteProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isFavorite={true}
              onFavoriteToggle={() => {}}
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
