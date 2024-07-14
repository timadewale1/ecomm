import React, { useEffect, useState } from 'react';
import { db } from '../../firebase.config';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import ProductCard from '../../components/Products/ProductCard';
import { useFavorites } from '../../components/Context/FavoritesContext';

const FavoritesPage = () => {
  const { favorites } = useFavorites();
  const [favoriteProducts, setFavoriteProducts] = useState([]);

  useEffect(() => {
    const fetchFavoriteProducts = async () => {
      try {
        console.log('Fetching favorite products...');

        const favoriteProductIds = favorites.map(favorite => ({
          productId: favorite.id,
          vendorId: favorite.vendorId
        }));
        console.log('Favorite product IDs and vendor IDs:', favoriteProductIds);

        const productPromises = favoriteProductIds.map(({ productId, vendorId }) => {
          console.log(`Fetching product with ID: ${productId} from vendor: ${vendorId}`);
          return getDoc(doc(db, 'vendors', vendorId, 'products', productId));
        });

        const productSnapshots = await Promise.all(productPromises);

        const products = productSnapshots.map(productDoc => {
          if (productDoc.exists()) {
            const productData = productDoc.data();
            console.log('Fetched product data:', productData);
            return { id: productDoc.id, ...productData };
          } else {
            console.error(`No product found with ID: ${productDoc.id}`);
            return null;
          }
        }).filter(product => product !== null);

        console.log('Products:', products);
        setFavoriteProducts(products);
      } catch (error) {
        console.error('Error fetching favorite products:', error);
      }
    };

    fetchFavoriteProducts();
  }, [favorites]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-medium font-ubuntu mb-4">Favorites</h1>
      <div className="grid grid-cols-2 gap-4">
        {favoriteProducts.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            isFavorite={true}
            onFavoriteToggle={() => {}}
          />
        ))}
      </div>
    </div>
  );
};

export default FavoritesPage;
