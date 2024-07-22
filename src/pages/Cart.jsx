import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { removeFromCart, clearCart } from "../redux/actions/action";
import { FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../firebase.config";
import EmptyCart from "../components/Loading/EmptyCart";

const Cart = () => {
  const cart = useSelector((state) => state.cart);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [validCart, setValidCart] = useState({});

  useEffect(() => {
    const checkCartProducts = async () => {
      const updatedCart = { ...cart };
      const productIds = Object.keys(cart);

      for (const productId of productIds) {
        const productDoc = await getDoc(
          doc(db, `vendors/${cart[productId].vendorId}/products`, productId)
        );
        if (!productDoc.exists()) {
          delete updatedCart[productId];
          dispatch(removeFromCart(productId));
          toast.info(
            `Product ${cart[productId].name} has been removed as it is no longer available.`
          );
        }
      }

      setValidCart(updatedCart);
    };

    checkCartProducts();
  }, [cart, dispatch]);

  const handleRemoveFromCart = (productId) => {
    const confirmRemove = window.confirm(
      "Are you sure you want to remove this product from the cart?"
    );
    if (confirmRemove) {
      dispatch(removeFromCart(productId));
      toast.info("Removed product from cart!");
    }
  };

  const handleClearCart = () => {
    const confirmClear = window.confirm(
      "Are you sure you want to clear your cart?"
    );
    if (confirmClear) {
      dispatch(clearCart());
      toast.info("Cleared all products from cart!");
    }
  };

  const handleCheckout = () => {
    navigate("/newcheckout");
  };

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
                key={product.id}
                className="flex justify-between items-center border-b py-2 mb-2"
              >
                <div className="flex items-center">
                  <img
                    src={product.selectedImageUrl}
                    alt={product.name}
                    className="w-16 h-16 object-cover rounded-lg mr-4"
                  />
                  <div>
                    <h3 className="text-md font-semibold font-poppins">
                      {product.name}
                    </h3>
                    <p className="text-green-600 font-lato text-lg">
                      ₦{product.price}
                    </p>
                    <p className="text-gray-600 font-medium text-xs">
                      Size: {product.selectedSize || product.size}
                    </p>
                    <p className="text-gray-600 font-medium text-xs">
                      Quantity: {product.quantity}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveFromCart(product.id)}
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
        <div className=" p-3 flex flex-col justify-between">
          <button
            onClick={handleClearCart}
            className="px-4 py-2 mb-2 bg-black text-white rounded-md shadow-sm hover:bg-red-600 transition-colors duration-300 font-ubuntu"
          >
            Clear Your Cart
          </button>
          <button
            onClick={handleCheckout}
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
