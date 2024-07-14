import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHeart, FaCheck } from 'react-icons/fa';
import { CiCircleInfo } from 'react-icons/ci';
import { toast } from 'react-toastify';
import { useFavorites } from '../../components/Context/FavoritesContext';

const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();
  const favorite = isFavorite(product.id);

  const handleCardClick = () => {
    console.log(`Navigating to product/${product.id}`);
    navigate(`/product/${product.id}`);
  };

  const handleFavoriteToggle = (e) => {
    e.stopPropagation();
    if (favorite) {
      removeFavorite(product.id);
      toast.info(`Removed ${product.name} from favorites!`);
    } else {
      addFavorite(product);
      toast.success(`Added ${product.name} to favorites!`);
    }
  };

  const mainImage = product.coverImageUrl || "https://via.placeholder.com/150";

  console.log('ProductCard product:', product);

  return (
    <div className="product-card border rounded-lg shadow relative cursor-pointer" onClick={handleCardClick}>
      <div className="relative">
        <img
          src={mainImage}
          alt={product.name}
          className="h-40 w-full object-cover rounded-lg"
        />
        <FaHeart
          className={`absolute top-2 right-2 cursor-pointer ${favorite ? 'text-red-500' : 'text-gray-500'}`}
          onClick={handleFavoriteToggle}
        />
      </div>
      <div className="p-2">
        <h3 className="text-xs font-medium mt-2">{product.name}</h3>
        <div className="flex items-center justify-between mt-2">
          <p className="text-gray-600 font-semibold">₦{product.price}</p>
          <span className="text-xs font-medium">({product.size})</span>
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
  );
};

export default ProductCard;
