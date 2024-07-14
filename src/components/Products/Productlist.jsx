// ProductList.jsx
import React, { useState } from "react";
import ProductCard from "./ProductCard";
import { useCart } from "./CartContext";

const ProductList = ({ products }) => {
  const [productList, setProductList] = useState(products);
  const { cart, addToCart, removeFromCart } = useCart();

  const handleFavoriteToggle = (productId) => {
    const updatedProducts = productList.map(product =>
      product.id === productId ? { ...product, isFavorite: !product.isFavorite } : product
    );
    setProductList(updatedProducts);
  };

  const handleAddToCart = (productId) => {
    if (cart.includes(productId)) {
      removeFromCart(productId);
    } else {
      addToCart(productId);
    }
  };

  return (
    <div className="product-list">
      {productList.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          isFavorite={product.isFavorite}
          isAddedToCart={cart.includes(product.id)}
          onFavoriteToggle={handleFavoriteToggle}
          onAddToCart={handleAddToCart}
        />
      ))}
    </div>
  );
};

export default ProductList;
