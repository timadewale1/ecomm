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
import LoadProducts from "../../components/Loading/LoadProducts";
import { GoChevronLeft, GoChevronRight } from "react-icons/go";
import { LuCopyCheck, LuCopy } from "react-icons/lu";
import toast from "react-hot-toast";
import Modal from "react-modal";
import { FiPlus } from "react-icons/fi";
import { FiMinus } from "react-icons/fi";
import { TbSquareRoundedCheck } from "react-icons/tb";
import { MdOutlineCancel } from "react-icons/md";
import "swiper/css/free-mode";
import "swiper/css/autoplay";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import SwiperCore, { Pagination, Navigation } from "swiper";
import { FreeMode, Autoplay } from "swiper/modules";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import RelatedProducts from "./SimilarProducts";
import Productnotofund from "../../components/Loading/Productnotofund";
import { decreaseQuantity, increaseQuantity } from "../../redux/actions/action";
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
  const [initialImage, setInitialImage] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [mainImage, setMainImage] = useState("");
  const [isSticky, setIsSticky] = useState(false);
  const [isDisclaimerModalOpen, setIsDisclaimerModalOpen] = useState(false);
  const [vendorLoading, setVendorLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [subProducts, setSubProducts] = useState([]);
  const [selectedSubProduct, setSelectedSubProduct] = useState(null);

  const [animateCart, setAnimateCart] = useState(false);
  const [isAddedToCart, setIsAddedToCart] = useState(false);
  const [toastShown, setToastShown] = useState({
    stockError: false,
    success: false,
    fetchError: false,
    productNotFound: false,
  });
  const [toastCount, setToastCount] = useState(0);
  const [selectedImage, setSelectedImage] = useState("");

  const [vendor, setVendor] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [availableColors, setAvailableColors] = useState([]);
  const [availableSizes, setAvailableSizes] = useState([]);
  const [selectedVariantStock, setSelectedVariantStock] = useState(0);
  const [allImages, setAllImages] = useState([]);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const db = getFirestore();

  const cart = useSelector((state) => state.cart || {});
  useEffect(() => {
    if (product && product.variants) {
      // Extract unique colors and sizes from product variants
      const uniqueColors = Array.from(
        new Set(product.variants.map((v) => v.color))
      );
      const uniqueSizes = Array.from(
        new Set(product.variants.map((v) => v.size))
      );

      // Initialize state variables
      setAvailableColors(uniqueColors);
      setAvailableSizes(uniqueSizes);
      setSelectedColor("");
      setSelectedSize("");
    } else {
      // Reset state variables if product is null or undefined
      setAvailableColors([]);
      setAvailableSizes([]);
      setSelectedColor("");
      setSelectedSize("");
    }
  }, [product]);

  useEffect(() => {
    if (product) {
      // Set initial images when the main product is loaded
      setAllImages(
        product.imageUrls?.length > 1
          ? [
              product.coverImageUrl,
              ...product.imageUrls.filter(
                (url) => url !== product.coverImageUrl
              ),
            ]
          : [product.coverImageUrl]
      );
    }
  }, [product]);
  useEffect(() => {
    if (product) {
      setMainImage(product.coverImageUrl); // Always store the main product's cover image
      setSelectedImage(product.coverImageUrl); // Initially display main product image

      // Set images to include main image plus other images if available
      setAllImages(
        product.imageUrls?.length > 1
          ? [
              product.coverImageUrl,
              ...product.imageUrls.filter(
                (url) => url !== product.coverImageUrl
              ),
            ]
          : [product.coverImageUrl]
      );
      setSubProducts(product.subProducts || []); // Store sub-products if available
    }
  }, [product]);

  useEffect(() => {
    if (product && selectedSize && selectedColor) {
      const productKey = `${product.vendorId}-${product.id}-${selectedSize}-${selectedColor}`;
      console.log("Checking cart for productKey:", productKey);

      const existingCartItem = cart?.[product.vendorId]?.products?.[productKey];

      if (existingCartItem) {
        setIsAddedToCart(true);
        setQuantity(existingCartItem.quantity);
        setAnimateCart(true);
        console.log("Product found in cart:", existingCartItem);
      } else {
        setIsAddedToCart(false);
        setQuantity(1);
        setAnimateCart(false);
        console.log("Product not found in cart for productKey:", productKey);
      }
    }
  }, [cart, product, selectedSize, selectedColor]);

  useEffect(() => {
    // Assuming sub-products are part of the product data
    if (product) {
      setSubProducts(product.subProducts || []);
      // Set the initial sub-product to the first one if available
      // if (product.subProducts && product.subProducts.length > 0) {
      //   setSelectedSubProduct(product.subProducts[0]);
      //   setSelectedColor(product.subProducts[0].color);
      //   setSelectedSize(product.subProducts[0].size);

      //   setMainImage(product.subProducts[0].images[0]);
      //   setSelectedVariantStock(product.subProducts[0].stock);
      // }
    }
  }, [product]);

  const handleSubProductClick = (subProduct) => {
    setSelectedSubProduct(subProduct);
    setSelectedImage(subProduct.images[0]);
    setSelectedColor(subProduct.color);
    setSelectedSize(subProduct.size);
    setAllImages(subProduct.images || []);
    setAvailableColors([subProduct.color]);
    setAvailableSizes([subProduct.size]);
  };

  // useEffect(() => {
  //   if (product) {
  //     setSelectedColor("");
  //     setSelectedSize("");
  //     setAvailableSizes(product.variants.map((variant) => variant.size)); // Show all sizes initially
  //     setAvailableColors(
  //       Array.from(new Set(product.variants.map((variant) => variant.color)))
  //     );
  //   }
  // }, [product]);

  useEffect(() => {
    if (product && product.variants) {
      const uniqueSizes = Array.from(
        new Set(product.variants.map((v) => v.size))
      );
      setAvailableSizes(uniqueSizes); // Show all sizes initially
    }
  }, [product]);
  useEffect(() => {
    if (product && product.variants) {
      const uniqueColors = Array.from(
        new Set(product.variants.map((v) => v.color))
      );
      const uniqueSizes = Array.from(
        new Set(product.variants.map((v) => v.size))
      );

      setAvailableColors(uniqueColors);
      setAvailableSizes(uniqueSizes);
      setSelectedColor("");
      setSelectedSize("");
    } else {
      setAvailableColors([]);
      setAvailableSizes([]);
      setSelectedColor("");
      setSelectedSize("");
    }
  }, [product]);

  const handleMainProductClick = () => {
    setSelectedSubProduct(null);
    setSelectedImage(mainImage);
    setSelectedColor("");
    setSelectedSize("");

    // Reset available colors and sizes to the main product’s variants
    const mainColors = Array.from(
      new Set(product.variants.map((v) => v.color))
    );
    const mainSizes = Array.from(new Set(product.variants.map((v) => v.size)));

    setAvailableColors(mainColors);
    setAvailableSizes(mainSizes);

    setAllImages(
      product.imageUrls?.length > 1
        ? [
            product.coverImageUrl,
            ...product.imageUrls.filter((url) => url !== product.coverImageUrl),
          ]
        : [product.coverImageUrl]
    );
  };

  // Automatically select color if only one is available

  useEffect(() => {
    if (selectedColor && selectedSize) {
      const matchingVariant = product.variants.find(
        (variant) =>
          variant.color === selectedColor && variant.size === selectedSize
      );
      setSelectedVariantStock(matchingVariant ? matchingVariant.stock : 0);
    }
  }, [selectedColor, selectedSize, product]);

  useEffect(() => {
    dispatch(fetchProduct(id)).catch((err) => {
      console.error("Failed to fetch product:", err);
      toast.error("Failed to load product details.");
    });
  }, [dispatch, id]);
  useEffect(() => {
    if (product) {
      setMainImage(product.coverImageUrl);
      setInitialImage(product.coverImageUrl);
    }
  }, [product]);

  useEffect(() => {
    if (product && product.vendorId) {
      fetchVendorData(product.vendorId);
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
    } finally {
      setVendorLoading(false);
    }
  };
  const handleDisclaimer = () => {
    const userAgreed = window.confirm(
      "Important Disclaimer: By agreeing to purchase this product, you acknowledge that it may have defects as described by the vendor. My Thrift does not assume any responsibility for any damages or defects associated with the product. The vendor has disclosed the condition of the product, and by proceeding with the purchase, you agree to accept the product in its current condition."
    );

    if (userAgreed) {
      console.log("User agreed to the disclaimer.");
    } else {
      console.log("User did not agree to the disclaimer.");
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
    console.log("Product:", product);
    console.log("Selected Size:", selectedSize);
    console.log("Selected Color:", selectedColor);
    console.log("Selected Sub-Product:", selectedSubProduct);
    console.log("Quantity:", quantity);

    if (!product) {
      console.error("Product is missing. Cannot add to cart.");
      return;
    }

    if (!selectedSize) {
      toast.error("Please select a size before adding to cart!");
      return;
    }

    if (!selectedColor) {
      toast.error("Please select a color before adding to cart!");
      return;
    }

    if (!product.id || !product.vendorId) {
      toast.error("Product or Vendor ID is missing. Cannot add to cart!");
      console.error("Product or Vendor ID is missing:", product);
      return;
    }

    // Determine stock based on selected product
    let maxStock = 0;
    if (selectedSubProduct) {
      maxStock = selectedSubProduct.stock;
      console.log("Sub-Product Stock:", maxStock);
      if (quantity > maxStock) {
        toast.error("Selected quantity exceeds stock availability!");
        return;
      }
    } else {
      const matchingVariant = product.variants.find(
        (variant) =>
          variant.color === selectedColor && variant.size === selectedSize
      );
      if (!matchingVariant) {
        toast.error("Selected variant is not available!");
        console.error(
          "Matching variant not found for selected size and color."
        );
        return;
      }
      maxStock = matchingVariant.stock;
      console.log("Variant Stock:", maxStock);
      if (quantity > maxStock) {
        toast.error("Selected quantity exceeds stock availability!");
        return;
      }
    }

    const productToAdd = {
      ...product,
      quantity,
      selectedSize,
      selectedColor,
      selectedImageUrl: selectedImage, // Use selectedImage which may change with sub-products
      selectedSubProduct, // Include this for reference if needed
    };

    // Generate the consistent productKey for this specific size/color combination
    const productKey = `${product.vendorId}-${product.id}-${selectedSize}-${selectedColor}`;
    console.log("Generated productKey:", productKey);

    // Check if the product with this size/color combination already exists in the cart
    const existingCartItem = cart?.[product.vendorId]?.products?.[productKey];

    if (existingCartItem) {
      const updatedProduct = {
        ...existingCartItem,
        quantity: quantity,
      };
      dispatch(addToCart(updatedProduct, true));
      console.log("Updated product in cart with new quantity:", updatedProduct);
    } else {
      dispatch(addToCart(productToAdd, true));
      console.log("Added new product to cart:", productToAdd);
    }

    setIsAddedToCart(true);
    toast.success(`Added ${product.name} to cart!`);
  }, [
    product,
    quantity,
    selectedSize,
    selectedColor,
    selectedSubProduct,
    dispatch,
    selectedImage,
    cart,
  ]);

  const handleIncreaseQuantity = useCallback(() => {
    console.log("Increase Quantity Triggered");
    console.log("Product:", product);
    console.log("Selected Size:", selectedSize);
    console.log("Selected Color:", selectedColor);
    console.log("Selected Sub-Product:", selectedSubProduct);
    console.log("Current Quantity:", quantity);

    if (!product) {
      console.error("Product not found.");
      return;
    }

    if (!selectedSize || !selectedColor) {
      toast.error("Please select a size and color before adjusting quantity.");
      return;
    }

    // Determine max stock based on selected product
    let maxStock = 0;
    if (selectedSubProduct) {
      maxStock = selectedSubProduct.stock;
      console.log("Sub-Product Stock:", maxStock);
    } else {
      const matchingVariant = product.variants.find(
        (variant) =>
          variant.color === selectedColor && variant.size === selectedSize
      );
      if (!matchingVariant) {
        toast.error("Selected variant is not available!");
        console.error(
          "Matching variant not found for selected size and color."
        );
        return;
      }
      maxStock = matchingVariant.stock;
      console.log("Variant Stock:", maxStock);
    }

    if (quantity < maxStock) {
      const updatedQuantity = quantity + 1;

      const productKey = `${product.vendorId}-${product.id}-${selectedSize}-${selectedColor}`;
      console.log("Generated Product Key:", productKey);

      const existingCartItem = cart?.[product.vendorId]?.products?.[productKey];

      if (existingCartItem) {
        dispatch(increaseQuantity({ vendorId: product.vendorId, productKey }));
        console.log("Increased quantity for product:", existingCartItem);
        setQuantity(updatedQuantity);
      } else {
        console.error("Product not found in cart for productKey:", productKey);
        toast.error("Product not found in cart");
      }
    } else {
      if (!toastShown.stockError) {
        toast.error("Cannot exceed available stock!");
        setToastShown((prev) => ({ ...prev, stockError: true }));
      }
      console.warn("Stock limit reached. Quantity exceeds stock quantity.");
    }
  }, [
    product,
    quantity,
    selectedSize,
    selectedColor,
    dispatch,
    toastShown,
    cart,
    selectedSubProduct,
  ]);

  const handleDecreaseQuantity = useCallback(() => {
    console.log("Decrease Quantity Triggered");
    console.log("Product:", product);
    console.log("Selected Size:", selectedSize);
    console.log("Selected Color:", selectedColor);
    console.log("Selected Sub-Product:", selectedSubProduct);
    console.log("Current Quantity:", quantity);

    if (!product) {
      console.error("Product not found.");
      return;
    }

    if (!selectedSize || !selectedColor) {
      toast.error("Please select a size and color before adjusting quantity.");
      return;
    }

    if (quantity > 1) {
      const updatedQuantity = quantity - 1;

      const productKey = `${product.vendorId}-${product.id}-${selectedSize}-${selectedColor}`;
      console.log("Generated Product Key:", productKey);

      const existingCartItem = cart?.[product.vendorId]?.products?.[productKey];

      if (existingCartItem) {
        dispatch(decreaseQuantity({ vendorId: product.vendorId, productKey }));
        console.log("Decreased quantity for product:", existingCartItem);
        setQuantity(updatedQuantity);
      } else {
        console.error("Product not found in cart for productKey:", productKey);
        toast.error("Product not found in cart");
      }
    } else {
      console.warn("Quantity is already at 1. Cannot decrease further.");
    }
  }, [
    product,
    quantity,
    selectedSize,
    selectedColor,
    dispatch,
    cart,
    selectedSubProduct,
  ]);

  const formatPrice = (price) => {
    return price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const capitalizeFirstLetter = (color) => {
    return color.charAt(0).toUpperCase() + color.slice(1).toLowerCase();
  };

  // Check if a color is available for the selected size
  const isColorAvailableForSize = (color) => {
    return product.variants.some(
      (variant) => variant.size === selectedSize && variant.color === color
    );
  };

  // Handle color selection

  const updateSizes = (color) => {
    const uniqueSizesForColor = Array.from(
      new Set(
        product.variants
          .filter((variant) => variant.color === color)
          .map((variant) => variant.size)
      )
    );
    setAvailableSizes(uniqueSizesForColor);
  };

  // Handle color selection and update sizes
  // Function to update sizes based on the selected color and set available sizes for that color
  const updateSizesForColor = (color) => {
    const sizesForColor = product.variants
      .filter((variant) => variant.color === color)
      .map((variant) => ({
        size: variant.size,
        stock: variant.stock,
      }));
    setAvailableSizes(sizesForColor);
  };

  // Handle color selection and update sizes to show only available sizes for that color
  const handleColorClick = (color) => {
    if (selectedSubProduct) {
      // Prevent changing color if a sub-product is selected
      console.log("Sub-product selected; cannot change color.");
      return;
    }

    console.log("Color clicked:", color);

    if (selectedColor === color) {
      setSelectedColor("");
      setAvailableSizes(
        Array.from(new Set(product.variants.map((variant) => variant.size)))
      );
      setSelectedSize("");
      console.log("Color deselected. Available sizes reset.");
    } else {
      setSelectedColor(color);
      const sizesForColor = product.variants
        .filter((variant) => variant.color === color)
        .map((variant) => variant.size);
      const uniqueSizesForColor = Array.from(new Set(sizesForColor));
      setAvailableSizes(uniqueSizesForColor);
      setSelectedSize("");
      console.log("Color selected:", color);
      console.log("Available sizes for color:", uniqueSizesForColor);
    }
  };

  // Function to check if a specific size has stock for the selected color
  const isSizeInStock = (size) => {
    if (selectedSubProduct) {
      return selectedSubProduct.size === size && selectedSubProduct.stock > 0;
    } else if (selectedColor) {
      const matchingVariant = product.variants.find(
        (variant) => variant.color === selectedColor && variant.size === size
      );
      return matchingVariant && matchingVariant.stock > 0;
    }
    return true;
  };

  const handleSizeClick = (size) => {
    if (!isSizeInStock(size)) {
      console.log("Size clicked is out of stock:", size);
      return;
    }

    if (selectedSize === size) {
      setSelectedSize("");
      console.log("Size deselected:", size);
    } else {
      setSelectedSize(size);
      console.log("Size selected:", size);
    }
  };

  // Check if size is available for the selected color
  const isSizeAvailableForColor = (size) => {
    if (selectedSubProduct) {
      // Check availability based on the selected sub-product only
      return selectedSubProduct.size === size;
    }

    // Fallback to the main product's variants if no sub-product is selected
    return product.variants.some(
      (variant) => variant.color === selectedColor && variant.size === size
    );
  };

  const handleRemoveFromCart = useCallback(() => {
    console.log("Remove from Cart Triggered");
    console.log("Product:", product);
    console.log("Selected Size:", selectedSize);
    console.log("Selected Color:", selectedColor);
    console.log("Selected Sub-Product:", selectedSubProduct);

    if (!product || !product.id || !selectedSize || !selectedColor) return;

    const productKey = `${product.vendorId}-${product.id}-${selectedSize}-${selectedColor}`;
    console.log("Removing product with productKey:", productKey);

    dispatch(removeFromCart({ vendorId: product.vendorId, productKey }));
    setIsAddedToCart(false);
    setQuantity(1);
    toast.success(`${product.name} removed from cart!`);
  }, [dispatch, product, selectedSize, selectedColor, selectedSubProduct]);

  const sizes =
    product && product.size
      ? product.size.split(",").map((size) => size.trim())
      : [];

  const colors =
    product && product.color
      ? product.color.split(",").map((color) => color.trim())
      : [];

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

  const shouldShowAlikeProducts = subProducts && subProducts.length > 0;

  const AlikeProducts = () => (
    <div className="alike-products p-3 mt-1">
      <h2 className="text-lg font-semibold font-opensans mb-2">
        Similar Products
      </h2>
      <div className="flex gap-4 overflow-x-scroll">
        <div
          className="w-48 min-w-48 cursor-pointer"
          onClick={handleMainProductClick}
        >
          <div className="relative mb-2">
            <img
              src={mainImage} // Ensures this is always the main product image
              alt="Original image"
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

        {/* Map through Sub-Products */}
        {subProducts.map((subProduct, index) => {
          const isOutOfStock = subProduct.stock <= 0;

          return (
            <div
              key={index}
              className={`w-48 min-w-48 ${
                isOutOfStock
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer"
              }`}
              onClick={() => {
                if (!isOutOfStock) {
                  handleSubProductClick(subProduct);
                }
              }}
            >
              <div className="relative mb-2">
                <img
                  src={subProduct.images[0]}
                  alt={`Sub-product ${index + 1}`}
                  className="h-52 w-full object-cover rounded-lg"
                />
              </div>
              <p className="text-sm font-opensans text-black font-normal">
                {isOutOfStock ? "Out of Stock" : product.name}
              </p>
              <p className="text-lg font-opensans font-bold text-black">
                ₦{formatPrice(product.price)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );

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
              onClick={() =>
                navigate("/latest-cart", { state: { fromProductDetail: true } })
              }
              className="text-2xl cursor-pointer "
            />
          </div>
        </div>
      </div>
      <div className="flex justify-center h-[540px]">
        {/* Only show Swiper if there's more than one image */}
        {allImages.length > 1 ? (
          <Swiper
            modules={[FreeMode, Autoplay]}
            pagination={{ clickable: true }}
            navigation
            autoplay={{
              delay: 7500,
              disableOnInteraction: false,
            }}
            className="product-images-swiper mt-20"
            style={{ width: "100%", height: "" }}
          >
            {allImages.map((image, index) => (
              <SwiperSlide key={index}>
                <img
                  src={image}
                  alt={`${product.name} image ${index + 1}`}
                  className="object-cover w-full h-full"
                  style={{ borderBottom: "6px solid white" }} // White line separator
                />
              </SwiperSlide>
            ))}
          </Swiper>
        ) : (
          // If there's only one image, display it without the Swiper
          <img
            src={allImages[0]}
            alt={`${product.name} image`}
            className="object-cover w-full h-full rounded-b-lg"
          />
        )}
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
                  onClick={handleDisclaimer} // Optional: Add an actual function for handling disclaimers
                  title="Click for important information about product defects"
                />
                <p className="ml-2 text-xs text-red-500">
                  {product.condition}
                  {product.defectDescription
                    ? ` ${product.defectDescription}`
                    : ""}
                </p>
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
            ) : null}
          </div>
        </div>

        <p className="text-2xl font-opensans font-semibold text-black">
          ₦{formatPrice(product.price)}
        </p>

        {vendorLoading ? (
          <LoadProducts className="mr-20" />
        ) : vendor ? (
          <div className="flex items-center mt-1">
            <p className="text-sm text-red-600 mr-2">{vendor.shopName}</p>
            {vendor.ratingCount > 0 && (
              <div className="flex items-center">
                <span className="mr-1 text-black font-medium ratings-text">
                  {averageRating}
                </span>
                <FaStar className="text-yellow-500 ratings-text" />
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-500">
            Vendor information not available
          </p>
        )}

        {/* Color Options */}
        {availableColors.length > 0 && (
          <div className="mt-3">
            <p className="text-sm font-semibold text-black font-opensans mb-2">
              {selectedColor ? capitalizeFirstLetter(selectedColor) : "Colors"}
            </p>
            <div className="flex flex-wrap gap-2">
              {availableColors.map((color, index) => (
                <div
                  key={index}
                  onClick={() => {
                    if (!selectedSubProduct) {
                      handleColorClick(color);
                    }
                  }}
                  className={`w-8 h-8 flex items-center justify-center rounded-full ${
                    selectedSubProduct
                      ? "cursor-not-allowed opacity-50"
                      : "cursor-pointer"
                  } ${selectedColor === color ? "border-2" : ""}`}
                  style={{
                    padding: "3px",
                    borderColor:
                      selectedColor === color ? color : "transparent",
                    backgroundColor: "#f0f0f0",
                  }}
                  title={color}
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

        {/* Size Selection */}
        {availableSizes.length > 0 && (
          <div className="mt-3">
            <p className="text-sm font-semibold text-black font-opensans mb-2">
              Sizes
            </p>
            <div className="flex flex-wrap gap-2">
              {availableSizes.map((size, index) => {
                const inStock = isSizeInStock(size);
                const isSelected = selectedSize === size && inStock;

                return (
                  <div
                    key={index}
                    onClick={() => {
                      if (inStock) {
                        handleSizeClick(size);
                      }
                    }}
                    className={`py-2 px-4 border rounded-lg ${
                      isSelected
                        ? "bg-customOrange text-white cursor-pointer"
                        : inStock
                        ? "bg-transparent text-black cursor-pointer"
                        : "bg-transparent text-black opacity-50 cursor-not-allowed"
                    }`}
                    style={{ position: "relative" }}
                  >
                    <span className="text-xs font-semibold">{size}</span>
                    {!inStock && (
                      <span
                        className="absolute inset-0 flex items-center justify-center text-black text-xs font-bold"
                        style={{
                          transform: "rotate(59deg) scaleX(0.3)",
                          fontSize: "4.3rem",
                          lineHeight: "0.1rem",
                          fontWeight: "100",
                        }}
                      >
                        /
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div
          className="flex justify-between items-center mt-4 mb-4 cursor-pointer"
          onClick={() => setIsModalOpen(true)}
        >
          <p className="text-black text-md font-opensans ">Product Details</p>
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

      <div
        className="fixed bottom-0 left-0 right-0 z-50 p-3 flex justify-between items-center"
        style={{
          background:
            "linear-gradient(to top, white, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0) 97%)",
          zIndex: 9999,
        }}
      >
        {!selectedSize || !selectedColor ? (
          // Prompt user to select size and color
          <button
            onClick={() => {
              toast.error("Please select size and color");
            }}
            className={`bg-customOrange text-white h-12 rounded-full font-opensans font-semibold w-full transition-all duration-300 ease-in-out`}
          >
            Add to Cart
          </button>
        ) : !isAddedToCart ? (
          // The "Add to Cart" button
          <button
            onClick={() => {
              handleAddToCart();
              setAnimateCart(true); // Trigger the animation
            }}
            className={`bg-customOrange text-white h-12 rounded-full font-opensans font-semibold w-full transition-all duration-300 ease-in-out`}
          >
            Add to Cart
          </button>
        ) : (
          // The Remove and Quantity controls
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
