import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { addToCart } from "../../redux/actions/action";
import { fetchProduct } from "../../redux/actions/productaction";
import Loading from "../../components/Loading/Loading";
import { PiShoppingCartThin } from "react-icons/pi";
import { FaAngleLeft, FaCheck, FaPlus, FaMinus } from "react-icons/fa";
import { CiCircleInfo } from "react-icons/ci";
import { toast } from "react-toastify";

const ProductDetailPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { product, loading, error } = useSelector((state) => state.product);
  const cart = useSelector((state) => state.cart);
  const [quantity, setQuantity] = useState(1);
  const [mainImage, setMainImage] = useState("");
  const [isSticky, setIsSticky] = useState(false);
  const [selectedSize, setSelectedSize] = useState("");
  const [showCheckoutButton, setShowCheckoutButton] = useState(false);
  const [toastShown, setToastShown] = useState({
    sizeError: false,
    stockError: false,
    success: false,
    fetchError: false,
    productNotFound: false,
  });

  useEffect(() => {
    dispatch(fetchProduct(id)).catch((err) => {
      console.error("Failed to fetch product:", err);
      if (!toastShown.fetchError) {
        toast.error("Failed to load product details. Please try again.");
        setToastShown((prev) => ({ ...prev, fetchError: true }));
      }
    });
  }, [dispatch, id, toastShown.fetchError]);

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

  const handleAddToCart = useCallback(() => {
    if (product.size.toLowerCase().includes("all sizes") && !selectedSize) {
      if (!toastShown.sizeError) {
        toast.error("Please select a size before adding to cart!");
        setToastShown((prev) => ({ ...prev, sizeError: true }));
      }
      return;
    }

    if (quantity > product.stockQuantity) {
      if (!toastShown.stockError) {
        toast.error("Selected quantity exceeds stock availability!");
        setToastShown((prev) => ({ ...prev, stockError: true }));
      }
    } else {
      const productToAdd = {
        ...product,
        quantity,
        selectedSize,
        selectedImageUrl: mainImage,
      };
      dispatch(addToCart(productToAdd));
      if (!toastShown.success) {
        toast.success(`Added ${product.name} to cart!`);
        setToastShown((prev) => ({ ...prev, success: true }));
      }
      setShowCheckoutButton(true); // Show the "Proceed to Checkout" button
    }
  }, [dispatch, product, quantity, selectedSize, mainImage, toastShown]);

  const handleIncreaseQuantity = useCallback(() => {
    if (quantity < product.stockQuantity) {
      setQuantity(quantity + 1);
    } else {
      if (!toastShown.stockError) {
        toast.error("Cannot exceed available stock!");
        setToastShown((prev) => ({ ...prev, stockError: true }));
      }
    }
  }, [quantity, product, toastShown]);

  const handleDecreaseQuantity = useCallback(() => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  }, [quantity]);

  const handleProceedToCheckout = () => {
    navigate("/newcheckout");
  };

  const totalCartItems = Object.values(cart).reduce(
    (total, item) => total + item.quantity,
    0
  );

  const totalCartPrice = Object.values(cart).reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!product) {
    if (!toastShown.productNotFound) {
      // toast.error("Product not found. It may have been removed by the vendor.");
      setToastShown((prev) => ({ ...prev, productNotFound: true }));
    }
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <h1 className="text-2xl font-bold text-red-600 mb-2">Product Not Found</h1>
        <p className="text-lg text-gray-700 mb-4">
          It looks like this product has been removed from the inventory by the vendor.
        </p>
        <p className="text-md font-poppins text-gray-500">Please continue shopping for other great deals!</p>
      </div>
    );
  }

  return (
    <div className="relative pb-20">
      <div
        className={`fixed top-0 left-0 h-20 w-full z-20 ${
          isSticky ? "bg-transparent shadow-md" : ""
        }`}
      >
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
        <p className="text-xs font-medium text-gray-600">
          Available in: {product.color}
        </p>
      </div>
      <div className="p-2">
        <p className="text-center mt-1">{product.description}</p>
        <h1 className="text-2xl font-ubuntu text-black font-bold mt-4">
          {product.name}
        </h1>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xl font-roboto font-bold text-gray-700">
            ₦{product.price}
          </p>
          <span className="text-xs font-medium">({product.size})</span>
        </div>
        <div>
          {product.condition &&
          product.condition.toLowerCase().includes("defect") ? (
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
            <label
              htmlFor="size-textarea"
              className="text-sm font-medium text-gray-700"
            >
              Enter Size:
            </label>
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
          <span className="px-4 py-1 border-t border-b border-customOrange text-black">
            {quantity}
          </span>
          <button
            onClick={handleIncreaseQuantity}
            className="px-3 py-1 border border-customOrange text-black rounded-r-md hover:bg-customOrange hover:text-white"
          >
            <FaPlus />
          </button>
        </div>
        <div className="flex font-poppins font-medium justify-center translate-y-4">
          <button
            onClick={handleAddToCart}
            className="mt-4 border border-customOrange text-black py-2 px-4 rounded-md hover:bg-customOrange hover:text-white flex items-center"
          >
            <PiShoppingCartThin className="mr-2" />
            Add to Cart
          </button>
        </div>
        {showCheckoutButton && (
          <div className="flex font-poppins font-medium justify-center translate-y-20">
            <button
              onClick={handleProceedToCheckout}
              className="bg-customOrange w-full flex h-14 items-center justify-between font-poppins text-black py-2 px-4 rounded-md"
            >
              <span className="text-sm font-ubuntu">Proceed to Order ({totalCartItems})</span>
              <span className="text-sm">₦{totalCartPrice.toFixed(2)}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetailPage;
