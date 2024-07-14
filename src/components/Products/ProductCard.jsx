import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHeart, FaPlus, FaCheck } from 'react-icons/fa';
import { CiCircleInfo } from 'react-icons/ci';
import { toast } from 'react-toastify';

const ProductCard = ({ product, isFavorite, isAddedToCart, onFavoriteToggle, onAddToCart }) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/product/${product.id}`);
  };

  const handleFavoriteToggle = (e) => {
    e.stopPropagation();
    onFavoriteToggle(product.id);
    if (isFavorite) {
      toast.info(`Removed ${product.name} from favorites!`);
    } else {
      toast.success(`Added ${product.name} to favorites!`);
    }
  };

  const handleAddToCart = (e) => {
    e.stopPropagation();
    onAddToCart(product.id);
    if (isAddedToCart) {
      toast.info(`Removed ${product.name} from cart!`);
    } else {
      toast.success(`Added ${product.name} to cart!`);
    }
  };

  return (
    <div className="product-card border rounded-lg shadow relative" onClick={handleCardClick}>
      <div className="relative">
        <img
          src={product.imageUrls[0] || "https://via.placeholder.com/150"}
          alt={product.name}
          className="h-40 w-full object-cover rounded-lg"
        />
        <FaHeart
          className={`absolute top-2 right-2 cursor-pointer ${isFavorite ? 'text-red-500' : 'text-gray-500'}`}
          onClick={handleFavoriteToggle}
        />
        <div
          className="absolute bottom-2 right-2 bg-customCream w-7 text-sm h-7 p-2 rounded-full text-black cursor-pointer"
          onClick={handleAddToCart}
        >
          {isAddedToCart ? <FaCheck /> : <FaPlus />}
        </div>
      </div>
      <div className="p-2 flex justify-between items-center">
        <div>
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
                <FaCheck className="text-green-500" />
                <p className="ml-2 text-xs text-green-500">Brand New</p>
              </>
            ) : product.condition === "thrift" ? (
              <>
                <FaCheck className="text-yellow-500" />
                <p className="ml-2 text-xs text-yellow-500">Thrift</p>
              </>
            ) : null}
          </div>
        </div>
        <span className="text-xs font-medium">{product.size}</span>
      </div>
    </div>
  );
};

export default ProductCard;
