import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { addToCart } from "../../redux/actions/action";
import { fetchProduct } from "../../redux/actions/productaction";
import Loading from "../../components/Loading/Loading";
import { PiShoppingCartThin } from "react-icons/pi";
import { FaAngleLeft, FaCheck, FaTimes, FaPlus, FaMinus } from "react-icons/fa";
import { CiCircleInfo } from "react-icons/ci";
import { toast } from "react-toastify";

const ProductDetailPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { product, loading, error } = useSelector((state) => state.product);
  const [quantity, setQuantity] = useState(1);
  const [mainImage, setMainImage] = useState("");
  const [isSticky, setIsSticky] = useState(false);
  const [selectedSize, setSelectedSize] = useState("");

  useEffect(() => {
    dispatch(fetchProduct(id));
  }, [dispatch, id]);

  useEffect(() => {
    if (product) {
      setMainImage(product.coverImageUrl);
    }
  }, [product]);

  const handleScroll = () => {
    if (window.scrollY > 50) {
      setIsSticky(true);
    } else {
      setIsSticky(false);
    }
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleAddToCart = () => {
    if (product.size.toLowerCase().includes("all sizes") && !selectedSize) {
      toast.error("Please select a size before adding to cart!");
      return;
    }

    if (quantity > product.stockQuantity) {
      toast.error("Selected quantity exceeds stock availability!");
    } else {
      const productToAdd = { ...product, quantity, selectedSize, selectedImageUrl: mainImage };
      dispatch(addToCart(productToAdd));
      toast.success(`Added ${product.name} to cart!`);
    }
  };

  const handleIncreaseQuantity = () => {
    if (quantity < product.stockQuantity) {
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

  if (error) {
    return <div>{error}</div>;
  }

  if (!product) {
    return <div>No product found</div>;
  }

  return (
    <div className="relative pb-40">
      <div className={`fixed top-0 left-0 h-20 w-full z-20 ${isSticky ? "bg-transparent shadow-md" : ""}`}>
        <FaAngleLeft
          onClick={() => navigate(-1)}
          className="text-4xl cursor-pointer bg-white p-2 rounded-full m-4"
        />
      </div>
      <div className="flex justify-center h-96">
        <img
          src={mainImage}
          alt={product.name}
          className="w-full h-full object-cover rounded-b-lg mb-2"
        />
      </div>
      <div className="flex h-20 rounded-full items-center justify-center gap-2 mt-2">
        {[product.coverImageUrl, ...product.imageUrls].map((url, index) => (
          <img
            key={index}
            src={url}
            alt={`Product ${index + 1}`}
            className={`w-12 h-12 object-cover border border-gray-300 rounded cursor-pointer ${
              mainImage === url ? "border-2 border-blue-500" : ""
            }`}
            onClick={() => setMainImage(url)}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-center">
        <p className="text-xs font-medium text-gray-600">Available in: {product.color}</p>
      </div>
      <div className="p-2">
        <p className="text-center mt-1">{product.description}</p>
        <h1 className="text-2xl font-ubuntu text-black font-bold mt-4">{product.name}</h1>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xl font-roboto font-bold text-gray-700">₦{product.price}</p>
          <span className="text-xs font-medium">({product.size})</span>
        </div>
        <div>
          {product.condition && product.condition.toLowerCase().includes("defect") ? (
            <div className="flex items-center mt-2">
              <CiCircleInfo className="text-red-500" />
              <p className="ml-2 text-xs text-red-500">{product.condition}</p>
            </div>
          ) : product.condition.toLowerCase() === "brand new" ? (
            <div className="flex items-center mt-2">
              <FaCheck className="text-green-500" />
              <p className="ml-2 text-xs text-green-500">Brand New</p>
            </div>
          ) : product.condition.toLowerCase() === "thrift" ? (
            <div className="flex items-center mt-2">
              <FaCheck className="text-yellow-500" />
              <p className="ml-2 text-xs text-yellow-500">Thrift</p>
            </div>
          ) : product.condition.toLowerCase() === "second hand" ? (
            <div className="flex items-center mt-2">
              <CiCircleInfo className="text-green-500" />
              <p className="ml-2 text-xs text-green-500">Second Hand</p>
            </div>
          ) : null}
        </div>
        {product.size.toLowerCase().includes("all sizes") && (
        <div className="mt-4">
        <label htmlFor="size-textarea" className="text-sm font-medium text-gray-700">Enter Size:</label>
        <textarea
          id="size-textarea"
          className="mt-1 block w-24 h-8 py-1 px-1 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm resize-none"
          value={selectedSize}
          onChange={(e) => setSelectedSize(e.target.value)}
          placeholder="Size"
        />
      </div>
      
        )}
        
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
            className="mt-4 border border-customOrange text-black py-2 px-4 rounded-md hover:bg-customOrange hover:text-white flex items-center"
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
