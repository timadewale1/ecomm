import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { addToCart, removeFromCart } from "../../redux/actions/action";
import { fetchProduct } from "../../redux/actions/productaction";
import Loading from "../../components/Loading/Loading";
import { PiShoppingCartBold } from "react-icons/pi";
import { FaStar } from "react-icons/fa";
import { CiCircleInfo } from "react-icons/ci";
import { TbInfoOctagon } from "react-icons/tb";
import { TbInfoTriangle } from "react-icons/tb";
import { GoChevronLeft, GoChevronRight } from "react-icons/go";
import { LuCopyCheck, LuCopy } from "react-icons/lu";
import toast from "react-hot-toast";
import Modal from "react-modal";
import { FiPlus } from "react-icons/fi";
import { FiMinus } from "react-icons/fi";
import { TbSquareRoundedCheck } from "react-icons/tb";
import { MdOutlineCancel } from "react-icons/md";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import RelatedProducts from "./SimilarProducts";
import Productnotofund from "../../components/Loading/Productnotofund";

Modal.setAppElement("#root");
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func.apply(null, args);
    }, delay);
  };
};

const ProductDetailPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Fetch product from Redux store
  const { product, loading, error } = useSelector((state) => state.product);
  const [initialImage, setInitialImage] = useState(""); // Already defined

  const [quantity, setQuantity] = useState(1);
  const [mainImage, setMainImage] = useState("");
  const [isSticky, setIsSticky] = useState(false);
  const [isDisclaimerModalOpen, setIsDisclaimerModalOpen] = useState(false);

  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [animateCart, setAnimateCart] = useState(false);
  const [isAddedToCart, setIsAddedToCart] = useState(false);
  const [toastShown, setToastShown] = useState({
    stockError: false,
    success: false,
    fetchError: false,
    productNotFound: false,
  });
  const [toastCount, setToastCount] = useState(0);
  const [vendor, setVendor] = useState(null); // Vendor details
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false); // Info modal for Similar Products
  const [isLinkCopied, setIsLinkCopied] = useState(false); // Link copy state
  const db = getFirestore();
  // Import selector for cart items at the top

  const { cartItems = {} } = useSelector((state) => state.cart);

  // To get all items as an array:

  const cartItemsArray = Object.values(cartItems);

  // Check if the product is already in the cart on component load
  useEffect(() => {
    if (product && Object.keys(cartItems).length > 0) {
      const itemInCart = Object.values(cartItems).find(
        (item) => item.id === product.id
      );
      if (itemInCart) {
        setIsAddedToCart(true);
        setQuantity(itemInCart.quantity); // Set initial quantity from cart
        setSelectedColor(itemInCart.selectedColor);
        setSelectedSize(itemInCart.selectedSize);
      }
    }
  }, [cartItems, product]);

  useEffect(() => {
    dispatch(fetchProduct(id)).catch((err) => {
      console.error("Failed to fetch product:", err);
      toast.error("Failed to load product details.");
    });
  }, [dispatch, id]);
  useEffect(() => {
    if (product) {
      setMainImage(product.coverImageUrl); // Set main image after product fetch
      setInitialImage(product.coverImageUrl); // Set initial image
    }
  }, [product]);

  useEffect(() => {
    if (product && product.vendorId) {
      fetchVendorData(product.vendorId); // Fetch vendor details
    }
  }, [product]);

  const fetchVendorData = async (vendorId) => {
    try {
      const vendorRef = doc(db, "vendors", vendorId);
      const vendorSnap = await getDoc(vendorRef);
      if (vendorSnap.exists()) {
        setVendor(vendorSnap.data());
      } else {
        console.error("Vendor not found");
      }
    } catch (err) {
      console.error("Error fetching vendor data:", err);
    }
  };

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
    console.log("Add to Cart Triggered");
    if (!product) return; // Ensure product exists

    if (!selectedSize) {
      toast.error("Please select a size before adding to cart!");
      return;
    }

    if (!selectedColor) {
      toast.error("Please select a color before adding to cart!");
      return;
    }

    if (quantity > product.stockQuantity) {
      toast.error("Selected quantity exceeds stock availability!");
    } else {
      const productToAdd = {
        ...product,
        quantity, // This should now be the selected quantity
        selectedSize,
        selectedColor,
        selectedImageUrl: mainImage, // Ensure selected image is passed
      };

      const existingCartItem = cartItems[product.id];

      if (existingCartItem) {
        // Instead of adding the quantities, override the existing quantity with the new one
        const updatedProduct = {
          ...existingCartItem,
          quantity: quantity, // This ensures the selected quantity is set directly
        };
        dispatch(addToCart(updatedProduct));
        console.log(
          "Updated product in cart with new quantity:",
          updatedProduct
        );
      } else {
        dispatch(addToCart(productToAdd));
        console.log("Added product to cart:", productToAdd);
      }

      setIsAddedToCart(true);
      toast.success(`Added ${product.name} to cart!`);
    }
  }, [
    product,
    quantity,
    selectedSize,
    selectedColor,
    cartItems,
    dispatch,
    mainImage,
  ]);

  const handleIncreaseQuantity = useCallback(() => {
    if (!product) return; // Ensure product exists

    if (quantity < product.stockQuantity) {
      const updatedQuantity = quantity + 1;
      setQuantity(updatedQuantity);

      const updatedProduct = {
        ...product,
        quantity: updatedQuantity, // Set the quantity directly
        selectedSize,
        selectedColor,
        selectedImageUrl: mainImage,
      };

      dispatch(addToCart(updatedProduct)); // Update quantity in cart
      console.log("Increased quantity:", updatedQuantity);
    } else {
      if (!toastShown.stockError) {
        toast.error("Cannot exceed available stock!");
        setToastShown((prev) => ({ ...prev, stockError: true }));
      }
    }
  }, [
    product,
    quantity,
    selectedSize,
    selectedColor,
    mainImage,
    dispatch,
    toastShown,
  ]);

  const handleDecreaseQuantity = useCallback(() => {
    if (!product) return; // Ensure product exists

    if (quantity > 1) {
      const updatedQuantity = quantity - 1;
      setQuantity(updatedQuantity);

      const updatedProduct = {
        ...product,
        quantity: updatedQuantity, // Set the quantity directly
        selectedSize,
        selectedColor,
        selectedImageUrl: mainImage,
      };

      dispatch(addToCart(updatedProduct)); // Update quantity in cart
      console.log("Decreased quantity:", updatedQuantity);
    }
  }, [product, quantity, selectedSize, selectedColor, mainImage, dispatch]);

  const formatPrice = (price) => {
    return price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const capitalizeFirstLetter = (color) => {
    return color.charAt(0).toUpperCase() + color.slice(1).toLowerCase();
  };
  const handleRemoveFromCart = useCallback(() => {
    if (!product || !product.id || !selectedSize) return; // Ensure product exists and size is selected

    const productKey = `${product.id}-${selectedSize}`; // Combine id and selectedSize to form the key

    dispatch(removeFromCart(productKey)); // Dispatch action to remove the product from the cart
    setIsAddedToCart(false); // Reset state when removed from the cart
    setQuantity(1); // Reset the quantity to 1 after removal
    toast.success(`${product.name} removed from cart!`);
  }, [dispatch, product, selectedSize]);

  const sizes =
    product && product.size
      ? product.size.split(",").map((size) => size.trim())
      : [];

  const colors =
    product && product.color
      ? product.color.split(",").map((color) => color.trim())
      : [];

  const handleColorClick = (color) => {
    setSelectedColor(color);
  };

  const handleSizeClick = (size) => {
    if (selectedSize === size) {
      setSelectedSize(""); // Unselect if clicked again
    } else {
      setSelectedSize(size);
    }
  };

  const copyProductLink = async () => {
    try {
      const shareableLink = `${window.location.origin}/product/${id}`;
      await navigator.clipboard.writeText(
        `Hey, check out this item I saw on ${vendor.shopName}'s store on My Thrift: ${shareableLink}`
      );
      setIsLinkCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setIsLinkCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error("Failed to copy the link", err);
      toast.error("Failed to copy the link. Please try again.");
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (error || !product) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <Productnotofund />
        <div className="relative w-full bg-customOrange bg-opacity-40 border-2 border-customOrange rounded-lg p-4">
          <div className="absolute top-2 left-4 w-4 h-4 bg-black rounded-full"></div>
          <div className="absolute top-2 right-4 w-4 h-4 bg-black rounded-full"></div>

          {/* Text content */}
          <h1 className="text-2xl font-opensans mt-2 font-bold text-red-600 mb-2">
            Product Not Found
          </h1>
          <p className="text-lg text-gray-700 font-opensans mb-4">
            It looks like this product has been removed from the inventory by
            the vendor.
          </p>
          <p className="text-md font-opensans text-gray-500">
            Please continue shopping for other great deals!
          </p>
        </div>

        <button
          className="w-32 bg-customOrange font-opensans text-xs px-2 h-10 text-white rounded-lg mt-12"
          onClick={() => navigate("/newhome")} // Navigate to /newhome on click
        >
          Back Home
        </button>
      </div>
    );
  }

  const averageRating =
    vendor && vendor.ratingCount > 0
      ? (vendor.rating / vendor.ratingCount).toFixed(1)
      : "No ratings";

  const shouldShowAlikeProducts =
    product.imageUrls && product.imageUrls.length > 0;

  const AlikeProducts = () => {
    const handleAlikeProductClick = (imageUrl) => {
      setMainImage(imageUrl);
    };

    return (
      <div className="alike-products p-3 mt-1">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold font-opensans mb-2">
            Similar Products
          </h2>
          <CiCircleInfo
            onClick={() => setIsInfoModalOpen(true)}
            className="text-gray-600 ml-2 cursor-pointer"
            title="Click to learn more about similar products"
          />
        </div>
        <Modal
          isOpen={isInfoModalOpen}
          onRequestClose={() => setIsInfoModalOpen(false)}
          className="modal-content"
          overlayClassName="modal-overlay"
        >
          <div
            className="p-2 relative"
            style={{ maxHeight: "100vh", overflowY: "auto" }}
          >
            <MdOutlineCancel
              onClick={() => setIsInfoModalOpen(false)}
              className="absolute top-2 right-2  text-gray-600 cursor-pointer text-2xl"
            />
            <h2 className="text-lg mt-3 font-bold">Why Similar Products?</h2>
            <p className="text-gray-600 mt-2 font-poppins text-sm">
              The vendor has curated these similar products as part of a
              sub-collection under this item. Whether they share the same
              category, fall within a similar price range, or are from the same
              brand, these selections are thoughtfully grouped to offer you
              relevant alternatives within this product line.
            </p>
          </div>
        </Modal>

        <div className="flex gap-4 overflow-x-scroll">
          <div
            className="w-48 min-w-48 cursor-pointer"
            onClick={() => setMainImage(initialImage)}
          >
            <div className="relative mb-2">
              <img
                src={initialImage}
                alt={`Initial image`}
                className="h-52 w-full object-cover rounded-lg"
              />
            </div>
            <p className="text-sm font-opensans text-black font-normal">
              Original
            </p>
            <p className="text-lg font-opensans font-bold text-black">
              ₦{formatPrice(product.price)}
            </p>
          </div>
          {product.imageUrls?.map((imageUrl, index) => (
            <div
              key={index}
              className="w-48 min-w-48 cursor-pointer"
              onClick={() => handleAlikeProductClick(imageUrl)}
            >
              <div className="relative mb-2">
                <img
                  src={imageUrl}
                  alt={`Alike product ${index + 1}`}
                  className="h-52 w-full object-cover rounded-lg"
                />
              </div>
              <p className="text-sm font-opensans text-black font-normal">
                {product.name}
              </p>
              <p className="text-lg font-opensans font-bold text-black">
                ₦{formatPrice(product.price)}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="relative pb-20">
      <div
        className={`fixed top-0 px-2 py-4 bg-white left-0 h-20 w-full z-20 shadow-md`} // Added shadow here
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
          <div className="flex items-center">
            {isLinkCopied ? (
              <LuCopyCheck className="text-2xl mr-4 cursor-pointer" />
            ) : (
              <LuCopy
                onClick={copyProductLink}
                className="text-2xl mr-4 cursor-pointer"
              />
            )}
            <PiShoppingCartBold
              onClick={() => navigate("/latest-cart")}
              className="text-2xl cursor-pointer "
            />
          </div>
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
                <TbInfoTriangle
                  className="text-red-500 cursor-pointer"
                  onClick={() => setIsDisclaimerModalOpen(true)}
                  title="Click for important information about product defects"
                />

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
          <div className="mt-3">
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

        <div className="mt-3">
          <p className="text-sm font-semibold text-black font-opensans mb-2">
            Size
          </p>

          {sizes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {sizes.map((size, index) => (
                <div
                  key={index}
                  onClick={() => handleSizeClick(size)}
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

        <div
          className="flex justify-between items-center mt-4 mb-4 cursor-pointer"
          onClick={() => setIsModalOpen(true)}
        >
          <p className="text-black text-md font-semibold">Product Details</p>
          <GoChevronRight className="text-3xl -mx-2" />
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

      {shouldShowAlikeProducts && (
        <>
          <div className="border-t-8 border-gray-100 mt-4"></div>
          <AlikeProducts />
        </>
      )}

      <div className="border-t-8 border-gray-100 mt-4"></div>

      <RelatedProducts product={product} />
      <Modal
        isOpen={isDisclaimerModalOpen}
        onRequestClose={() => setIsDisclaimerModalOpen(false)}
        className="modal-content2"
        overlayClassName="modal-overlay"
      >
        <div className="p-2 relative">
          <MdOutlineCancel
            onClick={() => setIsDisclaimerModalOpen(false)}
            className="absolute top-2 right-2 text-gray-600 cursor-pointer text-2xl"
          />
          <h2 className="text-lg font-bold">Important Disclaimer</h2>
          <p className="text-gray-600 mt-4 font-poppins text-xs">
            By agreeing to purchase this product, you acknowledge that it may
            have defects as described by the vendor. My Thrift does not assume
            any responsibility for any damages or defects associated with the
            product. The vendor has disclosed the condition of the product, and
            by proceeding with the purchase, you agree to accept the product in
            its current condition.
          </p>
         
        </div>
      </Modal>

      <div
        className="fixed bottom-0 left-0 right-0 z-50 p-3 flex justify-between items-center"
        style={{
          background:
            "linear-gradient(to top, white, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0) 97%)",
          zIndex: 9999,
        }}
      >
        {!isAddedToCart ? (
          // The "Add to Cart" button initially
          <button
            onClick={() => {
              handleAddToCart();
              setAnimateCart(true); // Trigger the animation
            }}
            className={`bg-customOrange text-white h-12 rounded-full font-opensans font-semibold w-full transition-all duration-300 ease-in-out`}
          >
            Add to cart
          </button>
        ) : (
          // The Remove and Quantity controls that animate in
          <div
            className={`flex w-full justify-between transition-all duration-500 ease-in-out transform ${
              animateCart
                ? "translate-x-0 opacity-100"
                : "translate-x-full opacity-0"
            }`}
          >
            <button
              onClick={handleRemoveFromCart}
              className="text-black open-sans mr-4 bg-gray-100 rounded-full h-14 w-52 text-md font-bold"
            >
              Remove
            </button>
            <div className="flex space-x-4 items-center">
              <button
                onClick={handleDecreaseQuantity}
                className="flex items-center justify-center w-12 h-12 opacity-40 bg-customOrange text-white text-3xl rounded-full"
              >
                <FiMinus />
              </button>
              <span className="font-opensans font-semibold text-lg">
                {quantity}
              </span>
              <button
                onClick={handleIncreaseQuantity}
                className="flex items-center justify-center w-12 h-12 bg-customOrange text-white text-3xl rounded-full"
              >
                <FiPlus />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetailPage;
