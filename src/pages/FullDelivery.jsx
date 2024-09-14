import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux"; // Added missing useDispatch
import { clearCart } from "../redux/actions/action"; // Add necessary imports
import useAuth from "../custom-hooks/useAuth"; // Add useAuth import
import { calculateServiceFee } from "./VendorCompleteProfile/utilis"; // Add calculateServiceFee import
import { createOrderAndReduceStock } from "../services/Services"; // Add createOrderAndReduceStock import

const FullDelivery = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { totalPrice, deliveryInfo, cart } = state;
  const dispatch = useDispatch();
  const { currentUser, loading } = useAuth();

  const serviceFee = calculateServiceFee(totalPrice);
  const total = (parseFloat(totalPrice) + parseFloat(serviceFee)).toFixed(2);

  const handlePaystackPayment = (amount, onSuccessCallback) => {
    if (loading) {
      toast.info("Checking authentication status...");
      return;
    }

    if (!currentUser) {
      toast.error("User is not logged in");
      return;
    }

    // Add the payment handling logic here if necessary
    onSuccessCallback(); // Call the success callback if needed
  };

  const handleFullDeliveryPayment = async () => {
    handlePaystackPayment(parseFloat(total), async () => {
      try {
        const userId = currentUser.uid;
        await createOrderAndReduceStock(userId, cart);
        dispatch(clearCart());
        navigate("/payment-approve", {
          state: { totalPrice, deliveryInfo },
        });
        setTimeout(() => {
          navigate("/newhome");
        }, 3000);
      } catch (error) {
        console.error("Error placing order:", error);
        toast.error(
          "An error occurred while placing the order. Please try again."
        );
      }
    });
  };

  return (
    <div className="p-4">
      <h1 className="font-ubuntu text-black text-2xl">Full Delivery Payment</h1>
      <div className="bg-white mt-8">
        <h2 className="text-lg font-semibold font-ubuntu mb-2">
          Order summary
        </h2>
        {Object.values(cart).map((product) => (
          <div
            key={product.id}
            className="flex justify-between items-center bg-gray-100 w-full border-b py-3 rounded-lg mb-2"
          >
            <div className="flex items-center">
              <img
                src={product.selectedImageUrl}
                alt={product.name}
                className="w-20 h-20 object-cover rounded-lg mr-4"
              />
              <div>
                <h3 className="text-lg font-semibold font-poppins">
                  {product.name}
                </h3>
                <p className="text-green-600 font-poppins font-medium text-md">
                  ₦{product.price.toFixed(2)}
                </p>
                <p className="text-gray-600 font-poppins font-medium text-xs">
                  Size: {product.selectedSize || product.size}
                </p>
                <p className="text-gray-600 font-medium text-xs">
                  Quantity: {product.quantity}
                </p>
              </div>
            </div>
          </div>
        ))}
        <div className="mt-4 flex justify-between">
          <label className="block mb-2 font-poppins font-semibold">
            Sub-Total
          </label>
          <p className="text-lg font-poppins text-black font-medium">
            ₦{totalPrice.toFixed(2)}
          </p>
        </div>
        <div className="mt-1 flex justify-between">
          <label className="block mb-2 font-poppins font-semibold">
            Service Fee
          </label>
          <p className="text-lg font-poppins text-black font-medium">
            ₦{serviceFee}
          </p>
        </div>
        <div className="mt-1 flex justify-between">
          <label className="block mb-2 font-poppins font-semibold">Total</label>
          <p className="text-lg font-poppins text-black font-medium">
            ₦{total}
          </p>
        </div>
        <button
          onClick={handleFullDeliveryPayment} // Added missing click handler
          className="w-full px-4 py-2 bg-green-500 text-white rounded-md shadow-sm hover:bg-green-600 transition-colors duration-300 font-ubuntu"
        >
          Pay for Full Delivery
        </button>
      </div>
    </div>
  );
};

export default FullDelivery;
