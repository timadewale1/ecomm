import React from 'react';
import { useSelector } from 'react-redux';
import ProductCard from '../../components/Products/ProductCard';

const FavoritesPage = () => {
  const favorites = useSelector(state => state.favorites);
  const products = useSelector(state => state.products);

  const favoriteProducts = products.filter(product => favorites[product.id]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-medium mb-4">Favorites</h1>
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
