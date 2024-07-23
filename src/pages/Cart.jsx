import React, { useEffect, useState, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  removeFromCart,
  clearCart,
  increaseQuantity,
  decreaseQuantity,
} from "../redux/actions/action";
import { FaTrash, FaPlus, FaMinus } from "react-icons/fa";
import { toast } from "react-toastify";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../firebase.config";
import EmptyCart from "../components/Loading/EmptyCart";
import useAuth from "../custom-hooks/useAuth";
import { useNavigate } from "react-router-dom";

const Cart = () => {
  const cart = useSelector((state) => state.cart);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentUser, loading } = useAuth();
  const [validCart, setValidCart] = useState({});
  const [userProfileComplete, setUserProfileComplete] = useState(false);
  const [toastShown, setToastShown] = useState({
    remove: false,
    clear: false,
    increase: false,
    decrease: false,
  });

  const checkCartProducts = async () => {
    try {
      const updatedCart = { ...cart };
      const productKeys = Object.keys(cart);

      for (const productKey of productKeys) {
        const { id, vendorId } = cart[productKey];
        const productDoc = await getDoc(
          doc(db, `vendors/${vendorId}/products`, id)
        );
        if (!productDoc.exists()) {
          delete updatedCart[productKey];
          dispatch(removeFromCart(productKey));
          if (!toastShown.remove) {
            toast.info(
              `Product ${cart[productKey].name} has been removed as it is no longer available.`
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
  };

  useEffect(() => {
    if (cart && Object.keys(cart).length > 0) {
      checkCartProducts();
    }
  }, [cart, dispatch]);

  const checkUserProfile = async () => {
    if (currentUser) {
      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.firstName && data.lastName && data.birthday) {
            setUserProfileComplete(true);
          } else {
            setUserProfileComplete(false);
          }
        }
      } catch (error) {
        console.error("Error checking user profile:", error);
      }
    }
  };

  useEffect(() => {
    checkUserProfile();
  }, [currentUser]);

  const handleRemoveFromCart = useCallback((productKey) => {
    const confirmRemove = window.confirm('Are you sure you want to remove this product from the cart?');
    if (confirmRemove) {
      dispatch(removeFromCart(productKey));
      if (!toastShown.remove) {
        toast.info('Removed product from cart!');
        setToastShown((prev) => ({ ...prev, remove: true }));
      }
    }
  }, [dispatch, toastShown]);

  const handleClearCart = useCallback(() => {
    const confirmClear = window.confirm(
      "Are you sure you want to clear your cart?"
    );
    if (confirmClear) {
      dispatch(clearCart());
      if (!toastShown.clear) {
        toast.info("Cleared all products from cart!");
        setToastShown((prev) => ({ ...prev, clear: true }));
      }
    }
  }, [dispatch, toastShown]);

  const handleIncreaseQuantity = useCallback(
    (productKey) => {
      if (
        validCart[productKey].quantity < validCart[productKey].stockQuantity
      ) {
        dispatch(increaseQuantity(productKey));
      } else {
        if (!toastShown.increase) {
          toast.error("Cannot exceed available stock!");
          setToastShown((prev) => ({ ...prev, increase: true }));
        }
      }
    },
    [dispatch, validCart, toastShown]
  );

  const handleDecreaseQuantity = useCallback(
    (productKey) => {
      dispatch(decreaseQuantity(productKey));
    },
    [dispatch]
  );

  useEffect(() => {
    setValidCart(cart);
  }, [cart]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!currentUser) {
    return <div>Please log in to view your cart.</div>;
  }

  return (
    <div className="flex flex-col h-screen justify-between p-3 bg-gray-200">
      <div className="flex-grow overflow-y-auto">
        <h1 className="text-center font-ubuntu mb-2 text-black text-2xl">
          CART
        </h1>
        {Object.keys(validCart).length === 0 ? (
          <div>
            <EmptyCart />
            <h1 className="font-ubuntu text-lg text-center text-customOrange mt-20 font-medium">
              Oops! Can't find anything in your Cart
            </h1>
          </div>
        ) : (
          <div className="bg-white rounded-lg p-1">
            {Object.values(validCart).map((product) => (
              <div
                key={`${product.id}-${product.selectedSize}`}
                className="flex justify-between items-center border-b py-2 mb-2"
              >
                <div className="flex items-center">
                  <img
                    src={product.selectedImageUrl}
                    alt={product.name}
                    className="w-16 h-16 object-cover rounded-lg mr-4"
                  />
                  <div>
                    <h3 className="text-lg font-semibold font-poppins">
                      {product.name}
                    </h3>
                    <p className="text-green-600 font-medium font-poppins text-md">
                      ₦{product.price}
                    </p>
                    <p className="text-black font-poppins font-medium text-xs">
                      Size: ({product.selectedSize || product.size})
                    </p>
                    <div className="flex items-center mt-2">
                      <button
                        onClick={() =>
                          handleDecreaseQuantity(
                            `${product.id}-${product.selectedSize}`
                          )
                        }
                        className="px-2 py-1 bg-customCream text-black text-xs rounded-l-md"
                      >
                        <FaMinus />
                      </button>
                      <span className="px-3 font-ubuntu py-1 bg-gray-100">
                        {product.quantity}
                      </span>
                      <button
                        onClick={() =>
                          handleIncreaseQuantity(
                            `${product.id}-${product.selectedSize}`
                          )
                        }
                        className="px-2 py-1 bg-customCream text-black text-xs rounded-r-md"
                      >
                        <FaPlus />
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() =>
                    handleRemoveFromCart(
                      `${product.id}-${product.selectedSize}`
                    )
                  }
                  className="text-red-400"
                >
                  <FaTrash />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      {Object.keys(validCart).length > 0 && (
        <div className="p-3 flex flex-col justify-between">
          <button
            onClick={handleClearCart}
            className="px-4 py-2 mb-2 bg-black text-white rounded-md shadow-sm hover:bg-red-600 transition-colors duration-300 font-ubuntu"
          >
            Clear Your Cart
          </button>
          <button
            onClick={() => navigate("/newcheckout")}
            className="px-4 py-2 bg-green-500 text-white rounded-md shadow-sm hover:bg-green-600 transition-colors duration-300 font-ubuntu"
          >
            Checkout
          </button>
        </div>
      )}
    </div>
  );
};

export default Cart;
