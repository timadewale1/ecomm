import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHeart, FaCheck } from 'react-icons/fa';
import { CiCircleInfo } from 'react-icons/ci';
import { toast } from 'react-toastify';

const ProductCard = ({ product, isFavorite, onFavoriteToggle }) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    console.log(`Navigating to product/${product.id}`);
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

  const mainImage = product.coverImageUrl || "https://via.placeholder.com/150";

  return (
    <div className="product-card border rounded-lg shadow relative cursor-pointer" onClick={handleCardClick}>
      <div className="relative">
        <img
          src={mainImage}
          alt={product.name}
          className="h-40 w-full object-cover rounded-lg"
        />
        <FaHeart
          className={`absolute top-2 right-2 cursor-pointer ${isFavorite ? 'text-red-500' : 'text-gray-500'}`}
          onClick={handleFavoriteToggle}
        />
      </div>
      <div className="p-2 flex justify-between items-center">
        <div>
          <h3 className="text-xs font-medium mt-2">{product.name}</h3>
          <div className="flex items-center justify-between">
            <p className="text-gray-600 font-semibold">₦{product.price}</p>
            <span className="text-xs font-medium ml-2">({product.size})</span>
          </div>
          <div className="flex items-center mt-2">
            {product.condition && product.condition.includes("Defect") ? (
              <>
                <CiCircleInfo className="text-red-500" />
                <p className="ml-2 text-xs text-red-500">{product.condition}</p>
              </>
            ) : product.condition && product.condition.includes("brand new") ? (
              <>
                <FaCheck className="text-green-500" />
                <p className="ml-2 text-xs text-green-500">Brand New</p>
              </>
            ) : product.condition && product.condition.includes("thrift") ? (
              <>
                <FaCheck className="text-yellow-500" />
                <p className="ml-2 text-xs text-yellow-500">Thrift</p>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
