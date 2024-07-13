// ProductCard.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { CiCircleInfo } from "react-icons/ci";
import { FaHeart, FaPlus, FaCheckCircle } from "react-icons/fa";

const ProductCard = ({ product, onFavoriteToggle }) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/product/${product.id}`);
  };

  return (
    <div className="product-card border rounded-lg shadow relative" onClick={handleCardClick}>
      <div className="relative">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-40 w-full object-cover rounded-lg"
        />
        <FaHeart
          className={`absolute top-2 right-2 cursor-pointer ${product.isFavorite ? 'text-red-500' : 'text-gray-500'}`}
          onClick={(e) => {
            e.stopPropagation(); // Prevent card click event
            // onFavoriteToggle(product);
          }}
        />
        <FaPlus className="absolute bottom-2 right-2 bg-customCream w-7 text-sm h-7 p-2 rounded-full text-black cursor-pointer" />
      </div>
      <div className="p-2">
        <h3 className="text-xs font-medium mt-2">{product.name}</h3>
        <p className="text-gray-600 font-semibold">₦{product.price}</p>
        <div className="flex items-center mt-2">
          
          {product.condition === "defect" ? (
            <>
              <CiCircleInfo className="text-red-500" />
              <p className="ml-2 text-xs text-red-500">{product.defectDescription}</p>
            </>
          ) : product.condition === "brand new" ? (
            <>
              <FaCheckCircle className="text-green-500" />
              <p className="ml-2 text-xs text-green-500">Brand New</p>
            </>
          ) : product.condition === "thrift" ? (
            <>
              <FaCheckCircle className="text-yellow-500" />
              <p className="ml-2 text-xs text-yellow-500">Thrift</p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
