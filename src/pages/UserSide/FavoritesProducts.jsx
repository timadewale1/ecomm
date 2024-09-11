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

const FavoritesPage = () => {
  const { favorites } = useFavorites();
  const [favoriteProducts, setFavoriteProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFavoriteProducts = async () => {
      try {
        console.log("Fetching favorite products...");

        // Collect all product IDs from favorites
        const favoriteProductIds = favorites.map((favorite) => favorite.id);
        console.log("Favorite product IDs:", favoriteProductIds);

        // Fetch products from the centralized 'products' collection
        const productPromises = favoriteProductIds.map((productId) => {
          console.log(`Fetching product with ID: ${productId} from 'products' collection`);
          return getDoc(doc(db, "products", productId));
        });

        // Await all product fetching promises
        const productSnapshots = await Promise.all(productPromises);

        // Extract product data and filter out null/undefined products
        const products = productSnapshots
          .map((productDoc) => {
            if (productDoc.exists()) {
              const productData = productDoc.data();
              console.log("Fetched product data:", productData);
              return { id: productDoc.id, ...productData };
            } else {
              console.error(`No product found with ID: ${productDoc.id}`);
              return null;
            }
          })
          .filter((product) => product !== null);

        console.log("Products:", products);
        setFavoriteProducts(products);
      } catch (error) {
        console.error("Error fetching favorite products:", error);
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
          <h1 className="text-xl font-bold">Favorites</h1>
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
        <Faves />
      )}
    </div>
  );
};

export default FavoritesPage;
