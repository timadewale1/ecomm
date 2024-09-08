import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchProducts } from "../redux/actions/productaction";
import Loading from "../components/Loading/Explorer";
import { addToCart } from "../redux/actions/action";
import { toggleFavorite } from "../redux/actions/favouriteactions";
import { FaHeart, FaCartPlus } from "react-icons/fa";

const Explore = () => {
  const dispatch = useDispatch();
  const products = useSelector((state) => state.product.products);
  const loading = useSelector((state) => state.product.loading);

  useEffect(() => {
    console.log("Dispatching fetchProducts");
    dispatch(fetchProducts());
  }, [dispatch]);

  const handleAddToCart = (product) => {
    dispatch(addToCart(product));
    console.log(`Added ${product.name} to cart`);
  };

  const handleToggleFavorite = (productId) => {
    dispatch(toggleFavorite(productId));
    console.log(`Toggled favorite for product ID: ${productId}`);
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-center mb-4">Explore Products</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.length === 0 ? (
          <p className="text-red-700 text-center col-span-full">No products available</p>
        ) : (
          products.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow-md p-4">
              <img
                src={product.coverImageUrl}
                alt={product.name}
                className="w-full h-48 object-cover rounded-md"
              />
              <h3 className="text-xl font-semibold mt-2">{product.name}</h3>
              <p className="text-gray-700 mt-1">{product.description}</p>
              <p className="text-green-600 font-bold mt-2">₦{product.price}</p>
              <div className="flex justify-between mt-4">
                <button
                  onClick={() => handleAddToCart(product)}
                  className="flex items-center bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                >
                  <FaCartPlus className="mr-2" />
                  Add to Cart
                </button>
                <button
                  onClick={() => handleToggleFavorite(product.id)}
                  className="flex items-center bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
                >
                  <FaHeart className="mr-2" />
                  Favorite
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Explore;
