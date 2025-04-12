import React, { useEffect, useCallback, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  removeFromCart,
  clearCart,
  increaseQuantity,
  decreaseQuantity,
} from "../redux/actions/action";
import { LiaTimesSolid } from "react-icons/lia";
import { FaPlus, FaMinus, FaTimes } from "react-icons/fa";
import {
  exitStockpileMode,
  fetchStockpileData,
} from "../redux/reducers/stockpileSlice";
import toast from "react-hot-toast";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../firebase.config";
import EmptyCart from "../components/Loading/EmptyCart";
import { useAuth } from "../custom-hooks/useAuth";
import { CiLogin } from "react-icons/ci";
import { useNavigate, useLocation } from "react-router-dom";
import { GoChevronLeft, GoChevronUp, GoChevronRight } from "react-icons/go";
import Loading from "../components/Loading/Loading";
import { HiOutlineBuildingStorefront } from "react-icons/hi2";
import { BiMessageDetail } from "react-icons/bi";
import { BsPlus } from "react-icons/bs";
import { Bars } from "react-loader-spinner";
import SEO from "../components/Helmet/SEO";
import { ImSad2 } from "react-icons/im";
import { FcPaid } from "react-icons/fc";
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

const Cart = () => {
  const cart = useSelector((state) => state.cart || {});
  const dispatch = useDispatch();

  const navigate = useNavigate();
  const { currentUser, loading } = useAuth();
  const [selectedVendorId, setSelectedVendorId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [vendorNotes, setVendorNotes] = useState({});
  const [vendorsInfo, setVendorsInfo] = useState({});
  const location = useLocation();
  const [checkoutLoading, setCheckoutLoading] = useState({});
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showExitStockpileModal, setShowExitStockpileModal] = useState(false);
  const [pendingCheckoutVendor, setPendingCheckoutVendor] = useState(null);
  const { pileItems } = useSelector((state) => state.stockpile);

  const { isActive, vendorId: stockpileVendorId } = useSelector(
    (state) => state.stockpile
  );

  useEffect(() => {
    if (isModalOpen || isNoteModalOpen || isLoginModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isModalOpen, isNoteModalOpen, isLoginModalOpen]);
  const formatPrice = (price) => {
    if (typeof price !== "number" || isNaN(price)) return "0.00";
    return price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  useEffect(() => {
    if (isActive && selectedVendorId === stockpileVendorId && currentUser) {
      dispatch(
        fetchStockpileData({
          userId: currentUser.uid,
          vendorId: selectedVendorId,
        })
      );
    }
  }, [selectedVendorId, isActive, stockpileVendorId, currentUser, dispatch]);

  const checkCartProducts = useCallback(async () => {
    try {
      const vendorIds = Object.keys(cart);

      for (const vendorId of vendorIds) {
        const vendor = cart[vendorId];

        for (const productKey in vendor.products) {
          const product = vendor.products[productKey];
          if (!product || !product.id) {
            console.error(
              `Invalid product found for key ${productKey}:`,
              product
            );
            dispatch(removeFromCart({ vendorId, productKey }));
            continue;
          }

          const { id } = product;

          try {
            const productDoc = await getDoc(doc(db, `products`, id));
            if (!productDoc.exists()) {
              dispatch(removeFromCart({ vendorId, productKey }));
              toast.dismiss();
              toast(
                `Product ${product.name} has been removed as it is no longer available.`,
                { icon: "ℹ️" }
              );
            } else {
              const productData = productDoc.data();
              if (!productData.published || productData.isDeleted) {
                dispatch(removeFromCart({ vendorId, productKey }));
                toast.dismiss();
                toast(
                  `Product ${product.name} has been removed as it is ${
                    productData.isDeleted
                      ? "deleted by the vendor"
                      : "unpublished by the vendor"
                  }.`,
                  { icon: "ℹ️" }
                );
              }
            }
          } catch (err) {
            console.error(`Error fetching product ${id}:`, err);
          }
        }
      }
    } catch (error) {
      console.error("Error checking cart products:", error);
      toast.error(
        "An error occurred while validating your cart. Please try again."
      );
    }
  }, [cart, dispatch]);

  const fromProductDetail = location.state?.fromProductDetail || false;
  useEffect(() => {
    if (isModalOpen || isNoteModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isModalOpen, isNoteModalOpen]);

  useEffect(() => {
    const fetchVendorInfo = async () => {
      try {
        const vendorIds = Object.keys(cart);
        const newVendorsInfo = { ...vendorsInfo };
        for (const vendorId of vendorIds) {
          if (!newVendorsInfo[vendorId]) {
            const vendorDoc = await getDoc(doc(db, "vendors", vendorId));
            if (vendorDoc.exists()) {
              newVendorsInfo[vendorId] = vendorDoc.data();
            } else {
              console.warn(`Vendor with ID ${vendorId} does not exist.`);
            }
          }
        }
        setVendorsInfo(newVendorsInfo);
      } catch (error) {
        console.error("Error fetching vendor info:", error);
      }
    };
    fetchVendorInfo();
  }, [cart]);

  useEffect(() => {
    if (cart && Object.keys(cart).length > 0) {
      checkCartProducts();
    } else {
    }
  }, [cart, checkCartProducts]);

  const handleRemoveFromCart = useCallback(
    (vendorId, productKey) => {
      const product = cart[vendorId]?.products[productKey]; // Safely access product using productKey
      if (!product) {
        console.error(`Product not found for key ${productKey}`);
        return;
      }

      const confirmRemove = window.confirm(
        `Are you sure you want to remove ${product.name} from the cart?`
      );

      if (confirmRemove) {
        dispatch(removeFromCart({ vendorId, productKey }));
        toast(`Removed ${product.name} from cart!`, { icon: "ℹ️" });
      }
    },
    [cart, dispatch]
  );

  const handleClearSelection = (vendorId) => {
    const confirmClear = window.confirm(
      `Are you sure you want to clear the cart?`
    );
    if (confirmClear) {
      dispatch(clearCart(vendorId));
      toast.success(`Cleared cart for ${cart[vendorId].vendorName}!`);
      setIsModalOpen(false);

      setVendorNotes((prevNotes) => {
        const updatedNotes = { ...prevNotes };
        delete updatedNotes[vendorId];
        return updatedNotes;
      });
    }
  };

  const handleCheckout = async (vendorId) => {
    setCheckoutLoading((prev) => ({ ...prev, [vendorId]: true }));
    const vendorCart = cart[vendorId];

    if (!vendorCart || Object.keys(vendorCart.products).length === 0) {
      toast.error("No products to checkout for this vendor.");
      setCheckoutLoading((prev) => ({ ...prev, [vendorId]: false }));
      return;
    }

    // Check if user is logged in
    if (!currentUser) {
      setIsLoginModalOpen(true);
      setCheckoutLoading((prev) => ({ ...prev, [vendorId]: false }));
      return;
    }

    // Check if user's email is verified
    if (!currentUser.emailVerified) {
      toast.error("Please verify your email before proceeding to checkout.");
      setCheckoutLoading((prev) => ({ ...prev, [vendorId]: false }));
      return;
    }
    if (isActive && vendorId !== stockpileVendorId) {
      setPendingCheckoutVendor(vendorId);
      setShowExitStockpileModal(true);
      setCheckoutLoading((prev) => ({ ...prev, [vendorId]: false }));
      return;
    }

    // Check if user's profile is complete
    let profileComplete = currentUser.profileComplete;
    if (profileComplete === undefined) {
      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          profileComplete = userData.profileComplete;
        }
      } catch (error) {
        console.error("Error fetching user profile from Firestore:", error);
        setCheckoutLoading((prev) => ({ ...prev, [vendorId]: false }));
        return;
      }
    }

    if (!profileComplete) {
      toast.error(
        "Please complete your profile before proceeding to checkout."
      );
      navigate("/profile?incomplete=true");
      setCheckoutLoading((prev) => ({ ...prev, [vendorId]: false }));
      return;
    }

    // Check if vendor is deactivated
    try {
      const vendorDocRef = doc(db, "vendors", vendorId);
      const vendorDocSnap = await getDoc(vendorDocRef);

      if (!vendorDocSnap.exists()) {
        toast.error("Vendor not found.");
        setCheckoutLoading((prev) => ({ ...prev, [vendorId]: false }));
        return;
      }

      const vendorData = vendorDocSnap.data();
      if (vendorData.isDeactivated) {
        toast.error("This vendor is currently not active.");
        setCheckoutLoading((prev) => ({ ...prev, [vendorId]: false }));
        return;
      }
    } catch (error) {
      console.error("Error checking vendor status:", error);
      toast.error("Unable to proceed with checkout at this time.");
      setCheckoutLoading((prev) => ({ ...prev, [vendorId]: false }));
      return;
    }

    // Check for out-of-stock items
    const outOfStockItems = [];

    for (const productKey in vendorCart.products) {
      const product = vendorCart.products[productKey];
      const productRef = doc(db, "products", product.id);
      const productDoc = await getDoc(productRef);

      if (productDoc.exists()) {
        const productData = productDoc.data();

        if (product.subProductId) {
          const subProduct = productData.subProducts?.find(
            (sp) => sp.subProductId === product.subProductId
          );
          if (!subProduct || subProduct.stock < product.quantity) {
            outOfStockItems.push(`${product.name}`);
          }
        } else if (product.selectedColor && product.selectedSize) {
          const variant = productData.variants?.find(
            (v) =>
              v.color === product.selectedColor &&
              v.size === product.selectedSize
          );
          if (!variant || variant.stock < product.quantity) {
            outOfStockItems.push(
              `${product.name} (${product.selectedColor}, ${product.selectedSize})`
            );
          }
        } else {
          if (productData.stock < product.quantity) {
            outOfStockItems.push(product.name);
          }
        }
      } else {
        console.warn(`Product with ID ${product.id} not found.`);
      }
    }

    if (outOfStockItems.length > 0) {
      toast.error(
        `The following items are out of stock: ${outOfStockItems.join(", ")}`
      );
      setCheckoutLoading((prev) => ({ ...prev, [vendorId]: false }));
      return;
    }

    const note = vendorNotes[vendorId]
      ? encodeURIComponent(vendorNotes[vendorId])
      : "";

    navigate(`/newcheckout/${vendorId}?note=${note}`);
    setCheckoutLoading((prev) => ({ ...prev, [vendorId]: false }));
  };

  const calculateVendorTotal = (vendorId) => {
    const vendorCart = cart[vendorId]?.products || {};
    return Object.values(vendorCart).reduce(
      (total, product) => total + product.price * product.quantity,
      0
    );
  };
  const formatColorText = (color) => {
    if (!color) return "";
    return color.charAt(0).toUpperCase() + color.slice(1).toLowerCase();
  };

  const calculateTotal = () => {
    return Object.keys(cart).reduce(
      (total, vendorId) => total + calculateVendorTotal(vendorId),
      0
    );
  };

  const handleViewSelection = (vendorId) => {
    setSelectedVendorId(vendorId);
    setIsModalOpen(true);
  };

  const handleAddToSelection = (vendorId) => {
    const vendorInfo = vendorsInfo[vendorId];
    if (vendorInfo) {
      const marketPlaceType = vendorInfo.marketPlaceType;
      if (marketPlaceType === "virtual") {
        navigate(`/store/${vendorId}`);
      } else {
        navigate(`/marketstorepage/${vendorId}`);
      }
    } else {
      // Vendor info not available
      console.warn(`Vendor info not available for vendorId ${vendorId}`);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      setIsModalOpen(false);
    }
  };
  const handleLoginOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      setIsLoginModalOpen(false);
    }
  };

  const handleNoteOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      setIsNoteModalOpen(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Loading />
      </div>
    );
  }

  // if (!currentUser) {
  //   return <div>Please log in to view your cart.</div>;
  // }

  return (
    <>
      <SEO
        title={`My Cart - My Thrift`}
        description={`Your cart on My Thrift`}
        url={`https://www.shopmythrift.store/latest-cart`}
      />
      <div className="flex flex-col h-screen justify-between mb-28 bg-gray-200">
        <div className="sticky top-0 bg-white w-full h-24 flex items-center p-3 shadow-md z-10">
          {fromProductDetail && (
            <GoChevronLeft
              className="text-3xl cursor-pointer"
              onClick={() => navigate(-1)}
            />
          )}
          <h1 className="font-opensans font-semibold text-xl ml-5 text-black">
            My Cart
          </h1>
        </div>
        <div className="p-2 overflow-y-auto flex-grow">
          {Object.keys(cart).length === 0 ? (
            <div>
              <EmptyCart />
              <h1 className="font-ubuntu text-lg text-center text-customOrange mt-20 font-medium">
                Oops! Can't find anything in your Cart
              </h1>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-lg p-3 shadow-md flex justify-between items-center mb-2">
                <h2 className="font-ubuntu totaltext text-gray-600 font-medium">
                  Total
                </h2>
                <p className="font-opensans text-black text-lg font-bold">
                  ₦{formatPrice(calculateTotal())}
                </p>
              </div>
              <div className="space-y-2 pb-2">
                {Object.keys(cart).map((vendorId) => {
                  const products = Object.values(cart[vendorId].products);
                  const firstProduct = products[0];
                  const productCount = products.length;

                  return (
                    <div
                      key={vendorId}
                      className="bg-white rounded-lg p-3 pb-6 shadow-md"
                    >
                      {/* Container for image, product name, and view selection on the same line */}
                      <div className="flex justify-between items-center w-full">
                        <div className="flex items-center flex-shrink-0">
                          <div className="relative">
                            <img
                              src={firstProduct.selectedImageUrl}
                              alt={firstProduct.name}
                              className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                            />
                            {productCount > 1 && (
                              <div className="absolute -top-1 text-xs -right-2 bg-gray-900 bg-opacity-40 text-white rounded-full w-7 h-7 flex items-center justify-center backdrop-blur-md">
                                +{productCount}
                              </div>
                            )}
                          </div>
                          <div className="ml-4 flex-shrink-0">
                            {/* Updated code to prevent "and others" from being truncated */}
                            <h3 className="font-roboto text-sm">
                              <span className="whitespace-nowrap overflow-hidden overflow-ellipsis max-w-[80px] inline-block align-middle">
                                {firstProduct.name.length > 5
                                  ? `${firstProduct.name.substring(0, 5)}...`
                                  : firstProduct.name}
                              </span>
                              <span className="text-gray-500 font-light">
                                {productCount > 1 && " and others"}
                              </span>
                            </h3>
                            <p className="font-opensans text-md text-black font-bold">
                              ₦{formatPrice(firstProduct.price)}
                            </p>
                          </div>
                        </div>

                        {/* "View Selection" stays on the right */}
                        <div
                          className="flex items-center cursor-pointer ml-auto"
                          onClick={() => handleViewSelection(vendorId)}
                        >
                          <h3 className="font-opensans text-black -translate-y-3 text-sm font-normal whitespace-nowrap">
                            {isActive && vendorId === stockpileVendorId
                              ? "View Pile"
                              : "View Selection"}
                          </h3>

                          <GoChevronUp className="ml-1 -translate-y-3 text-black" />
                        </div>
                      </div>

                      {/* Horizontal line moved down by increasing top margin */}
                      <div className="border-t border-gray-300 mt-6 mb-2"></div>

                      {/* "Ordering from" text at the bottom */}
                      <div className="flex items-center mt-4 whitespace-nowrap">
                        <HiOutlineBuildingStorefront className="text-2xl mr-2" />
                        <span className="text-black font-opensans text-sm font-normal">
                          {isActive && vendorId === stockpileVendorId
                            ? "Repiling from"
                            : "Ordering from"}
                        </span>

                        <h3
                          className="font-opensans text-orange-600 underline text-sm font-normal ml-1 truncate cursor-pointer"
                          style={{
                            maxWidth: "150px",
                            textOverflow: "ellipsis",
                            overflow: "hidden",
                          }}
                          onClick={() => handleAddToSelection(vendorId)}
                        >
                          {cart[vendorId]?.vendorName.length > 16
                            ? `${cart[vendorId].vendorName.substring(0, 16)}...`
                            : cart[vendorId]?.vendorName ||
                              `Vendor ${vendorId}`}
                        </h3>
                      </div>

                      {/* Vendor-specific Checkout and Clear Selection */}
                      <div className="flex-col flex mt-3">
                        <button
                          onClick={() => handleCheckout(vendorId)}
                          disabled={checkoutLoading[vendorId]}
                          className={`rounded-full flex justify-center items-center h-12 w-full font-opensans font-medium text-white px-4 py-2 ${
                            checkoutLoading[vendorId]
                              ? "bg-orange-500"
                              : "bg-customOrange"
                          }`}
                        >
                          {checkoutLoading[vendorId] ? (
                            <Bars
                              color="#fff"
                              height={24}
                              width={24}
                              className="inline-block"
                            />
                          ) : (
                            "Checkout"
                          )}
                        </button>

                        <button
                          onClick={() => handleClearSelection(vendorId)}
                          className="text-customOrange font-semibold mt-3 font-opensans"
                        >
                          Clear Selection
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Modal for viewing all products */}
        {isModalOpen &&
          selectedVendorId &&
          cart[selectedVendorId]?.products && (
            <div
              className="fixed inset-0 modal bg-black bg-opacity-50 flex items-end justify-center"
              onClick={handleOverlayClick}
            >
              <div
                className="bg-white w-full h-4/5 rounded-t-xl p-4 flex flex-col animate-modal-slide-up"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex justify-between pb-4 items-center">
                  <h2 className="text-2xl font-opensans font-semibold">
                    {isActive && selectedVendorId === stockpileVendorId
                      ? "Review Pile"
                      : "Review Order"}
                  </h2>

                  <LiaTimesSolid
                    onClick={() => setIsModalOpen(false)}
                    className="text-black text-xl cursor-pointer"
                  />
                </div>

                {/* Scrollable Products List */}
                <div className="overflow-y-auto mt-4 flex-grow">
                  {[
                    ...(isActive && selectedVendorId === stockpileVendorId
                      ? pileItems.map((item, index) => ({
                          ...item,
                          selectedImageUrl: item.imageUrl || "",
                          quantity: item.quantity || 1,
                          __isCart: false,
                          __index: index,
                        }))
                      : []),
                    ...Object.entries(
                      cart[selectedVendorId]?.products || {}
                    ).map(([key, product]) => ({
                      ...product,
                      __isCart: true,
                      __productKey: key,
                    })),
                  ].map((item, index, fullArray) => {
                    const isCartItem = item.__isCart;

                    return (
                      <div
                        key={isCartItem ? item.__productKey : `pile-${index}`}
                      >
                        <div className="flex items-center justify-between mt-2">
                          {/* Product Image */}
                          <div className="relative">
                            <img
                              src={item.selectedImageUrl}
                              alt={item.name}
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                            {item.quantity > 1 && (
                              <div className="absolute -top-1 text-xs -right-2 bg-gray-900 bg-opacity-40 text-white rounded-full w-7 h-7 flex items-center justify-center backdrop-blur-md">
                                +{item.quantity}
                              </div>
                            )}
                          </div>

                          {/* Product Details */}
                          <div className="flex-grow ml-4">
                            <h3 className="font-opensans text-sm">
                              {item.name}
                            </h3>

                            {isCartItem && (
                              <>
                                <p className="font-opensans text-md mt-2 text-black font-bold">
                                  ₦{formatPrice(item.price)}
                                </p>
                                <p className="text-gray-600 mt-2">
                                  Size:{" "}
                                  <span className="font-semibold mr-4 text-black">
                                    {item.selectedSize}
                                  </span>
                                  {item.selectedColor && (
                                    <>
                                      Color:{" "}
                                      <span className="font-semibold text-black">
                                        {formatColorText(item.selectedColor)}
                                      </span>
                                    </>
                                  )}
                                </p>
                              </>
                            )}
                          </div>

                          {/* Right-side Action */}
                          {isCartItem ? (
                            <button
                              onClick={() =>
                                handleRemoveFromCart(
                                  selectedVendorId,
                                  item.__productKey
                                )
                              }
                              className="text-gray-500 font-semibold font-opensans -translate-y-5 text-sm ml-2"
                            >
                              Remove
                            </button>
                          ) : (
                            <FcPaid className="text-2xl ml-2 -translate-y-5" />
                          )}
                        </div>

                        {/* Separator */}
                        {index < fullArray.length - 1 && (
                          <div className="border-t border-gray-300 my-2"></div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Sticky Footer */}
                <div className="mt-4">
                  {/* "Leave a Message for the Vendor" */}
                  <div className="border-t border-gray-300 my-2"></div>
                  <div
                    className="flex items-center mt-4 justify-between cursor-pointer"
                    onClick={() => setIsNoteModalOpen(true)}
                  >
                    <div className="flex items-center">
                      <BiMessageDetail className="text-xl mr-3" />
                      <span className="font-opensans text-sm">
                        {vendorNotes[selectedVendorId]
                          ? `Note: ${
                              vendorNotes[selectedVendorId].length > 18
                                ? vendorNotes[selectedVendorId].substring(
                                    0,
                                    18
                                  ) + "..."
                                : vendorNotes[selectedVendorId]
                            }`
                          : "Leave a message for the vendor"}
                      </span>
                    </div>
                    <GoChevronRight className="text-2xl text-gray-500" />
                  </div>

                  {/* "Proceed to Checkout" and "Clear Order" Buttons */}
                  <div className="flex flex-col justify-between space-y-4 mt-4">
                    <button
                      onClick={() => handleCheckout(selectedVendorId)}
                      disabled={checkoutLoading[selectedVendorId]}
                      className={`rounded-full flex justify-center items-center h-12 w-full font-opensans font-medium text-white px-4 py-2 ${
                        checkoutLoading[selectedVendorId]
                          ? "bg-orange-500"
                          : "bg-customOrange"
                      }`}
                    >
                      {checkoutLoading[selectedVendorId] ? (
                        <Bars
                          color="#fff"
                          height={24}
                          width={24}
                          className="inline-block"
                        />
                      ) : (
                        "Checkout"
                      )}
                    </button>

                    <button
                      onClick={() => handleClearSelection(selectedVendorId)}
                      className="bg-gray-300 text-black font-opensans font-semibold  h-12 w-full rounded-full flex-grow"
                    >
                      Clear Order
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* Modal for  a note */}
        {isNoteModalOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center modal1"
            onClick={handleNoteOverlayClick}
          >
            <div
              className="bg-white w-full h-3/5 rounded-t-xl p-4 flex flex-col z-50 animate-modal-slide-up"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-opensans text-black font-semibold">
                  Note for Vendor
                </h2>
                <LiaTimesSolid
                  onClick={() => setIsNoteModalOpen(false)}
                  className="text-black text-xl cursor-pointer"
                />
              </div>
              {/* Text input area */}
              <textarea
                maxLength={50}
                value={vendorNotes[selectedVendorId] || ""}
                onChange={(e) =>
                  setVendorNotes({
                    ...vendorNotes,
                    [selectedVendorId]: e.target.value,
                  })
                }
                className="w-full mt-4 p-2 border bg-gray-200 h-44 rounded-md"
                placeholder=""
              />
              {/* Send Note button */}
              <button
                onClick={() => {
                  setIsNoteModalOpen(false);
                  // Note is already saved in vendorNotes
                }}
                className="bg-customOrange w-full text-white font-opensans font-semibold py-3 mt-4 h-12 translate-y-10 rounded-full"
              >
                Send Note
              </button>
            </div>
          </div>
        )}
        {isLoginModalOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center"
            onClick={handleLoginOverlayClick}
          >
            <div
              className="bg-white w-9/12 max-w-md rounded-lg px-3 py-4 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex space-x-4">
                  <div className="w-8 h-8 bg-rose-100 flex justify-center items-center rounded-full">
                    <CiLogin className="text-customRichBrown" />
                  </div>
                  <h2 className="text-lg font-opensans font-semibold">
                    Please Log In
                  </h2>
                </div>
                <LiaTimesSolid
                  onClick={() => setIsLoginModalOpen(false)}
                  className="text-black text-xl mb-6 cursor-pointer"
                />
              </div>
              <p className="mb-6 text-xs font-opensans text-gray-800 ">
                You need to be logged in to proceed to checkout. Please log in
                to your account, or create a new account if you don’t have one,
                to continue.
              </p>
              <div className="flex space-x-16">
                <button
                  onClick={() => {
                    navigate("/signup", { state: { from: location.pathname } });
                    setIsLoginModalOpen(false);
                  }}
                  className="flex-1 bg-transparent py-2 text-customRichBrown font-medium text-xs font-opensans border-customRichBrown border rounded-full"
                >
                  Sign Up
                </button>

                <button
                  onClick={() => {
                    navigate("/login", { state: { from: location.pathname } });
                    setIsLoginModalOpen(false);
                  }}
                  className="flex-1 bg-customOrange py-2 text-white text-xs font-opensans rounded-full"
                >
                  Login
                </button>
              </div>
            </div>
          </div>
        )}
        {showExitStockpileModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowExitStockpileModal(false)}
          >
            <div
              className="bg-white rounded-lg p-6 max-w-sm w-full shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex  items-center mb-4">
                <ImSad2 className="text-2xl text-customRichBrown mr-2" />
                <h2 className="text-lg font-semibold  font-opensans">
                  Exit Stockpiling?
                </h2>
              </div>

              <p className="text-sm text-gray-800 font-opensans">
                You're currently repiling from{" "}
                <span className="font-semibold text-customOrange">
                  {cart[stockpileVendorId]?.vendorName || "this vendor"}
                </span>
                . Checking out with another vendor will exit this pile and clear your cart.
                Continue?
              </p>

              <div className="mt-6 flex justify-end space-x-4">
                <button
                  onClick={() => setShowExitStockpileModal(false)}
                  className="px-4 py-2 bg-transparent border border-customRichBrown text-sm rounded-full font-opensans"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Immediately close the modal.
                    setShowExitStockpileModal(false);
                    // Clear only the cart for the stockpiled vendor.
                    dispatch(clearCart(stockpileVendorId));
                    // Exit stockpiling mode.
                    dispatch(exitStockpileMode());
                    // Optionally, if you want to reset the pending vendor, you can do that here:
                    setPendingCheckoutVendor(null);
                  }}
                  className="px-4 py-2 bg-customOrange text-white text-sm rounded-full font-opensans"
                >
                  Yes, Exit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Cart;
