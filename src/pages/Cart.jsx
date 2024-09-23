import React, { useEffect, useState, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  removeFromCart,
  clearCart,
  increaseQuantity,
  decreaseQuantity,
} from "../redux/actions/action";
import { FaPlus, FaMinus } from "react-icons/fa";
import toast from "react-hot-toast";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../firebase.config";
import EmptyCart from "../components/Loading/EmptyCart";
import useAuth from "../custom-hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { GoChevronLeft } from "react-icons/go";
import { useFavorites } from "../components/Context/FavoritesContext";
import Loading from "../components/Loading/Loading";

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
  const cart = useSelector((state) => state.cart || {}); // Initialize cart as an empty object
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentUser, loading } = useAuth();
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();
  const [validCart, setValidCart] = useState({});
  const [userProfileComplete, setUserProfileComplete] = useState(false);
  const [toastShown, setToastShown] = useState({
    remove: false,
    clear: false,
  });

  const formatPrice = (price) => {
    return price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // Centralized collection fetching
  const checkCartProducts = useCallback(async () => {
    try {
      const updatedCart = { ...cart };
      const productKeys = Object.keys(cart);

      for (const productKey of productKeys) {
        const { id } = cart[productKey];
        // Fetch from centralized products collection
        const productDoc = await getDoc(doc(db, `products`, id));
        if (!productDoc.exists()) {
          delete updatedCart[productKey];
          dispatch(removeFromCart(productKey));
          if (!toastShown.remove) {
            toast(
              `Product ${cart[productKey].name} has been removed as it is no longer available.`,
              { icon: "ℹ️" }
            );
            setToastShown((prev) => ({ ...prev, remove: true }));
          }
        }
      }
      setValidCart(updatedCart);
    } catch (error) {
      console.error("Error checking cart products:", error);
      toast.error(
        "An error occurred while validating your cart. Please try again."
      );
    }
  }, [cart, dispatch, toastShown.remove]);

  useEffect(() => {
    if (cart && Object.keys(cart).length > 0) {
      checkCartProducts();
    }
  }, [cart, dispatch, checkCartProducts]);

  const checkUserProfile = useCallback(async () => {
    if (currentUser) {
      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.displayName && data.birthday) {
            setUserProfileComplete(true);
          } else {
            setUserProfileComplete(false);
          }
        }
      } catch (error) {
        console.error("Error checking user profile:", error);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    checkUserProfile();
  }, [currentUser, checkUserProfile]);

  const handleRemoveFromCart = useCallback(
    (productKey) => {
      const product = cart[productKey]; // Get the product details from the cart
      const confirmRemove = window.confirm(
        `Are you sure you want to remove ${product.name} from the cart?`
      );
      if (confirmRemove) {
        dispatch(removeFromCart(productKey));
        if (!toastShown.remove) {
          toast(`Removed ${product.name} from cart!`, { icon: "ℹ️" });
          setToastShown((prev) => ({ ...prev, remove: true }));
        }
      }
    },
    [cart, dispatch, toastShown]
  );

  const debouncedIncreaseQuantity = useCallback(
    debounce((productKey) => {
      dispatch(increaseQuantity(productKey));
    }, 200),
    [dispatch]
  );

  const debouncedDecreaseQuantity = useCallback(
    debounce((productKey) => {
      dispatch(decreaseQuantity(productKey));
    }, 200),
    [dispatch]
  );

  useEffect(() => {
    setValidCart(cart);
  }, [cart]);

  const handleCheckout = () => {
    if (userProfileComplete) {
      navigate("/newcheckout");
    } else {
      toast.error("Please complete your profile before checking out.");
    }
  };

  const handleFavoriteToggle = (product) => {
    if (isFavorite(product.id)) {
      removeFavorite(product.id);
      toast.info(`Removed ${product.name} from favorites!`);
    } else {
      addFavorite(product);
      toast.success(`Added ${product.name} to favorites!`);
    }
  };

  const calculateTotal = () => {
    return Object.values(validCart).reduce(
      (total, product) => total + product.price * product.quantity,
      0
    );
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
        <GoChevronLeft
          className="text-3xl cursor-pointer"
          onClick={() => navigate(-1)}
        />
        <h1 className="font-opensans font-semibold text-xl ml-5 text-black">
          My Cart
        </h1>
      </div>
      <div className="p-2 overflow-y-auto flex-grow">
        {Object.keys(validCart).length === 0 ? (
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
            <div className="space-y-2 pb-20">
              {Object.values(validCart).map((product) => (
                <div
                  key={`${product.id}-${product.selectedSize}`}
                  className="bg-white rounded-lg p-3  shadow-md relative"
                >
                  <div
                    className="absolute top-2 right-2 cursor-pointer rounded-full p-1"
                    onClick={() => handleFavoriteToggle(product)}
                  >
                    <img
                      src={
                        isFavorite(product.id)
                          ? "/favorites-filled.png"
                          : "/favorites.png"
                      }
                      alt="Favorite"
                      className="w-6 h-6"
                    />
                  </div>
                  <div className="flex flex-col justify-between">
                    <div className="flex items-center mb-2">
                      <img
                        src={product.selectedImageUrl}
                        alt={product.name}
                        className="w-16 h-16 object-cover rounded-lg mr-4"
                      />
                      <div className="flex flex-col">
                        <h3 className="text-xs font-roboto font-normal">
                          {product.name}
                        </h3>
                        <p className="text-black font-bold font-opensans text-lg">
                          ₦{formatPrice(product.price)}
                        </p>
                        <div className="flex">
                          <p className="text-gray-600 font-opensans font-normal text-md">
                            Size:{" "}
                            <span className="font-semibold text-black">
                              {product.selectedSize || product.size}
                            </span>
                          </p>

                          {product.selectedColor && (
                            <p className="text-gray-600 font-opensans ml-4 font-normal text-md">
                              Color:{" "}
                              <span className="font-semibold text-black">
                                {product.selectedColor}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex mt-1 justify-between">
                      <button
                        onClick={() =>
                          handleRemoveFromCart(
                            `${product.id}-${product.selectedSize}`
                          )
                        }
                        className="text-customOrange font-semibold font-lato text-sm mt-2"
                      >
                        Remove
                      </button>
                      <div className="flex space-x-5">
                        <button
                          onClick={() =>
                            debouncedDecreaseQuantity(
                              `${product.id}-${product.selectedSize}`
                            )
                          }
                          className="flex items-center justify-center w-9 h-9 bg-customOrange text-white text-lg opacity-40 rounded-full"
                        >
                          <FaMinus />
                        </button>
                        <span className="font-opensans font-semibold translate-y-1 text-lg">
                          {product.quantity}
                        </span>
                        <button
                          onClick={() =>
                            debouncedIncreaseQuantity(
                              `${product.id}-${product.selectedSize}`
                            )
                          }
                          className="flex items-center justify-center w-9 h-9 bg-customOrange text-white text-lg rounded-full"
                        >
                          <FaPlus />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      {Object.keys(validCart).length > 0 && (
        <div className="p-3 fixed bottom-0 w-full bg-white shadow-md">
          <button
            onClick={handleCheckout}
            className="px-4 py-2 h-12 bg-customOrange rounded-full font-opensans font-medium w-full text-white shadow-sm"
          >
            Checkout (₦{formatPrice(calculateTotal())})
          </button>
        </div>
      )}
    </div>
  );
};

export default Cart;
