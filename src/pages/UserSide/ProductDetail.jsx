/* eslint-disable jsx-a11y/img-redundant-alt */
import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { addToCart, removeFromCart } from "../../redux/actions/action";
import { fetchProduct } from "../../redux/actions/productaction";
import Loading from "../../components/Loading/Loading";
import { PiShoppingCartBold } from "react-icons/pi";
import { FaExclamationTriangle, FaSmileBeam, FaStar } from "react-icons/fa";
import { CiCircleInfo } from "react-icons/ci";
import { TbInfoOctagon } from "react-icons/tb";
import { TbInfoTriangle } from "react-icons/tb";
import LoadProducts from "../../components/Loading/LoadProducts";
import { GoChevronLeft, GoChevronRight } from "react-icons/go";
import { LuCopyCheck, LuCopy } from "react-icons/lu";
import toast from "react-hot-toast";
import Modal from "react-modal";
import { FiPlus } from "react-icons/fi";
import { buildCartKey } from "../../services/cartKey";
import { FiMinus } from "react-icons/fi";
import { TbSquareRoundedCheck } from "react-icons/tb";
import Badge from "../../components/Badge/Badge";
import { MdCancel, MdOutlineCancel, MdOutlineClose } from "react-icons/md";
import "swiper/css/free-mode";
import { TbFileDescription } from "react-icons/tb";
import "swiper/css/autoplay";
import { useLocation } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import Select from "react-select";
import "swiper/css";
import { RotatingLines } from "react-loader-spinner";

import { AnimatePresence, motion } from "framer-motion";
// import SwiperCore, { Pagination,  } from "swiper";
import { FreeMode, Autoplay } from "swiper/modules";
import {
  doc,
  getDoc,
  getFirestore,
  collection,
  serverTimestamp,
  addDoc,
} from "firebase/firestore";
import { findVariant } from "../../services/getVariant";
import RelatedProducts from "./SimilarProducts";
import Productnotofund from "../../components/Loading/Productnotofund";
import { decreaseQuantity, increaseQuantity } from "../../redux/actions/action";
import { AiOutlineHome } from "react-icons/ai";
import { auth, db } from "../../firebase.config";
import IkImage from "../../services/IkImage";
import SEO from "../../components/Helmet/SEO";
import QuestionandA from "../../components/Loading/QuestionandA";
import { LiaTimesSolid } from "react-icons/lia";
import { handleUserActionLimit } from "../../services/userWriteHandler";
import SafeImg from "../../services/safeImg";
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
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isShared = searchParams.has("shared");

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
  const { isActive, vendorId } = useSelector((state) => state.stockpile);
  const [isSending, setIsSending] = useState(false);
  const [isThankYouOpen, setIsThankYouOpen] = useState(false);

  const [vendor, setVendor] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [availableColors, setAvailableColors] = useState([]);
  const [availableSizes, setAvailableSizes] = useState([]);
  const [selectedVariantStock, setSelectedVariantStock] = useState(0);
  const [allImages, setAllImages] = useState([]);
  const [isLinkCopied, setIsLinkCopied] = useState(false);

  const currentUser = auth.currentUser;
  const userData = useSelector((state) => state.user.userData);
  const [isAskModalOpen, setIsAskModalOpen] = useState(false);
  const [questionText, setQuestionText] = useState("");
  // Inside your ProductDetailPage component
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);

  const handleOpenModal = () => setShowModal(true);
  const handleCloseModal = () => setShowModal(false);
  const db = getFirestore();

  const cart = useSelector((state) => state.cart || {});

  const [showHeader, setShowHeader] = useState(true);
  const prevScrollPos = useRef(0);

  useEffect(() => {
      const handleScroll = () => {
        const currentPos = window.scrollY;
        if (currentPos > prevScrollPos.current) {
          setShowHeader(false);
        } else {
          setShowHeader(true);
        }
        prevScrollPos.current = currentPos;
      };
      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => window.removeEventListener("scroll", handleScroll);
    }, []);

  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        const productRef = doc(db, "products", id); // Fetch product by ID
        const productSnap = await getDoc(productRef);

        if (productSnap.exists()) {
          const productData = productSnap.data();
          if (!productData.published) {
            toast.dismiss();
            toast.error("This product is no longer available.");
          } else {
            dispatch(fetchProduct(id));
          }
        } else {
          // toast.error("Product not found.");
        }
      } catch (err) {
        console.error("Error fetching product details:", err);
        toast.error("Failed to load product details.");
      }
    };

    fetchProductDetails();
  }, [id, dispatch, navigate, db]);

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
  const isStockpileForThisVendor = useMemo(() => {
    return isActive && vendorId === product?.vendorId;
  }, [isActive, vendorId, product?.vendorId]);
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
  // put this near the top, right after you pull `product` from redux
  const isFashion = product?.isFashion; // boolean – AddProduct already writes it

  const variants = React.useMemo(
    () => (Array.isArray(product?.variants) ? product.variants : []),
    [product]
  );

  useEffect(() => {
    if (product && selectedSize && selectedColor) {
      // Generate product key based on whether it's a sub-product or a variant
      const productKey = buildCartKey({
        vendorId: product.vendorId,
        productId: product.id,
        isFashion,
        selectedSize,
        selectedColor,
        subProductId: selectedSubProduct?.subProductId,
      });
      console.log("Checking cart for productKey:", productKey);

      // Check if the item exists in the cart
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
  }, [cart, product, selectedSize, selectedColor, selectedSubProduct]);

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
    swiperRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    setSelectedSubProduct(subProduct);
    setSelectedImage(subProduct.images[0]);
    setSelectedColor(subProduct.color);
    setSelectedSize(subProduct.size);
    setAllImages(subProduct.images || []);
    setAvailableColors([subProduct.color]);
    setAvailableSizes([subProduct.size]);
  };

  const handleDotClick = (index) => {
    setCurrentImageIndex(index);
    const swiperInstance = document.querySelector(".swiper").swiper;
    swiperInstance.slideTo(index);
  };
  // const truncatedText =
  //   product.defectDescription?.length > 10
  //     ? product.defectDescription.slice(0, 10) + "... tap to view"
  //     : product.defectDescription;

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
    // Only run for products that really have variants
    if (!Array.isArray(product?.variants)) {
      setSelectedVariantStock(0);
      return;
    }

    if (selectedColor && selectedSize) {
      const variant = findVariant(product, selectedSize, selectedColor);
      setSelectedVariantStock(variant ? variant.stock : 0);
    }
  }, [product, selectedColor, selectedSize]);
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

  // Dynamically generate meta tag data
  const metaTitle = product?.name
    ? `${product.name} - Buy Now on My Thrift`
    : "My Thrift Product Details";
  const metaDescription = product?.description
    ? product.description
    : "Discover amazing deals on My Thrift!";
  const metaImage = product?.coverImageUrl
    ? product.coverImageUrl
    : `${window.location.origin}/logo512.png`;
  const metaUrl = encodeURI(`${window.location.origin}/product/${id}`);

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
  const swiperRef = useRef(null);

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

    // Ask for size / colour ONLY when it’s a fashion item
    if (isFashion) {
      if (!selectedSize) return toast.error("Please select a size first!");
      if (!selectedColor) return toast.error("Please select a color first!");
    }

    if (!product.id || !product.vendorId) {
      toast.error("Product or Vendor ID is missing. Cannot add to cart!");
      console.error("Product or Vendor ID is missing:", product);
      return;
    }

    /* ---------- determine stock ---------- */
    let maxStock = 0;

    if (selectedSubProduct) {
      maxStock = selectedSubProduct.stock;
    } else if (isFashion) {
      // only check variants for true fashion items
      const matchingVariant = findVariant(
        { variants },
        selectedSize,
        selectedColor
      );
      if (!matchingVariant) {
        toast.error("Selected variant is not available!");
        console.error(
          "Matching variant not found for selected size and color."
        );
        return;
      }
      maxStock = matchingVariant.stock;
    } else {
      maxStock = Number(product.stockQuantity ?? product.stock ?? 1);
    }

    if (quantity > maxStock) {
      toast.error("Selected quantity exceeds stock availability!");
      return;
    }
    /* ---------- /determine stock ---------- */

    const productToAdd = {
      ...product,
      quantity,
      selectedSize,
      selectedColor,
      selectedImageUrl: selectedImage,
      selectedSubProduct,
      subProductId: selectedSubProduct ? selectedSubProduct.subProductId : null,
    };

    const productKey = buildCartKey({
      vendorId: product.vendorId,
      productId: product.id,
      isFashion,
      selectedSize,
      selectedColor,
      subProductId: selectedSubProduct?.subProductId,
    });
    console.log("Generated productKey in add:", productKey);

    const existingCartItem = cart?.[product.vendorId]?.products?.[productKey];

    if (existingCartItem) {
      dispatch(addToCart({ ...existingCartItem, quantity }, true));
    } else {
      dispatch(addToCart(productToAdd, true));
    }

    setIsAddedToCart(true);
    toast.success(
      isStockpileForThisVendor
        ? `${product.name} added to Pile!`
        : `Added ${product.name} to cart!`
    );
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

  const handleSendQuestion = useCallback(async () => {
    console.log("[Q&A] send button clicked, questionText:", questionText);
    const q = questionText.trim();
    if (!q) {
      console.log("[Q&A] no text, aborting");
      return toast.error("Please enter a question.");
    }

    // Immediately show spinner/disable UI
    setIsSending(true);

    // 1) Enforce a daily limit of 3 questions
    try {
      await handleUserActionLimit(
        currentUser.uid,
        "askQuestion",
        {}, // no extra userData
        { dayLimit: 3 } // cap at 3 per 24 hours
      );
    } catch (limitError) {
      // Rate limit hit: hide spinner and show error instantly
      setIsSending(false);
      return toast.error(limitError.message);
    }

    // build your object so you can inspect it
    const inquiryPayload = {
      productId: id,
      productName: product.name,
      vendorId: product.vendorId,
      customerId: currentUser.uid,
      question: q,
      status: "open",
      createdAt: serverTimestamp(),
      hasRead: false,
      customerHasRead: false,
      uid: currentUser.uid,
      email: currentUser.email,
    };

    console.log("[Q&A] payload to write:", inquiryPayload);

    try {
      console.log("[Q&A] writing to Firestore…");
      await addDoc(collection(db, "inquiries"), inquiryPayload);
      console.log("[Q&A] write succeeded");
      setIsAskModalOpen(false);
      setIsThankYouOpen(true);
    } catch (err) {
      console.error("[Q&A] write failed:", err);
      toast.error("Failed to send. Please try again.");
    } finally {
      console.log("[Q&A] send handler complete");
      setIsSending(false);
    }
  }, [questionText, id, product, currentUser, db]);

  const handleIncreaseQuantity = useCallback(() => {
    console.log("Increase Quantity Triggered");
    console.log("Product:", product);
    console.log("Selected Size:", selectedSize);
    console.log("Selected Color:", selectedColor);
    console.log("Selected Sub-Product:", selectedSubProduct);
    console.log("Current Quantity:", quantity);

    if (!product) return console.error("Product not found.");

    // Fashion items still need size + colour picked
    if (isFashion && (!selectedSize || !selectedColor)) {
      return toast.error(
        "Please select a size and color before adjusting quantity."
      );
    }

    /* ---------- figure out maxStock ---------- */
    let maxStock;

    if (selectedSubProduct) {
      maxStock = selectedSubProduct.stock;
    } else if (isFashion) {
      const matchingVariant = findVariant(
        { variants },
        selectedSize,
        selectedColor
      );
      if (!matchingVariant) {
        toast.error("Selected variant is not available!");
        console.error(
          "Matching variant not found for selected size and color."
        );
        return;
      }
      maxStock = matchingVariant.stock;
    } else {
      maxStock = Number(product.stockQuantity ?? product.stock ?? 1);
    }
    /* ---------- /figure out maxStock ---------- */

    if (quantity >= maxStock) {
      if (!toastShown.stockError) {
        toast.error("Cannot exceed available stock!");
        setToastShown((prev) => ({ ...prev, stockError: true }));
      }
      return;
    }

    const updatedQuantity = quantity + 1;

    const productKey = buildCartKey({
      vendorId: product.vendorId,
      productId: product.id,
      isFashion,
      selectedSize,
      selectedColor,
      subProductId: selectedSubProduct?.subProductId,
    });

    const existingCartItem = cart?.[product.vendorId]?.products?.[productKey];
    if (!existingCartItem) {
      console.error("Product not found in cart for productKey:", productKey);
      return toast.error("Product not found in cart");
    }

    dispatch(increaseQuantity({ vendorId: product.vendorId, productKey }));
    setQuantity(updatedQuantity);
  }, [
    product,
    quantity,
    selectedSize,
    selectedColor,
    dispatch,
    toastShown,
    cart,
    selectedSubProduct,
    isFashion,
  ]);

  const handleDecreaseQuantity = useCallback(() => {
    console.log("Decrease Quantity Triggered");
    console.log("Product:", product);
    console.log("Selected Size:", selectedSize);
    console.log("Selected Color:", selectedColor);
    console.log("Selected Sub-Product:", selectedSubProduct);
    console.log("Current Quantity:", quantity);

    if (!product) return console.error("Product not found.");

    if (isFashion && (!selectedSize || !selectedColor)) {
      return toast.error(
        "Please select a size and color before adjusting quantity."
      );
    }

    if (quantity <= 1) {
      console.warn("Quantity is already at 1. Cannot decrease further.");
      return toast.error("Quantity cannot be less than 1");
    }

    const updatedQuantity = quantity - 1;

    const productKey = buildCartKey({
      vendorId: product.vendorId,
      productId: product.id,
      isFashion,
      selectedSize,
      selectedColor,
      subProductId: selectedSubProduct?.subProductId,
    });

    const existingCartItem = cart?.[product.vendorId]?.products?.[productKey];
    if (!existingCartItem) {
      console.error("Product not found in cart for productKey:", productKey);
      return toast.error("Product not found in cart");
    }

    dispatch(decreaseQuantity({ vendorId: product.vendorId, productKey }));
    setQuantity(updatedQuantity);
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
    return variants.some(
      (variant) => variant.size === selectedSize && variant.color === color
    );
  };
  const cartItemCount = Object.values(cart || {}).reduce(
    (vendorAcc, vendor) => {
      if (!vendor.products) return vendorAcc;
      return (
        vendorAcc +
        Object.values(vendor.products).reduce((productAcc, product) => {
          return productAcc + (product.quantity || 0);
        }, 0)
      );
    },
    0
  );
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
    // Everyday items (no variants) don’t gate on size at all
    if (!isFashion) return true;

    // Sub-product path
    if (selectedSubProduct) {
      return selectedSubProduct.size === size && selectedSubProduct.stock > 0;
    }

    // Regular fashion variant path
    if (selectedColor) {
      const matchingVariant = findVariant({ variants }, size, selectedColor);
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
    return variants.some(
      (variant) => variant.color === selectedColor && variant.size === size
    );
  };
  // Helper function to parse the color string and return appropriate style
  const getColorStyle = (colorString) => {
    // Convert to lowercase and split by ',' or 'and'
    const colors = colorString
      .toLowerCase()
      .split(/(?:,|and)/) // Splits by ',' or 'and'
      .map((c) => c.trim())
      .filter((c) => c);

    if (colors.length === 2) {
      // Split the circle exactly in half with two colors
      return {
        background: `linear-gradient(to right, ${colors[0]} 50%, ${colors[1]} 50%)`,
      };
    } else if (colors.length === 1) {
      // Single color: solid background
      return {
        backgroundColor: colors[0],
      };
    } else {
      // No valid colors: fallback to a default or transparent
      return {
        backgroundColor: "#f0f0f0",
      };
    }
  };

  const handleRemoveFromCart = useCallback(() => {
    console.log("Remove from Cart Triggered");
    console.log("Product:", product);
    console.log("Selected Size:", selectedSize);
    console.log("Selected Color:", selectedColor);
    console.log("Selected Sub-Product:", selectedSubProduct);

    if (!product || !product.id) return; // basic guard

    // Only gate on size/colour for fashion items
    if (isFashion && (!selectedSize || !selectedColor)) return;

    const productKey = buildCartKey({
      vendorId: product.vendorId,
      productId: product.id,
      isFashion,
      selectedSize,
      selectedColor,
      subProductId: selectedSubProduct?.subProductId,
    });

    dispatch(removeFromCart({ vendorId: product.vendorId, productKey }));
    setIsAddedToCart(false);
    setQuantity(1);
    toast.success(`${product.name} removed from cart!`);
  }, [
    dispatch,
    product,
    selectedSize,
    selectedColor,
    selectedSubProduct,
    isFashion,
  ]);

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
      const shareableLink = `https://mx.shopmythrift.store/product/${id}?shared=true`;

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
  if (!product?.published) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <Productnotofund />
        <h1 className="text-2xl font-opensans font-bold text-red-600 mb-2">
          Product Not Found
        </h1>
        <p className="text-lg text-gray-700 font-opensans mb-4">
          It looks like this product has been removed or unpublished by the
          vendor.
        </p>
        <button
          className="w-32 bg-customOrange font-opensans text-xs px-2 h-10 text-white rounded-lg mt-12"
          onClick={() => navigate("/newhome")} // Navigate to the homepage
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
          {product.discount &&
            product.discount.initialPrice &&
            product.discount.discountType !== "personal-freebies" && (
              <p className="text-sm font-opensans text-gray-500 line-through">
                ₦{formatPrice(product.discount.initialPrice)}
              </p>
            )}
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
              {product.discount &&
                product.discount.initialPrice &&
                product.discount.discountType !== "personal-freebies" && (
                  <p className="text-sm font-opensans text-gray-500 line-through">
                    ₦{formatPrice(product.discount.initialPrice)}
                  </p>
                )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <SEO
        title={product.name}
        description={product.description}
        image={product.coverImageUrl}
        url={`https://www.shopmythrift.store/product/${product.id}`}
      />
      <div className="relative pb-20">
        <div>
          {isShared ? (
            <>
                <div
                  className={`px-2 fixed top-0 left-0 w-full h-20 py-10 bg-white z-20 shadow-md`}
                >
                  <div className="flex items-center justify-between h-full">
                    <div className="w-full ">
                      {/* LEFT: logo */}
                      <div className="flex items-center justify-center"><img
                        src="/newlogo.png"
                        alt="Logo"
                        onClick={() => navigate("/newhome")}
                        className="h-8 w-16 object-contain"
                      /></div>
                      

                      {/* RIGHT: login & sign up */}
                      <div className="flex mt-4 justify-between  gap-4 w-full items-center ">
                        <button
                          onClick={() => navigate("/login")}
                          className="px-4 py-1 text-sm w-full font-opensans text-customRichBrown border border-customRichBrown rounded-full"
                        >
                          Login
                        </button>
                        <button
                          onClick={() => navigate("/signup")}
                          className="px-4 py-1 w-full text-sm font-opensans text-white bg-customOrange rounded-full"
                        >
                          Sign Up
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
            </>
          ) : (
            <>
            <div
                  className={`px-2 fixed top-0 left-0 w-full h-20 py-10 z-20 bg-gradient-to-b from-white via-white to-transparent`}
                >
                  <div className="flex items-center justify-between h-full">
              {/* your existing “back + title” on the left */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigate(-1)}
                  className={`w-10 h-10 rounded-full bg-gradient-to-br from-transparent to-black/30 backdrop-blur-md flex items-center justify-center shadow-lg hover:bg-white/30 transition-opacity duration-300 border border-white/40
          ${showHeader ? "opacity-100" : "opacity-30"}`}
                >
                  <GoChevronLeft className="text-white text-xl" />
                </button>

                <span className={`text-lg font-opensans font-semibold ${showHeader ? "" : "opacity-0"}`}>
                  Details
                </span>
              </div>

              {/* your existing copy/cart on the right */}
              <div className="flex items-center space-x-2 relative">
                <button
                  className={`w-10 h-10 rounded-full bg-gradient-to-br from-transparent to-black/30 backdrop-blur-md flex items-center justify-center shadow-lg hover:bg-white/30 transition-opacity duration-300 border border-white/40
          ${showHeader ? "opacity-100" : "opacity-30"}`}
                  onClick={copyProductLink}
                >
                  {isLinkCopied ? (
                    <LuCopyCheck className="text-white text-xl" />
                  ) : (
                    <LuCopy className="text-white text-xl" />
                  )}
                </button>

                <button
                  className={`w-10 h-10 rounded-full bg-gradient-to-br from-transparent to-black/30 backdrop-blur-md flex items-center justify-center shadow-lg hover:bg-white/30 transition-opacity duration-300 border border-white/40
          ${showHeader ? "opacity-100" : "opacity-30"}`}
                  onClick={() =>
                    navigate("/latest-cart", {
                      state: { fromProductDetail: true },
                    })
                  }
                >
                  <PiShoppingCartBold className="text-white text-xl" />
                  {cartItemCount > 0 && (
                    <div className="-top-1 absolute right-0">
                      <Badge count={cartItemCount} />
                    </div>
                  )}
                </button>
              </div></div></div>
            </>
          )}
        </div>

        <div
          ref={swiperRef}
          className={`flex rounded-t-md justify-center h-[540px] relative mt-20`}
        >
          {allImages.length > 1 ? (
            <>
              <Swiper
                modules={[FreeMode, Autoplay]}
                pagination={{ clickable: true }}
                autoplay={{
                  delay: 7500,
                  disableOnInteraction: false,
                }}
                className="product-images-swiper"
                onSlideChange={(swiper) =>
                  setCurrentImageIndex(swiper.activeIndex)
                }
              >
                {allImages.map((image, index) => (
                  <SwiperSlide key={index}>
                    <div className="relative w-full h-full">
                      <SafeImg
                        src={image}
                        alt={`${product.name} image ${index + 1}`}
                        className="object-cover w-full h-full"
                      />
                      {/* Discount Badge inside each slide */}
                      {index === 0 && product.discount && (
                        <div className="absolute top-2 right-2 z-20">
                          {product.discount.discountType.startsWith(
                            "personal-freebies"
                          ) ? (
                            <div className="bg-customPink text-customOrange text-xs px-2 py-1.5 font-opensans font-medium rounded">
                              {product.discount.freebieText}
                            </div>
                          ) : (
                            <div className="bg-customPink text-customOrange text-xs px-2 py-1.5 font-opensans font-medium rounded">
                              -{product.discount.percentageCut}%
                            </div>
                          )}
                        </div>
                      )}
                      {index === 0 && product.defectDescription && (
                        <div
                          onClick={handleOpenModal}
                          className="px-3 w-28 py-1 absolute bg-opacity-40 bottom-16 right-2 bg-black rounded-md cursor-pointer"
                        >
                          <p className="text-[10px]  text-white font-opensans">
                            Tap to view defect description
                          </p>
                        </div>
                      )}
                      <div className="absolute bottom-12 left-2 bg-white bg-opacity-40 px-2 py-1 rounded-lg shadow-md flex items-center space-x-2">
                        <p className="text-xs font-opensans text-gray-700">
                          Still not sure?
                        </p>
                        <button
                          onClick={() => {
                            if (!currentUser) {
                              navigate("/login", {
                                state: { from: location.pathname },
                              });
                            } else {
                              setIsAskModalOpen(true);
                            }
                          }}
                          className="text-xs font-semibold font-opensans text-customOrange hover:underline focus:outline-none"
                        >
                          Ask a question
                        </button>
                      </div>
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>

              {/* Dot Indicators */}
              <div className="absolute bottom-4 z-10 w-full flex justify-center">
                {allImages.map((_, index) => (
                  <div
                    key={index}
                    className={`cursor-pointer mx-1 rounded-full transition-all duration-300 ${
                      index === currentImageIndex
                        ? "bg-customOrange h-3 w-3"
                        : "bg-gray-300 h-2 w-2"
                    }`}
                    onClick={() => handleDotClick(index)}
                  ></div>
                ))}
              </div>
            </>
          ) : (
            // Single image fallback
            <>
              <IkImage
                src={allImages[0]}
                alt={`${product.name} image`}
                className="object-cover w-full h-full rounded-b-lg"
              />
              {product.discount && (
                <div className="absolute top-10 right-2 ">
                  {product.discount.discountType.startsWith(
                    "personal-freebies"
                  ) ? (
                    <div className="bg-customPink text-customOrange text-xs px-2 py-1.5 font-opensans font-medium rounded">
                      {product.discount.freebieText}
                    </div>
                  ) : (
                    <div className="bg-customPink text-customOrange text-xs px-2 py-1.5 font-opensans font-medium rounded">
                      -{product.discount.percentageCut}%
                    </div>
                  )}
                </div>
              )}
              {product.defectDescription && (
                <div
                  onClick={handleOpenModal}
                  className="px-3 w-28 py-1 absolute bg-opacity-40 bottom-16 right-2 bg-black rounded-md cursor-pointer"
                >
                  <p className="text-xs text-white font-opensans truncate">
                    {product.defectDescription.slice(0, 20)} ...
                  </p>
                  <span className="text-[10px]  text-white font-opensans">
                    Tap to view defect
                  </span>
                </div>
              )}

              <div className="absolute bottom-4 left-2 bg-white bg-opacity-60 px-2 py-1 rounded-lg shadow-md flex items-center space-x-2">
                <p className="text-xs font-opensans text-gray-700">
                  Still not sure?
                </p>
                <button
                  onClick={() => {
                    if (!currentUser) {
                      navigate("/login", {
                        state: { from: location.pathname },
                      });
                    } else {
                      setIsAskModalOpen(true);
                    }
                  }}
                  className="text-xs font-semibold font-opensans text-customOrange hover:underline focus:outline-none"
                >
                  Ask a question
                </button>
              </div>
            </>
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
                <div className="flex  items-center mt-2">
                  <TbInfoTriangle className="text-red-500  cursor-pointer" />
                  <p className="ml-2 text-xs text-red-500">
                    {product.condition.replace(/:$/, "")}
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
          {product.discount &&
            product.discount.initialPrice &&
            product.discount.discountType !== "personal-freebies" && (
              <p className="text-lg font-opensans text-gray-500 line-through">
                ₦{formatPrice(product.discount.initialPrice)}
              </p>
            )}
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
            <p className="text-xs font-opensans text-gray-500">
              Vendor information not available
            </p>
          )}
          {isFashion && availableColors.length > 0 && (
            <div className="mt-3">
              <label
                htmlFor="color-select"
                className="text-sm font-semibold text-black font-opensans mb-2 block"
              >
                Color
              </label>

              <Select
                // 1) Transform `availableColors` into an array of { label, value } objects
                options={availableColors.map((color) => ({
                  label: capitalizeFirstLetter(color),
                  value: color,
                }))}
                // 2) If `selectedColor` is a string, convert it to an object
                value={
                  selectedColor
                    ? {
                        label: capitalizeFirstLetter(selectedColor),
                        value: selectedColor,
                      }
                    : null
                }
                onChange={(selectedOption) => {
                  const selectedValue = selectedOption.value;
                  setSelectedColor(selectedValue);

                  // Update sizes for the selected color
                  const sizesForColor = product.variants
                    .filter((variant) => variant.color === selectedValue)
                    .map((variant) => variant.size);
                  setAvailableSizes(Array.from(new Set(sizesForColor)));

                  setSelectedSize(""); // Reset the selected size
                }}
                placeholder="Select"
                // 3) Style it similarly to your Product Type select
                className="w-[109px] font-opensans text-sm"
                classNamePrefix="custom-select"
                isSearchable={false}
                styles={{
                  control: (provided, state) => ({
                    ...provided,
                    height: "2rem", // h-12
                    borderColor: state.isFocused ? "#f9531e" : "#D1D5DB", // Use the `state` parameter
                    borderRadius: "0.5rem", // rounded-lg
                    fontFamily: "Open Sans, sans-serif",
                    fontSize: "0.75rem", // text-sm
                    color: "black",
                    paddingLeft: "0.75rem", // px-4
                  }),
                  input: (provided) => ({
                    ...provided,
                    fontFamily: "Open Sans, sans-serif",
                    fontSize: "1rem",
                    color: "black",
                  }),
                  placeholder: (provided) => ({
                    ...provided,
                    fontFamily: "Open Sans, sans-serif",
                    fontSize: "1rem",
                    color: "#6B7280", // text-gray-500
                  }),
                }}
              />
            </div>
          )}
          {/* Size Selection */}
          {isFashion && (
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
                      className={`relative py-2 px-4 border rounded-lg ${
                        isSelected
                          ? "bg-customOrange text-white cursor-pointer"
                          : inStock
                          ? "bg-transparent text-black cursor-pointer"
                          : "bg-gray-200 text-black opacity-50 cursor-not-allowed"
                      }`}
                      style={{ position: "relative" }}
                    >
                      <span className="text-xs font-opensans font-semibold">
                        {size}
                      </span>
                      {!inStock && (
                        <span
                          className="absolute inset-0 animate-pulse flex items-center justify-center bg-gray-800 bg-opacity-50  text-customOrange font-opensans font-semibold text-xs text-center rounded-lg"
                          style={{
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 10,
                            pointerEvents: "none", // Prevents clicks on out-of-stock items
                          }}
                        >
                          Out of Stock
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div
            className="flex items-center mt-5 mb-2 cursor-pointer"
            onClick={() => setIsModalOpen(true)}
          >
            {/* Left label */}
            <span className="text-black text-md font-opensans whitespace-nowrap">
              Product Details
            </span>

            {/* Vertical divider */}
            <span className="mx-2 h-4 border-r border-gray-300" />

            {/* Truncated description */}
            <span className="text-xs text-gray-600 truncate font-opensans max-w-[140px]">
              {product.description?.slice(0, 20)}...
            </span>

            {/* Arrow icon */}
            <GoChevronRight className="ml-auto text-2xl" />
          </div>

          <Modal
            isOpen={isModalOpen}
            onRequestClose={() => setIsModalOpen(false)}
            className="modal-content"
            overlayClassName="modal-overlay backdrop-blur-md"
          >
            <div className="p-2 relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 bg-rose-100 flex justify-center items-center rounded-full">
                    <TbFileDescription className="text-customRichBrown" />
                  </div>
                  <h2 className="font-opensans text-base font-semibold">
                    Product Description
                  </h2>
                </div>
                <MdOutlineClose
                  onClick={() => setIsModalOpen(false)}
                  className="absolute top-2 right-2 text-gray-600 cursor-pointer text-2xl"
                />
              </div>{" "}
              <p className="text-gray-600 mt-2 font-opensans text-sm">
                {product.description}
              </p>
            </div>
          </Modal>
          <AnimatePresence>
            {isAskModalOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.8 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  onClick={() => setIsAskModalOpen(false)}
                  className="fixed inset-0 bg-black z-[8000]"
                />
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  onClick={(e) => e.stopPropagation()}
                  transition={{ type: "tween", duration: 0.3 }}
                  className="fixed bottom-0 left-0 h-60% right-0 z-[8100]  bg-white rounded-t-xl p-6 shadow-lg"
                >
                  <div>
                    <QuestionandA />
                  </div>
                  <h2 className="text-xl font-semibold font-ubuntu mb-2">
                    One-off question
                  </h2>
                  <p className="text-xs font-opensans text-gray-600 mb-4">
                    This is a single ask use it if you’re unsure of product
                    details or want to know more before buying. The vendor will
                    reply as soon as possible. This feature is limited to 3 uses
                    per day while in beta.
                  </p>

                  <label className="block text-xs font-medium font-opensans text-gray-700 mb-1">
                    Your email (We will send the response here)
                  </label>
                  <input
                    type="email"
                    value={currentUser.email}
                    readOnly
                    className="w-full mb-4 px-3 py-2 border font-opensans rounded bg-gray-100 text-sm"
                  />

                  <label className="block text-xs font-medium font-opensans text-gray-700 mb-1">
                    Ask question here
                  </label>
                  <textarea
                    rows={3}
                    placeholder="what do you wanna know?..."
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    maxLength={700}
                    className="w-full mb-4 px-3 py-2 border rounded resize-none font-opensans focus:outline-none text-base"
                  />

                  <div className="flex px-4 justify-center ">
                    <button
                      onClick={handleSendQuestion}
                      disabled={isSending}
                      className="px-4 py-2 bg-customOrange w-full font-opensans text-white rounded-full text-base font-semibold flex justify-center items-center"
                    >
                      {isSending ? (
                        <RotatingLines
                          width="24"
                          strokeColor="#fff"
                          strokeWidth="5"
                        />
                      ) : (
                        "Send"
                      )}
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
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
          isOpen={isThankYouOpen}
          onRequestClose={() => setIsThankYouOpen(false)}
          overlayClassName="fixed  inset-0 bg-black p-12 bg-opacity-50 z-[9000]"
          className="absolute inset-x-4 top-1/4   py-6 px-4 bg-white rounded-lg  shadow-lg"
          closeTimeoutMS={300}
          ariaHideApp={false}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="flex flex-col "
          >
            <div className="flex items-center  ">
              <FaSmileBeam className="text-xl mr-2 text-customRichBrown " />
              <h2 className="text-base font-medium font-opensans ">
                Message Sent!
              </h2>
            </div>
            <LiaTimesSolid
              onClick={() => setIsThankYouOpen(false)}
              className="absolute top-4 right-4"
            />
            <p className="text-sm mt-5 text-gray-800 font-opensans">
              <span className="text-customOrange font-medium">
                {vendorLoading ? (
                  /* make sure this loader renders inline or wrap it in a span */
                  <span className="inline-block">
                    <LoadProducts />
                  </span>
                ) : vendor ? (
                  /* use <span> instead of <div> */
                  <span>{vendor.shopName}</span>
                ) : (
                  /* use <span> instead of <p> */
                  <span className="text-xs text-gray-500">
                    Vendor information not available
                  </span>
                )}
              </span>{" "}
              has your question and will reply within 6 hours or less. Please
              check your spam folder if you don’t see their answer in your email
              inbox.
            </p>
          </motion.div>
        </Modal>

        <Modal
          isOpen={showModal}
          onRequestClose={handleCloseModal}
          contentLabel="Product Defect Details"
          ariaHideApp={false}
          className="modal-content-defect"
          overlayClassName="modal-overlay-defect"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-red-100 flex justify-center items-center rounded-full">
                <FaExclamationTriangle className="text-red-600" />
              </div>
              <h2 className="font-opensans text-base font-semibold">
                Defect Details
              </h2>
            </div>
          </div>

          {/* Defect description */}
          <p className="text-sm text-gray-800 font-opensans mb-4">
            {product.defectDescription}
          </p>

          {/* Important Disclaimer */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 px-1 py-2 rounded-md shadow-sm">
            <h3 className="text-sm font-semibold font-opensans text-yellow-700 mb-1">
              Important Disclaimer
            </h3>
            <p className="text-xs text-yellow-800 font-opensans">
              By purchasing this product, you acknowledge the disclosed defects.{" "}
              By proceeding, you accept the product as-is.
            </p>
          </div>

          {/* Close button */}
          <div className="flex justify-end mt-6">
            <button
              onClick={handleCloseModal}
              className="bg-customOrange text-white font-opensans py-2 px-6 rounded-full"
            >
              Got it
            </button>
          </div>
        </Modal>
        <div
          className="fixed bottom-0 left-0 right-0 z-50 p-3 flex justify-between items-center"
          style={{
            background:
              "linear-gradient(to top, white, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0) 97%)",
            zIndex: 8000,
          }}
          onClick={(e) => e.stopPropagation()} // Prevents background clicks from propagating
        >
          {isFashion && (!selectedSize || !selectedColor) ? (
            // Prompt user to select size and color
            <button
              onClick={() => {
                toast.error("Please select size and color");
              }}
              className={`bg-customOrange text-white h-12 rounded-full font-opensans font-semibold w-full transition-all duration-300 ease-in-out`}
            >
              {isStockpileForThisVendor ? "Add to Pile" : "Add to Cart"}
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
              {isStockpileForThisVendor ? "Add to Pile" : "Add to Cart"}
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
                className="text-black font-opensans open-sans mr-4 bg-gray-100 rounded-full h-14 w-52 text-md font-bold"
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
    </>
  );
};

export default ProductDetailPage;
