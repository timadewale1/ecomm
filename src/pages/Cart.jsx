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
import toast from "react-hot-toast";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../firebase.config";
import EmptyCart from "../components/Loading/EmptyCart";
import useAuth from "../custom-hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { GoChevronLeft, GoChevronUp, GoChevronRight } from "react-icons/go";
import Loading from "../components/Loading/Loading";
import { HiOutlineBuildingStorefront } from "react-icons/hi2";
import { BiMessageDetail } from "react-icons/bi";
import { BsPlus } from "react-icons/bs";

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
  const [vendorsInfo, setVendorsInfo] = useState({}); // New state variable
  const location = useLocation();
  const formatPrice = (price) => {
    return price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

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
              toast(
                `Product ${product.name} has been removed as it is no longer available.`,
                { icon: "ℹ️" }
              );
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

    // Clean up on component unmount
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isModalOpen, isNoteModalOpen]);

  useEffect(() => {
    const fetchVendorInfo = async () => {
      try {
        const vendorIds = Object.keys(cart);
        const newVendorsInfo = { ...vendorsInfo }; // Copy existing vendorsInfo
        for (const vendorId of vendorIds) {
          // If we already have the vendor info, skip fetching
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
      console.log("Cart before validation:", cart);
      checkCartProducts(); // Validate products in cart
    } else {
      console.log("Cart is empty or invalid:", cart);
    }
  }, [cart, checkCartProducts]);

  const handleRemoveFromCart = useCallback(
    (vendorId, productKey) => {
      const product = cart[vendorId].products[productKey]; // Directly access product by the key from cart
      if (!product) {
        console.error(`Product not found for key ${productKey}`);
        return;
      }

      console.log("Removing product:", product);
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
      setIsModalOpen(false); // Close the modal
      // Remove the note for this vendor
      setVendorNotes((prevNotes) => {
        const updatedNotes = { ...prevNotes };
        delete updatedNotes[vendorId];
        return updatedNotes;
      });
    }
  };

  const debouncedIncreaseQuantity = useCallback(
    debounce((vendorId, productKey) => {
      console.log(
        "Dispatching increaseQuantity for product:",
        productKey,
        "from vendor:",
        vendorId
      );
      dispatch(increaseQuantity({ vendorId, productKey }));
    }, 200),
    [dispatch]
  );

  const debouncedDecreaseQuantity = useCallback(
    debounce((vendorId, productKey) => {
      console.log(
        "Dispatching decreaseQuantity for product:",
        productKey,
        "from vendor:",
        vendorId
      );
      dispatch(decreaseQuantity({ vendorId, productKey }));
    }, 200),
    [dispatch]
  );

  const handleCheckout = (vendorId) => {
    const vendorCart = cart[vendorId];
    console.log("Checkout initiated for vendor:", vendorId);

    if (!vendorCart || Object.keys(vendorCart.products).length === 0) {
      toast.error("No products to checkout for this vendor.");
      return;
    }

    navigate(`/newcheckout/${vendorId}`, {
      state: { note: vendorNotes[vendorId] || "" },
    });
  };

  const calculateVendorTotal = (vendorId) => {
    const vendorCart = cart[vendorId]?.products || {};
    return Object.values(vendorCart).reduce(
      (total, product) => total + product.price * product.quantity,
      0
    );
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

  if (!currentUser) {
    return <div>Please log in to view your cart.</div>;
  }

  return (
    <div className="flex flex-col h-screen justify-between bg-gray-200">
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
                          View Selection
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
                        Ordering from
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
                          : cart[vendorId]?.vendorName || `Vendor ${vendorId}`}
                      </h3>
                    </div>

                    {/* Vendor-specific Checkout and Clear Selection */}
                    <div className="flex-col flex mt-3">
                      <button
                        onClick={() => handleCheckout(vendorId)}
                        className="bg-customOrange rounded-full h-12 w-full font-opensans font-medium text-white px-4 py-2"
                      >
                        Checkout
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
      {isModalOpen && selectedVendorId && cart[selectedVendorId]?.products && (
        <div
          className="fixed inset-0 modal  bg-black bg-opacity-50 flex items-end justify-center "
          onClick={handleOverlayClick}
        >
          <div
            className="bg-white  w-full h-4/5 rounded-t-xl p-4 flex flex-col animate-modal-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between pb-4 items-center">
              <h2 className="text-2xl font-opensans font-semibold">
                Review Order
              </h2>
              <LiaTimesSolid
                onClick={() => setIsModalOpen(false)}
                className="text-black text-xl cursor-pointer"
              />
            </div>

            {/* Scrollable Products List */}
            <div className="overflow-y-auto mt-4 flex-grow">
              {/* Display all products for the selected vendor */}
              {Object.keys(cart[selectedVendorId].products).map(
                (productKey, index) => {
                  const product = cart[selectedVendorId].products[productKey]; // Use the productKey from cart directly

                  return (
                    <div key={productKey}>
                      <div className="flex items-center justify-between mt-2">
                        {/* Left side: Product Image */}
                        <img
                          src={product.selectedImageUrl}
                          alt={product.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />

                        {/* Middle: Product Details */}
                        <div className="flex-grow ml-4">
                          <h3 className="font-opensans text-sm">
                            {product.name}
                          </h3>
                          <p className="font-opensans text-md mt-2 text-black font-bold">
                            ₦{formatPrice(product.price)}
                          </p>
                          <p className="text-gray-600 mt-2">
                            Size:{" "}
                            <span className="font-semibold mr-4 text-black">
                              {product.selectedSize}
                            </span>
                            {product.selectedColor && (
                              <>
                                Color:{" "}
                                <span className="font-semibold text-black">
                                  {product.selectedColor}
                                </span>
                              </>
                            )}
                          </p>
                        </div>

                        {/* Right side: Remove Button */}
                        <button
                          onClick={() =>
                            handleRemoveFromCart(selectedVendorId, productKey)
                          } // Pass the actual productKey from the cart
                          className="text-gray-500 font-semibold font-opensans -translate-y-5 text-sm ml-2"
                        >
                          Remove
                        </button>
                      </div>

                      {/* Add a thin line to separate products */}
                      {index <
                        Object.keys(cart[selectedVendorId].products).length -
                          1 && (
                        <div className="border-t border-gray-300 my-2"></div>
                      )}
                    </div>
                  );
                }
              )}

              <button
                onClick={() => handleAddToSelection(selectedVendorId)}
                className="flex items-center justify-center w-48 mt-6 bg-gray-200 text-black font-opensans font-semibold py-2 h-12 rounded-full mb-3"
              >
                <BsPlus className="text-2xl mr-2" />
                Add to Selection
              </button>
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
                            ? vendorNotes[selectedVendorId].substring(0, 18) +
                              "..."
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
                  className="bg-customOrange w-full text-white font-opensans font-semibold py-3 h-12 rounded-full flex-grow"
                >
                  Proceed to checkout
                </button>
                <button
                  onClick={() => handleClearSelection(selectedVendorId)}
                  className="bg-gray-300 text-black font-opensans font-semibold py-3 h-12 w-full rounded-full flex-grow"
                >
                  Clear Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal for adding a note */}
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
              className="bg-customOrange w-full text-white font-opensans font-semibold py-3 mt-4 h-12 translate-y-5 rounded-full"
            >
              Send Note
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
