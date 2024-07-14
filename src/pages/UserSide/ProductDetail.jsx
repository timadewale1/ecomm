import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { addToCart } from "../../redux/actions/action";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase.config"; // Adjust the import path based on your project structure
import Loading from "../../components/Loading/Loading";
import { PiShoppingCartThin } from "react-icons/pi";
import { FaAngleLeft, FaCheck, FaTimes, FaPlus, FaMinus } from "react-icons/fa";
import { CiCircleInfo } from "react-icons/ci";
import { toast } from "react-toastify";

const ProductDetailPage = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const dispatch = useDispatch();
  const cart = useSelector((state) => state.cart);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProductData = async () => {
      try {
        const productRef = doc(db, "products", id);
        const productDoc = await getDoc(productRef);
        if (productDoc.exists()) {
          setProduct({ id: productDoc.id, ...productDoc.data() });
        } else {
          toast.error("No such product found!");
        }
      } catch (error) {
        toast.error("Error fetching product data: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProductData();
  }, [id]);

  const handleAddToCart = () => {
    if (quantity > product.stock) {
      toast.error("Selected quantity exceeds stock availability!");
    } else {
      const productToAdd = { ...product, quantity };
      dispatch(addToCart(productToAdd));
      toast.success(`Added ${product.name} to cart!`);
    }
  };

  const handleIncreaseQuantity = () => {
    if (quantity < product.stock) {
      setQuantity(quantity + 1);
    } else {
      toast.error("Cannot exceed available stock!");
    }
  };

  const handleDecreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (!product) {
    return <div>No product found</div>;
  }

  return (
    <div className="relative">
      <FaAngleLeft
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 text-2xl cursor-pointer"
      />
      <img
        src={product.imageUrl}
        alt={product.name}
        className="w-full h-64 object-cover rounded-md mb-2"
      />
      <div className="p-2">
        <h1 className="text-2xl font-ubuntu text-black font-bold mb-2">{product.name}</h1>
        <p className="text-lg font-roboto text-gray-700">₦{product.price}</p>
        <div className="flex items-center justify-between mt-2">
          <div>
            {product.condition === "defect" ? (
              <div className="flex items-center">
                <CiCircleInfo className="text-red-500" />
                <p className="ml-2 text-xs text-red-500">{product.defectDescription}</p>
              </div>
            ) : product.condition === "brand new" ? (
              <div className="flex items-center">
                <FaCheck className="text-green-500" />
                <p className="ml-2 text-xs text-green-500">Brand New</p>
              </div>
            ) : product.condition === "thrift" ? (
              <div className="flex items-center">
                <FaCheck className="text-yellow-500" />
                <p className="ml-2 text-xs text-yellow-500">Thrift</p>
              </div>
            ) : null}
          </div>
          <span className="text-xs font-medium">{product.size}</span>
        </div>
        <p className="mt-3 text-center">{product.description}</p>
        <div className="flex justify-center items-center mt-4">
          <button
            onClick={handleDecreaseQuantity}
            className="px-3 py-1 border border-customOrange text-black rounded-l-md hover:bg-customOrange hover:text-white"
          >
            <FaMinus />
          </button>
          <span className="px-4 py-1 border-t border-b border-customOrange text-black">{quantity}</span>
          <button
            onClick={handleIncreaseQuantity}
            className="px-3 py-1 border border-customOrange text-black rounded-r-md hover:bg-customOrange hover:text-white"
          >
            <FaPlus />
          </button>
        </div>
        <div className="flex font-poppins font-medium justify-center translate-y-16">
          <button
            onClick={handleAddToCart}
            className="mt-4  border border-customOrange text-black py-2 px-4 rounded-md hover:bg-customOrange hover:text-white flex items-center"
          >
            <PiShoppingCartThin className="mr-2" />
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
