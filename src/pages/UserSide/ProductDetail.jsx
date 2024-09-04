import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { addToCart } from "../../redux/actions/action";
import { fetchProduct } from "../../redux/actions/productaction";
import Loading from "../../components/Loading/Loading";
import { PiShoppingCartThin } from "react-icons/pi";
import { FaAngleLeft, FaCheck, FaPlus, FaMinus, FaStar } from "react-icons/fa"; // FaStar for ratings
import { CiCircleInfo } from "react-icons/ci";
import { GoChevronLeft, GoChevronRight } from "react-icons/go";
import toast from "react-hot-toast";
import Modal from "react-modal";
import { TbSquareRoundedCheck } from "react-icons/tb";
import { MdOutlineCancel } from "react-icons/md";
// Firestore imports to fetch vendor data
import { getDoc, doc, getFirestore } from "firebase/firestore";

Modal.setAppElement("#root");

const ProductDetailPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { product, loading, error } = useSelector((state) => state.product);
  const [quantity, setQuantity] = useState(1);
  const [mainImage, setMainImage] = useState("");
  const [isSticky, setIsSticky] = useState(false);

  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [animateCart, setAnimateCart] = useState(false);
  const [toastShown, setToastShown] = useState({
    sizeError: false,
    stockError: false,
    success: false,
    fetchError: false,
    productNotFound: false,
  });

  const [vendor, setVendor] = useState(null); // State for vendor data
  const db = getFirestore(); // Firestore instance

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch product and vendor data
  useEffect(() => {
    dispatch(fetchProduct(id)).catch((err) => {
      console.error("Failed to fetch product:", err);
      if (!toastShown.fetchError) {
        toast.error("Failed to load product details. Please try again.");
        setToastShown((prev) => ({ ...prev, fetchError: true }));
      }
    });
  }, [dispatch, id, toastShown.fetchError]);

  // Use product.vendorId to fetch the vendor's information
  useEffect(() => {
    if (product && product.vendorId) {
      // Ensure the product exists and has a vendorId
      console.log("Vendor ID from product:", product.vendorId); // Log vendorId from product
      fetchVendorData(product.vendorId); // Fetch vendor data using product.vendorId
    } else {
      if (product && !product.vendorId) {
        console.error("No Vendor ID in product");
      }
    }
  }, [product]); // Run this effect whenever the product changes

  // Fetch vendor data using vendorId
  const fetchVendorData = async (vendorId) => {
    try {
      console.log("Fetching vendor data for vendorId:", vendorId);
      const vendorRef = doc(db, "vendors", vendorId); // Firestore reference to vendor document
      const vendorSnap = await getDoc(vendorRef);
      if (vendorSnap.exists()) {
        console.log("Vendor Data:", vendorSnap.data()); // Log the vendor data
        setVendor(vendorSnap.data()); // Store vendor data in state
      } else {
        console.error("Vendor not found");
      }
    } catch (err) {
      console.error("Error fetching vendor data:", err);
    }
  };

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
      setAnimateCart(true);
      setTimeout(() => setAnimateCart(false), 500);
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

  const formatPrice = (price) => {
    return price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div>
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
          <h1 className="text-2xl font-bold text-red-600 mb-2">
            Product Not Found
          </h1>
          <p className="text-sm text-gray-700 mb-4">
            Oops it looks like this product has been removed from the inventory
            by the vendor.
          </p>
          <p className="text-xs font-poppins text-gray-500">
            Please continue shopping for other great deals!
          </p>

          {/* Button to navigate back to the vendor profile */}
          <button
            onClick={() => navigate(`/newhome`)} // Assuming vendorId is part of the product data
            className="mt-4 px-4 py-2 bg-customOrange text-xs text-white rounded-md font-semibold transition"
          >
            Home
          </button>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <h1 className="text-2xl font-bold text-red-600 mb-2">
          Product Not Found
        </h1>
        <p className="text-lg text-gray-700 mb-4">
          It looks like this product has been removed from the inventory by the
          vendor.
        </p>
        <p className="text-md font-poppins text-gray-500">
          Please continue shopping for other great deals!
        </p>
      </div>
    );
  }
  const capitalizeFirstLetter = (color) => {
    return color.charAt(0).toUpperCase() + color.slice(1).toLowerCase();
  };

  const sizes = product.size
    ? product.size.split(",").map((size) => size.trim())
    : [];

  // Fetch and split colors if multiple colors are comma-separated
  const colors = product.color
    ? product.color.split(",").map((color) => color.trim())
    : [];
  const handleColorClick = (color) => {
    setSelectedColor(color); // Set the selected color
  };
  const averageRating =
    vendor && vendor.ratingCount > 0
      ? (vendor.rating / vendor.ratingCount).toFixed(1)
      : "No ratings";

  return (
    <div className="relative pb-20">
      <div
        className={`fixed top-0 px-2 py-4 bg-white left-0 h-20 w-full z-20 ${
          isSticky ? "bg-white" : ""
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <GoChevronLeft
              onClick={() => navigate(-1)}
              className="text-3xl cursor-pointer"
            />
            <span className="ml-4 text-lg font-opensans font-semibold">
              Details
            </span>
          </div>
          <PiShoppingCartThin
            onClick={() => navigate("/latest-cart")}
            className="text-2xl cursor-pointer"
          />
        </div>
      </div>

      <div className="flex justify-center mt-20 h-96">
        <img
          src={mainImage}
          alt={product.name}
          className="w-full h-full object-cover rounded-b-lg "
        />
      </div>

      <div className="px-3 mt-2">
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-opensans text-black font-normal ">
            {product.name}
          </h1>
          <div className="">
            {product.condition &&
            product.condition.toLowerCase().includes("defect") ? (
              <div className="flex items-center mt-2">
                <CiCircleInfo className="text-red-500" />
                <p className="ml-2 text-xs text-red-500">{product.condition}</p>
              </div>
            ) : product.condition.toLowerCase() === "brand new" ? (
              <div className="flex items-center mt-2">
                <TbSquareRoundedCheck className="text-green-700" />
                <p className="ml-2 text-xs text-green-700">Brand New</p>
              </div>
            ) : product.condition.toLowerCase() === "thrift" ? (
              <div className="flex items-center mt-2">
                <TbSquareRoundedCheck className="text-yellow-500" />
                <p className="ml-2 text-xs text-yellow-500">Thrift</p>
              </div>
            ) : (
              <div className="flex items-center mt-2">
                <CiCircleInfo className="text-green-500" />
                <p className="ml-2 text-xs text-green-500">Second Hand</p>
              </div>
            )}
          </div>
        </div>

        <p className="text-2xl font-opensans font-semibold text-black">
          ₦{formatPrice(product.price)}
        </p>

        {/* Vendor Shop Name and Rating */}
        {vendor ? (
          <div className="flex  items-center mt-1">
            <p className="text-sm text-red-600 mr-2"> {vendor.shopName}</p>
            <div className="flex items-center">
              <span className="mr-1 text-black font-medium ratings-text">
                {averageRating}
              </span>
              <FaStar className="text-yellow-500 ratings-text" />
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-500">
            Vendor information not available
          </p>
        )}

        {/* Color Options */}
        {colors.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-semibold text-black font-opensans mb-2">
              {selectedColor ? capitalizeFirstLetter(selectedColor) : "Colors"}
            </p>
            <div className="flex flex-wrap gap-2">
              {colors.map((color, index) => (
                <div
                  key={index}
                  onClick={() => handleColorClick(color)}
                  className={`w-8 h-8 flex items-center justify-center rounded-full cursor-pointer ${
                    selectedColor === color ? "border-2" : ""
                  }`}
                  style={{
                    padding: "3px",
                    borderColor:
                      selectedColor === color ? color : "transparent", // Border matches the color when selected
                    backgroundColor: "#f0f0f0", // Light gray background for visibility
                  }}
                  title={color} // Show color name/hex on hover
                >
                  <div
                    style={{ backgroundColor: color }}
                    className="w-6 h-6 rounded-full"
                  ></div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4">
          <p className="text-sm font-semibold text-black font-opensans mb-2">
            Size
          </p>

          {sizes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {sizes.map((size, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedSize(size)}
                  className={`py-2 px-4 border rounded-lg cursor-pointer ${
                    selectedSize === size
                      ? "bg-customOrange text-white" // Highlight selected size
                      : "bg-transparent text-black" // Default style for other sizes
                  }`}
                >
                  <span className="text-xs font-semibold">{size}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* <div className="flex justify-center items-center mt-4">
          <button
            onClick={handleDecreaseQuantity}
            className="px-3 py-1 border border-customOrange text-black rounded-l-md"
          >
            <FaMinus />
          </button>
          <span className="px-4 py-1 border-t border-b border-customOrange text-black">
            {quantity}
          </span>
          <button
            onClick={handleIncreaseQuantity}
            className="px-3 py-1 border border-customOrange text-black rounded-r-md"
          >
            <FaPlus />
          </button>
        </div>

        <div className="flex justify-center mt-4">
          <button
            onClick={handleAddToCart}
            className={`border border-customOrange text-black py-2 px-4 rounded-md flex items-center ${
              animateCart ? "animate-cart" : ""
            }`}
          >
            <PiShoppingCartThin className="mr-2" />
            Add to Cart
          </button>
        </div> */}

        <div
          className="flex justify-between items-center mt-4 cursor-pointer"
          onClick={() => setIsModalOpen(true)}
        >
          <p className="text-black text-md font-semibold">Product Details</p>
          <GoChevronRight className="text-3xl" />
        </div>

        <Modal
          isOpen={isModalOpen}
          onRequestClose={() => setIsModalOpen(false)}
          className="modal-content"
          overlayClassName="modal-overlay"
        >
          <div className="p-2 relative">
            <MdOutlineCancel
              onClick={() => setIsModalOpen(false)}
              className="absolute top-2 right-2 text-gray-600 cursor-pointer text-2xl"
            />
            <h2 className="text-lg mt-3 font-bold">Product Description</h2>
            <p className="text-gray-600 mt-2 font-poppins text-sm">
              {product.description}
            </p>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default ProductDetailPage;
